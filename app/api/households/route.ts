/**
 * API Route: Households
 *
 * GET /api/households - List caregiver's households
 * POST /api/households - Create new household
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import type { Household, HouseholdFormData } from '@/types/household'

/**
 * GET /api/households
 * Get all households managed by the authenticated caregiver
 */
export async function GET(request: NextRequest) {
  try {
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
    const caregiverId = decodedToken.uid

    // Query households where user is primary caregiver
    const householdsQuery = await adminDb
      .collection('households')
      .where('primaryCaregiverId', '==', caregiverId)
      .where('isActive', '==', true)
      .get()

    const households: Household[] = householdsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Household))

    // Also check for households where user is additional caregiver
    const additionalHouseholdsQuery = await adminDb
      .collection('households')
      .where('additionalCaregiverIds', 'array-contains', caregiverId)
      .where('isActive', '==', true)
      .get()

    const additionalHouseholds: Household[] = additionalHouseholdsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Household))

    // Merge and deduplicate
    const allHouseholds = [...households]
    for (const household of additionalHouseholds) {
      if (!allHouseholds.find(h => h.id === household.id)) {
        allHouseholds.push(household)
      }
    }

    // Sort by name client-side
    allHouseholds.sort((a, b) => a.name.localeCompare(b.name))

    logger.info('[Households API] Fetched households', {
      caregiverId,
      count: allHouseholds.length
    })

    return NextResponse.json({
      success: true,
      households: allHouseholds
    })
  } catch (error: any) {
    logger.error('[API /households GET] Error fetching households', error as Error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch households' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/households
 * Create a new household
 */
export async function POST(request: NextRequest) {
  try {
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
    const caregiverId = decodedToken.uid

    // Parse request body
    const body: HouseholdFormData = await request.json()

    // Validation: a household needs a name and at least one resident.
    // Address is optional — kitchen/shopping logic works on the
    // household + its members; the address is informational metadata
    // for future geo-aware shopping. Empty households are not a thing
    // (semantically a vacant building).
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: 'Household name is required' },
        { status: 400 }
      )
    }
    const memberIds = body.memberIds ?? []
    if (memberIds.length === 0) {
      return NextResponse.json(
        { error: 'A household must have at least one member' },
        { status: 400 }
      )
    }

    // Verify caregiver owns each declared member. Patients live at
    // users/{ownerUserId}/patients/{patientId} (nested) — if a doc
    // exists at the caregiver's nested path, ownership is implicit.
    for (const patientId of memberIds) {
      const patientDoc = await adminDb
        .collection('users').doc(caregiverId)
        .collection('patients').doc(patientId)
        .get()

      if (!patientDoc.exists) {
        return NextResponse.json(
          { error: `Patient not found: ${patientId}` },
          { status: 404 }
        )
      }
    }

    // Create household doc. Note: no memberIds, no primaryResidentId.
    // Membership is a property of the patient (Patient.householdId),
    // not the household. "Who lives here?" is a patient query.
    const householdRef = adminDb.collection('households').doc()
    const now = new Date().toISOString()

    const householdDoc: any = {
      id: householdRef.id,
      name: body.name.trim(),
      primaryCaregiverId: caregiverId,
      kitchenConfig: body.kitchenConfig || {
        hasSharedInventory: true,
        separateShoppingLists: false
      },
      createdBy: caregiverId,
      createdAt: now,
      updatedAt: now,
      isActive: true
    }
    if (body.nickname) householdDoc.nickname = body.nickname.trim()
    if (body.address?.street || body.address?.city || body.address?.state) {
      householdDoc.address = body.address
    }

    await householdRef.set(householdDoc)

    // Cascade Patient.householdId onto each new member. Single-field
    // assignment naturally enforces single-residence-per-patient: any
    // patient previously in another household has their householdId
    // overwritten here, atomically moving them. No cleanup of an old
    // memberIds[] array is needed because that array no longer exists.
    const batch = adminDb.batch()
    for (const patientId of memberIds) {
      const patientRef = adminDb
        .collection('users').doc(caregiverId)
        .collection('patients').doc(patientId)
      batch.update(patientRef, {
        householdId: householdRef.id,
        lastModified: now
      })
    }
    await batch.commit()

    logger.info('[Households API] Created household', {
      householdId: householdRef.id,
      caregiverId,
      memberCount: memberIds.length
    })

    return NextResponse.json({
      success: true,
      household: householdDoc
    }, { status: 201 })
  } catch (error: any) {
    logger.error('[API /households POST] Error creating household', error as Error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create household' },
      { status: 500 }
    )
  }
}
