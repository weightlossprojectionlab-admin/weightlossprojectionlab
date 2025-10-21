// Spinner Component
// Reusable loading spinner with consistent styling

import { type HTMLAttributes } from 'react'

export type SpinnerSize = 'sm' | 'md' | 'lg'

interface SpinnerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  size?: SpinnerSize
  className?: string
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3'
}

export function Spinner({ size = 'md', className = '', ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-spin rounded-full border-current border-t-transparent ${sizeClasses[size]} ${className}`}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}
