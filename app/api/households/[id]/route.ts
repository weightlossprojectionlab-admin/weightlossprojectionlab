/**
 * API Route: Household by ID
 *
 * GET /api/households/[id] - Get household details
 * PUT /api/households/[id] - Update household
 * DELETE /api/households/[id] - Delete household (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
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

    // Get household
    const householdDoc = await adminDb.collection('households').doc(householdId).get()

    if (!householdDoc.exists) {
      return NextResponse.json(
        { error: 'Household not found' },
        { status: 404 }
      )
    }

    const household = { id: householdDoc.id, ...householdDoc.data() } as Household

    // Verify access
    const hasAccess =
      household.primaryCaregiverId === userId ||
      household.additionalCaregiverIds?.includes(userId)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not have access to this household' },
        { status: 403 }
      )
    }

    // Get patients in household
    const patientsQuery = await adminDb
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
    logger.error('[API /households/[id] GET] Error fetching household', error)
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
    const allowedUpdates = ['name', 'nickname', 'address', 'kitchenConfig', 'preferences']

    const updates: any = {
      updatedAt: new Date().toISOString()
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
    logger.error('[API /households/[id] PUT] Error updating household', error)
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

    // Remove householdId from all patients
    const batch = adminDb.batch()
    for (const patientId of household.memberIds) {
      const patientRef = adminDb.collection('patients').doc(patientId)
      batch.update(patientRef, {
        householdId: null,
        residenceType: null,
        lastModified: new Date().toISOString()
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
    logger.error('[API /households/[id] DELETE] Error deleting household', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete household' },
      { status: 500 }
    )
  }
}
