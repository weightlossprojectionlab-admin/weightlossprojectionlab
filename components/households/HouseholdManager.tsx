/**
 * Household Manager Component
 *
 * Allows caregivers to manage multiple households (residences) and assign
 * patients to the correct physical location for accurate inventory/shopping.
 */

'use client'

import { useState } from 'react'
import { PlusIcon, HomeIcon, MapPinIcon, UsersIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import type { Household } from '@/types/household'
import { HouseholdFormModal } from './HouseholdFormModal'
import { useHouseholdMembers } from '@/hooks/useHouseholdMembers'
import { useHouseholds } from '@/hooks/useHouseholds'

export function HouseholdManager() {
  const { households, loading, error: fetchError } = useHouseholds()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingHousehold, setEditingHousehold] = useState<Household | undefined>()
  const [expandedHouseholdId, setExpandedHouseholdId] = useState<string | null>(null)

  const handleDelete = async (householdId: string, householdName: string) => {
    const user = auth.currentUser
    if (!user) return

    if (!confirm(`Are you sure you want to delete "${householdName}"? All patients will be removed from this household.`)) {
      return
    }

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/households/${householdId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete household')
      }

      toast.success('Household deleted successfully')
      // Real-time listener will auto-update the list
    } catch (error) {
      logger.error('Failed to delete household', error as Error)
      toast.error('Failed to delete household')
    }
  }

  const handleEdit = (household: Household) => {
    setEditingHousehold(household)
    setIsFormOpen(true)
  }

  const handleFormSuccess = () => {
    setEditingHousehold(undefined)
    // Real-time listener will auto-update the list
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingHousehold(undefined)
  }

  const formatAddress = (address: Household['address']) => {
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zipCode
    ].filter(Boolean)
    return parts.join(', ')
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Households</h2>
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="bg-card rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Households</h2>
        <div className="bg-error-light dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-error-dark font-medium">{fetchError}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-card rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Households</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage physical locations where your family members live
            </p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            Add Household
          </button>
        </div>

        {households.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <HomeIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No households created yet</p>
            <p className="text-sm text-muted-foreground mb-6">
              Create households to organize family members by where they live.<br />
              Each household has its own kitchen inventory and shopping list.
            </p>
            <button
              onClick={() => setIsFormOpen(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              Create Your First Household
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {households.map((household) => (
              <div
                key={household.id}
                className="border-2 border-border rounded-lg overflow-hidden hover:border-primary-light transition-colors"
              >
                {/* Household Header */}
                <div className="p-4 bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <HomeIcon className="w-5 h-5 text-primary" />
                        <h3 className="text-base font-semibold text-foreground">
                          {household.name}
                        </h3>
                        {household.nickname && (
                          <span className="text-sm text-muted-foreground">
                            ({household.nickname})
                          </span>
                        )}
                      </div>

                      <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
                        <MapPinIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{formatAddress(household.address)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <UsersIcon className="w-4 h-4" />
                        <span>
                          {household.memberIds.length} {household.memberIds.length === 1 ? 'member' : 'members'}
                        </span>
                        {household.kitchenConfig?.hasSharedInventory && (
                          <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                            Shared Kitchen
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(household)}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary-light rounded transition-colors"
                        title="Edit household"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(household.id, household.name)}
                        className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete household"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Members List */}
                <div className="border-t border-border">
                  <button
                    onClick={() => setExpandedHouseholdId(
                      expandedHouseholdId === household.id ? null : household.id
                    )}
                    className="w-full px-4 py-2 text-sm text-muted-foreground hover:bg-muted/30 transition-colors text-left"
                  >
                    {expandedHouseholdId === household.id ? '▼' : '▶'} View Members ({household.memberIds.length})
                  </button>

                  {expandedHouseholdId === household.id && (
                    <div className="px-4 pb-4 pt-2">
                      <HouseholdMembersList householdId={household.id} />
                      <div className="mt-3 pt-3 border-t border-border">
                        <button
                          onClick={() => handleEdit(household)}
                          className="text-sm text-primary hover:text-primary-hover font-medium"
                        >
                          + Add/Remove Members
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            💡 Why households matter
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Each household has its own kitchen inventory and shopping list. If you manage family members
            who live in different locations, create separate households to keep their groceries organized.
          </p>
        </div>
      </div>

      <HouseholdFormModal
        isOpen={isFormOpen}
        onClose={handleFormClose}
        household={editingHousehold}
        onSuccess={handleFormSuccess}
      />
    </>
  )
}

/**
 * Sub-component: Display household members with real-time updates
 */
function HouseholdMembersList({ householdId }: { householdId: string }) {
  const { members, loading, error } = useHouseholdMembers(householdId)

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading members...</div>
  }

  if (error) {
    return <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
  }

  if (members.length === 0) {
    return <div className="text-sm text-muted-foreground">No members assigned yet</div>
  }

  return (
    <div className="space-y-2">
      {members.map((patient) => (
        <div
          key={patient.id}
          className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded"
        >
          <div className="flex items-center gap-3">
            {patient.photo ? (
              <img
                src={patient.photo}
                alt={patient.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {patient.name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-foreground">{patient.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {patient.type || 'member'}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
