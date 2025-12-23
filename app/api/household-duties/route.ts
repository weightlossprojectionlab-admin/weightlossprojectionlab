import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { verifyAuthToken } from '@/lib/rbac-middleware'
import {
  HouseholdDuty,
  DutyFilters,
  CreateDutyRequest,
  DutyListResponse,
  DutyStats,
  DutyStatus
} from '@/types/household-duties'
import {
  HouseholdRole,
  getUserRoleInHousehold,
  checkPermission
} from '@/types/household-permissions'
import { logger } from '@/lib/logger'

// ==================== HELPER FUNCTIONS ====================

/**
 * Get user's role in a household
 */
async function getUserHouseholdRole(
  db: FirebaseFirestore.Firestore,
  householdId: string,
  userId: string
): Promise<HouseholdRole | null> {
  const householdDoc = await db.collection('households').doc(householdId).get()

  if (!householdDoc.exists) {
    return null
  }

  const household = householdDoc.data()
  if (!household) {
    return null
  }

  // Owner: Created the household
  if (household.createdBy === userId) {
    return 'owner'
  }

  // Primary Caregiver
  if (household.primaryCaregiverId === userId) {
    return 'primary_caregiver'
  }

  // Additional Caregiver
  if (household.additionalCaregiverIds?.includes(userId)) {
    return 'caregiver'
  }

  // No access
  return null
}

/**
 * GET /api/household-duties
 * List household duties with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult || !authResult.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)

    // Parse filters
    const filters: DutyFilters = {
      householdId: searchParams.get('householdId') || undefined,
      forPatientId: searchParams.get('forPatientId') || undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
      category: searchParams.get('category') as any || undefined,
      status: searchParams.get('status') as any || undefined,
      priority: searchParams.get('priority') as any || undefined,
      frequency: searchParams.get('frequency') as any || undefined,
      isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
      overdueOnly: searchParams.get('overdueOnly') === 'true',
      dueSoon: searchParams.get('dueSoon') === 'true'
    }

    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    const db = getAdminDb()

    // Start with base query - only userId to avoid composite index issues
    let query = db.collection('household_duties')
      .where('userId', '==', authResult.userId)

    // Only add ONE additional filter if provided, to avoid needing composite indexes
    // We'll filter the rest in memory
    if (filters.householdId) {
      query = query.where('householdId', '==', filters.householdId)
    }

    // Execute query - get all results and filter in memory
    const snapshot = await query.get()

    let duties: HouseholdDuty[] = []

    snapshot.forEach((doc) => {
      duties.push({ id: doc.id, ...doc.data() } as HouseholdDuty)
    })

    // Apply filters in memory
    let filteredDuties = duties

    if (filters.forPatientId) {
      filteredDuties = filteredDuties.filter(duty => duty.forPatientId === filters.forPatientId)
    }
    if (filters.assignedTo) {
      filteredDuties = filteredDuties.filter(duty =>
        duty.assignedTo.includes(filters.assignedTo!)
      )
    }
    if (filters.category) {
      filteredDuties = filteredDuties.filter(duty => duty.category === filters.category)
    }
    if (filters.status) {
      filteredDuties = filteredDuties.filter(duty => duty.status === filters.status)
    }
    if (filters.priority) {
      filteredDuties = filteredDuties.filter(duty => duty.priority === filters.priority)
    }
    if (filters.frequency) {
      filteredDuties = filteredDuties.filter(duty => duty.frequency === filters.frequency)
    }
    if (filters.isActive !== undefined) {
      filteredDuties = filteredDuties.filter(duty => duty.isActive === filters.isActive)
    }

    if (filters.overdueOnly) {
      const now = new Date()
      filteredDuties = filteredDuties.filter(duty =>
        duty.nextDueDate && new Date(duty.nextDueDate) < now && duty.status !== 'completed'
      )
    }

    if (filters.dueSoon) {
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      filteredDuties = filteredDuties.filter(duty =>
        duty.nextDueDate && new Date(duty.nextDueDate) <= tomorrow && duty.status !== 'completed'
      )
    }

    // Sort by created date descending
    filteredDuties.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateB - dateA
    })

    // Apply pagination
    const paginatedDuties = filteredDuties.slice(offset, offset + limit)
    const hasMore = filteredDuties.length > offset + limit

    // Calculate stats
    const stats = await calculateDutyStats(authResult.userId, filters.householdId)

    const response: DutyListResponse = {
      duties: paginatedDuties,
      stats,
      total: filteredDuties.length,
      page,
      limit,
      hasMore
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error fetching household duties', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch household duties' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/household-duties
 * Create a new household duty
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult || !authResult.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: CreateDutyRequest = await request.json()

    // Validate required fields
    if (!body.householdId || !body.category || !body.name || !body.assignedTo?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: householdId, category, name, assignedTo' },
        { status: 400 }
      )
    }

    // Verify user has access to this household and permission to create duties
    const db = getAdminDb()
    const householdDoc = await db.collection('households').doc(body.householdId).get()

    if (!householdDoc.exists) {
      return NextResponse.json(
        { error: 'Household not found' },
        { status: 404 }
      )
    }

    const householdData = householdDoc.data()

    // Get user's role in household
    const userRole = await getUserHouseholdRole(db, body.householdId, authResult.userId)

    if (!userRole) {
      return NextResponse.json(
        { error: 'You do not have access to this household' },
        { status: 403 }
      )
    }

    // Check permission to create duties
    const permissionCheck = checkPermission(userRole, 'canCreateDuties', 'create duties')
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.message },
        { status: 403 }
      )
    }

    // If forPatientId is provided, verify patient exists and belongs to household
    if (body.forPatientId) {
      const patientDoc = await db.collection('patients').doc(body.forPatientId).get()
      if (!patientDoc.exists) {
        return NextResponse.json(
          { error: 'Patient not found' },
          { status: 404 }
        )
      }

      // Verify patient is in this household
      const memberIds = householdData?.memberIds || []
      if (!memberIds.includes(body.forPatientId)) {
        return NextResponse.json(
          { error: 'Patient is not a member of this household' },
          { status: 403 }
        )
      }
    }

    // Calculate next due date based on frequency
    const nextDueDate = calculateNextDueDate(body.frequency, body.customSchedule)

    // Create duty document
    const now = new Date().toISOString()
    const duty: Partial<Omit<HouseholdDuty, 'id'>> = {
      householdId: body.householdId,
      userId: authResult.userId,
      category: body.category,
      name: body.name,
      isCustom: body.category === 'custom',
      assignedTo: body.assignedTo,
      assignedBy: authResult.userId,
      assignedAt: now,
      frequency: body.frequency,
      priority: body.priority || 'medium',
      status: 'pending',
      completionCount: 0,
      skipCount: 0,
      notifyOnCompletion: body.notifyOnCompletion ?? true,
      notifyOnOverdue: body.notifyOnOverdue ?? true,
      reminderEnabled: body.reminderEnabled ?? true,
      createdAt: now,
      createdBy: authResult.userId,
      lastModified: now,
      isActive: true
    }

    // Add optional fields only if they have values
    if (body.forPatientId) duty.forPatientId = body.forPatientId
    if (body.description) duty.description = body.description
    if (body.customSchedule) duty.customSchedule = body.customSchedule
    if (nextDueDate) duty.nextDueDate = nextDueDate
    if (body.estimatedDuration) duty.estimatedDuration = body.estimatedDuration
    if (body.subtasks) duty.subtasks = body.subtasks
    if (body.reminderTime) duty.reminderTime = body.reminderTime
    if (body.notes) duty.notes = body.notes
    if (body.specialInstructions) duty.specialInstructions = body.specialInstructions

    const docRef = await db.collection('household_duties').add(duty as Omit<HouseholdDuty, 'id'>)
    const createdDuty: HouseholdDuty = {
      id: docRef.id,
      ...duty
    }

    logger.info('Household duty created', {
      dutyId: docRef.id,
      householdId: body.householdId,
      forPatientId: body.forPatientId,
      category: body.category
    })

    return NextResponse.json(createdDuty, { status: 201 })
  } catch (error) {
    logger.error('Error creating household duty', error as Error)
    return NextResponse.json(
      { error: 'Failed to create household duty' },
      { status: 500 }
    )
  }
}

// ==================== HELPER FUNCTIONS ====================

async function calculateDutyStats(userId: string, householdId?: string): Promise<DutyStats> {
  const db = getAdminDb()
  let query = db.collection('household_duties')
    .where('userId', '==', userId)

  if (householdId) {
    query = query.where('householdId', '==', householdId)
  }

  const snapshot = await query.get()

  const stats: DutyStats = {
    total: snapshot.size,
    byStatus: {
      pending: 0,
      in_progress: 0,
      completed: 0,
      skipped: 0,
      overdue: 0
    },
    byCategory: {
      laundry: 0,
      shopping: 0,
      cleaning_bedroom: 0,
      cleaning_bathroom: 0,
      cleaning_kitchen: 0,
      cleaning_living_areas: 0,
      meal_preparation: 0,
      grocery_shopping: 0,
      medication_pickup: 0,
      transportation: 0,
      personal_care: 0,
      pet_care: 0,
      yard_work: 0,
      custom: 0
    },
    overdue: 0,
    completedThisWeek: 0,
    completedThisMonth: 0
  }

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  snapshot.forEach(doc => {
    const duty = doc.data() as HouseholdDuty

    // Count by status
    stats.byStatus[duty.status]++

    // Count by category
    stats.byCategory[duty.category]++

    // Count overdue
    if (duty.nextDueDate && new Date(duty.nextDueDate) < now && duty.status !== 'completed') {
      stats.overdue++
    }

    // Count completed this week/month
    if (duty.lastCompletedAt) {
      const completedDate = new Date(duty.lastCompletedAt)
      if (completedDate >= weekAgo) {
        stats.completedThisWeek++
      }
      if (completedDate >= monthAgo) {
        stats.completedThisMonth++
      }
    }
  })

  return stats
}

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
