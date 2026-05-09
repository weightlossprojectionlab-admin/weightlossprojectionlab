/**
 * Spreadsheet Import — Patients Preview
 *
 * POST /api/import/patients/preview
 *   Body: { csv: string }
 *   Returns: {
 *     headers: string[],
 *     sampleRows: Record<string, string>[],   // first 5 rows
 *     suggestedMapping: Record<string, ColumnMapping>,
 *     totalRows: number,
 *   }
 *
 * Read-only — does not write anything to Firestore. The UI uses
 * the response to render the column-mapping wizard and a row
 * preview before the user clicks Import.
 *
 * Why a separate endpoint from /commit: the preview is cheap and
 * cacheable on the client; the commit is the side-effecting
 * write. Splitting them means the user can fiddle with the
 * mapping without re-uploading the file every keystroke.
 */

import { NextRequest, NextResponse } from 'next/server'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/logger'
import { errorResponse, validationError } from '@/lib/api-response'
import { suggestMapping } from '@/lib/import/patient-import-config'
import { parseCsvText, MAX_PREVIEW_ROWS, MAX_IMPORT_ROWS } from '@/lib/import/csv-parser'
import { assertImportAccess } from '@/lib/import/assert-import-access'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const csv: unknown = body?.csv
    const targetOwnerUserId: string | undefined =
      typeof body?.targetOwnerUserId === 'string' ? body.targetOwnerUserId : undefined

    // Authorization + permission check + read-only gate, all in
    // one helper so the same rule applies on /preview and /commit.
    // Preview is read-only on Firestore but it costs CPU and is
    // gated behind the same authority because there's no point
    // surfacing a column-mapper to a user who can't commit.
    const access = await assertImportAccess(request, targetOwnerUserId)
    if (access instanceof Response) return access
    const { callerUserId } = access

    const rateLimitResult = await medicalApiRateLimit.limit(callerUserId)
    if (!rateLimitResult.success) {
      logger.warn('[API /import/patients/preview] Rate limit exceeded', { callerUserId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) },
      )
    }
    if (typeof csv !== 'string' || csv.length === 0) {
      return validationError('CSV content is required')
    }
    if (csv.length > 5_000_000) {
      // Generous 5 MB ceiling on raw text. The row-count cap below
      // is the actual limit; this just rejects pathological uploads.
      return validationError('CSV file is too large (max 5 MB)')
    }

    const parsed = parseCsvText(csv)
    if (parsed.headers.length === 0) {
      return validationError('Could not detect any column headers in the CSV')
    }
    if (parsed.rows.length > MAX_IMPORT_ROWS) {
      return validationError(`Import is limited to ${MAX_IMPORT_ROWS} rows per file. Split your spreadsheet and try again.`)
    }

    return NextResponse.json({
      success: true,
      data: {
        headers: parsed.headers,
        sampleRows: parsed.rows.slice(0, MAX_PREVIEW_ROWS),
        suggestedMapping: suggestMapping(parsed.headers),
        totalRows: parsed.rows.length,
      },
    })
  } catch (error) {
    return errorResponse(error, { route: '/api/import/patients/preview', operation: 'preview' })
  }
}
