/**
 * Recommendation Modal Component
 *
 * Uses AppointmentWizard to schedule appointments from AI recommendations
 * Pre-fills wizard with recommendation details
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { AppointmentRecommendation } from '@/types/medical'
import { usePatients } from '@/hooks/usePatients'
import { useProviders } from '@/hooks/useProviders'
import { useAppointments } from '@/hooks/useAppointments'
import { useFamilyMembers } from '@/hooks/useFamilyMembers'
import AppointmentWizard, { AppointmentData } from '@/components/wizards/AppointmentWizard'
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

  const patientId = recommendation.patientId || ''
  const patient = patients.find(p => p.id === patientId)

  // Fetch family members for the patient
  const { familyMembers } = useFamilyMembers({
    patientId,
    autoFetch: !!patientId
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

  const handleWizardSubmit = async (appointmentData: AppointmentData) => {
    const provider = providers.find(p => p.id === appointmentData.providerId)
    const driver = familyMembers.find(m => m.userId === appointmentData.assignedDriverId)

    if (!patient || !provider) {
      throw new Error('Patient or provider not found')
    }

    const data = {
      userId: user?.uid || '',
      patientId: patientId,
      patientName: patient.name,
      providerId: appointmentData.providerId,
      providerName: provider.name,
      specialty: provider.specialty,
      dateTime: appointmentData.dateTime.toISOString(),
      type: recommendation.type as any,
      reason: appointmentData.reason,
      notes: appointmentData.notes || `Recommended by AI: ${recommendation.reason}`,
      location: appointmentData.location,
      status: 'scheduled' as const,
      // Source tracking
      createdFrom: 'ai-recommendation' as const,
      aiRecommendationId: recommendation.id,
      recommendationReason: recommendation.reason,
      recommendationSeverity: recommendation.severity,
      // Driver fields
      requiresDriver: appointmentData.requiresDriver,
      assignedDriverId: driver?.userId,
      assignedDriverName: driver?.name,
      driverStatus: appointmentData.requiresDriver
        ? (appointmentData.assignedDriverId ? 'pending' as const : 'not-needed' as const)
        : 'not-needed' as const,
      pickupTime: appointmentData.pickupTime?.toISOString(),
      updatedAt: new Date().toISOString()
    }

    const newAppointment = await createAppointment(data)

    // Mark recommendation as scheduled
    await fetch(`/api/appointments/recommendations/${recommendation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'schedule',
        appointmentId: newAppointment.id
      })
    })

    if (appointmentData.requiresDriver && driver) {
      toast.success(`Driver request sent to ${driver.name}`)
    }

    toast.success('Appointment scheduled from AI recommendation!')
    onScheduled(newAppointment.id)
    router.push('/calendar')
  }

  if (!patient) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6 text-center">
          <p className="text-foreground mb-4">Patient not found</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <AppointmentWizard
      isOpen={true}
      onClose={onClose}
      familyMember={{
        id: patientId,
        name: patient.name
      }}
      providers={recommendedProviders.length > 0 ? recommendedProviders : providers}
      familyMembers={familyMembers.map(m => ({
        userId: m.userId,
        name: m.name,
        email: m.email
      }))}
      onSubmit={handleWizardSubmit}
    />
  )
}
