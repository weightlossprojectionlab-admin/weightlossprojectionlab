// Loading Button Component
// Button with built-in loading state and spinner

import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Spinner } from './Spinner'

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'outline' | 'ghost'

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
  variant?: ButtonVariant
  children: ReactNode
}

export function LoadingButton({
  loading = false,
  loadingText,
  variant = 'primary',
  children,
  disabled,
  className = '',
  ...props
}: LoadingButtonProps) {
  const isDisabled = disabled || loading
  const buttonClass = `btn btn-${variant} ${loading ? 'cursor-wait' : ''} ${className}`

  return (
    <button
      disabled={isDisabled}
      className={buttonClass}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size="sm" />
          <span>{loadingText || 'Loading...'}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
