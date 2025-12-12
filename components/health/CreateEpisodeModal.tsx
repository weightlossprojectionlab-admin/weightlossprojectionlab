/**
 * Create Episode Modal
 *
 * Modal for creating a new health episode (illness or injury).
 * Automatically adapts symptom suggestions based on patient type (pet vs human).
 *
 * UI Note: Only pets get "🐾 Pet" labels. Humans shown with just name.
 */

'use client'

import { useState, useMemo } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { PatientProfile } from '@/types/medical'
import { EpisodeType, HealthSymptom } from '@/types/health-episodes'
import {
  getSymptomLibrary,
  getCommonIllnesses,
  getCommonInjuries,
  getSeverityLabel
} from '@/lib/health-episode-constants'
import toast from 'react-hot-toast'

interface CreateEpisodeModalProps {
  isOpen: boolean
  onClose: () => void
  patients: PatientProfile[]
  onSubmit: (episodeData: CreateEpisodeData) => Promise<void>
}

export interface CreateEpisodeData {
  patientId: string
  patientType: 'human' | 'pet'
  type: EpisodeType
  title: string
  description?: string
  startDate: string
  startTime?: string // Exact time in HH:MM format
  approximateStartTime?: 'morning' | 'afternoon' | 'evening' | 'night' // Approximate time if exact unknown
  status: 'onset' | 'active'
  initialSymptoms: Omit<HealthSymptom, 'id' | 'episodeId' | 'patientId' | 'createdAt' | 'lastUpdatedAt'>[]
  initialPhotos?: { file: File; caption?: string }[] // Up to 4 photos with captions
  providerName?: string
  diagnosis?: string
}

interface SymptomInput {
  symptom: string
  severity: 1 | 2 | 3 | 4 | 5
  notes?: string
}

export function CreateEpisodeModal({ isOpen, onClose, patients, onSubmit }: CreateEpisodeModalProps) {
  const [step, setStep] = useState<1 | 1.5 | 2 | 2.5 | 3>(1) // Enhanced flow with date/time and photos
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [episodeType, setEpisodeType] = useState<EpisodeType>('illness')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState<string>('') // Exact time HH:MM
  const [approximateStartTime, setApproximateStartTime] = useState<'morning' | 'afternoon' | 'evening' | 'night' | ''>('') // Approximate time
  const [timeSelectionMode, setTimeSelectionMode] = useState<'just_now' | 'approximate' | 'exact'>('just_now')
  const [status, setStatus] = useState<'onset' | 'active'>('onset')
  const [symptoms, setSymptoms] = useState<SymptomInput[]>([])
  const [initialPhotos, setInitialPhotos] = useState<{ file: File; caption: string; preview: string }[]>([]) // Max 4 photos
  const [providerName, setProviderName] = useState('')
  const [diagnosis, setDiagnosis] = useState('')

  // Get selected patient
  const selectedPatient = useMemo(
    () => patients.find(p => p.id === selectedPatientId),
    [patients, selectedPatientId]
  )

  // Get symptom library based on patient type
  const symptomLibrary = useMemo(() => {
    if (!selectedPatient) return []
    return getSymptomLibrary(selectedPatient.type)
  }, [selectedPatient])

  // Get common illnesses/injuries based on type and patient
  const commonTitles = useMemo(() => {
    if (!selectedPatient) return []
    if (episodeType === 'illness') {
      return getCommonIllnesses(selectedPatient.type)
    } else {
      return getCommonInjuries(selectedPatient.type)
    }
  }, [selectedPatient, episodeType])

  if (!isOpen) return null

  // Photo handling functions
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remainingSlots = 4 - initialPhotos.length
    const filesToAdd = files.slice(0, remainingSlots)

    filesToAdd.forEach(file => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`)
        return
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`)
        return
      }

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setInitialPhotos(prev => [...prev, {
          file,
          caption: '',
          preview: reader.result as string
        }])
      }
      reader.readAsDataURL(file)
    })

    // Reset input
    e.target.value = ''
  }

  const handlePhotoRemove = (index: number) => {
    setInitialPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handlePhotoCaptionChange = (index: number, caption: string) => {
    setInitialPhotos(prev => prev.map((photo, i) =>
      i === index ? { ...photo, caption } : photo
    ))
  }

  const handleAddSymptom = () => {
    setSymptoms([...symptoms, { symptom: '', severity: 3, notes: '' }])
  }

  const handleRemoveSymptom = (index: number) => {
    setSymptoms(symptoms.filter((_, i) => i !== index))
  }

  const handleSymptomChange = (index: number, field: keyof SymptomInput, value: any) => {
    const updated = [...symptoms]
    updated[index] = { ...updated[index], [field]: value }
    setSymptoms(updated)
  }

  const handleSubmit = async () => {
    // Validation
    if (!selectedPatientId) {
      toast.error('Please select a patient')
      return
    }
    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    setIsSubmitting(true)
    try {
      const now = new Date().toISOString()

      // Prepare initial symptoms (only ones with symptom name filled)
      const validSymptoms = symptoms
        .filter(s => s.symptom.trim() !== '')
        .map(s => ({
          symptom: s.symptom,
          severity: s.severity,
          notes: s.notes || undefined,
          firstObserved: now,
          lastObserved: now,
          resolved: false,
          loggedBy: '', // Will be filled by API
        }))

      const episodeData: CreateEpisodeData = {
        patientId: selectedPatientId,
        patientType: selectedPatient!.type,
        type: episodeType,
        title: title.trim(),
        description: description.trim() || undefined,
        startDate,
        // Add time data based on selection mode
        startTime: timeSelectionMode === 'exact' ? startTime : undefined,
        approximateStartTime: timeSelectionMode === 'approximate' ? (approximateStartTime || undefined) : undefined,
        status,
        initialSymptoms: validSymptoms,
        initialPhotos: initialPhotos.map(p => ({ file: p.file, caption: p.caption || undefined })),
        providerName: providerName.trim() || undefined,
        diagnosis: diagnosis.trim() || undefined,
      }

      await onSubmit(episodeData)

      // Reset form
      setSelectedPatientId('')
      setEpisodeType('illness')
      setTitle('')
      setDescription('')
      setStartDate(new Date().toISOString().split('T')[0])
      setStartTime('')
      setApproximateStartTime('')
      setTimeSelectionMode('just_now')
      setStatus('onset')
      setSymptoms([])
      setInitialPhotos([])
      setProviderName('')
      setDiagnosis('')
      setStep(1)

      onClose()
      toast.success('Health episode created successfully!')
    } catch (error: any) {
      console.error('Error creating episode:', error)
      toast.error(error.message || 'Failed to create health episode')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (step === 1) {
      // Validate basic info before moving to date/time
      if (!selectedPatientId) {
        toast.error('Please select a patient')
        return
      }
      if (!title.trim()) {
        toast.error('Please enter a title')
        return
      }
      setStep(1.5) // Go to date/time step
    } else if (step === 1.5) {
      setStep(2) // Go to symptoms
    } else if (step === 2) {
      setStep(2.5) // Go to photos
    } else if (step === 2.5) {
      setStep(3) // Go to provider
    }
  }

  const handleBack = () => {
    if (step === 1.5) setStep(1)
    else if (step === 2) setStep(1.5)
    else if (step === 2.5) setStep(2)
    else if (step === 3) setStep(2.5)
  }

  // Calculate current step for progress bar (5 total steps now)
  const progressSteps = [1, 1.5, 2, 2.5, 3]
  const currentStepIndex = progressSteps.indexOf(step) + 1
  const totalSteps = progressSteps.length

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Track Illness/Injury</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Step {currentStepIndex} of {totalSteps}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStepIndex / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Patient Selector */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Who is sick or injured? *
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                >
                  <option value="">Select patient</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.type === 'pet' ? `🐾 ${patient.name} (${patient.species})` : patient.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Episode Type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEpisodeType('illness')}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                      episodeType === 'illness'
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    🤒 Illness
                  </button>
                  <button
                    type="button"
                    onClick={() => setEpisodeType('injury')}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                      episodeType === 'injury'
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    🤕 Injury
                  </button>
                </div>
              </div>

              {/* Title with Common Suggestions */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  What is it? *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={episodeType === 'illness' ? 'e.g., Flu, Cold, UTI' : 'e.g., Sprained ankle, Cut'}
                  list="common-titles"
                  className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
                {selectedPatient && commonTitles.length > 0 && (
                  <datalist id="common-titles">
                    {commonTitles.map(t => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Any additional context or notes..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Start Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Current Status *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'onset' | 'active')}
                    className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="onset">⚠️ Just Starting</option>
                    <option value="active">🤒 Active/Ongoing</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 1.5: When Did Symptoms Start? */}
          {step === 1.5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">When did symptoms start?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Help us track when this {episodeType} began
                </p>
              </div>

              {/* Date Picker */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              {/* Time Selection Mode */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Time (Optional)
                </label>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setTimeSelectionMode('just_now')}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors text-sm ${
                      timeSelectionMode === 'just_now'
                        ? 'border-primary bg-primary/5 text-foreground font-medium'
                        : 'border-border hover:border-primary/50 text-muted-foreground'
                    }`}
                  >
                    Just Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeSelectionMode('approximate')}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors text-sm ${
                      timeSelectionMode === 'approximate'
                        ? 'border-primary bg-primary/5 text-foreground font-medium'
                        : 'border-border hover:border-primary/50 text-muted-foreground'
                    }`}
                  >
                    Approximate
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeSelectionMode('exact')}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors text-sm ${
                      timeSelectionMode === 'exact'
                        ? 'border-primary bg-primary/5 text-foreground font-medium'
                        : 'border-border hover:border-primary/50 text-muted-foreground'
                    }`}
                  >
                    Exact Time
                  </button>
                </div>

                {/* Approximate Time Options */}
                {timeSelectionMode === 'approximate' && (
                  <div className="grid grid-cols-4 gap-3">
                    {(['morning', 'afternoon', 'evening', 'night'] as const).map((timeOfDay) => (
                      <button
                        key={timeOfDay}
                        type="button"
                        onClick={() => setApproximateStartTime(timeOfDay)}
                        className={`px-4 py-3 rounded-lg border-2 transition-colors capitalize ${
                          approximateStartTime === timeOfDay
                            ? 'border-primary bg-primary/5 text-foreground font-medium'
                            : 'border-border hover:border-primary/50 text-muted-foreground'
                        }`}
                      >
                        {timeOfDay === 'morning' && '🌅'}
                        {timeOfDay === 'afternoon' && '☀️'}
                        {timeOfDay === 'evening' && '🌆'}
                        {timeOfDay === 'night' && '🌙'} {timeOfDay}
                      </button>
                    ))}
                  </div>
                )}

                {/* Exact Time Input */}
                {timeSelectionMode === 'exact' && (
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                )}
              </div>

              {/* Current Status */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Current Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'onset' | 'active')}
                  className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="onset">Just Starting</option>
                  <option value="active">Active/Ongoing</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Symptoms */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Initial Symptoms</h3>
                <button
                  type="button"
                  onClick={handleAddSymptom}
                  className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                >
                  + Add Symptom
                </button>
              </div>

              {symptoms.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-2">No symptoms added yet</p>
                  <p className="text-sm">You can add symptoms now or skip this step</p>
                </div>
              )}

              {symptoms.map((symptom, index) => (
                <div key={index} className="border-2 border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Symptom
                      </label>
                      <input
                        type="text"
                        value={symptom.symptom}
                        onChange={(e) => handleSymptomChange(index, 'symptom', e.target.value)}
                        placeholder="Select or type symptom..."
                        list={`symptoms-${index}`}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                      {selectedPatient && symptomLibrary.length > 0 && (
                        <datalist id={`symptoms-${index}`}>
                          {symptomLibrary.map(s => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSymptom(index)}
                      className="mt-7 text-error hover:text-error/80 transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Severity Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-foreground">Severity</label>
                      <span className="text-sm">
                        {getSeverityLabel(symptom.severity).emoji} {getSeverityLabel(symptom.severity).label}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={symptom.severity}
                      onChange={(e) => handleSymptomChange(index, 'severity', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>😊 Mild</span>
                      <span>😭 Critical</span>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={symptom.notes}
                      onChange={(e) => handleSymptomChange(index, 'notes', e.target.value)}
                      placeholder="Any additional observations..."
                      rows={2}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2.5: Initial Photos (Optional) */}
          {step === 2.5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Initial Photos (Optional)</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Document the condition with up to 4 photos for baseline tracking
                </p>
              </div>

              {/* Photo Upload Area */}
              {initialPhotos.length < 4 && (
                <div>
                  <label className="block">
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                      <div className="text-4xl mb-2">📸</div>
                      <p className="text-foreground font-medium mb-1">
                        {initialPhotos.length === 0 ? 'Add Photos' : 'Add More Photos'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {4 - initialPhotos.length} {4 - initialPhotos.length === 1 ? 'slot' : 'slots'} remaining
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Photo Previews */}
              {initialPhotos.length > 0 && (
                <div className="space-y-3">
                  {initialPhotos.map((photo, index) => (
                    <div key={index} className="border-2 border-border rounded-lg p-4 space-y-3">
                      <div className="flex gap-4">
                        {/* Preview Image */}
                        <img
                          src={photo.preview}
                          alt={`Preview ${index + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border border-border"
                        />

                        {/* Caption Input and Remove Button */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <label className="text-sm font-medium text-foreground">
                              Photo {index + 1} Caption (Optional)
                            </label>
                            <button
                              type="button"
                              onClick={() => handlePhotoRemove(index)}
                              className="text-error hover:text-error/80 transition-colors"
                              title="Remove photo"
                            >
                              <XMarkIcon className="w-5 h-5" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={photo.caption}
                            onChange={(e) => handlePhotoCaptionChange(index, e.target.value)}
                            placeholder="e.g., 'Rash on left arm', 'Day 0 baseline'"
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
                          />
                          <p className="text-xs text-muted-foreground">
                            {photo.file.name} ({(photo.file.size / 1024 / 1024).toFixed(2)} MB)
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {initialPhotos.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  You can skip this step and add photos later if needed
                </div>
              )}
            </div>
          )}

          {/* Step 3: Provider Info */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Medical Provider (Optional)
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add information about the {selectedPatient?.type === 'pet' ? 'veterinarian' : 'doctor'} if applicable
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {selectedPatient?.type === 'pet' ? 'Veterinarian' : 'Doctor'} Name
                </label>
                <input
                  type="text"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder={selectedPatient?.type === 'pet' ? 'Dr. Smith, Valley Vet Clinic' : 'Dr. Johnson'}
                  className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Official Diagnosis
                </label>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Enter the official diagnosis if provided..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Summary */}
              <div className="bg-muted rounded-lg p-4 mt-6">
                <h4 className="font-medium text-foreground mb-3">Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Patient:</span>
                    <span className="text-foreground font-medium">
                      {selectedPatient?.name} {selectedPatient?.type === 'pet' && `🐾`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="text-foreground font-medium capitalize">{episodeType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Title:</span>
                    <span className="text-foreground font-medium">{title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Symptoms:</span>
                    <span className="text-foreground font-medium">
                      {symptoms.filter(s => s.symptom.trim()).length} added
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-border">
          <button
            type="button"
            onClick={step === 1 ? onClose : handleBack}
            disabled={isSubmitting}
            className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <div className="flex gap-3">
            {step !== 3 && (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
              >
                Next
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Episode'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
