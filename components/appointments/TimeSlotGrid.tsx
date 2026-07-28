'use client'

import { useMemo } from 'react'

export type SlotState = 'available' | 'taken' | 'provider-conflict' | 'busy-family'

export interface SlotDatum {
  state: SlotState
  /** Small annotation under the time (e.g. "Nina · Dentist"). */
  note?: string
  /** Descriptive hover/aria title naming who booked it (a11y + testability). */
  title?: string
  /** For provider-conflict: who/where, used by the override banner. */
  conflict?: { providerName?: string; patientName?: string }
}

interface TimeSlotGridProps {
  /** Currently selected time as "HH:MM" (24h), or '' when none chosen. */
  value?: string
  onChange: (hhmm: string) => void
  /** Per-slot conflict info keyed by "HH:MM". Absent = free/available. */
  slotInfo?: Map<string, SlotDatum>
  stepMinutes?: number
  /** Visible window (24h). Default is the full day; the panel scrolls. */
  startHour?: number
  endHour?: number
}

export function to12h(h24: number, m: number): string {
  const h12 = ((h24 + 11) % 12) + 1
  const ampm = h24 < 12 ? 'AM' : 'PM'
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

/**
 * A tap-first grid of time slots (default every 15 min) that doubles as a
 * family-coordination view:
 *   🟥 taken            — same patient already booked (disabled, impossible)
 *   🟨 provider-conflict — same provider booked then (selectable; caller warns + gates)
 *   🟧 busy-family       — another family member is out then (selectable heads-up)
 *   🟩 available / 🟦 selected
 * Off-step times are unrepresentable (no 9:03 appointment).
 */
export function TimeSlotGrid({
  value,
  onChange,
  slotInfo,
  stepMinutes = 15,
  startHour = 0,
  endHour = 24,
}: TimeSlotGridProps) {
  const slots = useMemo(() => {
    const out: { value: string; label: string }[] = []
    for (let mins = startHour * 60; mins < endHour * 60; mins += stepMinutes) {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      out.push({ value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, label: to12h(h, m) })
    }
    return out
  }, [stepMinutes, startHour, endHour])

  return (
    <div className="space-y-2">
      {/* Color legend — reduces friction: what's open, taken, or a heads-up. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-green-300 bg-green-100" /> Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-blue-600" /> Selected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-amber-400 bg-amber-100" /> Provider booked
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-orange-200 bg-orange-100" /> Family busy
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-red-200 bg-red-100" /> Booked
        </span>
      </div>

      <div
        role="listbox"
        aria-label="Available appointment times"
        className="max-h-72 overflow-y-auto rounded-lg border border-border p-2"
      >
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((s) => {
            const datum = slotInfo?.get(s.value)
            const tier: SlotState = datum?.state ?? 'available'
            const disabled = tier === 'taken'
            const selected = value === s.value && !disabled
            const state = selected ? 'selected' : tier

            const cls =
              state === 'selected'
                ? 'border border-blue-600 bg-blue-600 text-white'
                : tier === 'taken'
                  ? 'cursor-not-allowed border border-red-200 bg-red-50 text-red-400 line-through'
                  : tier === 'provider-conflict'
                    ? 'border border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100'
                    : tier === 'busy-family'
                      ? 'border border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100'
                      : 'border border-green-300 bg-green-50 text-green-800 hover:bg-green-100'

            return (
              <button
                key={s.value}
                type="button"
                role="option"
                data-slot-state={state}
                data-time={s.value}
                aria-selected={selected}
                disabled={disabled}
                onClick={() => onChange(s.value)}
                title={datum?.title ?? (tier === 'taken' ? 'Already booked' : datum?.note)}
                className={[
                  'flex min-h-[44px] flex-col items-center justify-center rounded-lg px-1 py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
                  cls,
                ].join(' ')}
              >
                <span>
                  {s.label}
                  {tier === 'provider-conflict' ? ' ⚠️' : ''}
                </span>
                {datum?.note && (
                  <span className="max-w-full truncate text-[10px] font-normal leading-tight opacity-80">
                    {datum.note}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
