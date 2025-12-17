/**
 * New Appointment Page
 * Schedule a new medical appointment using AI-guided wizard
 * Now with feature gating for appointments
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import AuthGuard from '@/components/auth/AuthGuard'
import AppointmentWizard, { AppointmentData } from '@/components/wizards/AppointmentWizard'
import { useAuth } from '@/hooks/useAuth'
import { usePatients } from '@/hooks/usePatients'
import { useProviders } from '@/hooks/useProviders'
import { useFamilyMembers } from '@/hooks/useFamilyMembers'
import { useAppointments } from '@/hooks/useAppointments'
import { FeatureGate } from '@/components/subscription'
import toast from 'react-hot-toast'

export default function NewAppointmentPage() {
  return (
    <AuthGuard>
      <FeatureGate
        feature="appointments"
        featureName="Medical Appointments"
      >
        <NewAppointmentContent />
      </FeatureGate>
    </AuthGuard>
  )
}

function NewAppointmentContent() {
  const router = useRouter()
  const { user } = useAuth()
  const { patients } = usePatients()
  const { providers } = useProviders()
  const { createAppointment } = useAppointments()

  const [selectedPatient, setSelectedPatient] = useState<string>('')
  const [showWizard, setShowWizard] = useState(false)

  // Fetch family members for selected patient
  const { familyMembers } = useFamilyMembers({
    patientId: selectedPatient,
    autoFetch: !!selectedPatient
  })

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatient(patientId)
    setShowWizard(true)
  }

  const handleWizardSubmit = async (appointmentData: AppointmentData) => {
    const patient = patients.find(p => p.id === selectedPatient)
    const provider = providers.find(p => p.id === appointmentData.providerId)
    const driver = familyMembers.find(m => m.userId === appointmentData.assignedDriverId)

    if (!patient) throw new Error('Patient not found')

    const data = {
      userId: user?.uid || '',
      patientId: selectedPatient,
      patientName: patient.name,
      providerId: appointmentData.providerId,
      providerName: provider?.name || '',
      specialty: provider?.specialty,
      dateTime: appointmentData.dateTime.toISOString(),
      type: appointmentData.type,
      reason: appointmentData.reason,
      notes: appointmentData.notes,
      location: appointmentData.location,
      status: 'scheduled' as const,
      createdFrom: 'manual' as const,
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

    if (appointmentData.requiresDriver && driver) {
      toast.success(`Driver request sent to ${driver.name}`)
    }

    toast.success('Appointment scheduled successfully!')
    router.push('/calendar')
  }

  const handleWizardClose = () => {
    setShowWizard(false)
    setSelectedPatient('')
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Schedule Appointment"
        subtitle="AI-guided appointment scheduling"
        backHref="/appointments"
      />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {!showWizard ? (
          <div className="bg-card rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Select Family Member</h2>
            <p className="text-muted-foreground mb-6">
              Choose who this appointment is for
            </p>
            <div className="space-y-3">
              {patients.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No family members found</p>
                  <button
                    onClick={() => router.push('/patients/new')}
                    className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                  >
                    Add Family Member
                  </button>
                </div>
              ) : (
                patients.map(patient => (
                  <button
                    key={patient.id}
                    onClick={() => handleSelectPatient(patient.id)}
                    className="w-full text-left p-4 border-2 border-border rounded-lg hover:border-primary transition-colors"
                  >
                    <div className="font-semibold text-foreground">{patient.name}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {patient.relationship}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <AppointmentWizard
            isOpen={showWizard}
            onClose={handleWizardClose}
            familyMember={{
              id: selectedPatient,
              name: patients.find(p => p.id === selectedPatient)?.name || ''
            }}
            providers={providers}
            familyMembers={familyMembers.map(m => ({
              userId: m.userId,
              name: m.name,
              email: m.email
            }))}
            onSubmit={handleWizardSubmit}
          />
        )}
      </main>
    </div>
  )
}
