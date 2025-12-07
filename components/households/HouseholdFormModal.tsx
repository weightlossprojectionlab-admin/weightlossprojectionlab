/**
 * Household Form Modal
 *
 * Modal form for creating/editing households with member selection
 */

'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { apiClient } from '@/lib/api-client'
import toast from 'react-hot-toast'
import type { Household, HouseholdFormData } from '@/types/household'
import type { PatientProfile } from '@/types/medical'

interface HouseholdFormModalProps {
  isOpen: boolean
  onClose: () => void
  household?: Household
  onSuccess: () => void
}

export function HouseholdFormModal({ isOpen, onClose, household, onSuccess }: HouseholdFormModalProps) {
  const [formData, setFormData] = useState<HouseholdFormData>({
    name: '',
    nickname: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    },
    memberIds: [],
    primaryResidentId: undefined,
    kitchenConfig: {
      hasSharedInventory: true,
      separateShoppingLists: false
    }
  })

  const [availablePatients, setAvailablePatients] = useState<PatientProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingPatients, setLoadingPatients] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchAvailablePatients()

      if (household) {
        // Edit mode - populate form
        setFormData({
          name: household.name,
          nickname: household.nickname,
          address: household.address,
          memberIds: household.memberIds,
          primaryResidentId: household.primaryResidentId,
          kitchenConfig: household.kitchenConfig
        })
      } else {
        // Create mode - reset form
        resetForm()
      }
    }
  }, [isOpen, household])

  const resetForm = () => {
    setFormData({
      name: '',
      nickname: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: ''
      },
      memberIds: [],
      primaryResidentId: undefined,
      kitchenConfig: {
        hasSharedInventory: true,
        separateShoppingLists: false
      }
    })
  }

  const fetchAvailablePatients = async () => {
    const user = auth.currentUser
    if (!user) return

    try {
      setLoadingPatients(true)
      // apiClient.get() already unwraps the 'data' field from the API response
      const patients = await apiClient.get<PatientProfile[]>('/patients')
      setAvailablePatients(patients || [])
    } catch (error) {
      logger.error('Failed to fetch patients', error as Error)
      toast.error('Failed to load patients')
    } finally {
      setLoadingPatients(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = auth.currentUser
    if (!user) return

    // Validation
    if (!formData.name.trim()) {
      toast.error('Please enter a household name')
      return
    }

    if (!formData.address.street.trim() || !formData.address.city.trim() || !formData.address.state.trim()) {
      toast.error('Please enter a complete address')
      return
    }

    try {
      setLoading(true)

      const endpoint = household
        ? `/households/${household.id}`
        : '/households'

      const method = household ? 'PUT' : 'POST'

      // Use apiClient which handles CSRF tokens automatically
      await apiClient.request(endpoint, {
        method,
        body: JSON.stringify(formData)
      })

      toast.success(household ? 'Household updated successfully' : 'Household created successfully')
      onSuccess()
      onClose()
      resetForm()
    } catch (error) {
      logger.error('Failed to save household', error as Error, {
        operation: household ? 'update' : 'create',
        householdId: household?.id,
        householdName: formData.name,
        memberCount: formData.memberIds?.length || 0
      })
      toast.error(error instanceof Error ? error.message : 'Failed to save household')
    } finally {
      setLoading(false)
    }
  }

  const handleMemberToggle = (patientId: string) => {
    setFormData(prev => {
      const currentMemberIds = prev.memberIds || []
      const isSelected = currentMemberIds.includes(patientId)
      const newMemberIds = isSelected
        ? currentMemberIds.filter(id => id !== patientId)
        : [...currentMemberIds, patientId]

      // If removing primary resident, clear it
      const newPrimaryResidentId = isSelected && prev.primaryResidentId === patientId
        ? undefined
        : prev.primaryResidentId

      return {
        ...prev,
        memberIds: newMemberIds,
        primaryResidentId: newPrimaryResidentId
      }
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            {household ? 'Edit Household' : 'Create Household'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Household Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Mom & Dad's House"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Nickname (optional)
                </label>
                <input
                  type="text"
                  value={formData.nickname || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder="e.g., Main House"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Address</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    address: { ...prev.address, street: e.target.value }
                  }))}
                  placeholder="123 Main St"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  required
                />
              </div>


              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, city: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, state: e.target.value }
                    }))}
                    placeholder="CA"
                    maxLength={2}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground uppercase"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={formData.address.zipCode}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    address: { ...prev.address, zipCode: e.target.value }
                  }))}
                  placeholder="12345"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Members Section - THIS IS WHERE YOU SELECT FAMILY MEMBERS */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <span className="text-lg">👥</span>
              Select Family Members Who Live Here
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Check the boxes next to family members who live at this address
            </p>
            {loadingPatients ? (
              <div className="text-sm text-muted-foreground">Loading family members...</div>
            ) : availablePatients.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No family members found. Please add family members first.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto border border-border rounded-lg p-3 bg-background">
                {availablePatients.map((patient) => (
                  <label
                    key={patient.id}
                    className="flex items-center gap-3 p-3 hover:bg-primary/5 rounded cursor-pointer border border-transparent hover:border-primary/20 transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={formData.memberIds?.includes(patient.id) || false}
                      onChange={() => handleMemberToggle(patient.id)}
                      className="w-5 h-5 rounded border-gray-300"
                    />
                    <div className="flex items-center gap-3 flex-1">
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
                      <span className="text-sm font-medium text-foreground">{patient.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Selected: {formData.memberIds?.length || 0} {(formData.memberIds?.length || 0) === 1 ? 'member' : 'members'}
            </p>
          </div>

          {/* Kitchen Config */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Kitchen Settings</h3>
            <div className="space-y-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.kitchenConfig?.hasSharedInventory ?? true}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    kitchenConfig: {
                      ...prev.kitchenConfig!,
                      hasSharedInventory: e.target.checked
                    }
                  }))}
                  className="w-4 h-4 mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">Shared Inventory</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Members share the same kitchen and groceries
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.kitchenConfig?.separateShoppingLists ?? false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    kitchenConfig: {
                      ...prev.kitchenConfig!,
                      separateShoppingLists: e.target.checked
                    }
                  }))}
                  className="w-4 h-4 mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">Separate Shopping Lists</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Each member maintains their own shopping list
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Saving...' : household ? 'Update Household' : 'Create Household'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
