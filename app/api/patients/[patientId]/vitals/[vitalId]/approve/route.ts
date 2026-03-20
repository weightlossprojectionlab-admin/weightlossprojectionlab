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
      return NextResponse.json(
        { error: 'Only account owners, co-admins, or caregivers can approve weight entries' },
        { status: 403 }
      )
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
      return NextResponse.json({ error: 'Vital not found' }, { status: 404 })
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

    return NextResponse.json({
      success: true,
      action,
      vitalId,
      message: action === 'approve'
        ? 'Weight entry approved and now visible on charts'
        : 'Weight entry rejected'
    })
  } catch (error) {
    logger.error('[API /vitals/approve] Error', error as Error)
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 }
    )
  }
}
