'use client'

/**
 * Family calendar — the single source for the month view of appointments.
 * Rendered standalone at /calendar AND inside the Medical hub's "Calendar" tab.
 * Honors ?patientId=<id> as the initial filter (patient detail deep-links here).
 */

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAppointments } from '@/hooks/useAppointments'
import { usePatients } from '@/hooks/usePatients'
import { ChevronLeftIcon, ChevronRightIcon, FunnelIcon } from '@heroicons/react/24/outline'

export function CalendarPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { appointments } = useAppointments()
  const { patients } = usePatients()

  const initialPatientFilter = searchParams.get('patientId') ?? 'all'

  const [currentDate, setCurrentDate] = useState(new Date())
  const [filterPatientId, setFilterPatientId] = useState<string>(initialPatientFilter)
  const [filterDriver, setFilterDriver] = useState<'all' | 'me' | 'pending'>('all')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const goToPreviousMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToToday = () => setCurrentDate(new Date())

  const filteredAppointments = appointments.filter(apt => {
    if (filterPatientId !== 'all' && apt.patientId !== filterPatientId) return false
    if (filterDriver === 'me' && apt.assignedDriverId !== user?.uid) return false
    if (filterDriver === 'pending' && apt.driverStatus !== 'pending') return false
    return true
  })

  const appointmentsByDay: Record<number, typeof appointments> = {}
  filteredAppointments.forEach(apt => {
    const aptDate = new Date(apt.dateTime)
    if (aptDate.getMonth() === month && aptDate.getFullYear() === year) {
      const day = aptDate.getDate()
      if (!appointmentsByDay[day]) appointmentsByDay[day] = []
      appointmentsByDay[day].push(apt)
    }
  })

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Single source for driver-status → dot color. Used by BOTH the per-
  // appointment dot and the legend below, so they can't drift. (They used to be
  // hardcoded separately — which is how a `bg-*-light0` typo, a stray trailing
  // 0 that resolves to no color, went unnoticed in both.)
  const getDriverStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-success'
      case 'pending': return 'bg-warning'
      case 'declined': return 'bg-error'
      default: return 'bg-gray-400'
    }
  }

  const DRIVER_STATUS_LEGEND: Array<{ status: string; label: string }> = [
    { status: 'accepted', label: 'Accepted' },
    { status: 'pending', label: 'Pending' },
    { status: 'declined', label: 'Declined' },
    { status: 'not-needed', label: 'No driver needed' },
  ]

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < startingDayOfWeek; i++) calendarDays.push(null)
  for (let day = 1; day <= daysInMonth; day++) calendarDays.push(day)

  const today = new Date()
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  return (
    <div>
      {/* Header with navigation and filters */}
      <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={goToPreviousMonth} aria-label="Previous month" className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center hover:bg-muted rounded-lg transition-colors">
              <ChevronLeftIcon className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2 className="text-2xl font-bold text-foreground min-w-[200px] text-center">
              {monthNames[month]} {year}
            </h2>
            <button onClick={goToNextMonth} aria-label="Next month" className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center hover:bg-muted rounded-lg transition-colors">
              <ChevronRightIcon className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <button onClick={goToToday} className="min-h-[44px] px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium">
            Today
          </button>
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-border">
          <FunnelIcon className="w-5 h-5 text-muted-foreground" />
          <select
            value={filterPatientId}
            onChange={(e) => setFilterPatientId(e.target.value)}
            className="min-h-[44px] px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-background text-foreground text-sm"
          >
            <option value="all">All Patients</option>
            {patients.map(patient => (
              <option key={patient.id} value={patient.id}>{patient.name}</option>
            ))}
          </select>
          <select
            value={filterDriver}
            onChange={(e) => setFilterDriver(e.target.value as any)}
            className="min-h-[44px] px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-background text-foreground text-sm"
          >
            <option value="all">All Appointments</option>
            <option value="me">I&apos;m Driving</option>
            <option value="pending">Driver Pending</option>
          </select>
          <div className="ml-auto text-sm text-muted-foreground">
            {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {dayNames.map(day => (
            <div key={day} className="px-4 py-3 text-center text-sm font-semibold text-foreground bg-background">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => (
            <div key={index} className={`min-h-[120px] border-r border-b border-border p-2 ${day ? 'bg-card' : 'bg-background/50'}`}>
              {day && (
                <>
                  <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center' : 'text-foreground'}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {appointmentsByDay[day]?.slice(0, 3).map(apt => (
                      <button
                        key={apt.id}
                        onClick={() => router.push(`/appointments/${apt.id}`)}
                        className="w-full text-left px-2 py-1 rounded text-xs bg-primary-light hover:bg-primary-light dark:hover:bg-purple-900/30 transition-colors border-l-2 border-purple-500"
                      >
                        <div className="font-medium text-foreground truncate">
                          {formatTime(apt.dateTime)} - {apt.patientName}
                        </div>
                        {apt.requiresDriver && apt.assignedDriverName && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${getDriverStatusColor(apt.driverStatus)}`}></span>
                            <span className="text-muted-foreground truncate">
                              {apt.assignedDriverId === user?.uid ? 'You' : apt.assignedDriverName}
                              {apt.driverStatus === 'pending' && ' (pending)'}
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                    {appointmentsByDay[day]?.length > 3 && (
                      <div className="text-xs text-muted-foreground dark:text-muted-foreground px-2">
                        +{appointmentsByDay[day].length - 3} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 bg-card rounded-lg shadow-sm p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Driver Status Legend</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          {DRIVER_STATUS_LEGEND.map(({ status, label }) => (
            <div key={status} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${getDriverStatusColor(status)}`}></span>
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
