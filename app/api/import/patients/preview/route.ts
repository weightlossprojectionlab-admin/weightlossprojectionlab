/**
 * Spreadsheet Import — Preview
 *
 * POST /api/import/patients/preview
 *   Body: { csv: string, targetOwnerUserId?: string }
 *   Returns: {
 *     headers: string[],
 *     sampleRows: Record<string, string>[],
 *     suggestedMapping: Record<string, ColumnMapping>,
 *     totalRows: number,
 *     householdPatients: Array<{ id, name, nickname?, type }>,
 *   }
 *
 * Read-only — does not write to Firestore. The wizard uses the
 * response to render the column-mapping step. The
 * `householdPatients` list is included so the wizard can warn
 * about unmatched names in weight rows BEFORE the commit, when
 * the user can still fix them.
 *
 * NB: route lives at /api/import/patients/preview to match the
 * commit endpoint's path. The endpoint accepts whatever rows the
 * spreadsheet contains (patient + weight via Type column);
 * "patients" is the entry point of the onboarding flow, not the
 * exclusive content of every file.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
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

    const access = await assertImportAccess(request, targetOwnerUserId)
    if (access instanceof Response) return access
    const { callerUserId, ownerUserId } = access

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
      return validationError('CSV file is too large (max 5 MB)')
    }

    const parsed = parseCsvText(csv)
    if (parsed.headers.length === 0) {
      return validationError('Could not detect any column headers in the CSV')
    }
    if (parsed.rows.length > MAX_IMPORT_ROWS) {
      return validationError(`Import is limited to ${MAX_IMPORT_ROWS} rows per file. Split your spreadsheet and try again.`)
    }

    // Existing household patients — used by the wizard to warn
    // about unmatched names in weight rows before commit.
    const patientsSnap = await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .get()
    const householdPatients = patientsSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>
      return {
        id: d.id,
        name: typeof data.name === 'string' ? data.name : '',
        nickname: typeof data.nickname === 'string' ? data.nickname : undefined,
        type: data.type === 'pet' ? 'pet' : 'human',
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        headers: parsed.headers,
        sampleRows: parsed.rows.slice(0, MAX_PREVIEW_ROWS),
        suggestedMapping: suggestMapping(parsed.headers),
        totalRows: parsed.rows.length,
        householdPatients,
      },
    })
  } catch (error) {
    return errorResponse(error, { route: '/api/import/patients/preview', operation: 'preview' })
  }
}
