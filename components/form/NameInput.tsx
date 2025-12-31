/**
 * NameInput Component
 * Reusable input component that auto-capitalizes names for proper Firebase storage
 * Follows DRY principles and separation of concerns
 */

'use client'

import { capitalizeName } from '@/lib/utils'
import { InputHTMLAttributes, useState, useEffect } from 'react'

interface NameInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  className?: string
  error?: string
}

export function NameInput({
  value,
  onChange,
  label,
  placeholder = 'Enter name',
  required = false,
  className = '',
  error,
  ...rest
}: NameInputProps) {
  const [displayValue, setDisplayValue] = useState(value)

  // Sync with external value changes
  useEffect(() => {
    setDisplayValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    setDisplayValue(rawValue)
  }

  const handleBlur = () => {
    const capitalizedName = capitalizeName(displayValue)
    setDisplayValue(capitalizedName)
    onChange(capitalizedName)
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium mb-2 text-foreground">
          {label}
          {required && ' *'}
        </label>
      )}
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 rounded-lg border-2 border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
        {...rest}
      />
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  )
}
