'use client'

/**
 * Appointments list — the single source for viewing / scheduling appointments.
 * Rendered standalone at /appointments AND inside the Medical hub's
 * "Appointments" tab, so both stay in sync (no duplicated logic).
 */

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAppointments } from '@/hooks/useAppointments'
import { usePatients } from '@/hooks/usePatients'
import { CalendarDaysIcon, PlusIcon } from '@heroicons/react/24/outline'
import { LockClosedIcon } from '@heroicons/react/24/solid'
import { useLockedAction } from '@/hooks/useLockedAction'

export function AppointmentsPanel() {
  const router = useRouter()
  // Feature-access gate — terminated subscribers can view but not schedule.
  const addAppointmentLock = useLockedAction()
  const { appointments, loading } = useAppointments()
  const { patients } = usePatients()

  // Hide appointments belonging to archived/deleted patients (kept in the data
  // for HIPAA retention, but not surfaced on the active list); show the count.
  const activePatientIds = useMemo(() => {
    const set = new Set<string>()
    for (const p of patients) {
      if (!p.status || p.status === 'active') set.add(p.id)
    }
    return set
  }, [patients])

  const visibleAppointments = useMemo(
    () => appointments.filter((apt) => !apt.patientId || activePatientIds.has(apt.patientId)),
    [appointments, activePatientIds],
  )
  const hiddenAppointmentsCount = appointments.length - visibleAppointments.length

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  const now = new Date()
  const upcomingAppointments = visibleAppointments.filter(apt => new Date(apt.dateTime) >= now)
  const pastAppointments = visibleAppointments.filter(apt => new Date(apt.dateTime) < now)
  const schedule = addAppointmentLock.isLocked
    ? addAppointmentLock.onLockedClick
    : () => router.push('/appointments/new')

  return (
    <div className="space-y-6">
      {/* Top "Schedule" only when the list has items — otherwise the empty
          state's own CTA is the single, non-redundant call to action. */}
      {visibleAppointments.length > 0 && (
        <div>
          <button
            onClick={schedule}
            className="flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
          >
            {addAppointmentLock.isLocked ? (
              <LockClosedIcon className="w-5 h-5" />
            ) : (
              <PlusIcon className="w-5 h-5" />
            )}
            {addAppointmentLock.isLocked ? 'Paused — Schedule Appointment' : 'Schedule Appointment'}
          </button>
        </div>
      )}

      {!loading && hiddenAppointmentsCount > 0 && (
        <div className="px-4 py-3 bg-muted rounded-lg text-sm text-muted-foreground">
          {hiddenAppointmentsCount} appointment{hiddenAppointmentsCount === 1 ? '' : 's'} hidden
          (for archived or removed family members). Restore the family member to see them here.
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground dark:text-muted-foreground">Loading appointments...</p>
        </div>
      ) : visibleAppointments.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg shadow-sm">
          <CalendarDaysIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No appointments scheduled</h3>
          <p className="text-muted-foreground dark:text-muted-foreground mb-6">
            Get started by scheduling your first appointment
          </p>
          <button
            onClick={schedule}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
          >
            Schedule Appointment
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {upcomingAppointments.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-4">
                Upcoming Appointments ({upcomingAppointments.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingAppointments.map(appointment => (
                  <button
                    type="button"
                    key={appointment.id}
                    onClick={() => router.push(`/appointments/${appointment.id}`)}
                    className="w-full text-left bg-card rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border-2 border-primary-light focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">{appointment.patientName}</h3>
                        <p className="text-sm text-muted-foreground">{appointment.providerName}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDaysIcon className="w-4 h-4 text-primary" />
                        <span className="text-foreground">{formatDate(appointment.dateTime)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-primary font-medium">{formatTime(appointment.dateTime)}</span>
                      </div>
                      {appointment.reason && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{appointment.reason}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {pastAppointments.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-4">
                Past Appointments ({pastAppointments.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastAppointments.map(appointment => (
                  <button
                    type="button"
                    key={appointment.id}
                    onClick={() => router.push(`/appointments/${appointment.id}`)}
                    className="w-full text-left bg-card rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow opacity-75 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">{appointment.patientName}</h3>
                        <p className="text-sm text-muted-foreground">{appointment.providerName}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDaysIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">{formatDate(appointment.dateTime)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground font-medium">{formatTime(appointment.dateTime)}</span>
                      </div>
                      {appointment.reason && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{appointment.reason}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
