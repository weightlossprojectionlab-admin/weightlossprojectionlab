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
import { verifyAuthToken } from '@/lib/rbac-middleware'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/logger'
import { errorResponse, unauthorizedResponse, validationError } from '@/lib/api-response'
import { suggestMapping } from '@/lib/import/patient-import-config'
import { parseCsvText, MAX_PREVIEW_ROWS, MAX_IMPORT_ROWS } from '@/lib/import/csv-parser'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult) return unauthorizedResponse()
    const userId = authResult.userId

    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /import/patients/preview] Rate limit exceeded', { userId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) },
      )
    }

    const body = await request.json()
    const csv: unknown = body?.csv
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
