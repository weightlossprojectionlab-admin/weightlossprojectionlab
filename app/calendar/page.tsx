/**
 * Family Calendar Page
 * View all family appointments in a calendar layout
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAppointments } from '@/hooks/useAppointments'
import { usePatients } from '@/hooks/usePatients'
import { PageHeader } from '@/components/ui/PageHeader'
import AuthGuard from '@/components/auth/AuthGuard'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, FunnelIcon } from '@heroicons/react/24/outline'

export default function CalendarPage() {
  return (
    <AuthGuard>
      <CalendarContent />
    </AuthGuard>
  )
}

function CalendarContent() {
  const router = useRouter()
  const { user } = useAuth()
  const { appointments, loading } = useAppointments()
  const { patients } = usePatients()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [filterPatientId, setFilterPatientId] = useState<string>('all')
  const [filterDriver, setFilterDriver] = useState<'all' | 'me' | 'pending'>('all')

  // Get current month details
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay() // 0 = Sunday

  // Month navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Filter appointments
  const filteredAppointments = appointments.filter(apt => {
    // Filter by patient
    if (filterPatientId !== 'all' && apt.patientId !== filterPatientId) {
      return false
    }

    // Filter by driver
    if (filterDriver === 'me' && apt.assignedDriverId !== user?.uid) {
      return false
    }
    if (filterDriver === 'pending' && apt.driverStatus !== 'pending') {
      return false
    }

    return true
  })

  // Group appointments by day
  const appointmentsByDay: Record<number, typeof appointments> = {}
  filteredAppointments.forEach(apt => {
    const aptDate = new Date(apt.dateTime)
    if (aptDate.getMonth() === month && aptDate.getFullYear() === year) {
      const day = aptDate.getDate()
      if (!appointmentsByDay[day]) {
        appointmentsByDay[day] = []
      }
      appointmentsByDay[day].push(apt)
    }
  })

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getDriverStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-success-light0'
      case 'pending':
        return 'bg-warning-light0'
      case 'declined':
        return 'bg-error-light0'
      default:
        return 'bg-gray-400'
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  // Build calendar grid (6 weeks max)
  const calendarDays: (number | null)[] = []

  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null)
  }

  // Add all days in month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  const today = new Date()
  const isToday = (day: number) => {
    return day === today.getDate() &&
           month === today.getMonth() &&
           year === today.getFullYear()
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Family Calendar"
        subtitle="View all appointments for your family"
        backHref="/medical"
      />

      <main className="container mx-auto px-4 py-8">
        {/* Header with navigation and filters */}
        <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5 text-muted-foreground" />
              </button>
              <h2 className="text-2xl font-bold text-foreground min-w-[200px] text-center">
                {monthNames[month]} {year}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <button
              onClick={goToToday}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              Today
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <FunnelIcon className="w-5 h-5 text-muted-foreground" />

            {/* Patient filter */}
            <select
              value={filterPatientId}
              onChange={(e) => setFilterPatientId(e.target.value)}
              className="px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-background text-foreground text-sm"
            >
              <option value="all">All Patients</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>

            {/* Driver filter */}
            <select
              value={filterDriver}
              onChange={(e) => setFilterDriver(e.target.value as any)}
              className="px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-background text-foreground text-sm"
            >
              <option value="all">All Appointments</option>
              <option value="me">I'm Driving</option>
              <option value="pending">Driver Pending</option>
            </select>

            <div className="ml-auto text-sm text-muted-foreground">
              {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="bg-card rounded-lg shadow-sm overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {dayNames.map(day => (
              <div
                key={day}
                className="px-4 py-3 text-center text-sm font-semibold text-foreground bg-background"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`min-h-[120px] border-r border-b border-border p-2 ${
                  day ? 'bg-card' : 'bg-background/50'
                }`}
              >
                {day && (
                  <>
                    <div className={`text-sm font-medium mb-1 ${
                      isToday(day)
                        ? 'w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center'
                        : 'text-foreground'
                    }`}>
                      {day}
                    </div>

                    {/* Appointments for this day */}
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
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-success-light0"></span>
              <span className="text-muted-foreground">Accepted</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-warning-light0"></span>
              <span className="text-muted-foreground">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-error-light0"></span>
              <span className="text-muted-foreground">Declined</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-400"></span>
              <span className="text-muted-foreground">No driver needed</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
