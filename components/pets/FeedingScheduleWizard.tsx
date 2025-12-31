/**
 * FeedingScheduleWizard Component
 * Multi-step wizard for creating pet feeding schedules
 */

'use client'

import { useState } from 'react'
import { useFeedingSchedule } from '@/hooks/useFeedingSchedule'
import { usePetFoodProfiles } from '@/hooks/usePetFoodProfiles'
import { useAuth } from '@/hooks/useAuth'
import { FeedingFrequency, FeedingSchedule } from '@/types/pet-feeding'
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'
import { PetFoodProfileWizard } from './PetFoodProfileWizard'

interface FeedingScheduleWizardProps {
  isOpen: boolean
  onClose: () => void
  petId: string
  petName: string
  onSuccess?: () => void
}

export function FeedingScheduleWizard({ isOpen, onClose, petId, petName, onSuccess }: FeedingScheduleWizardProps) {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showFoodProfileWizard, setShowFoodProfileWizard] = useState(false)

  // Debug logging
  console.log('FeedingScheduleWizard render', { isOpen, petId, petName })

  const { createSchedule } = useFeedingSchedule({
    userId: user?.uid || '',
    petId,
    autoFetch: false
  })

  const { foodProfiles } = usePetFoodProfiles({
    userId: user?.uid || '',
    petId,
    autoFetch: true,
    realtime: true
  })

  // Form state
  const [formData, setFormData] = useState({
    frequency: '' as FeedingFrequency,
    feedingTimes: [] as string[],
    defaultFoodProfileId: '',
    defaultPortionSize: 1,
    defaultPortionUnit: 'cups' as 'cups' | 'grams' | 'oz' | 'cans' | 'tbsp',
    reminderEnabled: true,
    reminderMinutesBefore: 15
  })

  // Frequency presets
  const frequencyOptions = [
    { value: 'once', label: 'Once Daily', times: ['08:00'] },
    { value: 'twice', label: 'Twice Daily', times: ['08:00', '18:00'] },
    { value: 'three-times', label: 'Three Times Daily', times: ['08:00', '12:00', '18:00'] },
    { value: 'four-times', label: 'Four Times Daily', times: ['07:00', '12:00', '17:00', '21:00'] }
  ]

  const handleFrequencySelect = (frequency: FeedingFrequency, times: string[]) => {
    setFormData(prev => ({
      ...prev,
      frequency,
      feedingTimes: times
    }))
    setStep(2)
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      // Validation
      if (!formData.frequency) {
        throw new Error('Please select a feeding frequency')
      }
      if (formData.feedingTimes.length === 0) {
        throw new Error('Please set at least one feeding time')
      }
      if (!formData.defaultFoodProfileId && foodProfiles.length > 0) {
        throw new Error('Please select a food profile')
      }
      if (formData.defaultPortionSize <= 0) {
        throw new Error('Portion size must be greater than 0')
      }

      await createSchedule({
        frequency: formData.frequency,
        feedingTimes: formData.feedingTimes,
        primaryFoodId: formData.defaultFoodProfileId || '',
        defaultPortionSize: formData.defaultPortionSize,
        defaultPortionUnit: formData.defaultPortionUnit,
        reminderEnabled: formData.reminderEnabled,
        reminderMinutesBefore: formData.reminderMinutesBefore,
        notificationChannels: {
          push: true,
          email: false,
          sms: false
        }
      })

      toast.success(`Feeding schedule created for ${petName}!`)
      onSuccess?.()
      onClose()
    } catch (err: any) {
      logger.error('[FeedingScheduleWizard] Error creating schedule', err)
      toast.error(err.message || 'Failed to create feeding schedule')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Set Up Feeding Schedule</h2>
            <p className="text-sm text-muted-foreground mt-1">for {petName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Step {step} of 3</span>
            <span className="text-sm text-muted-foreground">
              {step === 1 && 'Frequency'}
              {step === 2 && 'Food & Portions'}
              {step === 3 && 'Reminders'}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="px-6 py-6">
          {/* Step 1: Feeding Frequency */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">How often does {petName} eat?</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Choose a feeding frequency. You can customize times in the next step.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {frequencyOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleFrequencySelect(option.value as FeedingFrequency, option.times)}
                    className="p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  >
                    <div className="font-semibold text-foreground">{option.label}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {option.times.join(', ')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Food & Portions */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Food & Portion Settings</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Set default food and portion sizes for {petName}'s meals.
                </p>
              </div>

              {/* Feeding Times (editable) */}
              <div>
                <label className="block text-sm font-medium mb-2">Feeding Times</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {formData.feedingTimes.map((time, index) => (
                    <input
                      key={index}
                      type="time"
                      value={time}
                      onChange={(e) => {
                        const newTimes = [...formData.feedingTimes]
                        newTimes[index] = e.target.value
                        setFormData(prev => ({ ...prev, feedingTimes: newTimes }))
                      }}
                      className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ))}
                </div>
              </div>

              {/* Food Profile Selection */}
              {foodProfiles.length > 0 ? (
                <div>
                  <label className="block text-sm font-medium mb-2">Default Food</label>
                  <select
                    value={formData.defaultFoodProfileId}
                    onChange={(e) => setFormData(prev => ({ ...prev, defaultFoodProfileId: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select food profile...</option>
                    {foodProfiles.map(profile => (
                      <option key={profile.id} value={profile.id}>
                        {profile.foodName} ({profile.brand})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    You can change this per meal when logging
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-warning font-medium mb-2">
                        No food profiles found
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Add a food profile to track nutrition info, or skip for now and add it later.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowFoodProfileWizard(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add Food
                    </button>
                  </div>
                </div>
              )}

              {/* Portion Size */}
              <div>
                <label className="block text-sm font-medium mb-2">Default Portion Size</label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={formData.defaultPortionSize}
                    onChange={(e) => setFormData(prev => ({ ...prev, defaultPortionSize: parseFloat(e.target.value) || 1 }))}
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <select
                    value={formData.defaultPortionUnit}
                    onChange={(e) => setFormData(prev => ({ ...prev, defaultPortionUnit: e.target.value as any }))}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="cups">Cups</option>
                    <option value="grams">Grams</option>
                    <option value="oz">Ounces</option>
                    <option value="cans">Cans</option>
                    <option value="tbsp">Tablespoons</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Reminders */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Feeding Reminders</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Get reminded before it's time to feed {petName}.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">Enable Reminders</p>
                    <p className="text-sm text-muted-foreground">Get notified before feeding times</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, reminderEnabled: !prev.reminderEnabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.reminderEnabled ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.reminderEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {formData.reminderEnabled && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Remind me</label>
                    <select
                      value={formData.reminderMinutesBefore}
                      onChange={(e) => setFormData(prev => ({ ...prev, reminderMinutesBefore: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="5">5 minutes before</option>
                      <option value="15">15 minutes before</option>
                      <option value="30">30 minutes before</option>
                      <option value="60">1 hour before</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-semibold mb-3">Schedule Summary</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Frequency:</span>{' '}
                    <span className="font-medium">
                      {frequencyOptions.find(f => f.value === formData.frequency)?.label}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Times:</span>{' '}
                    <span className="font-medium">{formData.feedingTimes.join(', ')}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Portion:</span>{' '}
                    <span className="font-medium">
                      {formData.defaultPortionSize} {formData.defaultPortionUnit}
                    </span>
                  </p>
                  {formData.defaultFoodProfileId && (
                    <p>
                      <span className="text-muted-foreground">Food:</span>{' '}
                      <span className="font-medium">
                        {foodProfiles.find(f => f.id === formData.defaultFoodProfileId)?.foodName}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4 flex justify-between">
          <button
            onClick={() => {
              if (step > 1) setStep(step - 1)
              else onClose()
            }}
            className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            disabled={loading}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Schedule'}
            </button>
          )}
        </div>
      </div>

      {/* Food Profile Wizard */}
      <PetFoodProfileWizard
        isOpen={showFoodProfileWizard}
        onClose={() => setShowFoodProfileWizard(false)}
        petId={petId}
        petName={petName}
        onSuccess={() => {
          setShowFoodProfileWizard(false)
          // Food profiles will auto-refresh via real-time listener
        }}
      />
    </div>
  )
}
