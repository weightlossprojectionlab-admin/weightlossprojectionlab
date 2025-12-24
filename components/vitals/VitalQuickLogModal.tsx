/**
 * VitalQuickLogModal
 *
 * Simple modal for quickly logging a single vital sign
 * Used when clicking "Log Now" from vital reminder prompts
 */

'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { VitalType } from '@/types/medical'
import toast from 'react-hot-toast'
import VitalDatePicker from './VitalDatePicker'
import BackdateConfirmModal from './BackdateConfirmModal'
import { useVitalDatePicker } from '@/hooks/useVitalDatePicker'

interface VitalQuickLogModalProps {
  isOpen: boolean
  onClose: () => void
  vitalType: VitalType
  patientName: string
  patientCreatedAt: string // ISO string for date validation
  patientId: string // For fetching existing vitals
  onSubmit: (data: VitalLogData) => Promise<void>
}

export interface VitalLogData {
  type: VitalType
  value: any
  unit: string
  recordedAt: string
  notes?: string
}

const VITAL_CONFIG: Record<VitalType, {
  label: string
  icon: string
  fields: Array<{
    name: string
    label: string
    type: 'number' | 'text'
    placeholder: string
    unit?: string
    min?: number
    max?: number
  }>
  getDefaultValue: () => any
  formatValue: (data: any) => any
  getDefaultUnit: () => string
}> = {
  blood_pressure: {
    label: 'Blood Pressure',
    icon: '💓',
    fields: [
      { name: 'systolic', label: 'Systolic', type: 'number', placeholder: '120', unit: 'mmHg', min: 70, max: 200 },
      { name: 'diastolic', label: 'Diastolic', type: 'number', placeholder: '80', unit: 'mmHg', min: 40, max: 130 }
    ],
    getDefaultValue: () => ({ systolic: '', diastolic: '' }),
    formatValue: (data) => ({ systolic: Number(data.systolic), diastolic: Number(data.diastolic) }),
    getDefaultUnit: () => 'mmHg'
  },
  blood_sugar: {
    label: 'Blood Sugar',
    icon: '🩸',
    fields: [
      { name: 'glucose', label: 'Glucose', type: 'number', placeholder: '100', unit: 'mg/dL', min: 40, max: 400 }
    ],
    getDefaultValue: () => ({ glucose: '' }),
    formatValue: (data) => Number(data.glucose), // Blood sugar expects a number, not an object
    getDefaultUnit: () => 'mg/dL'
  },
  temperature: {
    label: 'Temperature',
    icon: '🌡️',
    fields: [
      { name: 'temp', label: 'Temperature', type: 'number', placeholder: '98.6', unit: '°F', min: 95, max: 105 }
    ],
    getDefaultValue: () => ({ temp: '' }),
    formatValue: (data) => Number(data.temp), // Temperature expects a number, not an object
    getDefaultUnit: () => '°F'
  },
  pulse_oximeter: {
    label: 'Pulse Oximeter',
    icon: '❤️',
    fields: [
      { name: 'spo2', label: 'SpO₂', type: 'number', placeholder: '98', unit: '%', min: 70, max: 100 },
      { name: 'pulseRate', label: 'Pulse Rate', type: 'number', placeholder: '74', unit: 'bpm', min: 40, max: 200 }
    ],
    getDefaultValue: () => ({ spo2: '', pulseRate: '' }),
    formatValue: (data) => ({ spo2: Number(data.spo2), pulseRate: Number(data.pulseRate) }), // Keep as object
    getDefaultUnit: () => 'SpO₂% / bpm'
  },
  weight: {
    label: 'Weight',
    icon: '⚖️',
    fields: [
      { name: 'weight', label: 'Weight', type: 'number', placeholder: '150', unit: 'lbs', min: 50, max: 500 }
    ],
    getDefaultValue: () => ({ weight: '' }),
    formatValue: (data) => Number(data.weight), // Weight expects a number, not an object
    getDefaultUnit: () => 'lbs'
  },
  mood: {
    label: 'Mood',
    icon: '😊',
    fields: [], // Mood uses emoji selector, not input fields
    getDefaultValue: () => ({ mood: '' }),
    formatValue: (data) => {
      // Map emoji mood to numeric value for storage
      const moodMap: Record<string, number> = {
        'happy': 10,
        'calm': 8,
        'okay': 6,
        'worried': 4,
        'sad': 2,
        'pain': 1
      }
      return moodMap[data.mood] || 6
    },
    getDefaultUnit: () => 'scale'
  }
}

export default function VitalQuickLogModal({
  isOpen,
  onClose,
  vitalType,
  patientName,
  patientCreatedAt,
  patientId,
  onSubmit
}: VitalQuickLogModalProps) {
  const config = VITAL_CONFIG[vitalType]
  const [formData, setFormData] = useState(config.getDefaultValue())
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showBackdateConfirm, setShowBackdateConfirm] = useState(false)

  // Use date picker hook with validation
  const datePicker = useVitalDatePicker({
    patientCreatedAt,
    userPlanTier: 'free', // TODO: Get from user subscription
    vitalType,
    initialDate: new Date()
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate date first
    if (!datePicker.isValid) {
      toast.error(datePicker.error || 'Please select a valid date')
      return
    }

    // Validate all required fields are filled
    const isEmpty = config.fields.some(field => !formData[field.name])
    if (isEmpty) {
      toast.error('Please fill in all fields')
      return
    }

    // Validate ranges
    for (const field of config.fields) {
      const value = Number(formData[field.name])
      if (field.min !== undefined && value < field.min) {
        toast.error(`${field.label} must be at least ${field.min}`)
        return
      }
      if (field.max !== undefined && value > field.max) {
        toast.error(`${field.label} must be no more than ${field.max}`)
        return
      }
    }

    // Check if backdated - show confirmation modal
    if (datePicker.isBackdated && !showBackdateConfirm) {
      setShowBackdateConfirm(true)
      return
    }

    // Proceed with submission
    await submitVital()
  }

  const submitVital = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit({
        type: vitalType,
        value: config.formatValue(formData),
        unit: config.getDefaultUnit(),
        recordedAt: datePicker.selectedDate, // Use selected date from picker
        notes: notes || undefined
      })

      toast.success(`${config.label} logged successfully!`)

      // Reset form
      setFormData(config.getDefaultValue())
      setNotes('')
      datePicker.reset()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Failed to log vital')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData((prev: typeof formData) => ({ ...prev, [fieldName]: value }))
  }

  return (
    <>
      {/* Backdate Confirmation Modal */}
      <BackdateConfirmModal
        isOpen={showBackdateConfirm}
        onClose={() => setShowBackdateConfirm(false)}
        onConfirm={submitVital}
        recordedDate={datePicker.selectedDate}
        vitalType={vitalType}
        patientName={patientName}
        daysDifference={datePicker.daysDifference}
      />

      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{config.icon}</span>
              <div>
                <h2 className="text-xl font-bold">Log {config.label}</h2>
                <p className="text-sm text-blue-100">for {patientName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Date Picker */}
          <VitalDatePicker
            value={datePicker.selectedDate}
            onChange={datePicker.setDate}
            patientCreatedAt={patientCreatedAt}
            userPlanTier="free"
            label="When was this vital taken?"
            helperText="Select today or a previous date"
            disabled={isSubmitting}
            required
          />

          {/* Mood emoji selector */}
          {vitalType === 'mood' && (
            <div>
              <label className="block text-base font-bold text-white mb-4">
                How is {patientName} feeling today?
              </label>
              <p className="text-sm font-medium text-white mb-4">
                Select the face that best describes their current mood
              </p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { emoji: '😊', label: 'Happy', value: 'happy' },
                  { emoji: '😌', label: 'Calm', value: 'calm' },
                  { emoji: '😐', label: 'Okay', value: 'okay' },
                  { emoji: '😟', label: 'Worried', value: 'worried' },
                  { emoji: '😢', label: 'Sad', value: 'sad' },
                  { emoji: '😫', label: 'Pain', value: 'pain' }
                ].map(mood => (
                  <button
                    key={mood.value}
                    type="button"
                    onClick={() => handleFieldChange('mood', mood.value)}
                    className={`p-6 rounded-xl border-2 transition-all bg-gray-800 hover:shadow-lg ${
                      formData.mood === mood.value
                        ? 'border-blue-500 ring-4 ring-blue-900 shadow-lg scale-105'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                    disabled={isSubmitting}
                  >
                    <div className="text-5xl mb-2">{mood.emoji}</div>
                    <div className="text-sm font-bold text-white">{mood.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Regular input fields for other vitals */}
          {config.fields.map(field => (
            <div key={field.name}>
              <label className="block text-sm font-bold text-white mb-2">
                {field.label}
                {field.unit && <span className="font-medium text-white ml-1">({field.unit})</span>}
              </label>
              <input
                type={field.type}
                value={formData[field.name]}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                min={field.min}
                max={field.max}
                step={field.type === 'number' ? '0.1' : undefined}
                className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-800 text-white font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
                required
              />
            </div>
          ))}

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-white mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this reading..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-800 text-white font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Action Buttons - Mobile optimized */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 px-4 py-3 border border-gray-600 text-white rounded-lg hover:bg-gray-800 active:bg-gray-700 transition-colors font-bold touch-manipulation"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white rounded-lg transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Reading'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </>
  )
}
