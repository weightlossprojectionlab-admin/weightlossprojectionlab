'use client'

import { useTheme, type Theme } from '@/hooks/useTheme'

interface ThemeOption {
  value: Theme
  icon: string
  label: string
  ariaLabel: string
}

const themeOptions: ThemeOption[] = [
  {
    value: 'light',
    icon: '☀️',
    label: 'Light',
    ariaLabel: 'Switch to light mode',
  },
  {
    value: 'dark',
    icon: '🌙',
    label: 'Dark',
    ariaLabel: 'Switch to dark mode',
  },
  {
    value: 'system',
    icon: '🔄',
    label: 'System',
    ariaLabel: 'Use system theme',
  },
]

/**
 * Three-way theme toggle component
 *
 * Allows users to switch between:
 * - Light mode
 * - Dark mode
 * - System preference (auto)
 *
 * Features:
 * - Accessible keyboard navigation
 * - Clear visual indication of active theme
 * - Smooth transitions
 * - Mobile responsive
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Dashboard"
 *   actions={<ThemeToggle />}
 * />
 * ```
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      className="inline-flex items-center rounded-lg bg-muted p-1 gap-1"
      role="radiogroup"
      aria-label="Theme selection"
    >
      {themeOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={`
            relative flex items-center justify-center
            px-3 py-1.5 rounded-md
            text-sm font-medium
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900
            ${
              theme === option.value
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }
          `}
          role="radio"
          aria-checked={theme === option.value}
          aria-label={option.ariaLabel}
          title={option.ariaLabel}
        >
          <span className="mr-1.5 text-base" aria-hidden="true">
            {option.icon}
          </span>
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Compact theme toggle for mobile/small spaces
 * Shows only icons without labels
 *
 * @example
 * ```tsx
 * <CompactThemeToggle />
 * ```
 */
export function CompactThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      className="inline-flex items-center rounded-lg bg-muted p-1 gap-1"
      role="radiogroup"
      aria-label="Theme selection"
    >
      {themeOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={`
            relative flex items-center justify-center
            w-8 h-8 rounded-md
            text-base
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900
            ${
              theme === option.value
                ? 'bg-card shadow-sm'
                : 'hover:bg-background/50/50'
            }
          `}
          role="radio"
          aria-checked={theme === option.value}
          aria-label={option.ariaLabel}
          title={option.ariaLabel}
        >
          <span aria-hidden="true">{option.icon}</span>
        </button>
      ))}
    </div>
  )
}
