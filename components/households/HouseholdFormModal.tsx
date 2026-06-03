/**
 * Household Form Modal
 *
 * Form for adding/editing a household. Semantic intent: the caregiver
 * is *registering an existing residence* (where some people they care
 * for live), not constructing a logical container. So the form leads
 * with the people — the load-bearing thing — and treats the address as
 * informational metadata.
 *
 * Single-source-of-truth model: `Patient.householdId` is canonical.
 * The Household doc stores no membership array. When a patient is
 * checked here, the server sets their `householdId` to this household —
 * which atomically moves them out of any prior household via the
 * single-field invariant. The UI surfaces "currently in X — will move
 * here" so the consequence is visible before submit.
 *
 * Kitchen config (shared inventory / separate shopping) is product
 * preference, not residential fact — it lives on a separate
 * household-settings surface, not in the create form. Sensible
 * defaults apply automatically.
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { apiClient } from '@/lib/api-client'
import toast from 'react-hot-toast'
import type { Household, HouseholdFormData } from '@/types/household'
import type { PatientProfile } from '@/types/medical'
import { useHouseholds } from '@/hooks/useHouseholds'
import { getPatientDisplayName } from '@/lib/life-stage-utils'

interface HouseholdFormModalProps {
  isOpen: boolean
  onClose: () => void
  household?: Household
  onSuccess: () => void
}

export function HouseholdFormModal({ isOpen, onClose, household, onSuccess }: HouseholdFormModalProps) {
  const isEdit = !!household
  const { households: allHouseholds } = useHouseholds()

  const [formData, setFormData] = useState<HouseholdFormData>({
    name: '',
    nickname: '',
    address: { street: '', city: '', state: '', zipCode: '' },
    memberIds: [],
  })

  const [availablePatients, setAvailablePatients] = useState<PatientProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingPatients, setLoadingPatients] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    fetchAvailablePatients()
    if (household) {
      // Edit mode: seed form from the household doc + derive members
      // from Patient.householdId (single source of truth).
      setFormData({
        name: household.name,
        nickname: household.nickname,
        address: household.address ?? { street: '', city: '', state: '', zipCode: '' },
        memberIds: [], // populated by fetchAvailablePatients via derivation
      })
    } else {
      resetForm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, household])

  // Once patients load (in edit mode), seed the checked set from the
  // patients currently pointing at this household. Authoritative — we
  // don't trust any stale memberIds[] that may exist on the doc.
  useEffect(() => {
    if (!isEdit || !household || availablePatients.length === 0) return
    const currentMemberIds = availablePatients
      .filter(p => p.householdId === household.id)
      .map(p => p.id)
    setFormData(prev => ({ ...prev, memberIds: currentMemberIds }))
  }, [isEdit, household, availablePatients])

  const resetForm = () => {
    setFormData({
      name: '',
      nickname: '',
      address: { street: '', city: '', state: '', zipCode: '' },
      memberIds: [],
    })
  }

  const fetchAvailablePatients = async () => {
    const user = auth.currentUser
    if (!user) return
    try {
      setLoadingPatients(true)
      const patients = await apiClient.get<PatientProfile[]>('/patients')
      setAvailablePatients(patients || [])
    } catch (error) {
      logger.error('Failed to fetch patients', error as Error)
      toast.error('Failed to load family members')
    } finally {
      setLoadingPatients(false)
    }
  }

  // Map: patientId → name of their current household (excluding the
  // one being edited). Lets us show "currently in My House" / "will
  // move from My House" affordances on each row.
  const householdNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const h of allHouseholds || []) {
      map.set(h.id, h.name)
    }
    return map
  }, [allHouseholds])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = auth.currentUser
    if (!user) return

    if (!formData.name.trim()) {
      toast.error('Please enter a household name')
      return
    }
    const memberIds = formData.memberIds ?? []
    if (memberIds.length === 0) {
      toast.error('Add at least one member — a household needs residents')
      return
    }

    try {
      setLoading(true)

      // Address: keep struct if any field is non-empty; otherwise
      // send null on edit (so server clears) or undefined on create
      // (so server skips). Same logic for nickname.
      const addressHasContent = !!(
        formData.address?.street?.trim() ||
        formData.address?.city?.trim() ||
        formData.address?.state?.trim() ||
        formData.address?.zipCode?.trim()
      )
      const trimmedNickname = formData.nickname?.trim() ?? ''

      const payload: HouseholdFormData = {
        name: formData.name.trim(),
        nickname: trimmedNickname
          ? trimmedNickname
          : (isEdit ? null : undefined),
        address: addressHasContent
          ? formData.address
          : (isEdit ? null : undefined),
        memberIds,
      }

      if (household) {
        await apiClient.put(`/households/${household.id}`, payload)
      } else {
        await apiClient.post('/households', payload)
      }

      toast.success(household ? 'Household updated' : 'Household added')
      onSuccess()
      onClose()
      resetForm()
    } catch (error) {
      logger.error('Failed to save household', error as Error, {
        operation: household ? 'update' : 'create',
        householdId: household?.id,
        memberCount: formData.memberIds?.length || 0,
      })
      toast.error(error instanceof Error ? error.message : 'Failed to save household')
    } finally {
      setLoading(false)
    }
  }

  const handleMemberToggle = (patientId: string) => {
    setFormData(prev => {
      const current = prev.memberIds || []
      const next = current.includes(patientId)
        ? current.filter(id => id !== patientId)
        : [...current, patientId]
      return { ...prev, memberIds: next }
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="household-form-title"
        className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 id="household-form-title" className="text-xl font-bold text-foreground">
              {isEdit ? 'Edit this household' : 'Add a household'}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {isEdit
                ? 'Update who lives here or rename this place.'
                : 'Register a residence where people you care for live.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {/* Members FIRST — the load-bearing thing about a household. */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              <span className="text-lg">👥</span>
              Who lives here?
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Pick the family members who share this residence. They'll share kitchen inventory and shopping lists for this household.
            </p>

            {loadingPatients ? (
              <div className="text-sm text-muted-foreground">Loading family members...</div>
            ) : availablePatients.length === 0 ? (
              <div className="text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg p-4 text-center">
                No family members yet. Add a family member first, then come back to register where they live.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto border border-border rounded-lg p-3 bg-background">
                {availablePatients.map(patient => {
                  const checked = formData.memberIds?.includes(patient.id) ?? false
                  const currentHouseholdId = patient.householdId
                  // Four membership states for each row:
                  //   (a) unassigned + unchecked → normal
                  //   (b) unassigned + checked   → normal-checked
                  //   (c) IN-THIS  + checked     → "Currently a member" (edit, pre-checked)
                  //   (d) IN-THIS  + unchecked   → "Will be removed" (edit, destructive)
                  //   (e) IN-OTHER + unchecked   → "Currently in X" (informational)
                  //   (f) IN-OTHER + checked     → "Will move from X" (destructive)
                  const inThisHousehold = isEdit && currentHouseholdId === household?.id
                  const inOtherHousehold = !!currentHouseholdId && currentHouseholdId !== household?.id
                  const otherHouseholdName = inOtherHousehold
                    ? householdNameById.get(currentHouseholdId as string) ?? 'another household'
                    : null
                  const willMove = checked && inOtherHousehold
                  const willBeRemoved = !checked && inThisHousehold
                  const isDestructive = willMove || willBeRemoved

                  return (
                    <label
                      key={patient.id}
                      className={`flex items-center gap-3 p-3 rounded border transition-colors cursor-pointer ${
                        isDestructive
                          ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                          : checked
                            ? 'bg-primary/5 border-primary/30'
                            : 'border-transparent hover:bg-primary/5 hover:border-primary/20'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleMemberToggle(patient.id)}
                        className="w-5 h-5 rounded border-gray-300 flex-shrink-0"
                      />
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {patient.photo ? (
                          <img
                            src={patient.photo}
                            alt={getPatientDisplayName(patient) || 'Unnamed'}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-primary">
                              {getPatientDisplayName(patient).charAt(0) || '?'}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {getPatientDisplayName(patient) || 'Unnamed member'}
                          </div>
                          {willMove && (
                            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                              Will move from {otherHouseholdName}
                            </div>
                          )}
                          {willBeRemoved && (
                            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                              Will be removed
                            </div>
                          )}
                          {!willMove && inOtherHousehold && (
                            <div className="text-xs text-muted-foreground">
                              Currently in {otherHouseholdName}
                            </div>
                          )}
                          {inThisHousehold && checked && (
                            <div className="text-xs text-muted-foreground">
                              Currently a member
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Selected: {formData.memberIds?.length || 0}{' '}
              {(formData.memberIds?.length || 0) === 1 ? 'member' : 'members'}
            </p>
          </div>

          {/* Name + nickname */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">What do you call this place?</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Mom & Dad's House"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Nickname <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.nickname || ''}
                  onChange={e => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder="e.g., The Main House"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Address — OPTIONAL. Informational metadata; not required to
              identify the household. Geo-aware shopping (future) will
              consume it. */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Where is it? <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Helps with delivery and shopping later. You can add this anytime.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={formData.address?.street || ''}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  address: { ...(prev.address ?? { street: '', city: '', state: '' }), street: e.target.value },
                }))}
                placeholder="Street address"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={formData.address?.city || ''}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    address: { ...(prev.address ?? { street: '', city: '', state: '' }), city: e.target.value },
                  }))}
                  placeholder="City"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
                <input
                  type="text"
                  value={formData.address?.state || ''}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    address: { ...(prev.address ?? { street: '', city: '', state: '' }), state: e.target.value },
                  }))}
                  placeholder="State"
                  maxLength={2}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground uppercase"
                />
              </div>
              <input
                type="text"
                value={formData.address?.zipCode || ''}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  address: { ...(prev.address ?? { street: '', city: '', state: '' }), zipCode: e.target.value },
                }))}
                placeholder="ZIP"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              />
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
              {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Add household'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
