/**
 * VitalLogForm Component
 * Form to log vital sign readings
 */

'use client'

import { useState, useEffect } from 'react'
import { VitalType, VitalValue, BloodPressureValue, PulseOximeterValue } from '@/types/medical'
import toast from 'react-hot-toast'

interface VitalLogFormProps {
  patientId: string
  onSubmit: (data: {
    type: VitalType
    value: VitalValue
    unit: string
    recordedAt?: Date
    notes?: string
    tags?: string[]
  }) => Promise<void>
  onCancel?: () => void
  defaultType?: VitalType
  onTypeChange?: (type: VitalType) => void
  initialData?: {
    type: VitalType
    value: VitalValue
    recordedAt?: Date
    notes?: string
  }
  isEditing?: boolean
}

export function VitalLogForm({ patientId, onSubmit, onCancel, defaultType, onTypeChange, initialData, isEditing }: VitalLogFormProps) {
  const [type, setType] = useState<VitalType>(initialData?.type || defaultType || 'blood_pressure')
  const [value, setValue] = useState<string>('')
  const [systolic, setSystolic] = useState<string>('')
  const [diastolic, setDiastolic] = useState<string>('')
  const [spo2, setSpo2] = useState<string>('')
  const [pulseRate, setPulseRate] = useState<string>('')
  const [perfusionIndex, setPerfusionIndex] = useState<string>('')
  const [recordedAt, setRecordedAt] = useState<string>(
    initialData?.recordedAt
      ? new Date(initialData.recordedAt).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  )
  const [notes, setNotes] = useState<string>(initialData?.notes || '')
  const [loading, setLoading] = useState(false)

  // Initialize form with existing data when editing
  useEffect(() => {
    if (initialData) {
      const val = initialData.value
      if (initialData.type === 'blood_pressure' && typeof val === 'object' && 'systolic' in val) {
        setSystolic(val.systolic.toString())
        setDiastolic(val.diastolic.toString())
      } else if (initialData.type === 'pulse_oximeter' && typeof val === 'object' && 'spo2' in val) {
        setSpo2(val.spo2.toString())
        setPulseRate(val.pulseRate.toString())
        if (val.perfusionIndex) setPerfusionIndex(val.perfusionIndex.toString())
      } else if (typeof val === 'number') {
        setValue(val.toString())
      }
    }
  }, [initialData])

  // Update type when defaultType changes
  useEffect(() => {
    if (defaultType) {
      setType(defaultType)
    }
  }, [defaultType])

  const getUnitForType = (vitalType: VitalType): string => {
    const units: Record<VitalType, string> = {
      'blood_sugar': 'mg/dL',
      'blood_pressure': 'mmHg',
      'pulse_oximeter': 'SpO₂% / bpm',
      'temperature': '°F',
      'weight': 'lbs',
      'mood': 'scale'
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
      } else if (type === 'pulse_oximeter') {
        if (!spo2 || !pulseRate) {
          toast.error('Please enter both SpO₂ and pulse rate values')
          return
        }
        vitalValue = {
          spo2: parseInt(spo2),
          pulseRate: parseInt(pulseRate),
          perfusionIndex: perfusionIndex ? parseFloat(perfusionIndex) : undefined
        } as PulseOximeterValue
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
        recordedAt: new Date(recordedAt),
        notes: notes || undefined
      })

      // Reset form
      setValue('')
      setSystolic('')
      setDiastolic('')
      setSpo2('')
      setPulseRate('')
      setPerfusionIndex('')
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
        <label className="block text-sm font-medium text-foreground mb-2">
          Vital Type
        </label>
        <select
          value={type}
          onChange={(e) => {
            const newType = e.target.value as VitalType
            setType(newType)
            onTypeChange?.(newType)
          }}
          className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
          required
          disabled={isEditing} // Can't change type when editing
        >
          <option value="blood_pressure">Blood Pressure</option>
          <option value="blood_sugar">Blood Sugar</option>
          <option value="pulse_oximeter">Pulse Oximeter (SpO₂ + Heart Rate)</option>
          <option value="temperature">Temperature</option>
          <option value="weight">Weight</option>
        </select>
      </div>

      {/* Date/Time Picker */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Date & Time {!isEditing && <span className="text-muted-foreground">(leave as now or backdate)</span>}
        </label>
        <input
          type="datetime-local"
          value={recordedAt}
          onChange={(e) => setRecordedAt(e.target.value)}
          max={new Date().toISOString().slice(0, 16)}
          className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          {isEditing ? 'Update the date/time if needed' : 'Default is current time. Change to backdate entry.'}
        </p>
      </div>

      {/* Value Input */}
      {type === 'blood_pressure' ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Systolic (mmHg)
            </label>
            <input
              type="number"
              value={systolic}
              onChange={(e) => setSystolic(e.target.value)}
              placeholder="120"
              min="40"
              max="300"
              className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Diastolic (mmHg)
            </label>
            <input
              type="number"
              value={diastolic}
              onChange={(e) => setDiastolic(e.target.value)}
              placeholder="80"
              min="20"
              max="200"
              className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
              required
            />
          </div>
        </div>
      ) : type === 'pulse_oximeter' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                SpO₂ (%)
              </label>
              <input
                type="number"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
                placeholder="98"
                min="70"
                max="100"
                className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Pulse Rate (bpm)
              </label>
              <input
                type="number"
                value={pulseRate}
                onChange={(e) => setPulseRate(e.target.value)}
                placeholder="72"
                min="30"
                max="220"
                className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Perfusion Index (%) - Optional
            </label>
            <input
              type="number"
              value={perfusionIndex}
              onChange={(e) => setPerfusionIndex(e.target.value)}
              placeholder="5.0"
              step="0.1"
              min="0"
              max="20"
              className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
            />
          </div>
          <div className="bg-secondary-light border border-secondary-light rounded-lg p-3 text-xs text-foreground">
            <p className="font-semibold mb-1">Reference Ranges:</p>
            <ul className="space-y-0.5 ml-4 list-disc">
              <li>SpO₂: 95-100% normal, 92-94% monitor, &lt;92% seek medical help</li>
              <li>Pulse: 60-100 bpm normal for adults at rest</li>
            </ul>
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Value ({getUnitForType(type)})
          </label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            step={type === 'temperature' ? '0.1' : '1'}
            className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
            required
          />
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any additional notes about this reading..."
          className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? (isEditing ? 'Updating...' : 'Logging...') : (isEditing ? 'Update Vital' : 'Log Vital Sign')}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
