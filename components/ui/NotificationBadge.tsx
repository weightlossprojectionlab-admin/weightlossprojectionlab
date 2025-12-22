/**
 * NotificationBadge Component
 *
 * Reusable notification count badge for consistent styling across the app
 */

interface NotificationBadgeProps {
  count: number
  /** Maximum count to display before showing "99+" */
  maxCount?: number
  /** Position of badge (defaults to top-right) */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  /** Custom background color class (defaults to bg-red-500) */
  bgColor?: string
  /** Show badge even when count is 0 */
  showZero?: boolean
}

export function NotificationBadge({
  count,
  maxCount = 99,
  position = 'top-right',
  bgColor = 'bg-red-500',
  showZero = false
}: NotificationBadgeProps) {
  // Don't render if count is 0 and showZero is false
  if (count === 0 && !showZero) return null

  const positionClasses = {
    'top-right': 'top-0 right-0 translate-x-1/2 -translate-y-1/2',
    'top-left': 'top-0 left-0 -translate-x-1/2 -translate-y-1/2',
    'bottom-right': 'bottom-0 right-0 translate-x-1/2 translate-y-1/2',
    'bottom-left': 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2'
  }

  return (
    <span
      className={`absolute ${positionClasses[position]} inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform ${bgColor} rounded-full min-w-[20px]`}
    >
      {count > maxCount ? `${maxCount}+` : count}
    </span>
  )
}
