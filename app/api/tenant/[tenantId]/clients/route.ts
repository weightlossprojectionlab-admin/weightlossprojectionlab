/**
 * POST /api/tenant/[tenantId]/clients
 *
 * Professional client intake endpoint. Creates:
 *   1. Firebase Auth user (get-or-create)
 *   2. Firestore user doc with managedBy + onboardingCompleted
 *   3. Patient profile with full medical history, insurance, goals
 *   4. Transactional seat increment on the tenant doc
 *   5. Audit log entry
 *
 * All in one call so the franchise intake wizard submits once.
 *
 * Auth: verifyTenantStaffOrAdminAuth — admin or staff can intake clients.
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { verifyTenantStaffOrAdminAuth } from '@/lib/tenant-auth'
import { logAdminAction } from '@/lib/admin/audit'
import { getPlanLimits } from '@/lib/franchise-plans'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ tenantId: string }>
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId } = await context.params
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const verification = await verifyTenantStaffOrAdminAuth(request.headers.get('authorization'))
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error || 'Forbidden' }, { status: 403 })
    }
    if (!verification.isSuperAdmin && verification.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Forbidden — wrong tenant' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))

    // ── Validate required fields ──
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!name) return NextResponse.json({ error: 'Client name is required' }, { status: 400 })
    if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })

    // ── Check tenant exists ──
    const tenantRef = adminDb.collection('tenants').doc(tenantId)
    const tenantSnap = await tenantRef.get()
    if (!tenantSnap.exists) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // ── Get-or-create Firebase Auth user ──
    let userRecord
    try {
      userRecord = await adminAuth.getUserByEmail(email)
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') {
        userRecord = await adminAuth.createUser({
          email,
          emailVerified: false,
          displayName: name,
        })
      } else {
        throw err
      }
    }

    const uid = userRecord.uid
    const nowIso = new Date().toISOString()

    // ── Transactional: create user doc + patient + attach + seat increment ──
    const userRef = adminDb.collection('users').doc(uid)

    let patientId: string | null = null
    try {
      await adminDb.runTransaction(async tx => {
        const userSnap = await tx.get(userRef)
        const tenantTxSnap = await tx.get(tenantRef)
        if (!tenantTxSnap.exists) throw new Error('TENANT_GONE')

        const tenantData = tenantTxSnap.data() as any

        // Seat limit check
        const currentFamilies: number = tenantData?.billing?.currentFamilies || 0
        const snapshotMax: number | undefined = tenantData?.billing?.maxFamilies
        const limit =
          typeof snapshotMax === 'number' && snapshotMax >= 0
            ? snapshotMax
            : getPlanLimits(tenantData?.billing?.plan).maxFamilies
        if (limit !== -1 && currentFamilies >= limit) {
          throw new Error('FAMILY_LIMIT')
        }

        // Create or update user doc
        if (!userSnap.exists) {
          tx.set(userRef, {
            email,
            name,
            preferences: { units: 'imperial', notifications: true, biometricEnabled: false, themePreference: 'system' },
            profile: { onboardingCompleted: true },
            managedBy: [tenantId],
            managedByUpdatedAt: nowIso,
            createdAt: new Date(),
            lastActiveAt: new Date(),
          })
        } else {
          const userData = userSnap.data() as any
          const existing: string[] = Array.isArray(userData?.managedBy) ? userData.managedBy : []
          if (existing.length > 0 && !existing.includes(tenantId)) {
            throw new Error('OTHER_TENANT')
          }
          if (!existing.includes(tenantId)) {
            tx.update(userRef, {
              managedBy: FieldValue.arrayUnion(tenantId),
              managedByUpdatedAt: nowIso,
              name: name, // Update name to what the franchise owner entered
            })
          }
          // Ensure onboarding is marked complete
          if (!userData?.profile?.onboardingCompleted) {
            tx.update(userRef, { 'profile.onboardingCompleted': true })
          }
        }

        // Create patient profile
        const patientRef = userRef.collection('patients').doc()
        patientId = patientRef.id

        const patient: Record<string, any> = {
          userId: uid,
          type: 'human',
          name,
          dateOfBirth: body.dateOfBirth || '',
          gender: body.gender || '',
          relationship: body.relationship || 'client',
          // Health
          healthConditions: Array.isArray(body.healthConditions) ? body.healthConditions : [],
          foodAllergies: Array.isArray(body.foodAllergies) ? body.foodAllergies : [],
          activityLevel: body.activityLevel || '',
          // Measurements
          currentWeight: typeof body.currentWeight === 'number' ? body.currentWeight : undefined,
          weightUnit: body.weightUnit || 'lbs',
          height: typeof body.height === 'number' ? body.height : undefined,
          heightUnit: body.heightUnit || 'imperial',
          targetWeight: typeof body.targetWeight === 'number' ? body.targetWeight : undefined,
          // Goals
          goals: {
            targetWeight: typeof body.targetWeight === 'number' ? body.targetWeight : undefined,
            startWeight: typeof body.currentWeight === 'number' ? body.currentWeight : undefined,
            dailyCalorieGoal: typeof body.dailyCalorieGoal === 'number' ? body.dailyCalorieGoal : undefined,
            dailyStepGoal: typeof body.dailyStepGoal === 'number' ? body.dailyStepGoal : undefined,
          },
          // Insurance
          insuranceProvider: typeof body.insuranceProvider === 'string' ? body.insuranceProvider.trim() : '',
          insurancePolicyNumber: typeof body.insurancePolicyNumber === 'string' ? body.insurancePolicyNumber.trim() : '',
          // Emergency contact
          emergencyContacts: body.emergencyContactName ? [{
            id: `ec-${Date.now()}`,
            name: body.emergencyContactName || '',
            phone: body.emergencyContactPhone || '',
            relationship: body.emergencyContactRelationship || '',
            isPrimary: true,
          }] : [],
          // Care goals & preferences
          careGoals: Array.isArray(body.careGoals) ? body.careGoals : [],
          dietaryRestrictions: Array.isArray(body.dietaryRestrictions) ? body.dietaryRestrictions : [],
          practiceNotes: typeof body.practiceNotes === 'string' ? body.practiceNotes.trim().slice(0, 5000) : '',
          consentGiven: body.consentGiven === true,
          consentGivenAt: body.consentGiven === true ? nowIso : undefined,
          // Franchise tracking
          intakedByTenantId: tenantId,
          intakedByUid: verification.uid,
          intakedAt: nowIso,
          // Metadata
          countsAsSeat: true,
          addedBy: verification.uid,
          addedAt: nowIso,
          status: 'active',
          vitalsComplete: !!(body.currentWeight && body.height),
          createdAt: nowIso,
          lastModified: nowIso,
        }

        // Strip undefined values (Firestore doesn't accept undefined)
        for (const key of Object.keys(patient)) {
          if (patient[key] === undefined) delete patient[key]
        }
        if (patient.goals) {
          for (const key of Object.keys(patient.goals)) {
            if (patient.goals[key] === undefined) delete patient.goals[key]
          }
          if (Object.keys(patient.goals).length === 0) delete patient.goals
        }

        tx.set(patientRef, patient)

        // Seat increment (only if family wasn't already attached)
        const userData = userSnap.exists ? (userSnap.data() as any) : null
        const alreadyManaged = Array.isArray(userData?.managedBy) && userData.managedBy.includes(tenantId)
        if (!alreadyManaged) {
          tx.update(tenantRef, {
            'billing.currentFamilies': FieldValue.increment(1),
          })
        }

        // If weight provided, create initial weight log
        if (typeof body.currentWeight === 'number') {
          const weightRef = patientRef.collection('weight-logs').doc()
          tx.set(weightRef, {
            patientId: patientRef.id,
            userId: uid,
            weight: body.currentWeight,
            unit: body.weightUnit || 'lbs',
            loggedAt: nowIso,
            source: 'intake',
          })
        }
      })
    } catch (err: any) {
      const msg = err.message
      if (msg === 'TENANT_GONE') return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
      if (msg === 'FAMILY_LIMIT') return NextResponse.json({ error: 'Your family seat limit is reached. Upgrade your plan to add more clients.' }, { status: 402 })
      if (msg === 'OTHER_TENANT') return NextResponse.json({ error: 'This client is already managed by another practice.' }, { status: 409 })
      throw err
    }

    // Medications (created outside the transaction — they're subcollection docs
    // and not critical to the atomic seat increment)
    if (Array.isArray(body.medications) && body.medications.length > 0 && patientId) {
      const patientRef = userRef.collection('patients').doc(patientId)
      for (const med of body.medications.slice(0, 20)) {
        if (!med.name) continue
        await patientRef.collection('medications').add({
          patientId,
          userId: uid,
          name: med.name,
          dosage: med.dosage || '',
          frequency: med.frequency || '',
          status: 'active',
          prescribedBy: '',
          addedBy: verification.uid,
          createdAt: nowIso,
          lastModified: nowIso,
        })
      }
    }

    await logAdminAction({
      adminUid: verification.uid,
      adminEmail: verification.email,
      action: 'tenant_client_onboarded',
      targetType: 'user',
      targetId: uid,
      tenantId,
      changes: { email, name, patientId },
      reason: verification.isFranchiseAdmin
        ? 'franchise owner client intake'
        : verification.isSuperAdmin
        ? 'super-admin client intake'
        : 'franchise staff client intake',
    })

    revalidatePath('/tenant-shell/dashboard')
    revalidatePath('/tenant-shell/dashboard/families')

    logger.info('[tenant clients] client onboarded', {
      tenantId,
      uid,
      patientId,
      adminUid: verification.uid,
    })

    return NextResponse.json({
      success: true,
      userId: uid,
      patientId,
    })
  } catch (err) {
    logger.error('[tenant clients] POST failed', err as Error)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
