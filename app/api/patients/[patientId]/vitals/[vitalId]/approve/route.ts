/**
 * API Route: /api/patients/[patientId]/vitals/[vitalId]/approve
 *
 * Approve or reject a pending weight vital entry.
 * Only account owners, co-admins, and caregivers can approve/reject.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { assertPatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { errorResponse, forbiddenResponse, notFoundResponse } from '@/lib/api-response'
import { createNotification } from '@/lib/notification-service'
import type { VitalSign, VitalModification } from '@/types/medical'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; vitalId: string }> }
) {
  try {
    const { patientId, vitalId } = await params

    // RBAC check — require logVitals permission
    const authResult = await assertPatientAccess(request, patientId, 'logVitals')
    if (authResult instanceof Response) {
      return authResult
    }

    const { userId, ownerUserId, role, familyRole } = authResult as AssertPatientAccessResult

    // Only trusted roles can approve/reject
    const canApprove =
      role === 'owner' ||
      familyRole === 'account_owner' ||
      familyRole === 'co_admin' ||
      familyRole === 'caregiver'

    if (!canApprove) {
      return forbiddenResponse('Only account owners, co-admins, or caregivers can approve weight entries')
    }

    // Parse body
    const body = await request.json()
    const { action, reason } = body as { action: 'approve' | 'reject'; reason?: string }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject".' },
        { status: 400 }
      )
    }

    // Fetch the vital
    const vitalRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('vitals')
      .doc(vitalId)

    const vitalDoc = await vitalRef.get()
    if (!vitalDoc.exists) {
      return notFoundResponse('Vital')
    }

    const vital = vitalDoc.data() as VitalSign

    // Must be pending
    if (vital.approvalStatus !== 'pending') {
      return NextResponse.json(
        { error: `Vital is not pending approval (current status: ${vital.approvalStatus || 'approved'})` },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()

    // Build audit modification entry
    const modification: VitalModification = {
      modifiedBy: userId,
      modifiedAt: now,
      changes: [{
        field: 'approvalStatus',
        oldValue: 'pending',
        newValue: action === 'approve' ? 'approved' : 'rejected'
      }],
      reason: action === 'approve'
        ? 'Weight entry approved by caregiver/admin'
        : reason || 'Weight entry rejected by caregiver/admin'
    }

    // Update the vital
    const updates: Partial<VitalSign> = {
      approvalStatus: action === 'approve' ? 'approved' : 'rejected',
      lastModifiedBy: userId,
      lastModifiedAt: now,
    }

    if (action === 'approve') {
      updates.approvedBy = userId
      updates.approvedAt = now
    } else {
      updates.rejectedBy = userId
      updates.rejectedAt = now
      if (reason) updates.rejectionReason = reason
    }

    await vitalRef.update({
      ...updates,
      modificationHistory: [...(vital.modificationHistory || []), modification]
    })

    logger.info(`[API /vitals/approve] Weight ${action}d`, {
      vitalId,
      patientId,
      approvedBy: userId,
      originalLoggedBy: vital.loggedBy,
      action
    })

    // Sync approved weight to patient profile
    if (action === 'approve' && vital.type === 'weight' && typeof vital.value === 'number') {
      try {
        const patientRef = adminDb
          .collection('users')
          .doc(ownerUserId)
          .collection('patients')
          .doc(patientId)

        await patientRef.update({
          currentWeight: vital.value,
          'goals.startWeight': vital.value
        })

        logger.info('[API /vitals/approve] Synced approved weight to patient profile', {
          patientId,
          weight: vital.value
        })
      } catch (syncError) {
        logger.error('[API /vitals/approve] Failed to sync weight to profile', syncError as Error)
      }
    }

    // Notify the original submitter about the approval/rejection
    try {
      if (vital.loggedBy && vital.loggedBy !== userId) {
        const approverDoc = await adminDb.collection('users').doc(userId).get()
        const approverName = approverDoc.exists ? approverDoc.data()?.name || approverDoc.data()?.email : 'A caregiver'
        const patientDoc = await adminDb.collection('users').doc(ownerUserId).collection('patients').doc(patientId).get()
        const patientName = patientDoc.data()?.name || 'Patient'

        await createNotification({
          userId: vital.loggedBy,
          patientId,
          type: 'weight_approval_result',
          priority: 'normal',
          title: action === 'approve' ? 'Weight Entry Approved' : 'Weight Entry Rejected',
          message: `Weight entry ${action === 'approve' ? 'approved' : 'rejected'}`,
          actionUrl: `/patients/${patientId}`,
          metadata: {
            vitalId,
            patientName,
            weight: typeof vital.value === 'number' ? vital.value : 0,
            unit: ((vital as any).unit || 'lbs') as 'lbs' | 'kg',
            submittedBy: 'You',
            submittedByUserId: vital.loggedBy,
            approvalAction: action,
            approvedBy: approverName,
            rejectionReason: reason,
            actionBy: approverName,
            actionByUserId: userId
          }
        })
      }
    } catch (notifError) {
      logger.error('[API /vitals/approve] Notification error (non-blocking)', notifError as Error)
    }

    return NextResponse.json({
      success: true,
      action,
      vitalId,
      message: action === 'approve'
        ? 'Weight entry approved and now visible on charts'
        : 'Weight entry rejected'
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/vitals/[vitalId]/approve',
      operation: 'approve'
    })
  }
}
