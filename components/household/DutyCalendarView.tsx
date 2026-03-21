'use client'

/**
 * Duty Calendar View
 *
 * Weekly/monthly calendar showing duties by date.
 * Color-coded by category, overdue highlighted in red.
 */

import { useState, useMemo } from 'react'
import { HouseholdDuty } from '@/types/household-duties'
import { CaregiverProfile } from '@/types/caregiver'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { DUTY_CATEGORY_COLORS, DUTY_CATEGORY_LABELS, DUTY_PRIORITY_COLORS } from './duty-constants'

interface DutyCalendarViewProps {
  duties: HouseholdDuty[]
  caregivers: CaregiverProfile[]
}

type ViewMode = 'week' | 'month'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

function isPast(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

export function DutyCalendarView({ duties, caregivers }: DutyCalendarViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Build duty-to-date map using nextDueDate
  const dutyByDate = useMemo(() => {
    const map: Record<string, HouseholdDuty[]> = {}
    duties.forEach(duty => {
      if (!duty.nextDueDate) return
      const dateKey = duty.nextDueDate.split('T')[0]
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(duty)
    })
    return map
  }, [duties])

  // Navigation
  const navigate = (direction: number) => {
    const d = new Date(currentDate)
    if (viewMode === 'week') {
      d.setDate(d.getDate() + direction * 7)
    } else {
      d.setMonth(d.getMonth() + direction)
    }
    setCurrentDate(d)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(formatDate(new Date()))
  }

  // Generate days for the view
  const days = useMemo(() => {
    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate)
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart)
        d.setDate(d.getDate() + i)
        return d
      })
    } else {
      // Month view: get first day of month, pad to start of week
      const firstOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const startDate = startOfWeek(firstOfMonth)
      // Generate 6 weeks (42 days) to cover any month
      return Array.from({ length: 42 }, (_, i) => {
        const d = new Date(startDate)
        d.setDate(d.getDate() + i)
        return d
      })
    }
  }, [currentDate, viewMode])

  // Header text
  const headerText = viewMode === 'week'
    ? `Week of ${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Selected date duties
  const selectedDuties = selectedDate ? (dutyByDate[selectedDate] || []) : []

  // Caregiver name lookup
  const caregiverNames = useMemo(() => {
    const map: Record<string, string> = {}
    caregivers.forEach(c => {
      map[c.id || c.userId] = c.name
    })
    return map
  }, [caregivers])

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold text-foreground min-w-[280px] text-center">
            {headerText}
          </h3>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="ml-2 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-accent transition-colors"
          >
            Today
          </button>
        </div>
        <div className="flex gap-1 bg-accent rounded-lg p-1">
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              viewMode === 'week' ? 'bg-primary text-primary-foreground' : 'hover:bg-background'
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              viewMode === 'month' ? 'bg-primary text-primary-foreground' : 'hover:bg-background'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-border rounded-xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-accent">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground border-r border-border last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className={`grid grid-cols-7 ${viewMode === 'month' ? '' : ''}`}>
          {days.map((day, idx) => {
            const dateKey = formatDate(day)
            const dayDuties = dutyByDate[dateKey] || []
            const isCurrentMonth = day.getMonth() === currentDate.getMonth()
            const isSelected = selectedDate === dateKey
            const hasOverdue = dayDuties.some(d => d.status === 'overdue' || (isPast(day) && d.status === 'pending'))

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                className={`
                  ${viewMode === 'week' ? 'min-h-[120px]' : 'min-h-[80px]'}
                  p-2 border-r border-b border-border last:border-r-0 text-left
                  transition-colors relative
                  ${!isCurrentMonth && viewMode === 'month' ? 'opacity-40' : ''}
                  ${isSelected ? 'bg-primary/10 ring-2 ring-primary ring-inset' : 'hover:bg-accent/50'}
                  ${isToday(day) ? 'bg-primary/5' : ''}
                `}
              >
                <span className={`text-xs font-medium ${
                  isToday(day) ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center' : 'text-foreground'
                }`}>
                  {day.getDate()}
                </span>

                {/* Duty dots / blocks */}
                <div className="mt-1 space-y-0.5">
                  {viewMode === 'week' ? (
                    // Week view: show duty names
                    dayDuties.slice(0, 4).map(duty => (
                      <div
                        key={duty.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate text-white ${
                          duty.status === 'overdue' ? 'bg-red-500' :
                          DUTY_CATEGORY_COLORS[duty.category] || 'bg-gray-500'
                        }`}
                      >
                        {duty.name}
                      </div>
                    ))
                  ) : (
                    // Month view: show colored dots
                    <div className="flex flex-wrap gap-0.5">
                      {dayDuties.slice(0, 5).map(duty => (
                        <span
                          key={duty.id}
                          className={`w-1.5 h-1.5 rounded-full ${
                            duty.status === 'overdue' ? 'bg-red-500' :
                            DUTY_CATEGORY_COLORS[duty.category] || 'bg-gray-500'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                  {dayDuties.length > (viewMode === 'week' ? 4 : 5) && (
                    <span className="text-[10px] text-muted-foreground">
                      +{dayDuties.length - (viewMode === 'week' ? 4 : 5)} more
                    </span>
                  )}
                </div>

                {/* Overdue indicator */}
                {hasOverdue && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Date Detail */}
      {selectedDate && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="font-semibold text-foreground mb-3">
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric'
            })}
            <span className="text-sm text-muted-foreground ml-2">
              ({selectedDuties.length} {selectedDuties.length === 1 ? 'duty' : 'duties'})
            </span>
          </h4>

          {selectedDuties.length === 0 ? (
            <p className="text-sm text-muted-foreground">No duties scheduled for this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedDuties.map(duty => (
                <div key={duty.id} className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                  <span className={`w-3 h-3 rounded-full ${
                    DUTY_CATEGORY_COLORS[duty.category] || 'bg-gray-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{duty.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {DUTY_CATEGORY_LABELS[duty.category]}
                      {duty.estimatedDuration && ` · ${duty.estimatedDuration} min`}
                      {duty.assignedTo?.length > 0 && (
                        <> · {duty.assignedTo.map(id => caregiverNames[id] || 'Unknown').join(', ')}</>
                      )}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    DUTY_PRIORITY_COLORS[duty.priority] || ''
                  }`}>
                    {duty.priority}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    duty.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    duty.status === 'overdue' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {duty.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
