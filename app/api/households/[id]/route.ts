/**
 * API Route: Household by ID
 *
 * GET /api/households/[id] - Get household details
 * PUT /api/households/[id] - Update household
 * DELETE /api/households/[id] - Delete household (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { checkHouseholdAccess } from '@/lib/household-access'
import { logger } from '@/lib/logger'
import type { Household } from '@/types/household'
import { getMaxMembersPerHousehold } from '@/lib/feature-gates'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/households/[id]
 * Get household details with members
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: householdId } = await params

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    const access = await checkHouseholdAccess(householdId, userId)
    if (!access.exists) {
      return NextResponse.json(
        { error: 'Household not found' },
        { status: 404 }
      )
    }
    if (!access.isMember) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not have access to this household' },
        { status: 403 }
      )
    }
    const household = { id: householdId, ...access.household } as Household

    // Members are derived from Patient.householdId (single source of
    // truth). The household doc itself stores no memberIds array.
    const patientsQuery = await adminDb
      .collection('users').doc(household.primaryCaregiverId)
      .collection('patients')
      .where('householdId', '==', householdId)
      .get()

    const patients = patientsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return NextResponse.json({
      success: true,
      household,
      patients
    })
  } catch (error: any) {
    logger.error('[API /households/[id] GET] Error fetching household', error as Error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch household' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/households/[id]
 * Update household details
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: householdId } = await params

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Get household
    const householdDoc = await adminDb.collection('households').doc(householdId).get()

    if (!householdDoc.exists) {
      return NextResponse.json(
        { error: 'Household not found' },
        { status: 404 }
      )
    }

    const household = householdDoc.data() as Household

    // Verify access (only primary caregiver can update)
    if (household.primaryCaregiverId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Only primary caregiver can update household' },
        { status: 403 }
      )
    }

    // Parse updates
    const body = await request.json()
    // Note: `memberIds` is ephemeral (used to cascade Patient.householdId)
    // and is NOT persisted on the household doc. `primaryResidentId` no
    // longer exists.
    const allowedUpdates = ['name', 'nickname', 'address', 'kitchenConfig', 'preferences']

    const now = new Date().toISOString()
    const updates: any = {
      updatedAt: now
    }

    // Three states per optional field:
    //   - body[key] === undefined  → caller doesn't want to touch it
    //   - body[key] === null       → caller wants to CLEAR it (delete field)
    //   - body[key] === <value>    → set new value
    // This matters for nickname and address (and would matter for
    // kitchenConfig if we ever expose its blanking). Without explicit
    // null-handling, a blanked-out form field can't clear the prior
    // stored value.
    for (const key of allowedUpdates) {
      if (!(key in body)) continue
      const value = body[key]
      if (value === undefined) continue
      if (value === null) {
        updates[key] = FieldValue.delete()
      } else {
        updates[key] = value
      }
    }

    const cleanedUpdates = updates

    // Membership update: if `memberIds` is in the body, diff against
    // the *actual* current members (patients with householdId == this
    // household) and cascade Patient.householdId writes. Setting a
    // patient's householdId to this household atomically moves them
    // from any prior household — no other cleanup needed because no
    // household stores a memberIds[] array.
    if (body.memberIds !== undefined) {
      const requestedIds = body.memberIds as string[]

      // Plan-cap gate: per-household member cap. Use the caregiver's
      // plan (read from user doc) and reject if the requested set
      // would exceed it. Removal-only edits stay allowed even at cap.
      const userDoc = await adminDb.collection('users').doc(userId).get()
      const plan: string = userDoc.data()?.subscription?.plan ?? 'free'
      const cap = getMaxMembersPerHousehold(plan)
      if (requestedIds.length > cap) {
        return NextResponse.json(
          {
            error: 'HOUSEHOLD_MEMBER_CAP',
            message: `Your ${plan} plan allows up to ${cap} member${cap === 1 ? '' : 's'} per household. You picked ${requestedIds.length}.`,
            plan,
            cap,
            attempted: requestedIds.length,
          },
          { status: 403 }
        )
      }

      // Read the actual current membership from the patient side.
      const currentMembersSnap = await adminDb
        .collection('users').doc(userId)
        .collection('patients')
        .where('householdId', '==', householdId)
        .get()
      const currentIds = currentMembersSnap.docs.map(d => d.id)

      const added = requestedIds.filter(id => !currentIds.includes(id))
      const removed = currentIds.filter(id => !requestedIds.includes(id))

      // Verify ownership of newly-added patients before any writes.
      for (const patientId of added) {
        const patientDoc = await adminDb
          .collection('users').doc(userId)
          .collection('patients').doc(patientId)
          .get()
        if (!patientDoc.exists) {
          return NextResponse.json(
            { error: `Patient not found: ${patientId}` },
            { status: 404 }
          )
        }
      }

      const memberBatch = adminDb.batch()
      for (const patientId of added) {
        const patientRef = adminDb
          .collection('users').doc(userId)
          .collection('patients').doc(patientId)
        memberBatch.update(patientRef, {
          householdId,
          lastModified: now
        })
      }
      for (const patientId of removed) {
        const patientRef = adminDb
          .collection('users').doc(userId)
          .collection('patients').doc(patientId)
        memberBatch.update(patientRef, {
          householdId: null,
          lastModified: now
        })
      }
      await memberBatch.commit()
    }

    await adminDb.collection('households').doc(householdId).update(cleanedUpdates)

    logger.info('[Households API] Updated household', {
      householdId,
      userId,
      updates: Object.keys(updates)
    })

    // Return updated household
    const updatedDoc = await adminDb.collection('households').doc(householdId).get()
    const updatedHousehold = { id: updatedDoc.id, ...updatedDoc.data() }

    return NextResponse.json({
      success: true,
      household: updatedHousehold
    })
  } catch (error: any) {
    logger.error('[API /households/[id] PUT] Error updating household', error as Error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update household' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/households/[id]
 * Soft delete household
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: householdId } = await params

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Get household
    const householdDoc = await adminDb.collection('households').doc(householdId).get()

    if (!householdDoc.exists) {
      return NextResponse.json(
        { error: 'Household not found' },
        { status: 404 }
      )
    }

    const household = householdDoc.data() as Household

    // Verify access (only primary caregiver can delete)
    if (household.primaryCaregiverId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Only primary caregiver can delete household' },
        { status: 403 }
      )
    }

    // Soft delete
    await adminDb.collection('households').doc(householdId).update({
      isActive: false,
      updatedAt: new Date().toISOString()
    })

    // Clear Patient.householdId on every patient who lived here.
    // Members are derived from the patient query — no household-side
    // memberIds[] to consult.
    const now = new Date().toISOString()
    const membersSnap = await adminDb
      .collection('users').doc(userId)
      .collection('patients')
      .where('householdId', '==', householdId)
      .get()

    if (!membersSnap.empty) {
      const batch = adminDb.batch()
      for (const doc of membersSnap.docs) {
        batch.update(doc.ref, {
          householdId: null,
          lastModified: now
        })
      }
      await batch.commit()
    }

    logger.info('[Households API] Deleted household', {
      householdId,
      userId
    })

    return NextResponse.json({
      success: true,
      message: 'Household deleted successfully'
    })
  } catch (error: any) {
    logger.error('[API /households/[id] DELETE] Error deleting household', error as Error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete household' },
      { status: 500 }
    )
  }
}
