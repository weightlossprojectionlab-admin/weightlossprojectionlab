import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { analyzeProductAssociations } from '@/scripts/analyze-product-associations'

/**
 * POST /api/admin/ml/analyze-associations
 * Trigger product association analysis
 *
 * This endpoint runs the market basket analysis on all user shopping data
 * to find products that are frequently bought together.
 *
 * Note: This can be a long-running operation depending on data volume.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email || 'unknown'

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com'].includes(
      adminEmail.toLowerCase()
    )

    if (!isSuperAdmin && adminData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Check if an analysis is already running
    const statusDoc = await adminDb.collection('system').doc('ml_analysis_status').get()
    const statusData = statusDoc.data()

    if (statusData?.running) {
      return NextResponse.json(
        {
          error: 'Analysis already in progress',
          startedAt: statusData.startedAt,
          startedBy: statusData.startedBy
        },
        { status: 409 }
      )
    }

    // Mark analysis as running
    await adminDb.collection('system').doc('ml_analysis_status').set({
      running: true,
      startedAt: new Date(),
      startedBy: adminEmail,
      progress: 'Starting analysis...'
    })

    logger.info(`Product association analysis triggered by ${adminEmail}`)

    // Run analysis (this is async and may take time)
    analyzeProductAssociations()
      .then(async () => {
        // Mark analysis as complete
        await adminDb.collection('system').doc('ml_analysis_status').set({
          running: false,
          completedAt: new Date(),
          lastRunBy: adminEmail,
          status: 'completed',
          progress: 'Analysis completed successfully'
        })

        // Update last analysis timestamp
        await adminDb.collection('system').doc('ml_metadata').set(
          {
            lastAnalysisRun: new Date(),
            lastAnalysisBy: adminEmail
          },
          { merge: true }
        )

        logger.info(`Product association analysis completed successfully`)
      })
      .catch(async (error) => {
        logger.error('Product association analysis failed', error as Error)

        // Mark analysis as failed
        await adminDb.collection('system').doc('ml_analysis_status').set({
          running: false,
          failedAt: new Date(),
          lastRunBy: adminEmail,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          progress: 'Analysis failed'
        })
      })

    return NextResponse.json({
      success: true,
      message: 'Product association analysis started',
      note: 'This is a background process. Check analysis status for progress.'
    })
  } catch (error) {
    logger.error('Error triggering product association analysis', error as Error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start analysis' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/ml/analyze-associations
 * Get the status of the current/last analysis run
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await adminAuth.verifyIdToken(idToken)

    // Get analysis status
    const statusDoc = await adminDb.collection('system').doc('ml_analysis_status').get()
    const metadataDoc = await adminDb.collection('system').doc('ml_metadata').get()

    const status = statusDoc.exists ? statusDoc.data() : { running: false }
    const metadata = metadataDoc.exists ? metadataDoc.data() : {}

    // Get count of product associations
    const associationsSnapshot = await adminDb.collection('product_associations').count().get()
    const associationCount = associationsSnapshot.data().count

    return NextResponse.json({
      status,
      metadata: {
        ...metadata,
        lastAnalysisRun: metadata?.lastAnalysisRun?.toDate?.()?.toISOString() || null,
        totalProductAssociations: associationCount
      }
    })
  } catch (error) {
    logger.error('Error fetching analysis status', error as Error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch status' },
      { status: 500 }
    )
  }
}
