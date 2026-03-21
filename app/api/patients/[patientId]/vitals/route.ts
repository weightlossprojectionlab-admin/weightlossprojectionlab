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
import { validateVitalDate, isVitalBackdated } from '@/lib/vital-date-validator'
import { checkDuplicateVital } from '@/lib/services/vital-service'

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
    logger.error('[API /patients/[id]/vitals GET] Error fetching vitals', error as Error)
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

    const { userId, ownerUserId, role, familyRole } = authResult as AssertPatientAccessResult

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

    // Get patient data for date validation
    const patientDoc = await patientRef.get()
    if (!patientDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      )
    }

    const patientData = patientDoc.data()
    const patientCreatedAt = patientData?.createdAt || new Date().toISOString()

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
    const now = new Date().toISOString()
    const recordedAtDate = vitalData.recordedAt ? new Date(vitalData.recordedAt) : new Date()

    // DEBUG: Log incoming date
    logger.debug('[API /patients/[id]/vitals POST] Date received', {
      recordedAtOriginal: vitalData.recordedAt,
      recordedAtDate: recordedAtDate.toISOString(),
      recordedAtDateLocal: recordedAtDate.toLocaleString()
    })

    // Validate recording date (DRY - use service layer)
    // TODO: Get user's actual plan tier from subscription data
    const userPlanTier = 'free' // Default to free tier for now
    const dateValidation = validateVitalDate(
      recordedAtDate,
      new Date(patientCreatedAt),
      userPlanTier,
      new Date()
    )

    // DEBUG: Log normalized date
    logger.debug('[API /patients/[id]/vitals POST] Date normalized', {
      normalizedDate: dateValidation.normalizedDate?.toISOString(),
      normalizedDateLocal: dateValidation.normalizedDate?.toLocaleString()
    })

    if (!dateValidation.isValid) {
      logger.warn('[API /patients/[id]/vitals POST] Invalid recording date', {
        userId,
        patientId,
        recordedAt: vitalData.recordedAt,
        error: dateValidation.error
      })
      return NextResponse.json(
        {
          success: false,
          error: dateValidation.error || 'Invalid recording date'
        },
        { status: 400 }
      )
    }

    // Check for duplicates (DRY - use service layer)
    const existingVitalsSnapshot = await patientRef
      .collection('vitals')
      .where('type', '==', vitalData.type)
      .get()

    const existingVitals: VitalSign[] = existingVitalsSnapshot.docs.map(doc => ({
      id: doc.id,
      patientId,
      ...doc.data()
    } as VitalSign))

    const duplicateCheck = checkDuplicateVital(
      existingVitals,
      vitalData.type,
      recordedAtDate
    )

    if (duplicateCheck.isDuplicate) {
      logger.warn('[API /patients/[id]/vitals POST] Duplicate vital detected', {
        userId,
        patientId,
        vitalType: vitalData.type,
        recordedAt: vitalData.recordedAt,
        existingVitalId: duplicateCheck.existingVital?.id
      })
      return NextResponse.json(
        {
          success: false,
          error: duplicateCheck.message || 'A vital entry already exists for this date',
          isDuplicate: true,
          existingVital: duplicateCheck.existingVital
        },
        { status: 409 }
      )
    }

    // Create vital sign document
    const vitalId = uuidv4()
    const normalizedRecordedAt = dateValidation.normalizedDate!.toISOString()
    const isBackdated = isVitalBackdated(recordedAtDate, new Date())

    // Determine approval status for weight entries
    // Onboarding writes directly to PatientProfile (bypasses this API)
    // Post-onboarding: only trusted roles (owner, co_admin, caregiver) auto-approve
    function determineApprovalStatus(): 'approved' | 'pending' {
      if (vitalData.type !== 'weight') return 'approved'
      if (role === 'owner') return 'approved'
      if (familyRole === 'account_owner' || familyRole === 'co_admin') return 'approved'
      if (familyRole === 'caregiver') return 'approved'
      return 'pending'
    }
    const approvalStatus = determineApprovalStatus()

    const newVital: VitalSign = {
      id: vitalId,
      patientId,
      ...vitalData,
      recordedAt: normalizedRecordedAt, // User-selected date (normalized to UTC midnight)
      loggedAt: now, // System timestamp when entry was created
      loggedBy: userId, // Who created the entry
      isBackdated, // True if logged > 1 hour after recorded
      daysDifference: dateValidation.daysDifference || 0, // Days between recorded and logged (HIPAA audit)
      takenBy: userId,
      method: vitalData.method || 'manual',
      // Approval workflow
      approvalStatus,
      ...(approvalStatus === 'approved' ? { approvedBy: userId, approvedAt: now } : {}),
      // Audit trail
      createdAt: now,
      lastModifiedBy: userId,
      lastModifiedAt: now,
      modificationHistory: []
    }

    const vitalRef = patientRef.collection('vitals').doc(vitalId)
    await vitalRef.set(newVital)

    // Sync approved weight to patient profile (keeps currentWeight fresh)
    if (newVital.type === 'weight' && approvalStatus === 'approved' && typeof newVital.value === 'number') {
      const patientDoc = await patientRef.get()
      const patientData = patientDoc.data()
      const profileUpdate: Record<string, any> = {
        currentWeight: newVital.value,
        weightUnit: newVital.unit || 'lbs',
      }
      // Set goals.startWeight only if not already set (preserve original baseline)
      if (!patientData?.goals?.startWeight || patientData.goals.startWeight <= 0) {
        profileUpdate['goals.startWeight'] = newVital.value
      }
      await patientRef.update(profileUpdate)
      logger.info('[API /patients/[id]/vitals POST] Patient profile weight synced', {
        patientId, currentWeight: newVital.value
      })
    }

    logger.info('[API /patients/[id]/vitals POST] Vital sign logged successfully', {
      userId,
      ownerUserId,
      patientId,
      vitalId,
      type: newVital.type,
      approvalStatus
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
      // Vital Alert — send urgent notification for abnormal readings
      const isAbnormal = detectAbnormalVital(newVital)
      if (isAbnormal) {
        await sendNotificationToFamilyMembers({
          userId: '',
          patientId,
          type: 'vital_alert',
          priority: 'urgent',
          title: `Vital Alert: ${newVital.type.replace(/_/g, ' ')}`,
          message: 'Abnormal reading detected',
          excludeUserId: userId,
          actionUrl: `/patients/${patientId}`,
          metadata: {
            vitalId: vitalRef.id,
            actionBy: userName,
            actionByUserId: userId,
            patientName: patientSnapshot.data()?.name || 'Patient',
            vitalType: newVital.type,
            value: formattedValue,
            unit: newVital.unit || '',
            isAbnormal: true,
            abnormalReason: isAbnormal
          }
        })
      }

      // Weight Approval — notify family when entry needs approval
      if (approvalStatus === 'pending') {
        await sendNotificationToFamilyMembers({
          userId: '',
          patientId,
          type: 'weight_approval_needed',
          priority: 'normal',
          title: 'Weight Entry Needs Approval',
          message: 'A weight entry requires approval',
          excludeUserId: userId,
          actionUrl: `/patients/${patientId}`,
          metadata: {
            vitalId: vitalRef.id,
            patientName: patientSnapshot.data()?.name || 'Patient',
            weight: typeof newVital.value === 'number' ? newVital.value : 0,
            unit: ((newVital as any).unit || 'lbs') as 'lbs' | 'kg',
            submittedBy: userName,
            submittedByUserId: userId,
            actionBy: userName,
            actionByUserId: userId
          }
        })
      }
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
    logger.error('[API /patients/[id]/vitals POST] Error logging vital sign', error as Error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to log vital sign' },
      { status: 500 }
    )
  }
}

/**
 * Detect abnormal vital readings using standard reference ranges.
 * Returns a human-readable reason string if abnormal, or null if normal.
 */
function detectAbnormalVital(vital: any): string | null {
  const value = vital.value

  switch (vital.type) {
    case 'blood_pressure': {
      const systolic = vital.systolic || value?.systolic
      const diastolic = vital.diastolic || value?.diastolic
      if (systolic >= 140 || diastolic >= 90) return `reading is elevated (${systolic}/${diastolic} mmHg)`
      if (systolic < 90 || diastolic < 60) return `reading is low (${systolic}/${diastolic} mmHg)`
      return null
    }
    case 'blood_sugar':
      if (value > 125) return 'reading is elevated'
      if (value < 70) return 'reading is low'
      return null
    case 'temperature': {
      const unit = vital.unit === 'celsius' ? 'C' : 'F'
      if (unit === 'F' && value > 100.4) return 'fever detected'
      if (unit === 'F' && value < 95) return 'reading is low (hypothermia risk)'
      if (unit === 'C' && value > 38) return 'fever detected'
      if (unit === 'C' && value < 35) return 'reading is low (hypothermia risk)'
      return null
    }
    case 'pulse_oximeter':
      if (value < 90) return 'oxygen saturation is critically low'
      if (value < 95) return 'oxygen saturation is below normal'
      return null
    case 'heart_rate':
      if (value > 100) return 'heart rate is elevated (tachycardia)'
      if (value < 60) return 'heart rate is low (bradycardia)'
      return null
    default:
      return null
  }
}
