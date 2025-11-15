/**
 * VitalLogForm Component
 * Form to log vital sign readings
 */

'use client'

import { useState } from 'react'
import { VitalType, VitalValue, BloodPressureValue } from '@/types/medical'
import toast from 'react-hot-toast'

interface VitalLogFormProps {
  patientId: string
  onSubmit: (data: {
    type: VitalType
    value: VitalValue
    unit: string
    notes?: string
    tags?: string[]
  }) => Promise<void>
  onCancel?: () => void
}

export function VitalLogForm({ patientId, onSubmit, onCancel }: VitalLogFormProps) {
  const [type, setType] = useState<VitalType>('blood_pressure')
  const [value, setValue] = useState<string>('')
  const [systolic, setSystolic] = useState<string>('')
  const [diastolic, setDiastolic] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const getUnitForType = (vitalType: VitalType): string => {
    const units: Record<VitalType, string> = {
      'blood_sugar': 'mg/dL',
      'blood_pressure': 'mmHg',
      'heart_rate': 'bpm',
      'blood_oxygen': '%',
      'temperature': '°F',
      'weight': 'lbs'
    }
    return units[vitalType]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let vitalValue: VitalValue

      if (type === 'blood_pressure') {
        if (!systolic || !diastolic) {
          toast.error('Please enter both systolic and diastolic values')
          return
        }
        vitalValue = {
          systolic: parseInt(systolic),
          diastolic: parseInt(diastolic)
        } as BloodPressureValue
      } else {
        if (!value) {
          toast.error('Please enter a value')
          return
        }
        vitalValue = parseFloat(value)
      }

      await onSubmit({
        type,
        value: vitalValue,
        unit: getUnitForType(type),
        notes: notes || undefined
      })

      // Reset form
      setValue('')
      setSystolic('')
      setDiastolic('')
      setNotes('')
      toast.success('Vital sign logged successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to log vital sign')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Vital Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Vital Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as VitalType)}
          className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
          required
        >
          <option value="blood_pressure">Blood Pressure</option>
          <option value="blood_sugar">Blood Sugar</option>
          <option value="heart_rate">Heart Rate</option>
          <option value="blood_oxygen">Blood Oxygen</option>
          <option value="temperature">Temperature</option>
          <option value="weight">Weight</option>
        </select>
      </div>

      {/* Value Input */}
      {type === 'blood_pressure' ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Systolic (mmHg)
            </label>
            <input
              type="number"
              value={systolic}
              onChange={(e) => setSystolic(e.target.value)}
              placeholder="120"
              min="40"
              max="300"
              className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Diastolic (mmHg)
            </label>
            <input
              type="number"
              value={diastolic}
              onChange={(e) => setDiastolic(e.target.value)}
              placeholder="80"
              min="20"
              max="200"
              className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
              required
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Value ({getUnitForType(type)})
          </label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            step={type === 'temperature' ? '0.1' : '1'}
            className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
            required
          />
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any additional notes about this reading..."
          className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? 'Logging...' : 'Log Vital Sign'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
