/** @jest-environment node */
/**
 * Household Duties API Tests
 *
 * Assertion tests for:
 * - GET  /api/household-duties       (list with filters)
 * - POST /api/household-duties       (create)
 * - GET  /api/household-duties/[id]  (get one)
 * - PATCH /api/household-duties/[id] (update)
 * - DELETE /api/household-duties/[id] (delete)
 * - POST /api/household-duties/[id]/complete (mark done)
 */

import { NextRequest } from 'next/server'
import { mockAuthToken, mockAuthenticatedRequest } from '../helpers/security-test-utils'

// ==================== MOCKS ====================

// Mock verifyAuthToken
jest.mock('@/lib/rbac-middleware', () => ({
  verifyAuthToken: jest.fn()
}))

// Mock Firebase Admin
jest.mock('@/lib/firebase-admin', () => ({
  getAdminDb: jest.fn()
}))

// Mock notification services (non-blocking, should not throw)
jest.mock('@/lib/duty-notification-service', () => ({
  notifyDutyAssigned: jest.fn(async () => {}),
  notifyDutyCompleted: jest.fn(async () => {})
}))

jest.mock('@/lib/duty-scheduler-service', () => ({
  scheduleDutyNotifications: jest.fn(async () => {})
}))

// Mock feature gates
jest.mock('@/lib/feature-gates', () => ({
  canAddDutyToHousehold: jest.fn(() => ({ allowed: true }))
}))

// Mock household-permissions types
jest.mock('@/types/household-permissions', () => ({
  getUserRoleInHousehold: jest.fn(),
  checkPermission: jest.fn(() => ({ allowed: true, message: '' }))
}))

// Import mocked modules for configuration
import { verifyAuthToken } from '@/lib/rbac-middleware'
import { getAdminDb } from '@/lib/firebase-admin'
import { canAddDutyToHousehold } from '@/lib/feature-gates'
import { checkPermission } from '@/types/household-permissions'

// Import route handlers
import { GET as listDuties, POST as createDuty } from '@/app/api/household-duties/route'
import { GET as getDuty, PATCH as updateDuty, DELETE as deleteDuty } from '@/app/api/household-duties/[dutyId]/route'
import { POST as completeDuty } from '@/app/api/household-duties/[dutyId]/complete/route'

// ==================== TEST HELPERS ====================

const MOCK_USER_ID = 'user-abc-123'
const MOCK_HOUSEHOLD_ID = 'household-xyz-456'
const MOCK_DUTY_ID = 'duty-789'

/**
 * Build a fluent Firestore query mock that returns given docs on .get()
 */
function createQueryMock(docs: Array<{ id: string; data: Record<string, any> }> = []) {
  const queryMock: any = {
    where: jest.fn(() => queryMock),
    orderBy: jest.fn(() => queryMock),
    limit: jest.fn(() => queryMock),
    get: jest.fn(async () => ({
      size: docs.length,
      empty: docs.length === 0,
      docs: docs.map(d => ({
        id: d.id,
        exists: true,
        data: () => d.data
      })),
      forEach: (fn: (doc: any) => void) =>
        docs.forEach(d => fn({ id: d.id, exists: true, data: () => d.data }))
    }))
  }
  return queryMock
}

function createDocMock(data: Record<string, any> | null, id = MOCK_DUTY_ID) {
  return {
    exists: data !== null,
    id,
    data: () => data
  }
}

function makeDb(overrides: Record<string, any> = {}) {
  const db = {
    collection: jest.fn((name: string) => {
      if (overrides[name]) return overrides[name]
      return {
        doc: jest.fn(() => ({
          get: jest.fn(async () => createDocMock(null)),
          set: jest.fn(async () => {}),
          update: jest.fn(async () => {}),
          delete: jest.fn(async () => {})
        })),
        add: jest.fn(async () => ({ id: 'new-id' })),
        ...createQueryMock()
      }
    }),
    runTransaction: jest.fn(async (fn: any) => {
      const txn = {
        get: jest.fn(async (ref: any) => ({
          exists: true,
          data: () => overrides.__txDutyData || makeDutyData()
        })),
        update: jest.fn(),
        set: jest.fn()
      }
      return fn(txn)
    }),
    batch: jest.fn(() => ({
      update: jest.fn(),
      commit: jest.fn(async () => {})
    }))
  }
  return db
}

function makeDutyData(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    householdId: MOCK_HOUSEHOLD_ID,
    userId: MOCK_USER_ID,
    name: 'Clean Kitchen',
    category: 'cleaning_kitchen',
    isCustom: false,
    assignedTo: [MOCK_USER_ID],
    assignedBy: MOCK_USER_ID,
    assignedAt: '2024-01-01T00:00:00.000Z',
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
    ...overrides
  }
}

function makeHouseholdData(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    id: MOCK_HOUSEHOLD_ID,
    name: 'Test Household',
    createdBy: MOCK_USER_ID,
    primaryCaregiverId: MOCK_USER_ID,
    memberIds: [],
    isActive: true,
    ...overrides
  }
}

function makeRequest(url: string, options: { method?: string; body?: any } = {}): NextRequest {
  const token = mockAuthToken({ uid: MOCK_USER_ID })
  return mockAuthenticatedRequest(url, {
    method: options.method || 'GET',
    token,
    body: options.body
  })
}

// ==================== SETUP ====================

beforeEach(() => {
  jest.clearAllMocks()
  ;(verifyAuthToken as jest.Mock).mockResolvedValue({ userId: MOCK_USER_ID })
  ;(canAddDutyToHousehold as jest.Mock).mockReturnValue({ allowed: true })
  ;(checkPermission as jest.Mock).mockReturnValue({ allowed: true, message: '' })
})

// ==================== GET /api/household-duties ====================

describe('GET /api/household-duties', () => {
  it('returns 401 when no token', async () => {
    ;(verifyAuthToken as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/household-duties')
    const res = await listDuties(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 with empty duty list for a household', async () => {
    const db = makeDb({
      household_duties: {
        ...createQueryMock([]),
        doc: jest.fn(() => ({ get: jest.fn(async () => createDocMock(null)) }))
      }
    })
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest(
      `http://localhost/api/household-duties?householdId=${MOCK_HOUSEHOLD_ID}`
    )
    const res = await listDuties(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveProperty('duties')
    expect(Array.isArray(body.duties)).toBe(true)
    expect(body).toHaveProperty('stats')
  })

  it('returns list of duties for the authenticated user', async () => {
    const dutyData = makeDutyData()
    const dutyDocs = [{ id: MOCK_DUTY_ID, data: dutyData }]

    const db = makeDb({
      household_duties: {
        ...createQueryMock(dutyDocs),
        doc: jest.fn(() => ({ get: jest.fn(async () => createDocMock(null)) }))
      }
    })
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest(
      `http://localhost/api/household-duties?householdId=${MOCK_HOUSEHOLD_ID}`
    )
    const res = await listDuties(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.duties.length).toBeGreaterThanOrEqual(0)
  })

  it('filters by status param', async () => {
    const db = makeDb({
      household_duties: createQueryMock([])
    })
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest(
      `http://localhost/api/household-duties?householdId=${MOCK_HOUSEHOLD_ID}&status=pending`
    )
    const res = await listDuties(req)
    expect(res.status).toBe(200)
  })

  it('includes stats in response', async () => {
    const db = makeDb({
      household_duties: createQueryMock([])
    })
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest(
      `http://localhost/api/household-duties?householdId=${MOCK_HOUSEHOLD_ID}`
    )
    const res = await listDuties(req)
    const body = await res.json()

    expect(body).toHaveProperty('stats')
    expect(body.stats).toHaveProperty('total')
    expect(body.stats).toHaveProperty('byStatus')
    expect(body.stats).toHaveProperty('overdue')
    expect(body.stats).toHaveProperty('completedThisWeek')
  })
})

// ==================== POST /api/household-duties ====================

describe('POST /api/household-duties', () => {
  it('returns 401 when no token', async () => {
    ;(verifyAuthToken as jest.Mock).mockResolvedValue(null)
    const req = makeRequest('http://localhost/api/household-duties', { method: 'POST', body: {} })
    const res = await createDuty(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields are missing', async () => {
    const db = makeDb()
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    // Missing name, category, assignedTo
    const req = makeRequest('http://localhost/api/household-duties', {
      method: 'POST',
      body: { householdId: MOCK_HOUSEHOLD_ID }
    })
    const res = await createDuty(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when assignedTo is empty array', async () => {
    const db = makeDb()
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest('http://localhost/api/household-duties', {
      method: 'POST',
      body: {
        householdId: MOCK_HOUSEHOLD_ID,
        category: 'cleaning_kitchen',
        name: 'Clean Kitchen',
        assignedTo: [] // empty — should fail validation
      }
    })
    const res = await createDuty(req)
    expect(res.status).toBe(400)
  })

  it('returns 404 when household does not exist', async () => {
    const collectionsMap: Record<string, any> = {}

    collectionsMap['households'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () => createDocMock(null)) // not found
      }))
    }

    const db = makeDb(collectionsMap)
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest('http://localhost/api/household-duties', {
      method: 'POST',
      body: {
        householdId: MOCK_HOUSEHOLD_ID,
        category: 'cleaning_kitchen',
        name: 'Clean Kitchen',
        assignedTo: [MOCK_USER_ID],
        frequency: 'daily',
        priority: 'medium'
      }
    })
    const res = await createDuty(req)
    expect(res.status).toBe(404)
  })

  it('returns 403 when user is not a member of the household', async () => {
    const householdData = makeHouseholdData({
      createdBy: 'other-user',
      primaryCaregiverId: 'other-user',
      additionalCaregiverIds: []
    })

    const collectionsMap: Record<string, any> = {}
    collectionsMap['households'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () => createDocMock(householdData, MOCK_HOUSEHOLD_ID))
      }))
    }
    collectionsMap['household_duties'] = {
      ...createQueryMock([]),
      doc: jest.fn(() => ({ get: jest.fn(async () => createDocMock(null)) })),
      add: jest.fn(async () => ({ id: 'new-id' }))
    }

    const db = makeDb(collectionsMap)
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest('http://localhost/api/household-duties', {
      method: 'POST',
      body: {
        householdId: MOCK_HOUSEHOLD_ID,
        category: 'cleaning_kitchen',
        name: 'Clean Kitchen',
        assignedTo: [MOCK_USER_ID],
        frequency: 'daily',
        priority: 'medium'
      }
    })
    const res = await createDuty(req)
    expect(res.status).toBe(403)
  })

  it('returns 403 when duty limit is exceeded', async () => {
    ;(canAddDutyToHousehold as jest.Mock).mockReturnValue({
      allowed: false,
      message: 'Upgrade to add more duties',
      currentUsage: 5,
      limit: 5,
      upgradeUrl: '/upgrade'
    })

    const householdData = makeHouseholdData()
    const collectionsMap: Record<string, any> = {}
    collectionsMap['households'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () => createDocMock(householdData, MOCK_HOUSEHOLD_ID))
      }))
    }
    collectionsMap['household_duties'] = {
      ...createQueryMock([]),
      doc: jest.fn(() => ({ get: jest.fn(async () => createDocMock(null)) })),
      add: jest.fn(async () => ({ id: 'new-id' }))
    }
    collectionsMap['users'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () => createDocMock({ displayName: 'Test User' }, MOCK_USER_ID))
      }))
    }

    const db = makeDb(collectionsMap)
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest('http://localhost/api/household-duties', {
      method: 'POST',
      body: {
        householdId: MOCK_HOUSEHOLD_ID,
        category: 'cleaning_kitchen',
        name: 'Clean Kitchen',
        assignedTo: [MOCK_USER_ID],
        frequency: 'daily',
        priority: 'medium'
      }
    })
    const res = await createDuty(req)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).toHaveProperty('upgradeUrl')
  })

  it('creates a duty and returns 201 with duty data', async () => {
    const householdData = makeHouseholdData()

    const collectionsMap: Record<string, any> = {}
    collectionsMap['households'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () => createDocMock(householdData, MOCK_HOUSEHOLD_ID))
      }))
    }
    collectionsMap['household_duties'] = {
      ...createQueryMock([]),
      doc: jest.fn(() => ({ get: jest.fn(async () => createDocMock(null)) })),
      add: jest.fn(async () => ({ id: 'new-duty-id' }))
    }
    collectionsMap['users'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () =>
          createDocMock({ displayName: 'Test User', subscription: { plan: 'free' } }, MOCK_USER_ID)
        )
      }))
    }
    collectionsMap['action_items'] = {
      add: jest.fn(async () => ({ id: 'action-item-id' }))
    }

    const db = makeDb(collectionsMap)
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest('http://localhost/api/household-duties', {
      method: 'POST',
      body: {
        householdId: MOCK_HOUSEHOLD_ID,
        category: 'cleaning_kitchen',
        name: 'Clean Kitchen',
        assignedTo: [MOCK_USER_ID],
        frequency: 'daily',
        priority: 'medium'
      }
    })
    const res = await createDuty(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty('id')
    expect(body.name).toBe('Clean Kitchen')
    expect(body.category).toBe('cleaning_kitchen')
    expect(body.status).toBe('pending')
  })

  it('sets isCustom=true when category is custom', async () => {
    const householdData = makeHouseholdData()

    const collectionsMap: Record<string, any> = {}
    collectionsMap['households'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () => createDocMock(householdData, MOCK_HOUSEHOLD_ID))
      }))
    }
    collectionsMap['household_duties'] = {
      ...createQueryMock([]),
      add: jest.fn(async () => ({ id: 'custom-duty-id' }))
    }
    collectionsMap['users'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () =>
          createDocMock({ displayName: 'Test', subscription: {} }, MOCK_USER_ID)
        )
      }))
    }
    collectionsMap['action_items'] = {
      add: jest.fn(async () => ({ id: 'ai' }))
    }

    const db = makeDb(collectionsMap)
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest('http://localhost/api/household-duties', {
      method: 'POST',
      body: {
        householdId: MOCK_HOUSEHOLD_ID,
        category: 'custom',
        name: 'My Special Duty',
        assignedTo: [MOCK_USER_ID],
        frequency: 'as_needed',
        priority: 'low'
      }
    })
    const res = await createDuty(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.isCustom).toBe(true)
  })
})

// ==================== GET /api/household-duties/[dutyId] ====================

describe('GET /api/household-duties/[dutyId]', () => {
  const params = Promise.resolve({ dutyId: MOCK_DUTY_ID })

  it('returns 401 without token', async () => {
    ;(verifyAuthToken as jest.Mock).mockResolvedValue(null)
    const req = makeRequest(`http://localhost/api/household-duties/${MOCK_DUTY_ID}`)
    const res = await getDuty(req, { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when duty does not exist', async () => {
    const collectionsMap: Record<string, any> = {}
    collectionsMap['household_duties'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () => createDocMock(null))
      }))
    }
    const db = makeDb(collectionsMap)
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest(`http://localhost/api/household-duties/${MOCK_DUTY_ID}`)
    const res = await getDuty(req, { params })
    expect(res.status).toBe(404)
  })

  it('returns 403 when user is not owner or assigned caregiver', async () => {
    const dutyData = makeDutyData({ userId: 'other-user', assignedTo: ['other-caregiver'] })
    const collectionsMap: Record<string, any> = {}
    collectionsMap['household_duties'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () => createDocMock(dutyData))
      }))
    }
    const db = makeDb(collectionsMap)
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest(`http://localhost/api/household-duties/${MOCK_DUTY_ID}`)
    const res = await getDuty(req, { params })
    expect(res.status).toBe(403)
  })

  it('returns 200 with duty data when user is owner', async () => {
    const dutyData = makeDutyData()
    const collectionsMap: Record<string, any> = {}
    collectionsMap['household_duties'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () => createDocMock(dutyData))
      }))
    }
    const db = makeDb(collectionsMap)
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest(`http://localhost/api/household-duties/${MOCK_DUTY_ID}`)
    const res = await getDuty(req, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(MOCK_DUTY_ID)
    expect(body.name).toBe('Clean Kitchen')
  })

  it('returns 200 when user is an assigned caregiver (not owner)', async () => {
    const dutyData = makeDutyData({ userId: 'other-user', assignedTo: [MOCK_USER_ID] })
    const collectionsMap: Record<string, any> = {}
    collectionsMap['household_duties'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () => createDocMock(dutyData))
      }))
    }
    const db = makeDb(collectionsMap)
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest(`http://localhost/api/household-duties/${MOCK_DUTY_ID}`)
    const res = await getDuty(req, { params })
    expect(res.status).toBe(200)
  })
})

// ==================== PATCH /api/household-duties/[dutyId] ====================

describe('PATCH /api/household-duties/[dutyId]', () => {
  const params = Promise.resolve({ dutyId: MOCK_DUTY_ID })

  it('returns 401 without token', async () => {
    ;(verifyAuthToken as jest.Mock).mockResolvedValue(null)
    const req = makeRequest(`http://localhost/api/household-duties/${MOCK_DUTY_ID}`, {
      method: 'PATCH',
      body: { name: 'New Name' }
    })
    const res = await updateDuty(req, { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when duty does not exist', async () => {
    const collectionsMap: Record<string, any> = {}
    collectionsMap['household_duties'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () => createDocMock(null)),
        update: jest.fn(async () => {})
      }))
    }
    const db = makeDb(collectionsMap)
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest(`http://localhost/api/household-duties/${MOCK_DUTY_ID}`, {
      method: 'PATCH',
      body: { name: 'New Name' }
    })
    const res = await updateDuty(req, { params })
    expect(res.status).toBe(404)
  })

  it('returns 403 when user is not the duty creator', async () => {
    const dutyData = makeDutyData({ userId: 'other-user' })
    const collectionsMap: Record<string, any> = {}
    collectionsMap['household_duties'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () => createDocMock(dutyData)),
        update: jest.fn(async () => {})
      }))
    }
    const db = makeDb(collectionsMap)
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest(`http://localhost/api/household-duties/${MOCK_DUTY_ID}`, {
      method: 'PATCH',
      body: { name: 'New Name' }
    })
    const res = await updateDuty(req, { params })
    expect(res.status).toBe(403)
  })

  it('updates and returns 200 with updated duty', async () => {
    const dutyData = makeDutyData()
    const updateFn = jest.fn(async () => {})
    const collectionsMap: Record<string, any> = {}
    collectionsMap['household_duties'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () => createDocMock(dutyData)),
        update: updateFn
      }))
    }
    const db = makeDb(collectionsMap)
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest(`http://localhost/api/household-duties/${MOCK_DUTY_ID}`, {
      method: 'PATCH',
      body: { name: 'Updated Kitchen Duty', priority: 'high' }
    })
    const res = await updateDuty(req, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('Updated Kitchen Duty')
    expect(body.priority).toBe('high')
    expect(updateFn).toHaveBeenCalledTimes(1)
  })

  it('soft-deactivates when isActive=false is patched', async () => {
    const dutyData = makeDutyData()
    const updateFn = jest.fn(async () => {})
    const collectionsMap: Record<string, any> = {}
    collectionsMap['household_duties'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () => createDocMock(dutyData)),
        update: updateFn
      }))
    }
    const db = makeDb(collectionsMap)
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest(`http://localhost/api/household-duties/${MOCK_DUTY_ID}`, {
      method: 'PATCH',
      body: { isActive: false }
    })
    const res = await updateDuty(req, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.isActive).toBe(false)
  })
})

// ==================== DELETE /api/household-duties/[dutyId] ====================

describe('DELETE /api/household-duties/[dutyId]', () => {
  const params = Promise.resolve({ dutyId: MOCK_DUTY_ID })

  it('returns 401 without token', async () => {
    ;(verifyAuthToken as jest.Mock).mockResolvedValue(null)
    const req = makeRequest(`http://localhost/api/household-duties/${MOCK_DUTY_ID}`, {
      method: 'DELETE'
    })
    const res = await deleteDuty(req, { params })
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not the creator', async () => {
    const dutyData = makeDutyData({ userId: 'other-user' })
    const collectionsMap: Record<string, any> = {}
    collectionsMap['household_duties'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () => createDocMock(dutyData)),
        delete: jest.fn(async () => {})
      }))
    }
    const db = makeDb(collectionsMap)
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest(`http://localhost/api/household-duties/${MOCK_DUTY_ID}`, {
      method: 'DELETE'
    })
    const res = await deleteDuty(req, { params })
    expect(res.status).toBe(403)
  })

  it('returns 200 and deletes the duty', async () => {
    const dutyData = makeDutyData()
    const deleteFn = jest.fn(async () => {})
    const collectionsMap: Record<string, any> = {}
    collectionsMap['household_duties'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () => createDocMock(dutyData)),
        delete: deleteFn
      }))
    }
    const db = makeDb(collectionsMap)
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest(`http://localhost/api/household-duties/${MOCK_DUTY_ID}`, {
      method: 'DELETE'
    })
    const res = await deleteDuty(req, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('success', true)
    expect(deleteFn).toHaveBeenCalledTimes(1)
  })
})

// ==================== POST /api/household-duties/[dutyId]/complete ====================

describe('POST /api/household-duties/[dutyId]/complete', () => {
  const params = Promise.resolve({ dutyId: MOCK_DUTY_ID })

  it('returns 401 without token', async () => {
    ;(verifyAuthToken as jest.Mock).mockResolvedValue(null)
    const req = makeRequest(
      `http://localhost/api/household-duties/${MOCK_DUTY_ID}/complete`,
      { method: 'POST', body: {} }
    )
    const res = await completeDuty(req, { params })
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not assigned to the duty', async () => {
    const dutyData = makeDutyData({ userId: 'owner', assignedTo: ['other-caregiver'] })

    const collectionsMap: Record<string, any> = {}
    collectionsMap['household_duties'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () => createDocMock(dutyData))
      }))
    }
    const db = makeDb(collectionsMap)
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest(
      `http://localhost/api/household-duties/${MOCK_DUTY_ID}/complete`,
      { method: 'POST', body: {} }
    )
    const res = await completeDuty(req, { params })
    expect(res.status).toBe(403)
  })

  it('returns 200 and marks duty as completed with transaction', async () => {
    const dutyData = makeDutyData()

    const updateFn = jest.fn()
    const setFn = jest.fn()

    const collectionsMap: Record<string, any> = {}
    collectionsMap['household_duties'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () => createDocMock(dutyData))
      }))
    }
    collectionsMap['users'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () =>
          createDocMock({ displayName: 'Test User' }, MOCK_USER_ID)
        )
      }))
    }
    collectionsMap['action_items'] = {
      ...createQueryMock([]),
      doc: jest.fn(() => ({ get: jest.fn(async () => createDocMock(null)) }))
    }
    collectionsMap['duty_completions'] = {
      doc: jest.fn(() => ({ id: 'completion-id' }))
    }

    const db = {
      collection: jest.fn((name: string) => collectionsMap[name] || {
        doc: jest.fn(() => ({ get: jest.fn(async () => createDocMock(null)) })),
        ...createQueryMock()
      }),
      runTransaction: jest.fn(async (fn: any) => {
        const txn = {
          get: jest.fn(async () => ({
            exists: true,
            data: () => dutyData
          })),
          update: updateFn,
          set: setFn
        }
        const result = await fn(txn)
        return result
      }),
      batch: jest.fn(() => ({
        update: jest.fn(),
        commit: jest.fn(async () => {})
      }))
    }
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest(
      `http://localhost/api/household-duties/${MOCK_DUTY_ID}/complete`,
      { method: 'POST', body: { notes: 'Completed on time' } }
    )
    const res = await completeDuty(req, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('duty')
    expect(body).toHaveProperty('completion')
    expect(updateFn).toHaveBeenCalledTimes(1)
    expect(setFn).toHaveBeenCalledTimes(1)
  })

  it('resets duty to pending after completion when there is a next due date', async () => {
    const dutyData = makeDutyData({ frequency: 'weekly' })

    const updateFn = jest.fn()
    const setFn = jest.fn()

    const collectionsMap: Record<string, any> = {}
    collectionsMap['household_duties'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () => createDocMock(dutyData))
      }))
    }
    collectionsMap['users'] = {
      doc: jest.fn(() => ({
        get: jest.fn(async () => createDocMock({ displayName: 'T' }, MOCK_USER_ID))
      }))
    }
    collectionsMap['action_items'] = { ...createQueryMock() }
    collectionsMap['duty_completions'] = {
      doc: jest.fn(() => ({ id: 'comp-id' }))
    }

    const db = {
      collection: jest.fn((name: string) => collectionsMap[name] || {
        doc: jest.fn(() => ({ get: jest.fn(async () => createDocMock(null)) })),
        ...createQueryMock()
      }),
      runTransaction: jest.fn(async (fn: any) => {
        const capturedUpdates: any = {}
        const txn = {
          get: jest.fn(async () => ({ exists: true, data: () => dutyData })),
          update: (ref: any, data: any) => { Object.assign(capturedUpdates, data) },
          set: setFn
        }
        const result = await fn(txn)
        // For weekly duties, status should reset to 'pending' after completion
        expect(capturedUpdates.status).toBe('pending')
        expect(capturedUpdates.nextDueDate).toBeDefined()
        return result
      }),
      batch: jest.fn(() => ({
        update: jest.fn(),
        commit: jest.fn(async () => {})
      }))
    }
    ;(getAdminDb as jest.Mock).mockReturnValue(db)

    const req = makeRequest(
      `http://localhost/api/household-duties/${MOCK_DUTY_ID}/complete`,
      { method: 'POST', body: {} }
    )
    await completeDuty(req, { params })
  })
})
