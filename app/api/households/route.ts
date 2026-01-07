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

    // Validate required fields
    if (!body.name || !body.address?.street || !body.address?.city || !body.address?.state) {
      return NextResponse.json(
        { error: 'Missing required fields: name and complete address required' },
        { status: 400 }
      )
    }

    // Verify caregiver has access to all specified patients
    if (body.memberIds && body.memberIds.length > 0) {
      for (const patientId of body.memberIds) {
        const patientDoc = await adminDb.collection('patients').doc(patientId).get()

        if (!patientDoc.exists) {
          return NextResponse.json(
            { error: `Patient not found: ${patientId}` },
            { status: 404 }
          )
        }

        const patientData = patientDoc.data()
        if (patientData?.userId !== caregiverId) {
          return NextResponse.json(
            { error: `Unauthorized: You do not have access to patient ${patientId}` },
            { status: 403 }
          )
        }
      }
    }

    // Create household
    const householdRef = adminDb.collection('households').doc()
    const now = new Date().toISOString()

    const household: Household = {
      id: householdRef.id,
      name: body.name,
      nickname: body.nickname,
      address: body.address,
      memberIds: body.memberIds || [],
      primaryResidentId: body.primaryResidentId,
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

    // Remove undefined values before saving to Firestore
    const cleanedHousehold: any = {}
    for (const [key, value] of Object.entries(household)) {
      if (value !== undefined) {
        cleanedHousehold[key] = value
      }
    }

    await householdRef.set(cleanedHousehold)

    // Update patient profiles with householdId
    const batch = adminDb.batch()
    for (const patientId of household.memberIds) {
      const patientRef = adminDb.collection('patients').doc(patientId)
      batch.update(patientRef, {
        householdId: household.id,
        residenceType: patientId === body.primaryResidentId ? 'full_time' : 'full_time',
        lastModified: now
      })
    }
    await batch.commit()

    logger.info('[Households API] Created household', {
      householdId: household.id,
      caregiverId,
      memberCount: household.memberIds.length
    })

    return NextResponse.json({
      success: true,
      household
    }, { status: 201 })
  } catch (error: any) {
    logger.error('[API /households POST] Error creating household', error as Error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create household' },
      { status: 500 }
    )
  }
}
