/**
 * Spreadsheet Import — Weight Logs Commit
 *
 * POST /api/import/weight-logs/commit
 *   Body: { csv: string, mapping: Record<string, ColumnMapping>, targetOwnerUserId? }
 *   Returns: {
 *     batchId: string,
 *     imported: number,
 *     skipped: Array<{ rowIndex, reason }>,
 *     errors:  Array<{ rowIndex, errors: Array<{ field, message }> }>,
 *   }
 *
 * Per-row pipeline:
 *   1. Transform raw CSV cells via the field transforms
 *   2. Validate via Zod (weight bounds, unit enum, valid date)
 *   3. Match patientName against the household's patients —
 *      unmatched rows go into errors with a clear reason
 *   4. Write the WeightLog into the patient's weight-logs
 *      subcollection, tagged with the import batch
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/logger'
import { errorResponse, validationError } from '@/lib/api-response'
import { transformRow, validateRow, type ColumnMapping } from '@/lib/import/weight-log-import-config'
import { parseCsvText, MAX_IMPORT_ROWS } from '@/lib/import/csv-parser'
import { assertImportAccess } from '@/lib/import/assert-import-access'
import { matchPatientByName } from '@/lib/import/match-patient'
import { v4 as uuidv4 } from 'uuid'

interface RowError {
  rowIndex: number
  errors: Array<{ field: string; message: string }>
}

interface RowSkip {
  rowIndex: number
  reason: string
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
      logger.warn('[API /import/weight-logs/commit] Rate limit exceeded', { callerUserId })
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

    // Load the household's patients up front so each row's name
    // can be matched without N round trips.
    const patientsSnap = await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .get()
    const candidates = patientsSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>
      return {
        id: d.id,
        name: typeof data.name === 'string' ? data.name : '',
        nickname: typeof data.nickname === 'string' ? data.nickname : undefined,
      }
    })

    const typedMapping = mapping as Record<string, ColumnMapping>
    const batchId = uuidv4()
    const importedAt = new Date().toISOString()
    const errors: RowError[] = []
    const skipped: RowSkip[] = []
    let imported = 0

    for (let i = 0; i < parsed.rows.length; i++) {
      const rawRow = parsed.rows[i]
      const rowNumber = i + 2 // 1 for header, 1 for 1-based

      const transformed = transformRow(rawRow, typedMapping)
      if (Object.keys(transformed).length === 0) {
        skipped.push({ rowIndex: rowNumber, reason: 'Row was empty' })
        continue
      }

      const validation = validateRow(transformed)
      if (!validation.ok) {
        errors.push({ rowIndex: rowNumber, errors: validation.errors })
        continue
      }

      // Match the patient name to a household patient. Failure
      // here is a hard error — refusing to write to the wrong
      // record beats silently picking the wrong one.
      const match = matchPatientByName(validation.data.patientName, candidates)
      if (!match.patientId) {
        errors.push({
          rowIndex: rowNumber,
          errors: [
            {
              field: 'patientName',
              message:
                match.reason === 'ambiguous'
                  ? `"${validation.data.patientName}" matches more than one family member. Use the exact name or nickname.`
                  : `Family member "${validation.data.patientName}" not found. Add them first or check the spelling.`,
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
        weight: validation.data.weight,
        unit: validation.data.unit,
        loggedAt: validation.data.loggedAt,
        loggedBy: callerUserId,
        source: 'manual' as const,
        ...(validation.data.notes ? { notes: validation.data.notes } : {}),
        ...(validation.data.bodyFat !== undefined ? { bodyFat: validation.data.bodyFat } : {}),
        ...(validation.data.tags ? { tags: validation.data.tags } : {}),
        // Audit tags for the future undo flow + invocation log
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
        logger.error('[API /import/weight-logs/commit] Write failed', writeError as Error, {
          callerUserId,
          ownerUserId,
          rowIndex: rowNumber,
        })
        errors.push({
          rowIndex: rowNumber,
          errors: [{ field: '_row', message: 'Failed to save — please try again' }],
        })
      }
    }

    logger.info('[API /import/weight-logs/commit] Import complete', {
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
    return errorResponse(error, { route: '/api/import/weight-logs/commit', operation: 'commit' })
  }
}
