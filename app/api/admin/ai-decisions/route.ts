import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logAdminAction } from '@/lib/admin/audit'
import { Timestamp } from 'firebase-admin/firestore'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

/**
 * GET /api/admin/ai-decisions?reviewed=<reviewed>&maxConfidence=<maxConfidence>
 * Get AI decisions for review
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
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com'].includes(adminEmail)

    if (!isSuperAdmin && adminData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const reviewed = searchParams.get('reviewed') || 'unreviewed'
    const maxConfidence = parseFloat(searchParams.get('maxConfidence') || '0.8')

    // Build query
    let query = adminDb.collection('ai_decision_logs').orderBy('timestamp', 'desc')

    // Filter by confidence
    query = query.where('confidence', '<', maxConfidence) as any

    // Filter by reviewed status
    if (reviewed === 'unreviewed') {
      query = query.where('reviewedBy', '==', null) as any
    } else if (reviewed === 'reviewed') {
      query = query.where('reviewedBy', '!=', null) as any
    }

    // Limit results
    query = query.limit(100) as any

    const snapshot = await query.get()

    const decisions = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        decisionId: doc.id,
        timestamp: data.timestamp?.toDate?.() || new Date(),
        decision: data.decision,
        confidence: data.confidence,
        rationale: data.rationale,
        policyReference: data.policyReference,
        model: data.model,
        modelTier: data.modelTier,
        executedBy: data.executedBy,
        userId: data.userId,
        templateId: data.templateId,
        dataSensitivity: data.dataSensitivity,
        reviewedBy: data.reviewedBy,
        reviewedAt: data.reviewedAt?.toDate?.() || null,
        reversalReason: data.reversalReason,
        metadata: data.metadata,
      }
    })

    return NextResponse.json({ decisions })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/ai-decisions',
      operation: 'fetch'
    })
  }
}

/**
 * POST /api/admin/ai-decisions
 * Review an AI decision (approve or reverse)
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
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com'].includes(adminEmail)

    if (!isSuperAdmin && adminData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { decisionId, action, notes } = body

    if (!decisionId || !action) {
      return NextResponse.json({ error: 'Decision ID and action required' }, { status: 400 })
    }

    if (!['approve', 'reverse'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get decision
    const decisionRef = adminDb.collection('ai_decision_logs').doc(decisionId)
    const decisionDoc = await decisionRef.get()

    if (!decisionDoc.exists) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 })
    }

    const decisionData = decisionDoc.data()

    // Update decision
    const updateData: any = {
      reviewedBy: adminEmail,
      reviewedAt: Timestamp.now(),
    }

    if (action === 'reverse') {
      updateData.reversalReason = notes || 'Reversed by admin'
    }

    await decisionRef.update(updateData)

    // Log action
    await logAdminAction({
      adminUid,
      adminEmail,
      action: action === 'approve' ? 'ai_decision_review' : 'ai_decision_reverse',
      targetType: 'decision',
      targetId: decisionId,
      reason: notes,
      metadata: {
        decision: decisionData?.decision,
        confidence: decisionData?.confidence,
        originalRationale: decisionData?.rationale,
      },
    })

    return NextResponse.json({ success: true, message: `Decision ${action}d` })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/ai-decisions',
      operation: 'create'
    })
  }
}
