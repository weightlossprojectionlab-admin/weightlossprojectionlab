/**
 * Appointment List Component
 * Displays list of appointments for a patient
 */

'use client'

import { useAppointments } from '@/hooks/useAppointments'
import { CalendarDaysIcon, ClockIcon, MapPinIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline'
import type { Appointment } from '@/types/medical'

interface AppointmentListProps {
  patientId: string
  onEdit?: (appointment: Appointment) => void
}

export function AppointmentList({ patientId, onEdit }: AppointmentListProps) {
  const { appointments, loading, deleteAppointment } = useAppointments({
    patientId,
    autoFetch: true
  })

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

  const handleDelete = async (appointmentId: string) => {
    if (confirm('Are you sure you want to delete this appointment?')) {
      await deleteAppointment(appointmentId)
    }
  }

  const now = new Date()
  const upcomingAppointments = appointments.filter(apt => new Date(apt.dateTime) >= now)
  const pastAppointments = appointments.filter(apt => new Date(apt.dateTime) < now)

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">Loading appointments...</p>
      </div>
    )
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-8 bg-muted rounded-lg">
        <CalendarDaysIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No appointments scheduled</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <div>
          <h3 className="text-md font-semibold text-foreground mb-3">
            Upcoming ({upcomingAppointments.length})
          </h3>
          <div className="space-y-3">
            {upcomingAppointments.map(appointment => (
              <div
                key={appointment.id}
                className="bg-card rounded-lg border-2 border-primary-light p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">
                      {appointment.providerName}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {appointment.specialty}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(appointment)}
                        className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                        title="Edit"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(appointment.id)}
                      className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDaysIcon className="w-4 h-4 text-primary" />
                    <span className="text-foreground font-medium">
                      {formatDate(appointment.dateTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ClockIcon className="w-4 h-4 text-primary" />
                    <span className="text-foreground">
                      {formatTime(appointment.dateTime)}
                    </span>
                  </div>
                  {appointment.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPinIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {appointment.location}
                      </span>
                    </div>
                  )}
                  {appointment.reason && (
                    <p className="text-sm text-muted-foreground mt-2">
                      <span className="font-medium">Reason:</span> {appointment.reason}
                    </p>
                  )}
                  {appointment.requiresDriver && appointment.assignedDriverName && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                      <span className="font-medium text-blue-700 dark:text-blue-300">
                        🚗 Driver: {appointment.assignedDriverName}
                      </span>
                      {appointment.driverStatus && (
                        <span className="ml-2 text-xs text-muted-foreground capitalize">
                          ({appointment.driverStatus})
                        </span>
                      )}
                    </div>
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
          <h3 className="text-md font-semibold text-foreground mb-3">
            Past ({pastAppointments.length})
          </h3>
          <div className="space-y-3">
            {pastAppointments.slice(0, 5).map(appointment => (
              <div
                key={appointment.id}
                className="bg-card rounded-lg border border-border p-4 opacity-75 hover:opacity-100 transition-opacity"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground text-sm">
                      {appointment.providerName}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {appointment.specialty}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(appointment.id)}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    title="Delete"
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <CalendarDaysIcon className="w-3 h-3 text-muted-foreground" />
                    <span className="text-foreground">
                      {formatDate(appointment.dateTime)}
                    </span>
                  </div>
                  {appointment.reason && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {appointment.reason}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {pastAppointments.length > 5 && (
              <p className="text-xs text-center text-muted-foreground">
                +{pastAppointments.length - 5} more past appointments
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
