import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

/**
 * GET /api/admin/ai-decisions/stats
 * Get AI decision statistics
 */
export async function GET(request: NextRequest) {
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
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weightlossprojectionlab@gmail.com'].includes(adminEmail)

    if (!isSuperAdmin && adminData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get all decisions
    const allDecisionsSnapshot = await adminDb.collection('ai_decision_logs').get()
    const totalDecisions = allDecisionsSnapshot.size

    let lowConfidenceCount = 0
    let totalConfidence = 0
    let reversalCount = 0
    let unreviewedCount = 0

    allDecisionsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      const confidence = data.confidence || 0

      totalConfidence += confidence

      if (confidence < 0.8) {
        lowConfidenceCount++
      }

      if (data.reversalReason) {
        reversalCount++
      }

      if (!data.reviewedBy) {
        unreviewedCount++
      }
    })

    const avgConfidence = totalDecisions > 0 ? totalConfidence / totalDecisions : 0
    const reversalRate = totalDecisions > 0 ? reversalCount / totalDecisions : 0

    const stats = {
      totalDecisions,
      lowConfidenceCount,
      avgConfidence,
      reversalRate,
      unreviewedCount,
    }

    return NextResponse.json({ stats })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/ai-decisions/stats',
      operation: 'fetch'
    })
  }
}
