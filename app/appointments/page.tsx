/**
 * Appointments List Page
 * View and manage all appointments
 */

'use client'

import { useRouter } from 'next/navigation'
import { useAppointments } from '@/hooks/useAppointments'
import { PageHeader } from '@/components/ui/PageHeader'
import AuthGuard from '@/components/auth/AuthGuard'
import { CalendarDaysIcon, PlusIcon } from '@heroicons/react/24/outline'

export default function AppointmentsPage() {
  return (
    <AuthGuard>
      <AppointmentsContent />
    </AuthGuard>
  )
}

function AppointmentsContent() {
  const router = useRouter()
  const { appointments, loading } = useAppointments()

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
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

  const now = new Date()
  const upcomingAppointments = appointments.filter(apt => new Date(apt.dateTime) >= now)
  const pastAppointments = appointments.filter(apt => new Date(apt.dateTime) < now)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageHeader
        title="Appointments"
        subtitle="Manage medical appointments"
        backHref="/medical"
      />

      <main className="container mx-auto px-4 py-8">
        {/* Add Appointment Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/appointments/new')}
            className="flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            <PlusIcon className="w-5 h-5" />
            Schedule Appointment
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading appointments...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
            <CalendarDaysIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No appointments scheduled
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Get started by scheduling your first appointment
            </p>
            <button
              onClick={() => router.push('/appointments/new')}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Schedule Appointment
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Upcoming Appointments */}
            {upcomingAppointments.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Upcoming Appointments ({upcomingAppointments.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingAppointments.map(appointment => (
                    <div
                      key={appointment.id}
                      onClick={() => router.push(`/appointments/${appointment.id}`)}
                      className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border-2 border-purple-200 dark:border-purple-800"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            {appointment.patientName}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {appointment.providerName}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarDaysIcon className="w-4 h-4 text-purple-600" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {formatDate(appointment.dateTime)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-purple-600 font-medium">
                            {formatTime(appointment.dateTime)}
                          </span>
                        </div>
                        {appointment.reason && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                            {appointment.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Appointments */}
            {pastAppointments.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Past Appointments ({pastAppointments.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastAppointments.map(appointment => (
                    <div
                      key={appointment.id}
                      onClick={() => router.push(`/appointments/${appointment.id}`)}
                      className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer opacity-75"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            {appointment.patientName}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {appointment.providerName}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {formatDate(appointment.dateTime)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-600 font-medium">
                            {formatTime(appointment.dateTime)}
                          </span>
                        </div>
                        {appointment.reason && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                            {appointment.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
