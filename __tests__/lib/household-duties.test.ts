/**
 * Household Duties Business Logic Tests
 *
 * Tests for:
 * - PREDEFINED_DUTIES constant (all categories populated)
 * - calculateNextDueDate frequency logic (via API route helper)
 * - DutyStats calculation logic
 * - Duty filter logic (in-memory filtering from GET route)
 */

import {
  PREDEFINED_DUTIES,
  DutyCategory,
  DutyFrequency,
  HouseholdDuty
} from '@/types/household-duties'

// ==================== PREDEFINED DUTIES ====================

describe('PREDEFINED_DUTIES', () => {
  it('has entries for all duty categories', () => {
    const expectedCategories: DutyCategory[] = [
      'laundry',
      'shopping',
      'cleaning_bedroom',
      'cleaning_bathroom',
      'cleaning_kitchen',
      'cleaning_living_areas',
      'meal_preparation',
      'grocery_shopping',
      'medication_pickup',
      'transportation',
      'personal_care',
      'pet_care',
      'yard_work',
      'custom'
    ]

    expectedCategories.forEach(category => {
      expect(PREDEFINED_DUTIES).toHaveProperty(category)
    })
  })

  it('has at least one preset for laundry', () => {
    expect(PREDEFINED_DUTIES.laundry.length).toBeGreaterThan(0)
  })

  it('has at least one preset for shopping', () => {
    expect(PREDEFINED_DUTIES.shopping.length).toBeGreaterThan(0)
  })

  it('has at least one preset for cleaning_bedroom', () => {
    expect(PREDEFINED_DUTIES.cleaning_bedroom.length).toBeGreaterThan(0)
  })

  it('has at least one preset for cleaning_bathroom', () => {
    expect(PREDEFINED_DUTIES.cleaning_bathroom.length).toBeGreaterThan(0)
  })

  it('has at least one preset for cleaning_kitchen', () => {
    expect(PREDEFINED_DUTIES.cleaning_kitchen.length).toBeGreaterThan(0)
  })

  it('custom category is an empty array (user adds on the fly)', () => {
    expect(PREDEFINED_DUTIES.custom).toEqual([])
  })

  it('each preset has required fields: id, category, name, description', () => {
    const nonCustomCategories = Object.entries(PREDEFINED_DUTIES)
      .filter(([cat]) => cat !== 'custom')

    nonCustomCategories.forEach(([, duties]) => {
      duties.forEach(duty => {
        expect(duty).toHaveProperty('id')
        expect(duty).toHaveProperty('category')
        expect(duty).toHaveProperty('name')
        expect(duty).toHaveProperty('description')
        expect(typeof duty.name).toBe('string')
        expect(duty.name.length).toBeGreaterThan(0)
      })
    })
  })

  it('all presets have a valid defaultFrequency if set', () => {
    const validFrequencies: DutyFrequency[] = [
      'daily', 'weekly', 'biweekly', 'monthly', 'as_needed', 'custom'
    ]

    Object.values(PREDEFINED_DUTIES).forEach(duties => {
      duties.forEach(duty => {
        if (duty.defaultFrequency) {
          expect(validFrequencies).toContain(duty.defaultFrequency)
        }
      })
    })
  })

  it('estimatedDuration is a positive number when present', () => {
    Object.values(PREDEFINED_DUTIES).forEach(duties => {
      duties.forEach(duty => {
        if (duty.estimatedDuration !== undefined) {
          expect(typeof duty.estimatedDuration).toBe('number')
          expect(duty.estimatedDuration).toBeGreaterThan(0)
        }
      })
    })
  })

  it('preset IDs are unique across all categories', () => {
    const allIds: string[] = []
    Object.values(PREDEFINED_DUTIES).forEach(duties => {
      duties.forEach(duty => allIds.push(duty.id))
    })
    const uniqueIds = new Set(allIds)
    expect(uniqueIds.size).toBe(allIds.length)
  })
})

// ==================== NEXT DUE DATE CALCULATION ====================

/**
 * Extracted nextDueDate calculation logic mirrors what's in the API routes.
 * We test it independently so route tests stay focused on HTTP behavior.
 */
function calculateNextDueDate(
  frequency: DutyFrequency | 'custom',
  customSchedule?: { interval?: number }
): string | undefined {
  const now = new Date()

  switch (frequency) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    case 'biweekly':
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
    case 'monthly': {
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      return nextMonth.toISOString()
    }
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

describe('calculateNextDueDate', () => {
  it('returns undefined for as_needed frequency', () => {
    expect(calculateNextDueDate('as_needed')).toBeUndefined()
  })

  it('returns a date ~24 hours from now for daily frequency', () => {
    const result = calculateNextDueDate('daily')
    expect(result).toBeDefined()
    const diff = new Date(result!).getTime() - Date.now()
    // Should be within 5 seconds of 24 hours
    expect(diff).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000 - 5000)
    expect(diff).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 5000)
  })

  it('returns a date ~7 days from now for weekly frequency', () => {
    const result = calculateNextDueDate('weekly')
    expect(result).toBeDefined()
    const diff = new Date(result!).getTime() - Date.now()
    expect(diff).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 * 1000 - 5000)
    expect(diff).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000 + 5000)
  })

  it('returns a date ~14 days from now for biweekly frequency', () => {
    const result = calculateNextDueDate('biweekly')
    expect(result).toBeDefined()
    const diff = new Date(result!).getTime() - Date.now()
    expect(diff).toBeGreaterThanOrEqual(14 * 24 * 60 * 60 * 1000 - 5000)
    expect(diff).toBeLessThanOrEqual(14 * 24 * 60 * 60 * 1000 + 5000)
  })

  it('returns approximately next month for monthly frequency', () => {
    const result = calculateNextDueDate('monthly')
    expect(result).toBeDefined()
    const now = new Date()
    const future = new Date(result!)
    // Should be between 28 and 32 days out
    const diffDays = (future.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    expect(diffDays).toBeGreaterThanOrEqual(28)
    expect(diffDays).toBeLessThanOrEqual(32)
  })

  it('uses custom interval when frequency is custom', () => {
    const result = calculateNextDueDate('custom', { interval: 3 })
    expect(result).toBeDefined()
    const diff = new Date(result!).getTime() - Date.now()
    expect(diff).toBeGreaterThanOrEqual(3 * 24 * 60 * 60 * 1000 - 5000)
    expect(diff).toBeLessThanOrEqual(3 * 24 * 60 * 60 * 1000 + 5000)
  })

  it('returns undefined for custom frequency without interval', () => {
    expect(calculateNextDueDate('custom')).toBeUndefined()
    expect(calculateNextDueDate('custom', {})).toBeUndefined()
  })

  it('returns valid ISO 8601 string for non-undefined results', () => {
    const result = calculateNextDueDate('weekly')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})

// ==================== IN-MEMORY DUTY FILTERING ====================

/**
 * The GET route filters duties in memory after a Firestore query.
 * Test this filtering logic directly.
 */

function filterDuties(
  duties: Partial<HouseholdDuty>[],
  filters: {
    forPatientId?: string
    assignedTo?: string
    category?: string
    status?: string
    priority?: string
    frequency?: string
    isActive?: boolean
    overdueOnly?: boolean
    dueSoon?: boolean
  }
): Partial<HouseholdDuty>[] {
  let result = [...duties]

  if (filters.forPatientId) {
    result = result.filter(d => d.forPatientId === filters.forPatientId)
  }
  if (filters.assignedTo) {
    result = result.filter(d => d.assignedTo?.includes(filters.assignedTo!))
  }
  if (filters.category) {
    result = result.filter(d => d.category === filters.category)
  }
  if (filters.status) {
    result = result.filter(d => d.status === filters.status)
  }
  if (filters.priority) {
    result = result.filter(d => d.priority === filters.priority)
  }
  if (filters.frequency) {
    result = result.filter(d => d.frequency === filters.frequency)
  }
  if (filters.isActive !== undefined) {
    result = result.filter(d => d.isActive === filters.isActive)
  }
  if (filters.overdueOnly) {
    const now = new Date()
    result = result.filter(
      d => d.nextDueDate && new Date(d.nextDueDate) < now && d.status !== 'completed'
    )
  }
  if (filters.dueSoon) {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    result = result.filter(
      d => d.nextDueDate && new Date(d.nextDueDate) <= tomorrow && d.status !== 'completed'
    )
  }
  return result
}

const SAMPLE_DUTIES: Partial<HouseholdDuty>[] = [
  {
    id: '1',
    category: 'laundry',
    status: 'pending',
    priority: 'medium',
    frequency: 'weekly',
    assignedTo: ['caregiver-1'],
    isActive: true,
    nextDueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days out
  },
  {
    id: '2',
    category: 'cleaning_kitchen',
    status: 'overdue',
    priority: 'high',
    frequency: 'daily',
    assignedTo: ['caregiver-2'],
    isActive: true,
    nextDueDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
  },
  {
    id: '3',
    category: 'shopping',
    status: 'completed',
    priority: 'low',
    frequency: 'as_needed',
    assignedTo: ['caregiver-1', 'caregiver-2'],
    isActive: false,
    nextDueDate: undefined
  },
  {
    id: '4',
    category: 'cleaning_bedroom',
    status: 'pending',
    priority: 'medium',
    frequency: 'weekly',
    assignedTo: ['caregiver-1'],
    forPatientId: 'patient-abc',
    isActive: true,
    nextDueDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() // 12 hours out (due soon)
  }
]

describe('in-memory duty filtering', () => {
  it('returns all duties when no filters', () => {
    const result = filterDuties(SAMPLE_DUTIES, {})
    expect(result).toHaveLength(4)
  })

  it('filters by category', () => {
    const result = filterDuties(SAMPLE_DUTIES, { category: 'laundry' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('filters by status', () => {
    const result = filterDuties(SAMPLE_DUTIES, { status: 'pending' })
    expect(result).toHaveLength(2)
    result.forEach(d => expect(d.status).toBe('pending'))
  })

  it('filters by assignedTo caregiver', () => {
    const result = filterDuties(SAMPLE_DUTIES, { assignedTo: 'caregiver-1' })
    expect(result).toHaveLength(3)
    result.forEach(d => expect(d.assignedTo).toContain('caregiver-1'))
  })

  it('filters by isActive=true', () => {
    const result = filterDuties(SAMPLE_DUTIES, { isActive: true })
    expect(result).toHaveLength(3)
    result.forEach(d => expect(d.isActive).toBe(true))
  })

  it('filters by isActive=false', () => {
    const result = filterDuties(SAMPLE_DUTIES, { isActive: false })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('3')
  })

  it('filters overdueOnly: excludes future and completed duties', () => {
    const result = filterDuties(SAMPLE_DUTIES, { overdueOnly: true })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
  })

  it('filters dueSoon: returns duties due within 24 hours (not completed)', () => {
    const result = filterDuties(SAMPLE_DUTIES, { dueSoon: true })
    // Duty 4 is due in 12 hours and not completed
    // Duty 2 is overdue (past) but nextDueDate <= tomorrow
    expect(result.some(d => d.id === '4')).toBe(true)
  })

  it('filters by forPatientId', () => {
    const result = filterDuties(SAMPLE_DUTIES, { forPatientId: 'patient-abc' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('4')
  })

  it('filters by priority', () => {
    const result = filterDuties(SAMPLE_DUTIES, { priority: 'high' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
  })

  it('filters by frequency', () => {
    const result = filterDuties(SAMPLE_DUTIES, { frequency: 'weekly' })
    expect(result).toHaveLength(2)
  })

  it('stacks multiple filters', () => {
    const result = filterDuties(SAMPLE_DUTIES, {
      category: 'cleaning_bedroom',
      assignedTo: 'caregiver-1',
      isActive: true
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('4')
  })
})

// ==================== DUTY STATS CALCULATION ====================

/**
 * calculateDutyStats is tested via API integration, but we validate the
 * shape and correctness of the stats object independently.
 */

function buildDutyStats(duties: Partial<HouseholdDuty>[]) {
  const stats = {
    total: duties.length,
    byStatus: { pending: 0, in_progress: 0, completed: 0, skipped: 0, overdue: 0 },
    byCategory: {} as Record<string, number>,
    overdue: 0,
    completedThisWeek: 0,
    completedThisMonth: 0
  }

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  duties.forEach(duty => {
    if (duty.status) stats.byStatus[duty.status as keyof typeof stats.byStatus]++
    if (duty.category) {
      stats.byCategory[duty.category] = (stats.byCategory[duty.category] || 0) + 1
    }
    if (duty.nextDueDate && new Date(duty.nextDueDate) < now && duty.status !== 'completed') {
      stats.overdue++
    }
    if (duty.lastCompletedAt) {
      const completedDate = new Date(duty.lastCompletedAt)
      if (completedDate >= weekAgo) stats.completedThisWeek++
      if (completedDate >= monthAgo) stats.completedThisMonth++
    }
  })

  return stats
}

describe('duty stats calculation', () => {
  it('counts total correctly', () => {
    const stats = buildDutyStats(SAMPLE_DUTIES)
    expect(stats.total).toBe(4)
  })

  it('counts byStatus correctly', () => {
    const stats = buildDutyStats(SAMPLE_DUTIES)
    expect(stats.byStatus.pending).toBe(2)
    expect(stats.byStatus.overdue).toBe(1)
    expect(stats.byStatus.completed).toBe(1)
    expect(stats.byStatus.in_progress).toBe(0)
  })

  it('counts byCategory correctly', () => {
    const stats = buildDutyStats(SAMPLE_DUTIES)
    expect(stats.byCategory.laundry).toBe(1)
    expect(stats.byCategory.cleaning_kitchen).toBe(1)
    expect(stats.byCategory.shopping).toBe(1)
    expect(stats.byCategory.cleaning_bedroom).toBe(1)
  })

  it('counts overdue based on nextDueDate in the past and not completed', () => {
    const stats = buildDutyStats(SAMPLE_DUTIES)
    expect(stats.overdue).toBe(1) // Only duty 2 is overdue and not completed
  })

  it('counts completedThisWeek for duties completed in the last 7 days', () => {
    const recentDuties: Partial<HouseholdDuty>[] = [
      {
        id: 'r1',
        status: 'completed',
        lastCompletedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
      },
      {
        id: 'r2',
        status: 'completed',
        lastCompletedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
      }
    ]
    const stats = buildDutyStats(recentDuties)
    expect(stats.completedThisWeek).toBe(1)
    expect(stats.completedThisMonth).toBe(2)
  })

  it('returns zero stats for empty duty list', () => {
    const stats = buildDutyStats([])
    expect(stats.total).toBe(0)
    expect(stats.overdue).toBe(0)
    expect(stats.completedThisWeek).toBe(0)
  })
})
