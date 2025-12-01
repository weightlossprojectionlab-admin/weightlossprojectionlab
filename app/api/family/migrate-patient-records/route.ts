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
import { errorResponse } from '@/lib/api-response'

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
    return errorResponse(error, {
      route: '/api/family/migrate-patient-records',
      operation: 'create'
    })
  }
}
