import { NextRequest, NextResponse } from 'next/server'
import { assertPatientAccess } from '@/lib/rbac-middleware'
import { logger } from '@/lib/logger'
import { adminDb } from '@/lib/firebase-admin'
import { errorResponse } from '@/lib/api-response'
import { Timestamp } from 'firebase-admin/firestore'

/**
 * GET /api/patients/[patientId]/health-reports/[reportId]
 * Fetch a specific health report by ID and increment view count
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; reportId: string }> }
) {
  try {
    const { patientId, reportId } = await params

    // Check patient access
    const accessInfo = await assertPatientAccess(request, patientId, 'viewMedicalRecords')
    if (accessInfo instanceof Response) {
      return accessInfo
    }

    const { ownerUserId } = accessInfo

    logger.info('[Health Reports] Fetching specific report', {
      patientId,
      reportId,
      ownerUserId
    })

    // Fetch the report
    const reportRef = adminDb.collection('healthReports').doc(reportId)
    const reportDoc = await reportRef.get()

    if (!reportDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          error: 'Report not found'
        },
        { status: 404 }
      )
    }

    const reportData = reportDoc.data()

    // Verify the report belongs to the requested patient
    if (reportData?.patientId !== patientId) {
      logger.warn('[Health Reports] Report patientId mismatch', {
        reportId,
        expectedPatientId: patientId,
        actualPatientId: reportData?.patientId
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Report does not belong to this patient'
        },
        { status: 403 }
      )
    }

    // Increment view count and update lastViewedAt
    const currentViewCount = reportData.viewCount || 0
    await reportRef.update({
      viewCount: currentViewCount + 1,
      lastViewedAt: Timestamp.now()
    })

    logger.info('[Health Reports] Report view count incremented', {
      reportId,
      patientId,
      newViewCount: currentViewCount + 1
    })

    // Convert Firestore timestamps to ISO strings for the response
    const report = {
      id: reportDoc.id,
      ...reportData,
      generatedAt: reportData.generatedAt?.toDate?.()?.toISOString() || reportData.generatedAt,
      lastViewedAt: new Date().toISOString(), // Use current time since we just viewed it
      viewCount: currentViewCount + 1
    }

    return NextResponse.json({
      success: true,
      report
    })

  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/health-reports/[reportId]',
      operation: 'fetch',
      patientId: (await params).patientId,
      reportId: (await params).reportId
    })
  }
}
