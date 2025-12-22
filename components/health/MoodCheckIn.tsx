/**
 * Mood Check-In Component
 *
 * Daily mood/behavior check-in card for humans and pets.
 * Automatically triggers illness detection when abnormal patterns detected.
 *
 * For Humans: Energy, Appetite, Pain, Overall (1-5 sliders with emoji)
 * For Pets: Energy, Appetite, Behavior, Mobility, Pain, Overall (species-specific options)
 *
 * Usage:
 * ```tsx
 * <MoodCheckIn
 *   patientId={patient.id}
 *   patientName={patient.name}
 *   patientType={patient.type}
 *   species={patient.species}
 *   onComplete={() => setShowSuccess(true)}
 * />
 * ```
 */

'use client'

import { useState } from 'react'
import { FaceSmileIcon, HeartIcon } from '@heroicons/react/24/outline'
import { medicalOperations } from '@/lib/medical-operations'
import { detectIllnessSignals, type MoodValue } from '@/lib/illness-detection-engine'

// PetBehaviorValue type definition - extends MoodValue with pet-specific fields
interface PetBehaviorValue extends MoodValue {
  behavior: string
  mobility?: string
  vocalizations?: string
  speciesNotes?: string
}
import toast from 'react-hot-toast'

interface MoodCheckInProps {
  patientId: string
  patientName: string
  patientType: 'human' | 'pet'
  species?: string // For pets - 'dog', 'cat', 'bird', 'fish', etc.
  onComplete?: () => void // Called after successful submission
  onIllnessDetected?: (signals: unknown[]) => void // Called when illness signals detected
}

export function MoodCheckIn({
  patientId,
  patientName,
  patientType,
  species,
  onComplete,
  onIllnessDetected
}: MoodCheckInProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Human mood state
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [appetite, setAppetite] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [pain, setPain] = useState<0 | 1 | 2 | 3 | 4 | 5>(0)
  const [overall, setOverall] = useState<1 | 2 | 3 | 4 | 5>(3)

  // Pet-specific state
  const [behavior, setBehavior] = useState<PetBehaviorValue['behavior']>('normal')
  const [vocalizations, setVocalizations] = useState<PetBehaviorValue['vocalizations']>('normal')
  const [mobility, setMobility] = useState<PetBehaviorValue['mobility']>('normal')
  const [speciesNotes, setSpeciesNotes] = useState('')

  // Get species-specific behavior options
  const getBehaviorOptions = (): Array<{ value: PetBehaviorValue['behavior']; label: string }> => {
    const common = [
      { value: 'normal' as const, label: 'Normal' },
      { value: 'playful' as const, label: 'Playful' },
      { value: 'withdrawn' as const, label: 'Withdrawn' },
      { value: 'restless' as const, label: 'Restless' },
      { value: 'clingy' as const, label: 'Clingy' },
      { value: 'aggressive' as const, label: 'Aggressive' },
    ]

    // Add species-specific options
    if (species === 'cat' || species === 'dog') {
      return [...common, { value: 'hiding' as const, label: 'Hiding' }]
    }

    return common
  }

  // Get species-specific mobility options
  const getMobilityOptions = (): Array<{ value: PetBehaviorValue['mobility']; label: string }> => {
    const speciesLower = species?.toLowerCase()

    if (speciesLower === 'fish') {
      return [
        { value: 'normal' as const, label: 'Swimming Normally' },
        { value: 'swimming_poorly' as const, label: 'Swimming Poorly' },
        { value: 'active' as const, label: 'Very Active' },
      ]
    } else if (speciesLower === 'bird') {
      return [
        { value: 'normal' as const, label: 'Flying/Moving Normally' },
        { value: 'flying_difficulty' as const, label: 'Difficulty Flying' },
        { value: 'active' as const, label: 'Very Active' },
      ]
    } else {
      // Dogs, cats, rabbits, etc.
      return [
        { value: 'normal' as const, label: 'Normal' },
        { value: 'active' as const, label: 'Active' },
        { value: 'limping' as const, label: 'Limping' },
        { value: 'favoring_limb' as const, label: 'Favoring Limb' },
      ]
    }
  }

  // Get emoji for slider value
  const getEmojiForValue = (value: number, type: 'energy' | 'appetite' | 'pain' | 'overall') => {
    if (type === 'pain') {
      const painEmojis = ['😊', '😐', '😟', '😢', '😭', '🚨']
      return painEmojis[value]
    }

    const emojis = ['😭', '😢', '😐', '🙂', '😊']
    return emojis[value - 1]
  }

  // Handle submission
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)

      // Build mood/behavior value
      const moodValue: MoodValue | PetBehaviorValue = patientType === 'human'
        ? { energy, appetite, pain, overall }
        : {
            energy,
            appetite,
            behavior,
            vocalizations,
            mobility,
            pain,
            overall,
            speciesNotes: speciesNotes.trim() || undefined
          }

      // Log as vital sign
      await medicalOperations.vitals.logVital(patientId, {
        type: 'mood',
        value: moodValue,
        unit: '%', // Mood doesn't have a traditional unit
        recordedAt: new Date().toISOString(),
        method: 'manual'
      })

      toast.success('Mood check-in recorded!')

      // Run illness detection
      try {
        const signals = await detectIllnessSignals(patientId)

        if (signals.length > 0) {
          // Illness signals detected - notify parent component
          onIllnessDetected?.(signals)
          toast.success('Health alert detected. Review recommended actions.', {
            duration: 5000,
            icon: '⚠️'
          })
        }
      } catch (detectionError) {
        console.error('Error running illness detection:', detectionError)
        // Don't block the mood log if detection fails
      }

      // Call completion callback
      onComplete?.()

      // Reset form to defaults
      setEnergy(3)
      setAppetite(3)
      setPain(0)
      setOverall(3)
      setBehavior('normal')
      setVocalizations('normal')
      setMobility('normal')
      setSpeciesNotes('')
    } catch (error) {
      console.error('Error submitting mood check-in:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to record mood check-in'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-card rounded-lg border-2 border-border p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-lg">
          {patientType === 'pet' ? (
            <HeartIcon className="w-6 h-6 text-primary" />
          ) : (
            <FaceSmileIcon className="w-6 h-6 text-primary" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {patientType === 'pet' ? '🐾 ' : ''}{patientName} - Daily Check-In
          </h3>
          <p className="text-sm text-muted-foreground">
            {patientType === 'pet'
              ? `How is ${patientName} ${species ? `(${species})` : ''} doing today?`
              : 'How are you feeling today?'}
          </p>
        </div>
      </div>

      {/* Energy Slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground">
            Energy Level
          </label>
          <span className="text-2xl">
            {getEmojiForValue(energy, 'energy')}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="5"
          value={energy}
          onChange={(e) => setEnergy(parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5)}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(energy - 1) * 25}%, #e5e7eb ${(energy - 1) * 25}%, #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Exhausted</span>
          <span>Energetic</span>
        </div>
      </div>

      {/* Appetite Slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground">
            Appetite
          </label>
          <span className="text-2xl">
            {getEmojiForValue(appetite, 'appetite')}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="5"
          value={appetite}
          onChange={(e) => setAppetite(parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5)}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(appetite - 1) * 25}%, #e5e7eb ${(appetite - 1) * 25}%, #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>No Appetite</span>
          <span>Very Hungry</span>
        </div>
      </div>

      {/* Pet-Specific: Behavior Dropdown */}
      {patientType === 'pet' && (
        <>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Behavior
            </label>
            <select
              value={behavior}
              onChange={(e) => setBehavior(e.target.value as PetBehaviorValue['behavior'])}
              className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {getBehaviorOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Vocalizations */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Vocalizations
            </label>
            <select
              value={vocalizations}
              onChange={(e) => setVocalizations(e.target.value as PetBehaviorValue['vocalizations'])}
              className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="normal">Normal</option>
              <option value="quiet">Quiet</option>
              <option value="excessive">Excessive</option>
              <option value="distressed">Distressed</option>
              <option value="none">None</option>
            </select>
          </div>

          {/* Mobility */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Mobility
            </label>
            <select
              value={mobility}
              onChange={(e) => setMobility(e.target.value as PetBehaviorValue['mobility'])}
              className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {getMobilityOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Pain Slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground">
            {patientType === 'pet' ? 'Pain Signs' : 'Pain Level'}
          </label>
          <span className="text-2xl">
            {getEmojiForValue(pain, 'pain')}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="5"
          value={pain}
          onChange={(e) => setPain(parseInt(e.target.value) as 0 | 1 | 2 | 3 | 4 | 5)}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${pain * 20}%, #e5e7eb ${pain * 20}%, #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>No Pain</span>
          <span>Severe Pain</span>
        </div>
      </div>

      {/* Overall Slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground">
            Overall Condition
          </label>
          <span className="text-2xl">
            {getEmojiForValue(overall, 'overall')}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="5"
          value={overall}
          onChange={(e) => setOverall(parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5)}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(overall - 1) * 25}%, #e5e7eb ${(overall - 1) * 25}%, #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Very Sick</span>
          <span>Feeling Great</span>
        </div>
      </div>

      {/* Species-Specific Notes (Pets Only) */}
      {patientType === 'pet' && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Additional Observations (Optional)
          </label>
          <textarea
            value={speciesNotes}
            onChange={(e) => setSpeciesNotes(e.target.value)}
            placeholder={
              species === 'fish' ? 'e.g., Staying at bottom of tank, not eating...' :
              species === 'bird' ? 'e.g., Not singing, feathers ruffled...' :
              'Any other observations about behavior or symptoms...'
            }
            rows={3}
            className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Recording...' : 'Submit Check-In'}
      </button>

      {/* Info Text */}
      <p className="text-xs text-muted-foreground text-center">
        {patientType === 'pet'
          ? `This check-in helps track ${patientName}'s health and detect potential issues early.`
          : 'Your daily check-in helps detect health patterns and potential issues early.'}
      </p>
    </div>
  )
}
