/**
 * AvailabilityCalendar Component
 *
 * Visual weekly schedule display with color-coded availability
 * Supports both view and edit modes
 */

'use client'

import { useState } from 'react'
import type { WeeklyAvailability, DayOfWeek, TimeSlot } from '@/types/caregiver'

interface AvailabilityCalendarProps {
  schedule: WeeklyAvailability
  onChange?: (schedule: WeeklyAvailability) => void
  editable?: boolean
  compact?: boolean
}

const DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
]

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun'
}

export function AvailabilityCalendar({
  schedule,
  onChange,
  editable = false,
  compact = false
}: AvailabilityCalendarProps) {
  const [editingDay, setEditingDay] = useState<DayOfWeek | null>(null)

  const handleToggleDay = (day: DayOfWeek) => {
    if (!editable || !onChange) return

    const updated = {
      ...schedule,
      [day]: {
        ...schedule[day],
        available: !schedule[day].available
      }
    }
    onChange(updated)
  }

  const handleAddTimeSlot = (day: DayOfWeek) => {
    if (!editable || !onChange) return

    const newSlot: TimeSlot = {
      start: '09:00',
      end: '17:00'
    }

    const updated = {
      ...schedule,
      [day]: {
        ...schedule[day],
        slots: [...schedule[day].slots, newSlot]
      }
    }
    onChange(updated)
  }

  const handleRemoveTimeSlot = (day: DayOfWeek, index: number) => {
    if (!editable || !onChange) return

    const updated = {
      ...schedule,
      [day]: {
        ...schedule[day],
        slots: schedule[day].slots.filter((_, i) => i !== index)
      }
    }
    onChange(updated)
  }

  const handleUpdateTimeSlot = (
    day: DayOfWeek,
    index: number,
    field: 'start' | 'end',
    value: string
  ) => {
    if (!editable || !onChange) return

    const updated = {
      ...schedule,
      [day]: {
        ...schedule[day],
        slots: schedule[day].slots.map((slot, i) =>
          i === index ? { ...slot, [field]: value } : slot
        )
      }
    }
    onChange(updated)
  }

  if (compact) {
    return (
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((day) => {
          const dayData = schedule[day]
          return (
            <div key={day} className="text-center">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {DAY_LABELS[day]}
              </div>
              <div
                className={`w-full h-12 rounded-lg flex items-center justify-center text-xs font-medium ${
                  dayData.available
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {dayData.available ? (
                  <span>{dayData.slots.length > 0 ? `${dayData.slots.length}` : '✓'}</span>
                ) : (
                  <span>-</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {DAYS.map((day) => {
        const dayData = schedule[day]
        const isEditing = editingDay === day

        return (
          <div
            key={day}
            className={`rounded-lg border-2 p-4 transition-colors ${
              dayData.available
                ? 'border-green-500/30 bg-green-50 dark:bg-green-900/10'
                : 'border-border bg-card'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {editable && (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dayData.available}
                      onChange={() => handleToggleDay(day)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                  </label>
                )}
                <h4
                  className={`font-semibold ${
                    dayData.available ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </h4>
              </div>

              {dayData.available && editable && (
                <button
                  onClick={() => handleAddTimeSlot(day)}
                  className="text-sm text-primary hover:text-primary-hover font-medium"
                >
                  + Add Time Slot
                </button>
              )}
            </div>

            {dayData.available && dayData.slots.length > 0 && (
              <div className="space-y-2">
                {dayData.slots.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-2"
                  >
                    {editable ? (
                      <>
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) =>
                            handleUpdateTimeSlot(day, index, 'start', e.target.value)
                          }
                          className="flex-1 px-3 py-1.5 border border-border rounded-lg bg-background text-foreground"
                        />
                        <span className="text-muted-foreground">to</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) =>
                            handleUpdateTimeSlot(day, index, 'end', e.target.value)
                          }
                          className="flex-1 px-3 py-1.5 border border-border rounded-lg bg-background text-foreground"
                        />
                        <button
                          onClick={() => handleRemoveTimeSlot(day, index)}
                          className="p-1.5 text-error hover:bg-error-light dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Remove time slot"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <div className="flex-1 text-sm text-foreground">
                        {formatTime(slot.start)} - {formatTime(slot.end)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {dayData.available && dayData.slots.length === 0 && (
              <div className="text-sm text-muted-foreground italic">
                Available all day (no specific time slots)
              </div>
            )}

            {!dayData.available && (
              <div className="text-sm text-muted-foreground italic">Not available</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}
