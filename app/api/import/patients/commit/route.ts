/**
 * Spreadsheet Import — Commit
 *
 * POST /api/import/patients/commit
 *   Body: {
 *     csv: string,
 *     mapping: Record<string, ColumnMapping>,
 *     targetOwnerUserId?: string,
 *   }
 *   Returns: { batchId, imported, skipped, errors }
 *
 * The single import endpoint. Dispatches per row:
 *   - patient row → /users/{ownerUserId}/patients/{id}
 *   - weight row  → /users/{ownerUserId}/patients/{patientId}/weight-logs/{id}
 *
 * Two-pass design when the CSV mixes types:
 *   Pass 1: validate + write patient rows. Builds a name → id
 *           map of just-created patients.
 *   Pass 2: validate weight rows, match Name against the union
 *           of existing-household patients + just-created
 *           patients, write to the matched patient's
 *           weight-logs subcollection.
 *
 * Why two passes: if a CSV creates patient "Mike Doe" on row 2
 * and references "Mike Doe" in a weight row on row 6, row 6
 * needs to find the patient created on row 2. A single pass
 * would either fail the weight row or have to do a deferred
 * resolution. Two passes are simpler and the cost is negligible
 * (at most 1000 rows).
 *
 * Hard-error policy on unmatched names (option (a) per design):
 * a weight row whose Name doesn't match any existing patient OR
 * any patient row in this same upload lands in the errors
 * bucket. Better to surface the typo than to silently drop data
 * or write to the wrong record.
 *
 * NB: the URL path stays at /api/import/patients/commit to avoid
 * a route-rename when the underlying endpoint grew weight-row
 * support. The "patients" segment is the entry point of the
 * onboarding flow that happens to start with patients; the
 * endpoint accepts whatever the spreadsheet contains.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/logger'
import { errorResponse, validationError } from '@/lib/api-response'
import {
  transformRow,
  resolveRowType,
  validatePatientRow,
  validateWeightRow,
  type ColumnMapping,
} from '@/lib/import/patient-import-config'
import { parseCsvText, MAX_IMPORT_ROWS } from '@/lib/import/csv-parser'
import { assertImportAccess } from '@/lib/import/assert-import-access'
import { loadOwnerSubscription } from '@/lib/owner-subscription-guard'
import { matchPatientByName } from '@/lib/import/match-patient'
import { v4 as uuidv4 } from 'uuid'
import type { PatientProfile } from '@/types/medical'

interface RowError {
  rowIndex: number
  errors: Array<{ field: string; message: string }>
}

interface RowSkip {
  rowIndex: number
  reason: string
}

interface CombinedCandidate {
  id: string
  name: string
  nickname?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const csv: unknown = body?.csv
    const mapping: unknown = body?.mapping
    const targetOwnerUserId: string | undefined =
      typeof body?.targetOwnerUserId === 'string' ? body.targetOwnerUserId : undefined

    const access = await assertImportAccess(request, targetOwnerUserId)
    if (access instanceof Response) return access
    const { callerUserId, ownerUserId, via } = access

    const rateLimitResult = await medicalApiRateLimit.limit(callerUserId)
    if (!rateLimitResult.success) {
      logger.warn('[API /import/patients/commit] Rate limit exceeded', { callerUserId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) },
      )
    }

    if (typeof csv !== 'string' || csv.length === 0) {
      return validationError('CSV content is required')
    }
    if (!mapping || typeof mapping !== 'object') {
      return validationError('Column mapping is required')
    }
    if (csv.length > 5_000_000) {
      return validationError('CSV file is too large (max 5 MB)')
    }

    const parsed = parseCsvText(csv)
    if (parsed.headers.length === 0) {
      return validationError('Could not detect any column headers in the CSV')
    }
    if (parsed.rows.length > MAX_IMPORT_ROWS) {
      return validationError(`Import is limited to ${MAX_IMPORT_ROWS} rows per file.`)
    }

    const typedMapping = mapping as Record<string, ColumnMapping>
    const batchId = uuidv4()
    const importedAt = new Date().toISOString()
    const errors: RowError[] = []
    const skipped: RowSkip[] = []
    let imported = 0

    // Existing household patients up front — both passes need
    // them. Just-created patients get appended to this list as
    // pass 1 writes them, so pass 2 can match against the union.
    const existingSnap = await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .get()
    const candidates: CombinedCandidate[] = existingSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>
      return {
        id: d.id,
        name: typeof data.name === 'string' ? data.name : '',
        nickname: typeof data.nickname === 'string' ? data.nickname : undefined,
      }
    })

    // Resolve every row's type up front so we can split the work
    // into two passes without re-parsing.
    type Resolved = {
      rowIndex: number
      transformed: Record<string, unknown>
      type: 'patient' | 'weight'
    }
    const resolvedRows: Resolved[] = []
    for (let i = 0; i < parsed.rows.length; i++) {
      const rowNumber = i + 2 // 1 for header, 1 for 1-based
      const transformed = transformRow(parsed.rows[i], typedMapping)
      if (Object.keys(transformed).length === 0) {
        skipped.push({ rowIndex: rowNumber, reason: 'Row was empty' })
        continue
      }
      const typeOrError = resolveRowType(transformed)
      if (typeof typeOrError !== 'string') {
        errors.push({
          rowIndex: rowNumber,
          errors: [{ field: '_rowType', message: typeOrError.error }],
        })
        continue
      }
      resolvedRows.push({ rowIndex: rowNumber, transformed, type: typeOrError })
    }

    // ============= Plan-capacity gate =============
    // Reject the whole batch if it would exceed the household
    // owner's plan's patient cap. Hard-fail rather than partial-
    // import so the user sees a clear "upgrade or remove rows"
    // outcome instead of "imported 3 of 10 — figure out which 7
    // got dropped." Weight rows don't count (they don't add new
    // patients).
    const newPatientCount = resolvedRows.filter((r) => r.type === 'patient').length
    if (newPatientCount > 0) {
      const ownerSub = await loadOwnerSubscription(ownerUserId)
      // Canonical plan-name lookup so users on stale subscription
      // docs (created before a cap change) still see the current
      // cap. Falls back to stored fields for unrecognized plans.
      const PLAN_CAPS: Record<string, number> = {
        free: 1, single: 1, single_plus: 1,
        family_basic: 5, family_plus: 10, family_premium: 20,
      }
      const canonicalMax = ownerSub?.plan ? PLAN_CAPS[ownerSub.plan] : undefined
      const maxPatients = canonicalMax ?? ownerSub?.maxPatients ?? ownerSub?.maxSeats ?? 1
      const existingPatientCount = candidates.length

      if (existingPatientCount + newPatientCount > maxPatients) {
        logger.info('[API /import/patients/commit] Patient cap exceeded — rejecting batch', {
          callerUserId,
          ownerUserId,
          existingPatientCount,
          newPatientCount,
          maxPatients,
        })
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Patient limit exceeded',
            code: 'PATIENT_LIMIT_EXCEEDED',
            message: `Your plan allows ${maxPatients} family member${
              maxPatients === 1 ? '' : 's'
            }. You already have ${existingPatientCount} and this import would add ${newPatientCount}. Upgrade your plan or remove patient rows from the file.`,
            data: { maxPatients, existingPatientCount, newPatientCount },
          }),
          { status: 402, headers: { 'Content-Type': 'application/json' } },
        )
      }
    }

    // ============= Pass 1: patient rows =============

    const patientsCollection = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')

    for (const r of resolvedRows.filter((r) => r.type === 'patient')) {
      const validation = validatePatientRow(r.transformed)
      if (!validation.ok) {
        errors.push({ rowIndex: r.rowIndex, errors: validation.errors })
        continue
      }

      const patientId = uuidv4()
      const profile: Partial<PatientProfile> & { id: string; userId: string; addedAt: string } = {
        id: patientId,
        userId: ownerUserId,
        addedBy: callerUserId,
        addedAt: importedAt,
        ...validation.data,
        ...({
          source: 'spreadsheet-import',
          importBatchId: batchId,
          importedAt,
          importedBy: callerUserId,
          importedVia: via,
        } as Record<string, string>),
      }

      try {
        await patientsCollection.doc(patientId).set(profile)
        imported++
        // Make this just-created patient available to pass 2.
        candidates.push({
          id: patientId,
          name: validation.data.name,
          nickname: validation.data.nickname,
        })
      } catch (writeError) {
        logger.error('[API /import/patients/commit] Patient write failed', writeError as Error, {
          callerUserId,
          ownerUserId,
          rowIndex: r.rowIndex,
        })
        errors.push({
          rowIndex: r.rowIndex,
          errors: [{ field: '_row', message: 'Failed to save — please try again' }],
        })
      }
    }

    // ============= Pass 2: weight rows =============

    for (const r of resolvedRows.filter((r) => r.type === 'weight')) {
      const validation = validateWeightRow(r.transformed)
      if (!validation.ok) {
        errors.push({ rowIndex: r.rowIndex, errors: validation.errors })
        continue
      }

      const match = matchPatientByName(validation.data.name, candidates)
      if (!match.patientId) {
        errors.push({
          rowIndex: r.rowIndex,
          errors: [
            {
              field: 'name',
              message:
                match.reason === 'ambiguous'
                  ? `"${validation.data.name}" matches more than one family member. Use the exact name or nickname.`
                  : `Family member "${validation.data.name}" not found. Add a patient row in this file or import family members first.`,
            },
          ],
        })
        continue
      }

      const weightLogId = uuidv4()
      const weightLog = {
        id: weightLogId,
        patientId: match.patientId,
        userId: ownerUserId,
        weight: validation.data.measuredWeight,
        unit: validation.data.measuredUnit,
        loggedAt: validation.data.loggedAt,
        loggedBy: callerUserId,
        source: 'manual' as const,
        ...(validation.data.notes ? { notes: validation.data.notes } : {}),
        ...(validation.data.bodyFat !== undefined ? { bodyFat: validation.data.bodyFat } : {}),
        ...(validation.data.tags ? { tags: validation.data.tags } : {}),
        importBatchId: batchId,
        importedAt,
        importedBy: callerUserId,
        importedVia: via,
      }

      try {
        await adminDb
          .collection('users')
          .doc(ownerUserId)
          .collection('patients')
          .doc(match.patientId)
          .collection('weight-logs')
          .doc(weightLogId)
          .set(weightLog)
        imported++
      } catch (writeError) {
        logger.error('[API /import/patients/commit] Weight log write failed', writeError as Error, {
          callerUserId,
          ownerUserId,
          rowIndex: r.rowIndex,
        })
        errors.push({
          rowIndex: r.rowIndex,
          errors: [{ field: '_row', message: 'Failed to save — please try again' }],
        })
      }
    }

    logger.info('[API /import/patients/commit] Import complete', {
      callerUserId,
      ownerUserId,
      via,
      batchId,
      imported,
      errorCount: errors.length,
      skippedCount: skipped.length,
    })

    return NextResponse.json({
      success: true,
      data: { batchId, imported, skipped, errors },
    })
  } catch (error) {
    return errorResponse(error, { route: '/api/import/patients/commit', operation: 'commit' })
  }
}
