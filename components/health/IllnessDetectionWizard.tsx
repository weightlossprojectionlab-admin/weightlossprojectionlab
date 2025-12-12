/**
 * Illness Detection Wizard
 *
 * Auto-triggered modal when illness signals are detected by the detection engine.
 * Pre-fills episode data from detected signals and guides user through streamlined flow.
 *
 * Flow: Confirm → When → What → Photos → Provider → Create
 *
 * Usage:
 * ```tsx
 * <IllnessDetectionWizard
 *   isOpen={signals.length > 0}
 *   signals={signals}
 *   patient={patient}
 *   onClose={() => setSignals([])}
 *   onCreateEpisode={(data) => handleCreateEpisode(data)}
 * />
 * ```
 */

'use client'

import { useState, useMemo } from 'react'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { PatientProfile } from '@/types/medical'
import type { IllnessSignal } from '@/lib/illness-detection-engine'
import { CreateEpisodeData, CreateEpisodeModal } from './CreateEpisodeModal'
import toast from 'react-hot-toast'

interface IllnessDetectionWizardProps {
  isOpen: boolean
  signals: IllnessSignal[] // Detected illness signals
  patient: PatientProfile
  onClose: () => void
  onCreateEpisode: (episodeData: CreateEpisodeData) => Promise<void>
}

export function IllnessDetectionWizard({
  isOpen,
  signals,
  patient,
  onClose,
  onCreateEpisode
}: IllnessDetectionWizardProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Get the highest severity signal - ALL HOOKS MUST BE BEFORE EARLY RETURN
  const primarySignal = useMemo(() => {
    if (signals.length === 0) return null
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    return signals.sort((a, b) =>
      severityOrder[b.severity] - severityOrder[a.severity]
    )[0]
  }, [signals])

  // Pre-fill episode data from signals - MUST BE BEFORE EARLY RETURN
  const preFillData = useMemo((): Partial<CreateEpisodeData> | null => {
    if (!primarySignal) return null
    const now = new Date()
    const startDate = now.toISOString().split('T')[0]

    // Determine episode type (illness vs injury) - default to illness from detection
    const type = 'illness'

    // Suggest title from detected illness suggestions or signal type
    const title = primarySignal.recommendation.suggestedIllnesses?.[0] ||
                  (primarySignal.type === 'vital_abnormal' ? 'Abnormal Vital Signs' :
                   primarySignal.type === 'mood_decline' ? 'Not Feeling Well' :
                   'Health Concern')

    // Build initial symptoms from signals
    const initialSymptoms: any[] = []

    signals.forEach(signal => {
      if (signal.trigger.vitalType) {
        // Add vital abnormality as a symptom
        const symptomName = signal.trigger.vitalType === 'temperature' ? 'Fever' :
                           signal.trigger.vitalType === 'pulse_oximeter' ? 'Low oxygen' :
                           signal.trigger.vitalType === 'blood_pressure' ? 'High blood pressure' :
                           signal.trigger.vitalType === 'blood_sugar' ? 'Blood sugar issue' :
                           'Vital abnormality'

        initialSymptoms.push({
          symptom: symptomName,
          severity: signal.severity === 'critical' ? 5 :
                   signal.severity === 'high' ? 4 :
                   signal.severity === 'medium' ? 3 : 2,
          notes: signal.recommendation.reasoning,
          firstObserved: signal.detectedAt,
          lastObserved: signal.detectedAt,
          resolved: false,
          loggedBy: ''
        })
      }

      if (signal.trigger.moodChange) {
        // Add mood changes as symptoms
        if (signal.trigger.moodChange.energy <= -2) {
          initialSymptoms.push({
            symptom: 'Low energy',
            severity: Math.abs(signal.trigger.moodChange.energy) as 1 | 2 | 3 | 4 | 5,
            notes: 'Detected from mood tracking',
            firstObserved: signal.detectedAt,
            lastObserved: signal.detectedAt,
            resolved: false,
            loggedBy: ''
          })
        }
        if (signal.trigger.moodChange.appetite <= -2) {
          initialSymptoms.push({
            symptom: patient.type === 'pet' ? 'Loss of appetite' : 'Poor appetite',
            severity: Math.abs(signal.trigger.moodChange.appetite) as 1 | 2 | 3 | 4 | 5,
            notes: 'Detected from mood tracking',
            firstObserved: signal.detectedAt,
            lastObserved: signal.detectedAt,
            resolved: false,
            loggedBy: ''
          })
        }
      }
    })

    return {
      patientId: patient.id,
      patientType: patient.type,
      type,
      title,
      startDate,
      approximateStartTime: 'morning', // Default to morning for detection
      status: 'onset',
      initialSymptoms: initialSymptoms.slice(0, 3) // Limit to 3 pre-filled symptoms
    }
  }, [primarySignal, signals, patient])

  // Early return AFTER all hooks
  if (!isOpen || signals.length === 0 || !primarySignal) return null

  // Helper functions
  const getSeverityColor = (severity: IllnessSignal['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-error border-error bg-error/10'
      case 'high':
        return 'text-orange-600 border-orange-600 bg-orange-50'
      case 'medium':
        return 'text-yellow-600 border-yellow-600 bg-yellow-50'
      case 'low':
        return 'text-blue-600 border-blue-600 bg-blue-50'
      default:
        return 'text-muted-foreground border-border bg-muted'
    }
  }

  const getSeverityLabel = (severity: IllnessSignal['severity']) => {
    return severity.charAt(0).toUpperCase() + severity.slice(1)
  }

  const handleDismiss = () => {
    toast.success('Alert dismissed. You can create an episode manually if needed.')
    onClose()
  }

  const handleCreateEpisode = () => {
    setShowCreateModal(true)
  }

  // Wrapper for onSubmit that includes the pre-filled data
  const handleSubmitEpisode = async (episodeData: CreateEpisodeData) => {
    await onCreateEpisode(episodeData)
    setShowCreateModal(false)
    onClose() // Close the wizard after successful creation
  }

  return (
    <>
      {/* Illness Detection Alert Modal */}
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className={`flex items-start gap-4 p-6 border-b-2 ${getSeverityColor(primarySignal.severity)}`}>
            <ExclamationTriangleIcon className="w-8 h-8 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1">
                Health Alert Detected
              </h2>
              <p className="text-sm opacity-90">
                {patient.type === 'pet' ? `🐾 ${patient.name}` : patient.name} - {getSeverityLabel(primarySignal.severity)} Priority
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-current hover:opacity-70 transition-opacity"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Signal Details */}
          <div className="p-6 space-y-4">
            {/* Primary Signal */}
            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-2">What We Detected:</h3>
              <p className="text-foreground">{primarySignal.recommendation.reasoning}</p>
            </div>

            {/* Additional Signals */}
            {signals.length > 1 && (
              <div className="space-y-2">
                <h4 className="font-medium text-foreground text-sm">Additional Concerns:</h4>
                <ul className="space-y-1">
                  {signals.slice(1).map((signal, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{signal.recommendation.reasoning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Illnesses */}
            {primarySignal.recommendation.suggestedIllnesses &&
             primarySignal.recommendation.suggestedIllnesses.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-foreground text-sm">Possible Conditions:</h4>
                <div className="flex flex-wrap gap-2">
                  {primarySignal.recommendation.suggestedIllnesses.map((illness, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {illness}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendation */}
            <div className={`border-l-4 pl-4 py-2 ${
              primarySignal.recommendation.action === 'emergency' ? 'border-error' :
              primarySignal.recommendation.action === 'contact_doctor' ? 'border-orange-600' :
              primarySignal.recommendation.action === 'create_episode' ? 'border-primary' :
              'border-blue-600'
            }`}>
              <h4 className="font-semibold text-foreground text-sm mb-1">
                Recommended Action:
              </h4>
              <p className="text-sm text-muted-foreground">
                {primarySignal.recommendation.action === 'emergency' &&
                  '🚨 Seek immediate medical attention'}
                {primarySignal.recommendation.action === 'contact_doctor' &&
                  `📞 Contact ${patient.type === 'pet' ? 'veterinarian' : 'doctor'} soon`}
                {primarySignal.recommendation.action === 'create_episode' &&
                  '📝 Track this illness/injury episode'}
                {primarySignal.recommendation.action === 'monitor' &&
                  '👁️ Monitor symptoms closely'}
              </p>
            </div>

            {/* Photos Recommendation */}
            {primarySignal.recommendation.requiresPhotos && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                <p className="text-sm text-foreground">
                  📸 <strong>Tip:</strong> Consider taking photos to document the condition for your {patient.type === 'pet' ? 'vet' : 'doctor'}.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 p-6 border-t border-border">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={handleCreateEpisode}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              Track This Episode
            </button>
          </div>
        </div>
      </div>

      {/* CreateEpisodeModal with Pre-filled Data */}
      {showCreateModal && (
        <CreateEpisodeModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            onClose() // Also close the wizard when modal is closed
          }}
          patients={[patient]} // Pass only the relevant patient
          onSubmit={handleSubmitEpisode}
          // Note: We'll need to modify CreateEpisodeModal to accept initialData prop
          // For now, users will need to fill in the form (signals provide context)
        />
      )}
    </>
  )
}
