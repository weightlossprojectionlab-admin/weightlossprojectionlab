import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { verifyAuthToken } from '@/lib/rbac-middleware'
import {
  HouseholdDuty,
  UpdateDutyRequest
} from '@/types/household-duties'
import { logger } from '@/lib/logger'

/**
 * GET /api/household-duties/[dutyId]
 * Get a specific household duty
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dutyId: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult || !authResult.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { dutyId } = await params
    const db = getAdminDb()

    const dutyDoc = await db.collection('household_duties').doc(dutyId).get()

    if (!dutyDoc.exists) {
      return NextResponse.json(
        { error: 'Duty not found' },
        { status: 404 }
      )
    }

    const duty = { id: dutyDoc.id, ...dutyDoc.data() } as HouseholdDuty

    // Verify user has access
    if (duty.userId !== authResult.userId && !duty.assignedTo.includes(authResult.userId)) {
      return NextResponse.json(
        { error: 'You do not have access to this duty' },
        { status: 403 }
      )
    }

    return NextResponse.json(duty)
  } catch (error) {
    const { dutyId } = await params
    logger.error('Error fetching household duty', error as Error, { dutyId })
    return NextResponse.json(
      { error: 'Failed to fetch household duty' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/household-duties/[dutyId]
 * Update a household duty
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ dutyId: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult || !authResult.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { dutyId } = await params
    const body: UpdateDutyRequest = await request.json()

    const db = getAdminDb()
    const dutyDoc = await db.collection('household_duties').doc(dutyId).get()

    if (!dutyDoc.exists) {
      return NextResponse.json(
        { error: 'Duty not found' },
        { status: 404 }
      )
    }

    const duty = dutyDoc.data() as HouseholdDuty

    // Only the creator can update the duty
    if (duty.userId !== authResult.userId) {
      return NextResponse.json(
        { error: 'Only the duty creator can update this duty' },
        { status: 403 }
      )
    }

    // Build update object
    const updates: Partial<HouseholdDuty> = {
      lastModified: new Date().toISOString(),
      modifiedBy: authResult.userId
    }

    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.assignedTo !== undefined) updates.assignedTo = body.assignedTo
    if (body.frequency !== undefined) {
      updates.frequency = body.frequency
      // Recalculate next due date if frequency changes
      updates.nextDueDate = calculateNextDueDate(body.frequency, body.customSchedule || duty.customSchedule)
    }
    if (body.customSchedule !== undefined) updates.customSchedule = body.customSchedule
    if (body.priority !== undefined) updates.priority = body.priority
    if (body.estimatedDuration !== undefined) updates.estimatedDuration = body.estimatedDuration
    if (body.subtasks !== undefined) updates.subtasks = body.subtasks
    if (body.notifyOnCompletion !== undefined) updates.notifyOnCompletion = body.notifyOnCompletion
    if (body.notifyOnOverdue !== undefined) updates.notifyOnOverdue = body.notifyOnOverdue
    if (body.reminderEnabled !== undefined) updates.reminderEnabled = body.reminderEnabled
    if (body.reminderTime !== undefined) updates.reminderTime = body.reminderTime
    if (body.notes !== undefined) updates.notes = body.notes
    if (body.specialInstructions !== undefined) updates.specialInstructions = body.specialInstructions
    if (body.isActive !== undefined) updates.isActive = body.isActive

    await db.collection('household_duties').doc(dutyId).update(updates)

    const updatedDuty: HouseholdDuty = {
      ...duty,
      id: dutyId,
      ...updates
    }

    logger.info('Household duty updated', { dutyId, updates })

    return NextResponse.json(updatedDuty)
  } catch (error) {
    const { dutyId } = await params
    logger.error('Error updating household duty', error as Error, { dutyId })
    return NextResponse.json(
      { error: 'Failed to update household duty' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/household-duties/[dutyId]
 * Delete a household duty
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ dutyId: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult || !authResult.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { dutyId } = await params
    const db = getAdminDb()

    const dutyDoc = await db.collection('household_duties').doc(dutyId).get()

    if (!dutyDoc.exists) {
      return NextResponse.json(
        { error: 'Duty not found' },
        { status: 404 }
      )
    }

    const duty = dutyDoc.data() as HouseholdDuty

    // Only the creator can delete the duty
    if (duty.userId !== authResult.userId) {
      return NextResponse.json(
        { error: 'Only the duty creator can delete this duty' },
        { status: 403 }
      )
    }

    await db.collection('household_duties').doc(dutyId).delete()

    logger.info('Household duty deleted', { dutyId })

    return NextResponse.json({ success: true })
  } catch (error) {
    const { dutyId } = await params
    logger.error('Error deleting household duty', error as Error, { dutyId })
    return NextResponse.json(
      { error: 'Failed to delete household duty' },
      { status: 500 }
    )
  }
}

// ==================== HELPER FUNCTIONS ====================

function calculateNextDueDate(
  frequency: string,
  customSchedule?: HouseholdDuty['customSchedule']
): string | undefined {
  const now = new Date()

  switch (frequency) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

    case 'biweekly':
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()

    case 'monthly':
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      return nextMonth.toISOString()

    case 'custom':
      if (customSchedule?.interval) {
        return new Date(now.getTime() + customSchedule.interval * 24 * 60 * 60 * 1000).toISOString()
      }
      return undefined

    case 'as_needed':
    default:
      return undefined
  }
}
