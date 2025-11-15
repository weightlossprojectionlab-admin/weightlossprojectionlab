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

    // Query all patients for this user
    const patientsRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')

    const snapshot = await patientsRef.get()

    const patients: PatientProfile[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PatientProfile[]

    logger.info('[API /patients GET] Patients fetched successfully', {
      userId,
      count: patients.length
    })

    return NextResponse.json({
      success: true,
      data: patients
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

    // Create patient document
    const patientId = uuidv4()
    const now = new Date().toISOString()

    const newPatient: PatientProfile = {
      id: patientId,
      userId,
      ...patientData,
      createdAt: now,
      lastModified: now
    }

    const patientRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)

    await patientRef.set(newPatient)

    logger.info('[API /patients POST] Patient created successfully', {
      userId,
      patientId,
      type: newPatient.type,
      name: newPatient.name
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
