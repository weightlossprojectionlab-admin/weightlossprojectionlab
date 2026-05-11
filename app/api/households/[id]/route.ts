/**
 * API Route: Household by ID
 *
 * GET /api/households/[id] - Get household details
 * PUT /api/households/[id] - Update household
 * DELETE /api/households/[id] - Delete household (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { checkHouseholdAccess } from '@/lib/household-access'
import { logger } from '@/lib/logger'
import type { Household } from '@/types/household'

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

    // Get patients in household. Patients live at
    // users/{primaryCaregiverId}/patients/{id} (nested) — querying the
    // top-level `patients` collection finds nothing.
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
    const allowedUpdates = ['name', 'nickname', 'address', 'kitchenConfig', 'preferences', 'memberIds', 'primaryResidentId']

    const now = new Date().toISOString()
    const updates: any = {
      updatedAt: now
    }

    for (const key of allowedUpdates) {
      if (body[key] !== undefined) {
        updates[key] = body[key]
      }
    }

    // Remove any nested undefined values
    const cleanedUpdates: any = {}
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanedUpdates[key] = value
      }
    }

    // If memberIds is being updated, cascade to each patient's
    // householdId field. Two sides of the link must stay in sync:
    // newly-added patients get the household pinned, removed patients
    // get it cleared. Patients live in the primary caregiver's nested
    // collection.
    if (body.memberIds !== undefined) {
      const oldMemberIds = household.memberIds || []
      const newMemberIds = body.memberIds as string[]
      const added = newMemberIds.filter(id => !oldMemberIds.includes(id))
      const removed = oldMemberIds.filter(id => !newMemberIds.includes(id))

      // Verify ownership of newly-added patients before any writes
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
          residenceType: 'full_time',
          lastModified: now
        })
      }
      for (const patientId of removed) {
        const patientRef = adminDb
          .collection('users').doc(userId)
          .collection('patients').doc(patientId)
        memberBatch.update(patientRef, {
          householdId: null,
          residenceType: null,
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

    // Remove householdId from all patients (nested path).
    const batch = adminDb.batch()
    const now = new Date().toISOString()
    for (const patientId of household.memberIds) {
      const patientRef = adminDb
        .collection('users').doc(userId)
        .collection('patients').doc(patientId)
      batch.update(patientRef, {
        householdId: null,
        residenceType: null,
        lastModified: now
      })
    }
    await batch.commit()

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
