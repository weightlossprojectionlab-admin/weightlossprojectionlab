/**
 * useHouseholdDuties Hook Tests
 *
 * Tests for:
 * - Initial fetch on mount
 * - Loading and error states
 * - createDuty / updateDuty / deleteDuty / completeDuty mutations
 * - Optimistic updates to local state
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useHouseholdDuties } from '@/hooks/useHouseholdDuties'

// ==================== MOCKS ====================

const MOCK_TOKEN = 'mock-auth-token'
const MOCK_USER_ID = 'user-abc'
const MOCK_HOUSEHOLD_ID = 'household-xyz'
const MOCK_DUTY_ID = 'duty-123'

jest.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn(async () => MOCK_TOKEN)
    }
  }
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

// ==================== HELPERS ====================

function makeDuty(overrides: Record<string, any> = {}) {
  return {
    id: MOCK_DUTY_ID,
    householdId: MOCK_HOUSEHOLD_ID,
    userId: MOCK_USER_ID,
    name: 'Clean Kitchen',
    category: 'cleaning_kitchen',
    isCustom: false,
    assignedTo: [MOCK_USER_ID],
    frequency: 'daily',
    priority: 'medium',
    status: 'pending',
    completionCount: 0,
    skipCount: 0,
    notifyOnCompletion: true,
    notifyOnOverdue: true,
    reminderEnabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    createdBy: MOCK_USER_ID,
    lastModified: '2024-01-01T00:00:00.000Z',
    isActive: true,
    assignedBy: MOCK_USER_ID,
    assignedAt: '2024-01-01T00:00:00.000Z',
    ...overrides
  }
}

function makeDutyListResponse(duties: any[] = []) {
  return {
    duties,
    stats: {
      total: duties.length,
      byStatus: { pending: duties.length, in_progress: 0, completed: 0, skipped: 0, overdue: 0 },
      byCategory: {},
      overdue: 0,
      completedThisWeek: 0,
      completedThisMonth: 0
    },
    total: duties.length,
    page: 1,
    limit: 50,
    hasMore: false
  }
}

function mockFetchSuccess(data: any, status = 200) {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: status < 400,
    status,
    json: async () => data
  } as Response)
}

function mockFetchError(errorMessage: string, status = 500) {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ error: errorMessage })
  } as Response)
}

// ==================== TESTS ====================

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useHouseholdDuties — initial fetch', () => {
  it('starts with loading=true when autoFetch=true', () => {
    mockFetchSuccess(makeDutyListResponse())
    const { result } = renderHook(() =>
      useHouseholdDuties({ householdId: MOCK_HOUSEHOLD_ID })
    )
    expect(result.current.loading).toBe(true)
  })

  it('loads duties on mount and sets loading=false', async () => {
    const duties = [makeDuty()]
    mockFetchSuccess(makeDutyListResponse(duties))

    const { result } = renderHook(() =>
      useHouseholdDuties({ householdId: MOCK_HOUSEHOLD_ID })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.duties).toHaveLength(1)
    expect(result.current.duties[0].id).toBe(MOCK_DUTY_ID)
    expect(result.current.total).toBe(1)
  })

  it('returns stats after fetch', async () => {
    mockFetchSuccess(makeDutyListResponse([makeDuty()]))

    const { result } = renderHook(() =>
      useHouseholdDuties({ householdId: MOCK_HOUSEHOLD_ID })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.stats).not.toBeNull()
    expect(result.current.stats?.total).toBe(1)
  })

  it('sets error on fetch failure', async () => {
    mockFetchError('Failed to fetch duties')

    const { result } = renderHook(() =>
      useHouseholdDuties({ householdId: MOCK_HOUSEHOLD_ID })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Failed to fetch duties')
    expect(result.current.duties).toHaveLength(0)
  })

  it('does not fetch when autoFetch=false', () => {
    const { result } = renderHook(() =>
      useHouseholdDuties({ householdId: MOCK_HOUSEHOLD_ID, autoFetch: false })
    )
    expect(result.current.loading).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('includes forPatientId in fetch URL when provided', async () => {
    mockFetchSuccess(makeDutyListResponse())

    renderHook(() =>
      useHouseholdDuties({
        householdId: MOCK_HOUSEHOLD_ID,
        forPatientId: 'patient-abc'
      })
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('forPatientId=patient-abc'),
        expect.any(Object)
      )
    })
  })

  it('includes status filter in fetch URL when not all', async () => {
    mockFetchSuccess(makeDutyListResponse())

    renderHook(() =>
      useHouseholdDuties({
        householdId: MOCK_HOUSEHOLD_ID,
        statusFilter: 'pending'
      })
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=pending'),
        expect.any(Object)
      )
    })
  })

  it('sends auth token in fetch header', async () => {
    mockFetchSuccess(makeDutyListResponse())

    renderHook(() =>
      useHouseholdDuties({ householdId: MOCK_HOUSEHOLD_ID })
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${MOCK_TOKEN}`
          })
        })
      )
    })
  })
})

describe('useHouseholdDuties — createDuty', () => {
  it('POSTs to /api/household-duties and adds duty to local state', async () => {
    // Initial fetch
    mockFetchSuccess(makeDutyListResponse([]))
    // createDuty response
    const newDuty = makeDuty({ id: 'new-duty-id', name: 'Wash Laundry' })
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => newDuty
    })

    const { result } = renderHook(() =>
      useHouseholdDuties({ householdId: MOCK_HOUSEHOLD_ID })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.createDuty({
        category: 'laundry',
        name: 'Wash Laundry',
        assignedTo: [MOCK_USER_ID],
        frequency: 'weekly',
        priority: 'medium'
      })
    })

    expect(result.current.duties).toHaveLength(1)
    expect(result.current.duties[0].name).toBe('Wash Laundry')
    expect(result.current.total).toBe(1)
  })

  it('throws when createDuty API returns error', async () => {
    mockFetchSuccess(makeDutyListResponse([]))
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Missing required fields' })
    })

    const { result } = renderHook(() =>
      useHouseholdDuties({ householdId: MOCK_HOUSEHOLD_ID })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => {
        await result.current.createDuty({
          category: 'laundry',
          name: '',
          assignedTo: [],
          frequency: 'weekly',
          priority: 'medium'
        })
      })
    ).rejects.toThrow('Missing required fields')
  })

  it('includes householdId in POST body', async () => {
    mockFetchSuccess(makeDutyListResponse([]))
    const newDuty = makeDuty()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => newDuty
    })

    const { result } = renderHook(() =>
      useHouseholdDuties({ householdId: MOCK_HOUSEHOLD_ID })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.createDuty({
        category: 'laundry',
        name: 'Wash Laundry',
        assignedTo: [MOCK_USER_ID],
        frequency: 'weekly',
        priority: 'medium'
      })
    })

    const lastCall = (global.fetch as jest.Mock).mock.calls.find(
      ([url]: [string]) => url === '/api/household-duties'
    )
    expect(lastCall).toBeDefined()
    const body = JSON.parse(lastCall[1].body)
    expect(body.householdId).toBe(MOCK_HOUSEHOLD_ID)
  })
})

describe('useHouseholdDuties — updateDuty', () => {
  it('PATCHes duty and updates local state', async () => {
    const existingDuty = makeDuty()
    mockFetchSuccess(makeDutyListResponse([existingDuty]))
    const updatedDuty = { ...existingDuty, name: 'Updated Name', priority: 'high' }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => updatedDuty
    })

    const { result } = renderHook(() =>
      useHouseholdDuties({ householdId: MOCK_HOUSEHOLD_ID })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.updateDuty(MOCK_DUTY_ID, { name: 'Updated Name', priority: 'high' })
    })

    const duty = result.current.duties.find(d => d.id === MOCK_DUTY_ID)
    expect(duty?.name).toBe('Updated Name')
    expect(duty?.priority).toBe('high')
  })

  it('throws when updateDuty API returns error', async () => {
    const existingDuty = makeDuty()
    mockFetchSuccess(makeDutyListResponse([existingDuty]))
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Only the duty creator can update this duty' })
    })

    const { result } = renderHook(() =>
      useHouseholdDuties({ householdId: MOCK_HOUSEHOLD_ID })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => {
        await result.current.updateDuty(MOCK_DUTY_ID, { name: 'Hack' })
      })
    ).rejects.toThrow('Only the duty creator can update this duty')
  })
})

describe('useHouseholdDuties — deleteDuty', () => {
  it('DELETEs duty and removes from local state', async () => {
    const existingDuty = makeDuty()
    mockFetchSuccess(makeDutyListResponse([existingDuty]))
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    })

    const { result } = renderHook(() =>
      useHouseholdDuties({ householdId: MOCK_HOUSEHOLD_ID })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.duties).toHaveLength(1)

    await act(async () => {
      await result.current.deleteDuty(MOCK_DUTY_ID)
    })

    expect(result.current.duties).toHaveLength(0)
    expect(result.current.total).toBe(0)
  })

  it('throws when deleteDuty API returns 403', async () => {
    const existingDuty = makeDuty()
    mockFetchSuccess(makeDutyListResponse([existingDuty]))
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Only the duty creator can delete this duty' })
    })

    const { result } = renderHook(() =>
      useHouseholdDuties({ householdId: MOCK_HOUSEHOLD_ID })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => {
        await result.current.deleteDuty(MOCK_DUTY_ID)
      })
    ).rejects.toThrow('Only the duty creator can delete this duty')

    // Duty should NOT have been removed from local state
    expect(result.current.duties).toHaveLength(1)
  })
})

describe('useHouseholdDuties — completeDuty', () => {
  it('POSTs to complete endpoint and updates duty in local state', async () => {
    const existingDuty = makeDuty()
    mockFetchSuccess(makeDutyListResponse([existingDuty]))

    // completeDuty returns the updated duty (reset to pending with new due date)
    const updatedDuty = {
      ...existingDuty,
      status: 'pending',
      completionCount: 1,
      lastCompletedAt: new Date().toISOString(),
      nextDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ duty: updatedDuty, completion: {} })
    })

    const { result } = renderHook(() =>
      useHouseholdDuties({ householdId: MOCK_HOUSEHOLD_ID })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.completeDuty(MOCK_DUTY_ID)
    })

    const duty = result.current.duties.find(d => d.id === MOCK_DUTY_ID)
    expect(duty?.completionCount).toBe(1)
    expect(duty?.lastCompletedAt).toBeDefined()
  })

  it('passes notes in completeDuty payload', async () => {
    const existingDuty = makeDuty()
    mockFetchSuccess(makeDutyListResponse([existingDuty]))
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ duty: existingDuty, completion: {} })
    })

    const { result } = renderHook(() =>
      useHouseholdDuties({ householdId: MOCK_HOUSEHOLD_ID })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.completeDuty(MOCK_DUTY_ID, { notes: 'Done well' })
    })

    const lastCall = (global.fetch as jest.Mock).mock.calls.at(-1)
    const body = JSON.parse(lastCall[1].body)
    expect(body.notes).toBe('Done well')
  })

  it('throws when completeDuty API returns 403', async () => {
    const existingDuty = makeDuty()
    mockFetchSuccess(makeDutyListResponse([existingDuty]))
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'You are not assigned to this duty' })
    })

    const { result } = renderHook(() =>
      useHouseholdDuties({ householdId: MOCK_HOUSEHOLD_ID })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => {
        await result.current.completeDuty(MOCK_DUTY_ID)
      })
    ).rejects.toThrow('You are not assigned to this duty')
  })
})

describe('useHouseholdDuties — refetch', () => {
  it('refetches duties and updates state', async () => {
    // First fetch: 1 duty
    mockFetchSuccess(makeDutyListResponse([makeDuty()]))

    const { result } = renderHook(() =>
      useHouseholdDuties({ householdId: MOCK_HOUSEHOLD_ID })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.duties).toHaveLength(1)

    // Second fetch: 2 duties
    const secondDuty = makeDuty({ id: 'duty-456', name: 'Vacuum Living Room' })
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => makeDutyListResponse([makeDuty(), secondDuty])
    })

    await act(async () => {
      await result.current.refetch()
    })

    expect(result.current.duties).toHaveLength(2)
    expect(result.current.total).toBe(2)
  })
})
