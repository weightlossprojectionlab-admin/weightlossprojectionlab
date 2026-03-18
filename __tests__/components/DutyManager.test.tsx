/**
 * Household Duty Component Tests
 *
 * Tests for:
 * - DutyFormModal: rendering steps, validation, submission
 * - DutyListView: list rendering, empty state, complete/delete actions
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DutyFormModal } from '@/components/household/DutyFormModal'
import { DutyListView } from '@/components/household/DutyListView'
import type { HouseholdDuty } from '@/types/household-duties'
import type { CaregiverProfile } from '@/types/caregiver'

// ==================== MOCKS ====================

jest.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn(async () => 'mock-token')
    }
  }
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() }
}))

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn()
  },
  success: jest.fn(),
  error: jest.fn()
}))

jest.mock('@/hooks/useUser', () => ({
  useUser: () => ({ user: { id: 'user-1', subscription: { plan: 'free' } }, loading: false })
}))

jest.mock('@/lib/feature-gates', () => ({
  canAddDutyToHousehold: jest.fn(() => ({ allowed: true }))
}))

jest.mock('@/components/subscription', () => ({
  UpgradePrompt: ({ message }: { message: string }) => (
    <div data-testid="upgrade-prompt">{message}</div>
  )
}))

// ==================== FIXTURES ====================

const MOCK_HOUSEHOLD_ID = 'household-abc'
const MOCK_CAREGIVERS: CaregiverProfile[] = [
  { id: 'caregiver-1', name: 'Alice Smith', email: 'alice@example.com' } as any,
  { id: 'caregiver-2', name: 'Bob Jones', email: 'bob@example.com' } as any
]

function makeDuty(overrides: Partial<HouseholdDuty> = {}): HouseholdDuty {
  return {
    id: 'duty-1',
    householdId: MOCK_HOUSEHOLD_ID,
    userId: 'user-1',
    name: 'Clean Kitchen',
    category: 'cleaning_kitchen',
    isCustom: false,
    assignedTo: ['caregiver-1'],
    assignedBy: 'user-1',
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
    createdBy: 'user-1',
    lastModified: '2024-01-01T00:00:00.000Z',
    isActive: true,
    ...overrides
  }
}

// ==================== DutyFormModal Tests ====================

describe('DutyFormModal', () => {
  const defaultProps = {
    householdId: MOCK_HOUSEHOLD_ID,
    householdName: 'Test Household',
    caregivers: MOCK_CAREGIVERS,
    onClose: jest.fn(),
    onSuccess: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('renders the category selection step by default', () => {
    render(<DutyFormModal {...defaultProps} />)
    expect(screen.getByText('Select Duty Category')).toBeInTheDocument()
  })

  it('shows household name in header', () => {
    render(<DutyFormModal {...defaultProps} />)
    expect(screen.getByText('Test Household')).toBeInTheDocument()
  })

  it('shows all duty categories in step 1', () => {
    render(<DutyFormModal {...defaultProps} />)
    expect(screen.getByText('Laundry')).toBeInTheDocument()
    expect(screen.getByText('Shopping')).toBeInTheDocument()
    expect(screen.getByText('Kitchen Cleaning')).toBeInTheDocument()
    expect(screen.getByText('Bathroom Cleaning')).toBeInTheDocument()
    expect(screen.getByText('Bedroom Cleaning')).toBeInTheDocument()
    expect(screen.getByText('Custom Duty')).toBeInTheDocument()
  })

  it('navigates to template step when a non-custom category is clicked', async () => {
    render(<DutyFormModal {...defaultProps} />)
    await userEvent.click(screen.getByText('Laundry'))
    expect(screen.getByText('Choose a Template or Create Custom')).toBeInTheDocument()
  })

  it('skips template step and goes straight to details for Custom Duty', async () => {
    render(<DutyFormModal {...defaultProps} />)
    await userEvent.click(screen.getByText('Custom Duty'))
    expect(screen.getByText('Duty Name *')).toBeInTheDocument()
  })

  it('shows preset duty templates in step 2', async () => {
    render(<DutyFormModal {...defaultProps} />)
    await userEvent.click(screen.getByText('Laundry'))
    expect(screen.getByText('Wash Laundry')).toBeInTheDocument()
  })

  it('pre-fills form when a preset template is selected', async () => {
    render(<DutyFormModal {...defaultProps} />)
    await userEvent.click(screen.getByText('Laundry'))
    await userEvent.click(screen.getByText('Wash Laundry'))

    const nameInput = screen.getByPlaceholderText('e.g., Wash laundry')
    expect((nameInput as HTMLInputElement).value).toBe('Wash Laundry')
  })

  it('can go back from template step to category step', async () => {
    render(<DutyFormModal {...defaultProps} />)
    await userEvent.click(screen.getByText('Laundry'))
    await userEvent.click(screen.getByText('← Back to categories'))
    expect(screen.getByText('Select Duty Category')).toBeInTheDocument()
  })

  it('shows caregiver list in details step', async () => {
    render(<DutyFormModal {...defaultProps} />)
    await userEvent.click(screen.getByText('Custom Duty'))
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('Bob Jones')).toBeInTheDocument()
  })

  it('shows empty caregiver message when no caregivers are provided', async () => {
    render(<DutyFormModal {...defaultProps} caregivers={[]} />)
    await userEvent.click(screen.getByText('Custom Duty'))
    expect(
      screen.getByText('No caregivers available. Add caregivers to assign duties.')
    ).toBeInTheDocument()
  })

  it('shows validation error when submitting with empty name', async () => {
    const toast = require('react-hot-toast').default
    render(<DutyFormModal {...defaultProps} />)

    // Go to details step
    await userEvent.click(screen.getByText('Custom Duty'))

    // Click save without entering a name
    await userEvent.click(screen.getByText('Create Duty'))

    expect(toast.error).toHaveBeenCalledWith('Please enter a duty name')
  })

  it('shows validation error when submitting without assigning a caregiver', async () => {
    const toast = require('react-hot-toast').default
    render(<DutyFormModal {...defaultProps} />)

    await userEvent.click(screen.getByText('Custom Duty'))

    const nameInput = screen.getByPlaceholderText('e.g., Wash laundry')
    await userEvent.type(nameInput, 'My Custom Duty')

    await userEvent.click(screen.getByText('Create Duty'))

    expect(toast.error).toHaveBeenCalledWith('Please assign at least one caregiver')
  })

  it('submits form successfully with name and caregiver', async () => {
    const toast = require('react-hot-toast').default
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => makeDuty({ name: 'My Custom Duty' })
    })

    const onSuccess = jest.fn()
    const onClose = jest.fn()
    render(<DutyFormModal {...defaultProps} onSuccess={onSuccess} onClose={onClose} />)

    await userEvent.click(screen.getByText('Custom Duty'))

    const nameInput = screen.getByPlaceholderText('e.g., Wash laundry')
    await userEvent.type(nameInput, 'My Custom Duty')

    // Assign caregiver
    const checkboxes = screen.getAllByRole('checkbox')
    await userEvent.click(checkboxes[0]) // first caregiver checkbox

    await userEvent.click(screen.getByText('Create Duty'))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Duty created!')
      expect(onSuccess).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = jest.fn()
    render(<DutyFormModal {...defaultProps} onClose={onClose} />)

    await userEvent.click(screen.getByText('Custom Duty'))
    await userEvent.click(screen.getByText('Cancel'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows "Edit Household Duty" title when editing an existing duty', () => {
    render(<DutyFormModal {...defaultProps} duty={makeDuty()} />)
    expect(screen.getByText('Edit Household Duty')).toBeInTheDocument()
  })

  it('pre-fills form fields when editing an existing duty', () => {
    const duty = makeDuty({ name: 'Pre-existing Duty', priority: 'high' })
    render(<DutyFormModal {...defaultProps} duty={duty} />)

    const nameInput = screen.getByPlaceholderText('e.g., Wash laundry')
    expect((nameInput as HTMLInputElement).value).toBe('Pre-existing Duty')
  })
})

// ==================== DutyListView Tests ====================

describe('DutyListView', () => {
  const defaultProps = {
    householdId: MOCK_HOUSEHOLD_ID,
    householdName: 'Test Household',
    caregivers: MOCK_CAREGIVERS
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset feature gate to allowed (clearAllMocks doesn't reset mockReturnValue)
    const { canAddDutyToHousehold } = require('@/lib/feature-gates')
    canAddDutyToHousehold.mockReturnValue({ allowed: true })
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        duties: [],
        stats: {
          total: 0,
          byStatus: { pending: 0, in_progress: 0, completed: 0, skipped: 0, overdue: 0 },
          byCategory: {},
          overdue: 0,
          completedThisWeek: 0,
          completedThisMonth: 0
        },
        total: 0,
        page: 1,
        limit: 50,
        hasMore: false
      })
    })
  })

  it('shows loading spinner on initial render', () => {
    render(<DutyListView {...defaultProps} />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows empty state when no duties exist', async () => {
    render(<DutyListView {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('No duties found')).toBeInTheDocument()
    })
  })

  it('shows "Add Duty" button', async () => {
    render(<DutyListView {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Add Duty')).toBeInTheDocument()
    })
  })

  it('renders stats when duties exist', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        duties: [makeDuty()],
        stats: {
          total: 1,
          byStatus: { pending: 1, in_progress: 0, completed: 0, skipped: 0, overdue: 0 },
          byCategory: { cleaning_kitchen: 1 },
          overdue: 0,
          completedThisWeek: 0,
          completedThisMonth: 0
        },
        total: 1,
        page: 1,
        limit: 50,
        hasMore: false
      })
    })

    render(<DutyListView {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Total Duties')).toBeInTheDocument()
    })
  })

  it('renders duty card with name and assigned caregiver', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        duties: [makeDuty({ assignedTo: ['caregiver-1'] })],
        stats: {
          total: 1,
          byStatus: { pending: 1, in_progress: 0, completed: 0, skipped: 0, overdue: 0 },
          byCategory: {},
          overdue: 0,
          completedThisWeek: 0,
          completedThisMonth: 0
        },
        total: 1,
        page: 1,
        limit: 50,
        hasMore: false
      })
    })

    render(<DutyListView {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Clean Kitchen')).toBeInTheDocument()
    })

    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('shows Complete button for non-completed duties', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        duties: [makeDuty({ status: 'pending' })],
        stats: {
          total: 1,
          byStatus: { pending: 1, in_progress: 0, completed: 0, skipped: 0, overdue: 0 },
          byCategory: {},
          overdue: 0,
          completedThisWeek: 0,
          completedThisMonth: 0
        },
        total: 1,
        page: 1,
        limit: 50,
        hasMore: false
      })
    })

    render(<DutyListView {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Complete')).toBeInTheDocument()
    })
  })

  it('does NOT show Complete button for completed duties', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        duties: [makeDuty({ status: 'completed' })],
        stats: {
          total: 1,
          byStatus: { pending: 0, in_progress: 0, completed: 1, skipped: 0, overdue: 0 },
          byCategory: {},
          overdue: 0,
          completedThisWeek: 1,
          completedThisMonth: 1
        },
        total: 1,
        page: 1,
        limit: 50,
        hasMore: false
      })
    })

    render(<DutyListView {...defaultProps} />)

    await waitFor(() => {
      expect(screen.queryByText('Complete')).not.toBeInTheDocument()
    })
  })

  it('shows upgrade prompt when duty limit is reached', async () => {
    const { canAddDutyToHousehold } = require('@/lib/feature-gates')
    canAddDutyToHousehold.mockReturnValue({
      allowed: false,
      message: 'Upgrade to add more duties'
    })

    render(<DutyListView {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument()
    })
  })

  it('disables Add Duty button when duty limit is reached', async () => {
    const { canAddDutyToHousehold } = require('@/lib/feature-gates')
    canAddDutyToHousehold.mockReturnValue({
      allowed: false,
      message: 'Upgrade to add more duties'
    })

    render(<DutyListView {...defaultProps} />)

    await waitFor(() => {
      const addButton = screen.getByText('Add Duty').closest('button')
      expect(addButton).toBeDisabled()
    })
  })

  it('filters list by status when filter tab is clicked', async () => {
    render(<DutyListView {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Add Duty')).toBeInTheDocument()
    })

    // Click the "Pending" filter tab (use role to avoid matching stats label)
    await userEvent.click(screen.getByRole('button', { name: 'Pending' }))

    await waitFor(() => {
      // fetch should have been called with status=pending
      const calls = (global.fetch as jest.Mock).mock.calls
      expect(calls.some(([url]: [string]) => url.includes('status=pending'))).toBe(true)
    })
  })

  it('opens DutyFormModal when Add Duty is clicked', async () => {
    render(<DutyListView {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Add Duty')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Add Duty'))

    expect(screen.getByText('New Household Duty')).toBeInTheDocument()
  })
})
