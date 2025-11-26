/**
 * Appointment Detail Page
 * View and manage individual appointment details
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { medicalOperations } from '@/lib/medical-operations'
import { Appointment } from '@/types/medical'
import { PageHeader } from '@/components/ui/PageHeader'
import AuthGuard from '@/components/auth/AuthGuard'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { CalendarDaysIcon, UserIcon, BuildingOffice2Icon, MapPinIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

export default function AppointmentDetailPage() {
  return (
    <AuthGuard>
      <AppointmentDetailContent />
    </AuthGuard>
  )
}

function AppointmentDetailContent() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const appointmentId = params.appointmentId as string

  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [respondingToDriver, setRespondingToDriver] = useState(false)

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        setLoading(true)
        const data = await medicalOperations.appointments.getAppointment(appointmentId)
        setAppointment(data)
      } catch (error: any) {
        toast.error('Failed to load appointment details')
      } finally {
        setLoading(false)
      }
    }

    fetchAppointment()
  }, [appointmentId])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this appointment?')) {
      return
    }

    try {
      setDeleting(true)
      await medicalOperations.appointments.deleteAppointment(appointmentId)
      toast.success('Appointment deleted successfully')
      router.push('/appointments')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete appointment')
    } finally {
      setDeleting(false)
    }
  }

  const handleDriverAccept = async () => {
    if (!appointment) return

    try {
      setRespondingToDriver(true)
      const updatedAppointment = await medicalOperations.appointments.updateAppointment(appointmentId, {
        driverStatus: 'accepted',
        driverAcceptedAt: new Date().toISOString()
      })
      setAppointment(updatedAppointment)
      toast.success('You accepted the driver assignment!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept driver assignment')
    } finally {
      setRespondingToDriver(false)
    }
  }

  const handleDriverDecline = async () => {
    if (!appointment) return

    const reason = prompt('Optional: Why are you declining?')

    try {
      setRespondingToDriver(true)
      const updatedAppointment = await medicalOperations.appointments.updateAppointment(appointmentId, {
        driverStatus: 'declined',
        driverDeclinedAt: new Date().toISOString(),
        driverDeclineReason: reason || undefined
      })
      setAppointment(updatedAppointment)
      toast.success('You declined the driver assignment')
    } catch (error: any) {
      toast.error(error.message || 'Failed to decline driver assignment')
    } finally {
      setRespondingToDriver(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 dark:bg-green-900/20 text-success-dark dark:text-green-400'
      case 'scheduled':
        return 'bg-blue-100 text-blue-700'
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/20 text-error-dark'
      case 'completed':
        return 'bg-muted text-foreground dark:text-muted-foreground'
      default:
        return 'bg-muted text-foreground dark:text-muted-foreground'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Appointment Not Found
          </h2>
          <p className="text-muted-foreground mb-6">
            The appointment you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => router.push('/appointments')}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            Back to Appointments
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Appointment Details"
        subtitle={appointment.patientName}
        backHref="/appointments"
      />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-card rounded-lg shadow-sm p-8 space-y-8">
          {/* Header with Status */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {appointment.reason}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(appointment.status)}`}>
                  {appointment.status}
                </span>
              </div>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-error hover:bg-error-light dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <TrashIcon className="w-5 h-5" />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>

          {/* Date and Time */}
          <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <CalendarDaysIcon className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                {formatDate(appointment.dateTime)}
              </h2>
            </div>
            <p className="text-2xl font-bold text-primary ml-9">
              {formatTime(appointment.dateTime)}
            </p>
          </div>

          {/* Patient */}
          <div className="flex items-start gap-4">
            <UserIcon className="w-6 h-6 text-muted-foreground mt-1" />
            <div>
              <h3 className="text-sm font-medium text-muted-foreground dark:text-muted-foreground mb-1">
                Patient
              </h3>
              <p className="text-lg font-semibold text-foreground">
                {appointment.patientName}
              </p>
            </div>
          </div>

          {/* Provider */}
          <div className="flex items-start gap-4">
            <BuildingOffice2Icon className="w-6 h-6 text-muted-foreground mt-1" />
            <div>
              <h3 className="text-sm font-medium text-muted-foreground dark:text-muted-foreground mb-1">
                Provider
              </h3>
              <p className="text-lg font-semibold text-foreground">
                {appointment.providerName}
              </p>
            </div>
          </div>

          {/* Transportation / Driver Status */}
          {appointment.requiresDriver && (
            <div className="border-l-4 border-blue-500 bg-secondary-light dark:bg-blue-900/10 rounded-r-lg p-6">
              <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                Transportation
              </h3>

              {appointment.driverStatus === 'pending' && appointment.assignedDriverName && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-warning-light0 rounded-full animate-pulse"></span>
                    <p className="text-foreground font-medium">
                      {user?.uid === appointment.assignedDriverId
                        ? '⏳ You have been requested to drive'
                        : `Waiting for ${appointment.assignedDriverName} to confirm`}
                    </p>
                  </div>

                  {user?.uid === appointment.assignedDriverId ? (
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={handleDriverAccept}
                        disabled={respondingToDriver}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-success text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        <CheckCircleIcon className="w-5 h-5" />
                        {respondingToDriver ? 'Accepting...' : 'Accept & Drive'}
                      </button>
                      <button
                        onClick={handleDriverDecline}
                        disabled={respondingToDriver}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-error text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        <XCircleIcon className="w-5 h-5" />
                        {respondingToDriver ? 'Declining...' : 'Decline'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Driver has been notified and will accept or decline soon.
                    </p>
                  )}
                </div>
              )}

              {appointment.driverStatus === 'accepted' && appointment.assignedDriverName && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-success-light0 rounded-full"></span>
                    <p className="text-foreground font-medium">
                      ✅ {appointment.assignedDriverName} will drive
                    </p>
                  </div>
                  {appointment.pickupTime && (
                    <p className="text-sm text-muted-foreground">
                      Pickup time: {formatDate(appointment.pickupTime)} at {formatTime(appointment.pickupTime)}
                    </p>
                  )}
                  {appointment.driverAcceptedAt && (
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                      Accepted on {formatDate(appointment.driverAcceptedAt)}
                    </p>
                  )}
                </div>
              )}

              {appointment.driverStatus === 'declined' && appointment.assignedDriverName && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-error-light0 rounded-full"></span>
                    <p className="text-foreground font-medium">
                      ❌ {appointment.assignedDriverName} declined
                    </p>
                  </div>
                  {appointment.driverDeclineReason && (
                    <p className="text-sm text-muted-foreground">
                      Reason: {appointment.driverDeclineReason}
                    </p>
                  )}
                  <p className="text-sm text-warning dark:text-orange-400 font-medium">
                    ⚠️ Please assign a different driver
                  </p>
                </div>
              )}

              {appointment.driverStatus === 'not-needed' && (
                <p className="text-muted-foreground">
                  Patient does not require transportation
                </p>
              )}
            </div>
          )}

          {/* Location */}
          {appointment.location && (
            <div className="flex items-start gap-4">
              <MapPinIcon className="w-6 h-6 text-muted-foreground mt-1" />
              <div>
                <h3 className="text-sm font-medium text-muted-foreground dark:text-muted-foreground mb-1">
                  Location
                </h3>
                <p className="text-foreground">
                  {appointment.location}
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-medium text-muted-foreground dark:text-muted-foreground mb-2">
                Notes
              </h3>
              <p className="text-foreground whitespace-pre-wrap">
                {appointment.notes}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="border-t border-border pt-6 flex gap-3">
            <button
              onClick={() => router.push(`/patients/${appointment.patientId}`)}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              View Family Member
            </button>
            <button
              onClick={() => router.push(`/providers/${appointment.providerId}`)}
              className="px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              View Provider
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
