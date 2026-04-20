'use client'

import { formatPhone } from '@/lib/utils'
import { InputHTMLAttributes } from 'react'

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type' | 'value'> {
  value: string
  onChange: (value: string) => void
}

export function PhoneInput({ value, onChange, placeholder = '(555) 123-4567', ...rest }: PhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(formatPhone(e.target.value))
  }

  return (
    <input
      {...rest}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={formatPhone(value)}
      onChange={handleChange}
      placeholder={placeholder}
    />
  )
}
