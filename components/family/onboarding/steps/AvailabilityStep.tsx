'use client'

import { useState } from 'react'
import type { Availability, DayOfWeek, WeeklySchedule, DaySchedule } from '@/types/caregiver-profile'
import { createDefaultWeeklySchedule } from '@/types/caregiver-profile'

interface AvailabilityStepProps {
  data: Availability | undefined
  onChange: (data: Availability) => void
}

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
]

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney'
]

export function AvailabilityStep({ data, onChange }: AvailabilityStepProps) {
  const availabilityData: Availability = data || {
    schedule: createDefaultWeeklySchedule(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    isAvailableForEmergencies: false,
    emergencyResponseTime: undefined,
    maxHoursPerWeek: undefined
  }

  const handleChange = (updates: Partial<Availability>) => {
    onChange({ ...availabilityData, ...updates })
  }

  const handleDayChange = (day: DayOfWeek, updates: Partial<DaySchedule>) => {
    handleChange({
      schedule: {
        ...availabilityData.schedule,
        [day]: {
          ...availabilityData.schedule[day],
          ...updates
        }
      }
    })
  }

  const handleQuickSelect = (preset: 'weekdays' | 'weekends' | 'allWeek' | 'none') => {
    const schedule: WeeklySchedule = createDefaultWeeklySchedule()

    const setDayAvailable = (day: DayOfWeek, available: boolean) => {
      schedule[day] = {
        available,
        startTime: available ? '09:00' : undefined,
        endTime: available ? '17:00' : undefined
      }
    }

    switch (preset) {
      case 'weekdays':
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day =>
          setDayAvailable(day as DayOfWeek, true)
        )
        break
      case 'weekends':
        ['saturday', 'sunday'].forEach(day => setDayAvailable(day as DayOfWeek, true))
        break
      case 'allWeek':
        DAYS.forEach(({ key }) => setDayAvailable(key, true))
        break
      case 'none':
        // Already default (all unavailable)
        break
    }

    handleChange({ schedule })
  }

  return (
    <div className="space-y-6">
      {/* Timezone Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Your Timezone <span className="text-red-500">*</span>
        </label>
        <select
          value={availabilityData.timezone}
          onChange={(e) => handleChange({ timezone: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
          required
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Quick Select Presets */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Quick Select
        </label>
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => handleQuickSelect('weekdays')}
            className="px-3 py-2 rounded-lg border-2 border-border hover:border-primary bg-card text-sm font-medium transition-colors"
          >
            Weekdays
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('weekends')}
            className="px-3 py-2 rounded-lg border-2 border-border hover:border-primary bg-card text-sm font-medium transition-colors"
          >
            Weekends
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('allWeek')}
            className="px-3 py-2 rounded-lg border-2 border-border hover:border-primary bg-card text-sm font-medium transition-colors"
          >
            All Week
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('none')}
            className="px-3 py-2 rounded-lg border-2 border-border hover:border-primary bg-card text-sm font-medium transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Weekly Schedule
        </label>
        <div className="space-y-2">
          {DAYS.map(({ key, label }) => {
            const dayData = availabilityData.schedule[key]
            return (
              <div
                key={key}
                className="p-4 rounded-lg border-2 border-border bg-card space-y-3"
              >
                {/* Day Toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dayData.available}
                    onChange={(e) =>
                      handleDayChange(key, {
                        available: e.target.checked,
                        startTime: e.target.checked ? '09:00' : undefined,
                        endTime: e.target.checked ? '17:00' : undefined
                      })
                    }
                    className="w-5 h-5 rounded border-2 border-border text-primary focus:ring-2 focus:ring-primary"
                  />
                  <span className="font-semibold text-foreground">{label}</span>
                </label>

                {/* Time Inputs */}
                {dayData.available && (
                  <div className="grid grid-cols-2 gap-3 pl-8">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={dayData.startTime || '09:00'}
                        onChange={(e) => handleDayChange(key, { startTime: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={dayData.endTime || '17:00'}
                        onChange={(e) => handleDayChange(key, { endTime: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Emergency Availability */}
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border-2 border-border bg-card">
          <input
            type="checkbox"
            checked={availabilityData.isAvailableForEmergencies}
            onChange={(e) => handleChange({ isAvailableForEmergencies: e.target.checked })}
            className="w-5 h-5 rounded border-2 border-border text-primary focus:ring-2 focus:ring-primary"
          />
          <div className="flex-1">
            <span className="font-semibold text-foreground">Available for emergency calls</span>
            <p className="text-sm text-muted-foreground mt-1">
              You may receive notifications outside your regular schedule for urgent matters
            </p>
          </div>
        </label>

        {/* Emergency Response Time */}
        {availabilityData.isAvailableForEmergencies && (
          <div className="pl-8 space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Emergency Response Time (minutes)
            </label>
            <input
              type="number"
              min="5"
              max="1440"
              step="5"
              value={availabilityData.emergencyResponseTime || 30}
              onChange={(e) =>
                handleChange({ emergencyResponseTime: parseInt(e.target.value) || 30 })
              }
              placeholder="30"
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
            />
            <p className="text-xs text-muted-foreground">
              How quickly can you typically respond to emergency calls?
            </p>
          </div>
        )}
      </div>

      {/* Max Hours Per Week */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Maximum Hours Per Week (Optional)
        </label>
        <input
          type="number"
          min="1"
          max="168"
          value={availabilityData.maxHoursPerWeek || ''}
          onChange={(e) =>
            handleChange({ maxHoursPerWeek: parseInt(e.target.value) || undefined })
          }
          placeholder="40"
          className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
        />
        <p className="text-xs text-muted-foreground">
          Set a limit on your weekly availability (useful for professional caregivers)
        </p>
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-lg bg-muted border border-border">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📅</span>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground mb-1">Flexible Scheduling</h4>
            <p className="text-sm text-muted-foreground">
              Your availability helps us send notifications at appropriate times. You can always
              update your schedule later, and you'll never miss critical emergency alerts.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
