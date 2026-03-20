/**
 * VitalLogForm Component
 * Form to log vital sign readings
 */

'use client'

import { useState, useEffect } from 'react'
import { VitalType, VitalValue, BloodPressureValue, PulseOximeterValue } from '@/types/medical'
import toast from 'react-hot-toast'

// Labels for all vital types including newborn-specific
const VITAL_TYPE_LABELS: Partial<Record<VitalType, string>> = {
  blood_pressure: 'Blood Pressure',
  blood_sugar: 'Blood Sugar',
  pulse_oximeter: 'Pulse Oximeter (SpO₂ + Heart Rate)',
  temperature: 'Temperature',
  weight: 'Weight',
  newborn_heart_rate: 'Heart Rate',
  newborn_respiratory_rate: 'Respiratory Rate',
  newborn_oxygen_saturation: 'Oxygen Saturation (SpO₂)',
  newborn_bilirubin: 'Bilirubin Level',
  newborn_blood_glucose: 'Blood Glucose',
  newborn_head_circumference: 'Head Circumference',
  newborn_diaper_output: 'Diaper Output (wet + dirty)',
  newborn_fontanelle: 'Fontanelle Check',
  newborn_umbilical_cord: 'Umbilical Cord Status',
}

// Newborn-specific reference ranges
const NEWBORN_REFERENCE_RANGES: Partial<Record<VitalType, { normal: string; concern: string }>> = {
  newborn_heart_rate: { normal: '120–160 bpm', concern: '<100 or >180 bpm' },
  newborn_respiratory_rate: { normal: '30–60 breaths/min', concern: '<30 or >60 breaths/min' },
  newborn_oxygen_saturation: { normal: '95–100%', concern: '<95%' },
  newborn_bilirubin: { normal: '<5 mg/dL (day 1)', concern: '>12 mg/dL (may need phototherapy)' },
  newborn_blood_glucose: { normal: '40–100 mg/dL', concern: '<40 mg/dL (hypoglycemia)' },
  newborn_head_circumference: { normal: '13–14.5 inches (33–37 cm)', concern: 'Outside expected percentile' },
  temperature: { normal: '97.7–99.5°F (36.5–37.5°C)', concern: '<97.7°F or >100.4°F' },
}

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
  availableTypes?: VitalType[]
}

export function VitalLogForm({ patientId, onSubmit, onCancel, defaultType, onTypeChange, initialData, isEditing, availableTypes }: VitalLogFormProps) {
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
      'mood': 'scale',
      // Newborn-specific vitals
      'newborn_heart_rate': 'bpm',
      'newborn_respiratory_rate': 'breaths/min',
      'newborn_oxygen_saturation': '%',
      'newborn_bilirubin': 'mg/dL',
      'newborn_blood_glucose': 'mg/dL',
      'newborn_head_circumference': 'inches',
      'newborn_diaper_output': 'count',
      'newborn_fontanelle': 'status',
      'newborn_umbilical_cord': 'status',
      // Pet-specific vitals
      'heartRate': 'bpm',
      'respiratoryRate': 'breaths/min',
      'bodyConditionScore': '1-9',
      // Fish-specific vitals
      'waterTemp': '°F',
      'pH': 'pH',
      'ammonia': 'ppm',
      'nitrite': 'ppm',
      'nitrate': 'ppm',
      // Reptile-specific vitals
      'baskingTemp': '°F',
      'coolSideTemp': '°F',
      'humidity': '%'
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
          {availableTypes ? (
            availableTypes.map(vt => (
              <option key={vt} value={vt}>{VITAL_TYPE_LABELS[vt] || vt.replace(/_/g, ' ')}</option>
            ))
          ) : (
            <>
              <option value="blood_pressure">Blood Pressure</option>
              <option value="blood_sugar">Blood Sugar</option>
              <option value="pulse_oximeter">Pulse Oximeter (SpO₂ + Heart Rate)</option>
              <option value="temperature">Temperature</option>
              <option value="weight">Weight</option>
            </>
          )}
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
      ) : type === 'newborn_fontanelle' ? (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Fontanelle Status</label>
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
            required
          >
            <option value="">Select status</option>
            <option value="1">Flat / Normal</option>
            <option value="2">Slightly Sunken (may indicate dehydration)</option>
            <option value="3">Bulging (may indicate increased pressure)</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">Anterior fontanelle should be soft and flat. Sunken may indicate dehydration; bulging needs medical attention.</p>
        </div>
      ) : type === 'newborn_umbilical_cord' ? (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Umbilical Cord Status</label>
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
            required
          >
            <option value="">Select status</option>
            <option value="1">Healing / Drying — Normal</option>
            <option value="2">Moist / Slight Discharge</option>
            <option value="3">Redness / Odor (possible infection)</option>
            <option value="4">Fallen Off — Healed</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">Cord stump typically falls off within 1–3 weeks. Redness, swelling, or foul odor may indicate infection.</p>
        </div>
      ) : type === 'newborn_diaper_output' ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Total Diapers Today (wet + dirty)</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 8"
              min="0"
              max="30"
              className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
              required
            />
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-foreground">
            <p className="font-semibold mb-1">Expected Diaper Output:</p>
            <ul className="space-y-0.5 ml-4 list-disc">
              <li>Day 1: 1–2 wet diapers</li>
              <li>Day 2: 2–3 wet diapers</li>
              <li>Day 3+: 6–8 wet diapers/day (adequate hydration)</li>
              <li>Stool: 3–4+ per day for breastfed; 1–2+ for formula-fed</li>
            </ul>
            <p className="mt-1 text-amber-600 dark:text-amber-400">&lt;6 wet diapers/day after day 3 may indicate insufficient feeding</p>
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
            step={type === 'temperature' || type === 'newborn_head_circumference' ? '0.1' : '1'}
            className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
            required
          />
          {/* Newborn reference ranges */}
          {NEWBORN_REFERENCE_RANGES[type] && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-foreground mt-2">
              <p className="font-semibold mb-1">Reference Ranges (Newborn):</p>
              <ul className="space-y-0.5 ml-4 list-disc">
                <li>Normal: {NEWBORN_REFERENCE_RANGES[type]!.normal}</li>
                <li className="text-amber-600 dark:text-amber-400">Concern: {NEWBORN_REFERENCE_RANGES[type]!.concern}</li>
              </ul>
            </div>
          )}
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
