import { useContext } from 'react'
import { ThemeContext } from '@/components/ThemeProvider'
import { logger } from '@/lib/logger'

export type Theme = 'light' | 'dark' | 'system'

export interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  systemTheme: 'light' | 'dark'
  resolvedTheme: 'light' | 'dark'
}

/**
 * Hook to access and control the current theme
 *
 * @returns {ThemeContextType} Theme context with current theme and setter
 * @throws {Error} If used outside ThemeProvider
 *
 * @example
 * ```tsx
 * const { theme, setTheme, resolvedTheme } = useTheme()
 *
 * // Get current theme setting
 * logger.debug(theme) // 'light' | 'dark' | 'system'
 *
 * // Get actual rendered theme
 * logger.debug(resolvedTheme) // 'light' | 'dark'
 *
 * // Change theme
 * setTheme('dark')
 * ```
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
