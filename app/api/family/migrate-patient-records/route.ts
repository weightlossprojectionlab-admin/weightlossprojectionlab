/**
 * Family Member Migration API
 *
 * POST /api/family/migrate-patient-records
 *
 * Backfill patient-level family member records for existing family members
 * This fixes the issue where family members don't see patients properly
 *
 * Authorization: Account Owner only
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import type { FamilyMember } from '@/types/medical'

interface MigrationResult {
  totalFamilyMembers: number
  recordsCreated: number
  recordsSkipped: number
  errors: string[]
  details: {
    memberId: string
    memberName: string
    patientsProcessed: number
    recordsCreatedForMember: number
  }[]
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch (error) {
      logger.error('[API /family/migrate-patient-records POST] Token verification failed', error as Error)
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    const userId = decodedToken.uid

    // Step 2: Verify user is account owner
    const userDoc = await adminDb.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()
    const isAccountOwner = userData?.preferences?.isAccountOwner === true

    if (!isAccountOwner) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Only Account Owners can run migrations' },
        { status: 403 }
      )
    }

    logger.info('[API /family/migrate-patient-records POST] Starting migration', { userId })

    const result: MigrationResult = {
      totalFamilyMembers: 0,
      recordsCreated: 0,
      recordsSkipped: 0,
      errors: [],
      details: []
    }

    // Step 3: Get all family members for this account owner
    const familyMembersSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('familyMembers')
      .where('status', '==', 'accepted')
      .get()

    result.totalFamilyMembers = familyMembersSnapshot.docs.length

    logger.info('[API /family/migrate-patient-records POST] Found family members', {
      count: result.totalFamilyMembers
    })

    // Step 4: For each family member, backfill patient-level records
    for (const memberDoc of familyMembersSnapshot.docs) {
      const member = { id: memberDoc.id, ...memberDoc.data() } as FamilyMember
      const patientsAccess = member.patientsAccess || []

      let recordsCreatedForMember = 0

      logger.debug('[API /family/migrate-patient-records POST] Processing member', {
        memberId: member.id,
        memberName: member.name,
        patientsAccessCount: patientsAccess.length
      })

      // Process each patient this member has access to
      for (const patientId of patientsAccess) {
        try {
          // Check if patient exists
          const patientDoc = await adminDb
            .collection('users')
            .doc(userId)
            .collection('patients')
            .doc(patientId)
            .get()

          if (!patientDoc.exists) {
            logger.warn('[API /family/migrate-patient-records POST] Patient not found', {
              patientId,
              memberId: member.id
            })
            result.errors.push(`Patient ${patientId} not found for member ${member.name}`)
            continue
          }

          // Check if patient-level family member record already exists
          const patientFamilyMemberRef = adminDb
            .collection('users')
            .doc(userId)
            .collection('patients')
            .doc(patientId)
            .collection('familyMembers')
            .doc(member.id)

          const existingDoc = await patientFamilyMemberRef.get()

          if (existingDoc.exists) {
            logger.debug('[API /family/migrate-patient-records POST] Record already exists, skipping', {
              patientId,
              memberId: member.id
            })
            result.recordsSkipped++
            continue
          }

          // Create the patient-level family member record
          await patientFamilyMemberRef.set({
            userId: member.userId,
            email: member.email,
            name: member.name,
            relationship: member.relationship || 'family',
            permissions: member.permissions || {},
            status: 'accepted',
            addedAt: member.acceptedAt || member.invitedAt || new Date().toISOString(),
            addedBy: member.invitedBy || userId,
            lastModified: new Date().toISOString(),
            _migratedAt: new Date().toISOString() // Mark as migrated
          })

          recordsCreatedForMember++
          result.recordsCreated++

          logger.debug('[API /family/migrate-patient-records POST] Record created', {
            patientId,
            memberId: member.id
          })
        } catch (err: any) {
          const errorMsg = `Error processing patient ${patientId} for member ${member.name}: ${err.message}`
          logger.error('[API /family/migrate-patient-records POST] Error processing patient', err, {
            patientId,
            memberId: member.id
          })
          result.errors.push(errorMsg)
        }
      }

      result.details.push({
        memberId: member.id,
        memberName: member.name,
        patientsProcessed: patientsAccess.length,
        recordsCreatedForMember
      })
    }

    logger.info('[API /family/migrate-patient-records POST] Migration completed', {
      userId,
      totalFamilyMembers: result.totalFamilyMembers,
      recordsCreated: result.recordsCreated,
      recordsSkipped: result.recordsSkipped,
      errorsCount: result.errors.length
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: `Migration completed. Created ${result.recordsCreated} records, skipped ${result.recordsSkipped} existing records.`
    })
  } catch (error: any) {
    logger.error('[API /family/migrate-patient-records POST] Migration failed', error as Error)
    return NextResponse.json(
      { success: false, error: error.message || 'Migration failed' },
      { status: 500 }
    )
  }
}
