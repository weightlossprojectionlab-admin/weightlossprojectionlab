/**
 * New Appointment Page
 * Schedule a new medical appointment
 */

'use client'

import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import AuthGuard from '@/components/auth/AuthGuard'
import { AppointmentForm } from '@/components/appointments/AppointmentForm'

export default function NewAppointmentPage() {
  return (
    <AuthGuard>
      <NewAppointmentContent />
    </AuthGuard>
  )
}

function NewAppointmentContent() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Schedule Appointment"
        subtitle="Book a new medical appointment"
        backHref="/appointments"
      />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-card rounded-lg shadow-sm p-8">
          <AppointmentForm
            onSuccess={(appointmentId) => router.push(`/appointments/${appointmentId}`)}
            onCancel={() => router.back()}
          />
        </div>
      </main>
    </div>
  )
}
