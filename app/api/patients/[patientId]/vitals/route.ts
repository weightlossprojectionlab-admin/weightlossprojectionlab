/**
 * API Route: /api/patients/[patientId]/vitals
 *
 * Handles vital sign operations for a specific patient
 * GET - List all vital signs for the patient (with optional filtering)
 * POST - Log a new vital sign reading
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { vitalSignFormSchema } from '@/lib/validations/medical'
import { assertPatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import type { VitalSign } from '@/types/medical'
import { v4 as uuidv4 } from 'uuid'
import { sendNotificationToFamilyMembers } from '@/lib/notification-service'

// GET /api/patients/[patientId]/vitals - List vital signs with optional filtering
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params
    const { searchParams } = new URL(request.url)

    // Check authorization and get owner userId
    const authResult = await assertPatientAccess(request, patientId, 'viewVitals')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { userId, ownerUserId, role } = authResult as AssertPatientAccessResult

    // Check rate limit (per-user)
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /patients/[id]/vitals GET] Rate limit exceeded', { userId, patientId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    // Parse query parameters
    const type = searchParams.get('type')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    logger.debug('[API /patients/[id]/vitals GET] Fetching vitals', {
      userId,
      ownerUserId,
      patientId,
      role,
      type,
      limit,
      startDate,
      endDate
    })

    // Get patient reference
    const patientRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)

    // Build query
    let vitalsQuery = patientRef
      .collection('vitals')
      .orderBy('recordedAt', 'desc')

    // Apply filters
    if (type) {
      vitalsQuery = vitalsQuery.where('type', '==', type)
    }

    if (startDate) {
      vitalsQuery = vitalsQuery.where('recordedAt', '>=', startDate)
    }

    if (endDate) {
      vitalsQuery = vitalsQuery.where('recordedAt', '<=', endDate)
    }

    if (limit) {
      vitalsQuery = vitalsQuery.limit(limit)
    }

    // Execute query
    const snapshot = await vitalsQuery.get()

    const vitals: VitalSign[] = snapshot.docs.map(doc => ({
      id: doc.id,
      patientId,
      ...doc.data()
    })) as VitalSign[]

    logger.info('[API /patients/[id]/vitals GET] Vitals fetched successfully', {
      userId,
      ownerUserId,
      patientId,
      count: vitals.length
    })

    return NextResponse.json({
      success: true,
      data: vitals
    })

  } catch (error: any) {
    logger.error('[API /patients/[id]/vitals GET] Error fetching vitals', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch vitals' },
      { status: 500 }
    )
  }
}

// POST /api/patients/[patientId]/vitals - Log a new vital sign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

    // Check authorization and get owner userId
    const authResult = await assertPatientAccess(request, patientId, 'logVitals')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { userId, ownerUserId, role } = authResult as AssertPatientAccessResult

    // Check rate limit (per-user)
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /patients/[id]/vitals POST] Rate limit exceeded', { userId, patientId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    logger.debug('[API /patients/[id]/vitals POST] Request body', { body, userId, ownerUserId, role })

    // Get patient reference
    const patientRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)

    // Validate vital sign data
    const validationResult = vitalSignFormSchema.safeParse(body)
    if (!validationResult.success) {
      logger.warn('[API /patients/[id]/vitals POST] Validation failed', {
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

    const vitalData = validationResult.data

    // Create vital sign document
    const vitalId = uuidv4()
    const now = new Date().toISOString()

    const newVital: VitalSign = {
      id: vitalId,
      patientId,
      ...vitalData,
      recordedAt: vitalData.recordedAt || now,
      takenBy: userId,
      method: vitalData.method || 'manual',
      // Audit trail
      createdAt: now,
      lastModifiedBy: userId,
      lastModifiedAt: now,
      modificationHistory: []
    }

    const vitalRef = patientRef.collection('vitals').doc(vitalId)
    await vitalRef.set(newVital)

    logger.info('[API /patients/[id]/vitals POST] Vital sign logged successfully', {
      userId,
      ownerUserId,
      patientId,
      vitalId,
      type: newVital.type
    })

    // Trigger notification to family members
    try {
      // Get patient and user info for notification
      const patientSnapshot = await patientRef.get()
      const userDoc = await adminDb.collection('users').doc(userId).get()
      const userName = userDoc.exists ? userDoc.data()?.name || userDoc.data()?.email : 'Unknown User'

      // Format vital value for display
      let formattedValue = ''
      if (newVital.type === 'blood_pressure') {
        const systolic = (newVital as any).systolic || (newVital.value as any)?.systolic || 'N/A'
        const diastolic = (newVital as any).diastolic || (newVital.value as any)?.diastolic || 'N/A'
        formattedValue = `${systolic}/${diastolic} mmHg`
      } else if (newVital.type === 'blood_sugar') {
        formattedValue = `${newVital.value} mg/dL`
      } else if (newVital.type === 'pulse_oximeter') {
        formattedValue = `${newVital.value}%`
      } else if (newVital.type === 'temperature') {
        formattedValue = `${newVital.value}°${(newVital as any).unit === 'celsius' ? 'C' : 'F'}`
      } else if (newVital.type === 'weight') {
        formattedValue = `${newVital.value} ${(newVital as any).unit}`
      } else {
        formattedValue = `${newVital.value || 'N/A'}`
      }

      await sendNotificationToFamilyMembers({
        userId: '', // Will be overridden for each recipient
        patientId,
        type: 'vital_logged',
        priority: 'normal',
        title: 'Vital Sign Logged',
        message: `${userName} logged vital sign`,
        excludeUserId: userId,
        metadata: {
          vitalId: vitalRef.id,
          actionBy: userName,
          actionByUserId: userId,
          patientName: patientSnapshot.data()?.name || 'Patient',
          vitalType: newVital.type,
          value: formattedValue,
          unit: newVital.unit || ''
        }
      })
    } catch (notificationError) {
      // Log error but don't fail the main operation
      logger.error('[API /patients/[id]/vitals POST] Error sending notification', notificationError as Error, {
        patientId,
        vitalId
      })
    }

    return NextResponse.json({
      success: true,
      data: newVital
    }, { status: 201 })

  } catch (error: any) {
    logger.error('[API /patients/[id]/vitals POST] Error logging vital sign', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to log vital sign' },
      { status: 500 }
    )
  }
}
