/**
 * Recommendation Modal Component
 *
 * Pre-fills appointment form with recommendation details
 * Allows user to select provider and schedule
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { AppointmentRecommendation } from '@/types/medical'
import { usePatients } from '@/hooks/usePatients'
import { useProviders } from '@/hooks/useProviders'
import { useAppointments } from '@/hooks/useAppointments'
import { XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface RecommendationModalProps {
  recommendation: AppointmentRecommendation
  onClose: () => void
  onScheduled: (appointmentId: string) => void
}

export function RecommendationModal({
  recommendation,
  onClose,
  onScheduled
}: RecommendationModalProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { patients } = usePatients()
  const { providers } = useProviders()
  const { createAppointment } = useAppointments()

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    patientId: recommendation.patientId || '',
    providerId: '',
    dateTime: '',
    reason: recommendation.reason,
    notes: `Recommended by AI due to: ${recommendation.reason}`,
    location: ''
  })

  // Filter providers by recommended type
  const recommendedProviders = providers.filter(p => {
    const providerType = p.specialty?.toLowerCase() || ''
    const recType = recommendation.suggestedProviderType.toLowerCase()

    if (recType.includes('nutrition')) {
      return providerType.includes('nutrition') || providerType.includes('dietitian')
    }
    if (recType.includes('primary') || recType.includes('physician')) {
      return providerType.includes('primary') || providerType.includes('family') || providerType.includes('physician')
    }
    if (recType.includes('mental') || recType.includes('psych')) {
      return providerType.includes('mental') || providerType.includes('psych') || providerType.includes('therapist')
    }
    if (recType.includes('specialist')) {
      return providerType.includes('specialist') || providerType.includes('cardio') || providerType.includes('endo')
    }

    return true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const patient = patients.find(p => p.id === formData.patientId)
      const provider = providers.find(p => p.id === formData.providerId)

      if (!patient || !provider) {
        throw new Error('Patient or provider not found')
      }

      const appointmentData = {
        userId: user?.uid || '',
        patientId: formData.patientId,
        patientName: patient.name,
        providerId: formData.providerId,
        providerName: provider.name,
        specialty: provider.specialty,
        dateTime: new Date(formData.dateTime).toISOString(),
        type: recommendation.type as any, // Map recommendation type to appointment type
        reason: formData.reason,
        notes: formData.notes || undefined,
        location: formData.location || undefined,
        status: 'scheduled' as const,
        // Source tracking
        createdFrom: 'ai-recommendation' as const,
        aiRecommendationId: recommendation.id,
        recommendationReason: recommendation.reason,
        recommendationSeverity: recommendation.severity,
        // Driver defaults
        requiresDriver: false,
        driverStatus: 'not-needed' as const,
        updatedAt: new Date().toISOString()
      }

      const newAppointment = await createAppointment(appointmentData)

      // Mark recommendation as scheduled
      await fetch(`/api/appointments/recommendations/${recommendation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'schedule',
          appointmentId: newAppointment.id
        })
      })

      toast.success('Appointment scheduled from AI recommendation!')
      onScheduled(newAppointment.id)
      router.push(`/appointments/${newAppointment.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule appointment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Schedule Recommended Appointment
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              AI detected: {recommendation.reason}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Patient Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Patient *
            </label>
            <select
              value={formData.patientId}
              onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              required
              className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
            >
              <option value="">Select a patient</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} ({patient.relationship})
                </option>
              ))}
            </select>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Provider * <span className="text-primary text-xs">(Filtered by recommendation)</span>
            </label>
            <select
              value={formData.providerId}
              onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
              required
              className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
            >
              <option value="">Select a provider</option>
              {recommendedProviders.length === 0 ? (
                <option disabled>No matching providers found</option>
              ) : (
                recommendedProviders.map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} - {provider.specialty}
                  </option>
                ))
              )}
            </select>
            {recommendedProviders.length === 0 && (
              <p className="text-sm text-warning dark:text-orange-400 mt-1">
                No {recommendation.suggestedProviderType} providers found.{' '}
                <a href="/providers/new" className="underline hover:text-orange-700">
                  Add one first
                </a>
              </p>
            )}
          </div>

          {/* Date and Time */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Date & Time *
            </label>
            <input
              type="datetime-local"
              value={formData.dateTime}
              onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
              required
              className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
            />
          </div>

          {/* Reason (pre-filled but editable) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Reason for Visit *
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
              className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Location (Optional)
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Office address or telehealth"
              className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
            />
          </div>

          {/* Notes (pre-filled) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-border">
            <button
              type="submit"
              disabled={loading || recommendedProviders.length === 0}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Scheduling...' : 'Schedule Appointment'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
