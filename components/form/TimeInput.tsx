'use client'

import { InputHTMLAttributes, useMemo } from 'react'

interface TimeInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type' | 'value' | 'step'> {
  value: string
  onChange: (value: string) => void
  stepMinutes?: 15 | 30
  /**
   * When true, render a segmented Hour · Minute · AM/PM picker whose Minute
   * control ONLY offers step-boundary values (e.g. :00/:15/:30/:45). Use for
   * domains where off-step times are invalid — e.g. appointment slots; an
   * appointment at 9:03 is not a thing.
   *
   * A native <input type="time" step=…> is NOT enough here: Chrome's time
   * dropdown lists every minute regardless of `step`, so an off-step time is
   * still selectable. The segmented picker makes off-step times unrepresentable.
   *
   * Leave false (default) for free-form times like a vitals reading at 9:03.
   */
  slots?: boolean
}

export function roundToStepMinutes(hhmm: string, step: number): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!match) return ''
  const h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  if (isNaN(h) || isNaN(m) || h > 23 || m > 59) return ''
  const total = h * 60 + m
  const rounded = Math.round(total / step) * step
  const H = Math.floor(rounded / 60) % 24
  const M = rounded % 60
  return `${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}`
}

// >=44px tap targets (WCAG 2.5.5), fat-finger friendly.
const SLOT_SELECT_CLASS =
  'min-h-[44px] px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500'

export function TimeInput({
  value,
  onChange,
  stepMinutes = 15,
  slots = false,
  onBlur,
  className,
  disabled,
  ...rest
}: TimeInputProps) {
  // Step-boundary minutes only: [00, 15, 30, 45] for a 15-minute step.
  const minuteOptions = useMemo(() => {
    const out: string[] = []
    for (let m = 0; m < 60; m += stepMinutes) out.push(String(m).padStart(2, '0'))
    return out
  }, [stepMinutes])

  if (slots) {
    const has = /^\d{2}:\d{2}$/.test(value)
    const h24 = has ? parseInt(value.slice(0, 2), 10) : null
    const min = has ? value.slice(3, 5) : ''
    const hour12 = h24 == null ? '' : String(((h24 + 11) % 12) + 1)
    const ampm = h24 == null ? '' : h24 < 12 ? 'AM' : 'PM'

    // Emit "HH:MM" (24h) once hour + minute + meridiem are all known. Any part
    // still empty => emit '' so the caller treats the time as not-yet-chosen.
    const emit = (h: string, m: string, ap: string) => {
      if (!h || !m || !ap) {
        onChange('')
        return
      }
      let H = parseInt(h, 10) % 12
      if (ap === 'PM') H += 12
      onChange(`${String(H).padStart(2, '0')}:${m}`)
    }

    return (
      <div className={`flex items-center gap-2 ${className ?? ''}`}>
        <select
          aria-label="Hour"
          disabled={disabled}
          className={SLOT_SELECT_CLASS}
          value={hour12}
          onChange={(e) => emit(e.target.value, min || minuteOptions[0], ampm || 'AM')}
        >
          <option value="" disabled>
            Hour
          </option>
          {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="font-semibold text-foreground">:</span>
        <select
          aria-label="Minutes (in 15-minute increments)"
          disabled={disabled}
          className={SLOT_SELECT_CLASS}
          value={min}
          onChange={(e) => emit(hour12 || '12', e.target.value, ampm || 'AM')}
        >
          <option value="" disabled>
            Min
          </option>
          {minuteOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          aria-label="AM or PM"
          disabled={disabled}
          className={SLOT_SELECT_CLASS}
          value={ampm}
          onChange={(e) => emit(hour12 || '12', min || minuteOptions[0], e.target.value)}
        >
          <option value="" disabled>
            AM/PM
          </option>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    )
  }

  return (
    <input
      {...rest}
      className={className}
      disabled={disabled}
      type="time"
      step={stepMinutes * 60}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => {
        const rounded = roundToStepMinutes(e.target.value, stepMinutes)
        if (rounded && rounded !== e.target.value) onChange(rounded)
        onBlur?.(e)
      }}
    />
  )
}
