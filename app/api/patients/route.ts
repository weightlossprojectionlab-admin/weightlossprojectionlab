/**
 * API Route: /api/patients
 *
 * Handles CRUD operations for patient profiles
 * GET - List all patients for the authenticated user
 * POST - Create a new patient profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { patientProfileFormSchema } from '@/lib/validations/medical'
import type { PatientProfile } from '@/types/medical'
import { v4 as uuidv4 } from 'uuid'

// GET /api/patients - List all patients for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Extract and verify auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('[API /patients GET] Missing or invalid Authorization header')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    logger.debug('[API /patients GET] Fetching patients', { userId })

    // 1. Fetch patients owned by this user
    const ownedPatientsRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')

    const ownedSnapshot = await ownedPatientsRef.get()
    const ownedPatients = ownedSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      _source: 'owned' // Mark as owned patient
    }))

    logger.debug('[API /patients GET] Owned patients fetched', { count: ownedPatients.length })

    // 2. Check if user is a family member with access to other patients
    const familyMembersSnapshot = await adminDb
      .collectionGroup('familyMembers')
      .where('userId', '==', userId)
      .where('status', '==', 'accepted')
      .get()

    const caregiverPatients: PatientProfile[] = []

    // For each family member record, fetch patients from patientsAccess
    for (const familyMemberDoc of familyMembersSnapshot.docs) {
      const familyMember = familyMemberDoc.data()
      const patientsAccess = familyMember.patientsAccess || []

      // Extract owner userId from family member document path
      // Path format: users/{ownerUserId}/familyMembers/{memberId}
      const ownerUserId = familyMemberDoc.ref.parent.parent?.id

      if (!ownerUserId) {
        logger.warn('[API /patients GET] Unable to extract owner from family member path', {
          familyMemberId: familyMemberDoc.id,
          path: familyMemberDoc.ref.path
        })
        continue
      }

      logger.debug('[API /patients GET] Found family member record', {
        familyMemberId: familyMemberDoc.id,
        ownerUserId,
        patientsAccessCount: patientsAccess.length
      })

      // Fetch each patient in patientsAccess from the owner's patients collection
      for (const patientId of patientsAccess) {
        try {
          const patientDoc = await adminDb
            .collection('users')
            .doc(ownerUserId)
            .collection('patients')
            .doc(patientId)
            .get()

          if (patientDoc.exists) {
            caregiverPatients.push({
              id: patientDoc.id,
              ...patientDoc.data(),
              _source: 'caregiver', // Mark as caregiver access
              _permissions: familyMember.permissions // Include permissions
            } as any)
          } else {
            logger.warn('[API /patients GET] Patient not found in owner collection', {
              ownerUserId,
              patientId
            })
          }
        } catch (err) {
          logger.warn('[API /patients GET] Failed to fetch caregiver patient', {
            ownerUserId,
            patientId,
            error: err
          })
        }
      }
    }

    logger.debug('[API /patients GET] Caregiver patients fetched', { count: caregiverPatients.length })

    // 3. Combine both lists and filter deleted patients
    const allPatients = [...ownedPatients, ...caregiverPatients]
      .filter((patient: any) => patient.name !== '[DELETED USER]')

    logger.info('[API /patients GET] All patients fetched successfully', {
      userId,
      total: allPatients.length,
      owned: ownedPatients.length,
      caregiver: caregiverPatients.length
    })

    // Return with _source field preserved (TypeScript will strip it if we cast to PatientProfile)
    return NextResponse.json({
      success: true,
      data: allPatients
    })

  } catch (error: any) {
    logger.error('[API /patients GET] Error fetching patients', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch patients' },
      { status: 500 }
    )
  }
}

// POST /api/patients - Create a new patient profile
export async function POST(request: NextRequest) {
  try {
    // Extract and verify auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('[API /patients POST] Missing or invalid Authorization header')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Parse and validate request body
    const body = await request.json()
    logger.debug('[API /patients POST] Request body', { body })

    const validationResult = patientProfileFormSchema.safeParse(body)
    if (!validationResult.success) {
      logger.warn('[API /patients POST] Validation failed', {
        errors: validationResult.error.format()
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.format()
        },
        { status: 400 }
      )
    }

    const patientData = validationResult.data

    // Check patient limit based on subscription
    // Get user document to check subscription
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const subscription = userData?.subscription

    // Count existing patients (exclude deleted patients)
    const patientsSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .get()

    const currentPatientCount = patientsSnapshot.docs
      .filter(doc => doc.data().name !== '[DELETED USER]')
      .length

    // Check if user can add more patients
    const maxPatients = subscription?.maxPatients || 1 // Default to 1 if no subscription

    if (currentPatientCount >= maxPatients) {
      logger.warn('[API /patients POST] Patient limit reached', {
        userId,
        current: currentPatientCount,
        max: maxPatients,
        plan: subscription?.plan || 'none'
      })

      return NextResponse.json(
        {
          success: false,
          error: 'PATIENT_LIMIT_REACHED',
          message: 'You have reached your patient limit. Upgrade to Family Plan to add more family members.',
          current: currentPatientCount,
          max: maxPatients,
          suggestedUpgrade: 'family'
        },
        { status: 403 }
      )
    }

    // Create patient document
    const patientId = uuidv4()
    const now = new Date().toISOString()

    // Extract weight data before creating patient profile
    const { currentWeight, weightUnit, ...profileData } = patientData as any

    const newPatient: PatientProfile = {
      id: patientId,
      userId,
      ...profileData,
      createdAt: now,
      lastModified: now
    }

    const patientRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)

    await patientRef.set(newPatient)

    // Create initial weight log if currentWeight provided
    if (currentWeight) {
      const weightLogRef = patientRef.collection('weight-logs').doc()
      await weightLogRef.set({
        weight: currentWeight,
        unit: weightUnit || 'lbs',
        loggedAt: now,
        source: 'initial',
        tags: ['baseline'],
        createdAt: now
      })

      logger.info('[API /patients POST] Initial weight log created', {
        patientId,
        weight: currentWeight,
        unit: weightUnit
      })
    }

    logger.info('[API /patients POST] Patient created successfully', {
      userId,
      patientId,
      type: newPatient.type,
      name: newPatient.name,
      vitalsComplete: newPatient.vitalsComplete || false
    })

    return NextResponse.json({
      success: true,
      data: newPatient
    }, { status: 201 })

  } catch (error: any) {
    logger.error('[API /patients POST] Error creating patient', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create patient' },
      { status: 500 }
    )
  }
}
