'use client'

import { InputHTMLAttributes } from 'react'

interface TimeInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type' | 'value' | 'step'> {
  value: string
  onChange: (value: string) => void
  stepMinutes?: 15 | 30
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

export function TimeInput({ value, onChange, stepMinutes = 15, onBlur, ...rest }: TimeInputProps) {
  return (
    <input
      {...rest}
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
