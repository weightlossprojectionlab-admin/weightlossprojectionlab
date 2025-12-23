'use client'

/**
 * Duty Form Modal
 *
 * Modal for creating and editing household duties.
 * Includes:
 * - Category selection with predefined duty templates
 * - Custom duty creation
 * - Caregiver assignment
 * - Scheduling and frequency
 * - Priority and notifications
 */

import { useState, useEffect } from 'react'
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import {
  DutyCategory,
  DutyFrequency,
  DutyPriority,
  HouseholdDuty,
  CreateDutyRequest,
  UpdateDutyRequest,
  PREDEFINED_DUTIES,
  PredefinedDuty
} from '@/types/household-duties'
import { CaregiverProfile } from '@/types/caregiver'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'

interface DutyFormModalProps {
  householdId: string // PRIMARY: Which household this duty belongs to
  householdName: string
  caregivers: CaregiverProfile[]
  // Optional patient context - for patient-specific duties like "Give medication to Mom"
  forPatientId?: string
  forPatientName?: string
  duty?: HouseholdDuty // If editing
  onClose: () => void
  onSuccess: () => void
}

const DUTY_CATEGORIES: { value: DutyCategory; label: string }[] = [
  { value: 'laundry', label: 'Laundry' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'cleaning_bedroom', label: 'Bedroom Cleaning' },
  { value: 'cleaning_bathroom', label: 'Bathroom Cleaning' },
  { value: 'cleaning_kitchen', label: 'Kitchen Cleaning' },
  { value: 'cleaning_living_areas', label: 'Living Areas Cleaning' },
  { value: 'meal_preparation', label: 'Meal Preparation' },
  { value: 'grocery_shopping', label: 'Grocery Shopping' },
  { value: 'medication_pickup', label: 'Medication Pickup' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'personal_care', label: 'Personal Care' },
  { value: 'pet_care', label: 'Pet Care' },
  { value: 'yard_work', label: 'Yard Work' },
  { value: 'custom', label: 'Custom Duty' }
]

const FREQUENCIES: { value: DutyFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'as_needed', label: 'As Needed' },
  { value: 'custom', label: 'Custom Schedule' }
]

const PRIORITIES: { value: DutyPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
]

export function DutyFormModal({
  householdId,
  householdName,
  caregivers,
  forPatientId,
  forPatientName,
  duty,
  onClose,
  onSuccess
}: DutyFormModalProps) {
  const [step, setStep] = useState<'category' | 'template' | 'details'>('category')
  const [selectedCategory, setSelectedCategory] = useState<DutyCategory | null>(
    duty?.category || null
  )
  const [selectedTemplate, setSelectedTemplate] = useState<PredefinedDuty | null>(null)
  const [isCustom, setIsCustom] = useState(duty?.isCustom || false)

  // Form state
  const [name, setName] = useState(duty?.name || '')
  const [description, setDescription] = useState(duty?.description || '')
  const [assignedTo, setAssignedTo] = useState<string[]>(duty?.assignedTo || [])
  const [frequency, setFrequency] = useState<DutyFrequency>(duty?.frequency || 'weekly')
  const [priority, setPriority] = useState<DutyPriority>(duty?.priority || 'medium')
  const [estimatedDuration, setEstimatedDuration] = useState<string>(
    duty?.estimatedDuration?.toString() || ''
  )
  const [subtasks, setSubtasks] = useState<string[]>(duty?.subtasks || [])
  const [newSubtask, setNewSubtask] = useState('')
  const [notes, setNotes] = useState(duty?.notes || '')
  const [reminderEnabled, setReminderEnabled] = useState(duty?.reminderEnabled ?? true)
  const [reminderTime, setReminderTime] = useState(duty?.reminderTime || '09:00')
  const [notifyOnCompletion, setNotifyOnCompletion] = useState(duty?.notifyOnCompletion ?? true)
  const [notifyOnOverdue, setNotifyOnOverdue] = useState(duty?.notifyOnOverdue ?? true)

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // If editing, skip to details
    if (duty) {
      setStep('details')
    }
  }, [duty])

  const handleCategorySelect = (category: DutyCategory) => {
    setSelectedCategory(category)
    if (category === 'custom') {
      setIsCustom(true)
      setStep('details')
    } else {
      setStep('template')
    }
  }

  const handleTemplateSelect = (template: PredefinedDuty | 'custom') => {
    if (template === 'custom') {
      setIsCustom(true)
      setName('')
      setDescription('')
      setSubtasks([])
      setEstimatedDuration('')
    } else {
      setSelectedTemplate(template)
      setName(template.name)
      setDescription(template.description)
      setSubtasks(template.subtasks || [])
      setEstimatedDuration(template.estimatedDuration?.toString() || '')
      if (template.defaultFrequency) {
        setFrequency(template.defaultFrequency)
      }
    }
    setStep('details')
  }

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, newSubtask.trim()])
      setNewSubtask('')
    }
  }

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      toast.error('Please enter a duty name')
      return
    }

    if (assignedTo.length === 0) {
      toast.error('Please assign at least one caregiver')
      return
    }

    try {
      setSaving(true)
      const user = auth.currentUser
      if (!user) {
        throw new Error('Not authenticated')
      }

      const token = await user.getIdToken()

      const requestBody: CreateDutyRequest | UpdateDutyRequest = {
        name,
        description: description || undefined,
        assignedTo,
        frequency,
        priority,
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : undefined,
        subtasks: subtasks.length > 0 ? subtasks : undefined,
        notifyOnCompletion,
        notifyOnOverdue,
        reminderEnabled,
        reminderTime: reminderEnabled ? reminderTime : undefined,
        notes: notes || undefined
      }

      let url = '/api/household-duties'
      let method = 'POST'

      if (duty) {
        // Editing existing duty
        url = `/api/household-duties/${duty.id}`
        method = 'PATCH'
      } else {
        // Creating new duty
        (requestBody as CreateDutyRequest).householdId = householdId
        ;(requestBody as CreateDutyRequest).forPatientId = forPatientId // Optional
        ;(requestBody as CreateDutyRequest).category = selectedCategory!
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save duty')
      }

      toast.success(duty ? 'Duty updated!' : 'Duty created!')
      onSuccess()
      onClose()
    } catch (error) {
      logger.error('[DutyFormModal] Error saving duty', error as Error)
      toast.error('Failed to save duty')
    } finally {
      setSaving(false)
    }
  }

  const toggleCaregiver = (caregiverId: string) => {
    if (assignedTo.includes(caregiverId)) {
      setAssignedTo(assignedTo.filter(id => id !== caregiverId))
    } else {
      setAssignedTo([...assignedTo, caregiverId])
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {duty ? 'Edit Household Duty' : 'New Household Duty'}
            </h2>
            <p className="text-sm text-blue-100 mt-1">
              {householdName}
              {forPatientName && ` • For ${forPatientName}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Category Selection */}
          {step === 'category' && (
            <div>
              <h3 className="text-lg font-bold text-foreground mb-4">Select Duty Category</h3>
              <div className="grid grid-cols-2 gap-3">
                {DUTY_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => handleCategorySelect(cat.value)}
                    className="p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  >
                    <div className="font-semibold text-foreground">{cat.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Template Selection */}
          {step === 'template' && selectedCategory && selectedCategory !== 'custom' && (
            <div>
              <button
                onClick={() => setStep('category')}
                className="text-primary hover:underline mb-4 flex items-center gap-1"
              >
                ← Back to categories
              </button>

              <h3 className="text-lg font-bold text-foreground mb-4">
                Choose a Template or Create Custom
              </h3>

              <div className="space-y-3">
                {/* Custom duty option */}
                <button
                  onClick={() => handleTemplateSelect('custom')}
                  className="w-full p-4 border-2 border-dashed border-primary rounded-lg hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <PlusIcon className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-primary">Create Custom Duty</span>
                  </div>
                </button>

                {/* Predefined templates */}
                {PREDEFINED_DUTIES[selectedCategory]?.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  >
                    <div className="font-semibold text-foreground mb-1">{template.name}</div>
                    <div className="text-sm text-muted-foreground">{template.description}</div>
                    {template.estimatedDuration && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Est. {template.estimatedDuration} minutes
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Duty Details */}
          {step === 'details' && (
            <div className="space-y-6">
              {!duty && (
                <button
                  onClick={() => setStep(selectedCategory === 'custom' ? 'category' : 'template')}
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  ← Back
                </button>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Duty Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Wash laundry"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={2}
                  placeholder="Additional details..."
                />
              </div>

              {/* Assign to Caregivers */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Assign to Caregivers *
                </label>
                <div className="space-y-2">
                  {caregivers.map(caregiver => (
                    <label
                      key={caregiver.id}
                      className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={assignedTo.includes(caregiver.id)}
                        onChange={() => toggleCaregiver(caregiver.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{caregiver.name}</div>
                        <div className="text-xs text-muted-foreground">{caregiver.email}</div>
                      </div>
                    </label>
                  ))}
                  {caregivers.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No caregivers available. Add caregivers to assign duties.
                    </p>
                  )}
                </div>
              </div>

              {/* Frequency and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as DutyFrequency)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {FREQUENCIES.map(freq => (
                      <option key={freq.value} value={freq.value}>{freq.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as DutyPriority)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {PRIORITIES.map(pri => (
                      <option key={pri.value} value={pri.value}>{pri.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Estimated Duration */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Estimated Duration (minutes)
                </label>
                <input
                  type="number"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="30"
                  min="1"
                />
              </div>

              {/* Subtasks */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Subtasks (Optional)
                </label>
                <div className="space-y-2">
                  {subtasks.map((task, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 border border-border rounded-lg bg-muted">
                        {task}
                      </div>
                      <button
                        onClick={() => handleRemoveSubtask(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddSubtask()
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Add a subtask..."
                    />
                    <button
                      onClick={handleAddSubtask}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Reminders */}
              <div>
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-foreground">Enable Reminders</span>
                </label>

                {reminderEnabled && (
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </div>

              {/* Notifications */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={notifyOnCompletion}
                    onChange={(e) => setNotifyOnCompletion(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-foreground">Notify when completed</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={notifyOnOverdue}
                    onChange={(e) => setNotifyOnOverdue(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-foreground">Notify when overdue</span>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Special instructions or notes..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'details' && (
          <div className="border-t border-border p-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:bg-gray-400 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{duty ? 'Update Duty' : 'Create Duty'}</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
