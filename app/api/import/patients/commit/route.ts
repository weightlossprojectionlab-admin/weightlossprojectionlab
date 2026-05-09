/**
 * Spreadsheet Import — Patients Commit
 *
 * POST /api/import/patients/commit
 *   Body: {
 *     csv: string,
 *     mapping: Record<string, ColumnMapping>,
 *   }
 *   Returns: {
 *     batchId: string,
 *     imported: number,
 *     skipped: Array<{ rowIndex: number, reason: string }>,
 *     errors:  Array<{ rowIndex: number, errors: Array<{ field: string, message: string }> }>,
 *   }
 *
 * The commit endpoint takes the SAME CSV text the preview returned
 * and the mapping the user confirmed, re-parses both server-side
 * (defense in depth — never trust the client to have shipped the
 * exact rows it previewed), validates each row, and writes via
 * the canonical patient-creation pipeline. Failed rows are listed
 * but don't abort the batch; we'd rather import 8 of 10 than zero.
 *
 * Each created patient is tagged with:
 *   - source: 'spreadsheet-import'
 *   - importBatchId: <uuid>
 *   - importedAt: <ISO timestamp>
 * so a future undo flow can batch-delete a bad import.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyAuthToken } from '@/lib/rbac-middleware'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/logger'
import { errorResponse, unauthorizedResponse, validationError } from '@/lib/api-response'
import { transformRow, validateRow, type ColumnMapping } from '@/lib/import/patient-import-config'
import { parseCsvText, MAX_IMPORT_ROWS } from '@/lib/import/csv-parser'
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

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult) return unauthorizedResponse()
    const userId = authResult.userId

    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /import/patients/commit] Rate limit exceeded', { userId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) },
      )
    }

    const body = await request.json()
    const csv: unknown = body?.csv
    const mapping: unknown = body?.mapping
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

    // Reuse the user's own /users/{uid}/patients subcollection —
    // same path createPatient via the API would write to. Going
    // through adminDb directly skips the API round-trip and lets
    // us batch a series of writes inside one request.
    const patientsCollection = adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')

    for (let i = 0; i < parsed.rows.length; i++) {
      const rawRow = parsed.rows[i]
      const transformed = transformRow(rawRow, typedMapping)

      // Skip rows that produced no data at all (entirely empty
      // when filtered through the mapping). The 'skipped' bucket
      // exists so the receipt can distinguish "row had a typo
      // we caught" from "row was effectively blank".
      if (Object.keys(transformed).length === 0) {
        skipped.push({ rowIndex: i + 2, reason: 'Row was empty' }) // +2: 1 for header, 1 for 1-based
        continue
      }

      const validation = validateRow(transformed)
      if (!validation.ok) {
        errors.push({ rowIndex: i + 2, errors: validation.errors })
        continue
      }

      const patientId = uuidv4()
      const profile: Partial<PatientProfile> & { id: string; userId: string; addedAt: string } = {
        id: patientId,
        userId,
        addedBy: userId,
        addedAt: importedAt,
        ...validation.data,
        // Source tags — used by a future undo flow to roll back
        // a bad batch.
        ...({
          source: 'spreadsheet-import',
          importBatchId: batchId,
          importedAt,
        } as Record<string, string>),
      }

      try {
        await patientsCollection.doc(patientId).set(profile)
        imported++
      } catch (writeError) {
        logger.error('[API /import/patients/commit] Write failed', writeError as Error, {
          userId,
          rowIndex: i + 2,
        })
        errors.push({
          rowIndex: i + 2,
          errors: [{ field: '_row', message: 'Failed to save — please try again' }],
        })
      }
    }

    logger.info('[API /import/patients/commit] Import complete', {
      userId,
      batchId,
      imported,
      errorCount: errors.length,
      skippedCount: skipped.length,
    })

    return NextResponse.json({
      success: true,
      data: {
        batchId,
        imported,
        skipped,
        errors,
      },
    })
  } catch (error) {
    return errorResponse(error, { route: '/api/import/patients/commit', operation: 'commit' })
  }
}
