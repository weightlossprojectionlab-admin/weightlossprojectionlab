import { useContext } from 'react'
import { ThemeContext } from '@/components/ThemeProvider'

export type Theme = 'light' | 'dark' | 'system'

export interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  systemTheme: 'light' | 'dark'
  resolvedTheme: 'light' | 'dark'
}

/**
 * Hook to access the current theme
 *
 * LIGHT MODE ONLY - Dark mode disabled
 *
 * @returns {ThemeContextType} Theme context (always 'light')
 * @throws {Error} If used outside ThemeProvider
 *
 * @example
 * ```tsx
 * const { theme, resolvedTheme } = useTheme()
 *
 * // Theme is always 'light'
 * console.log(theme) // 'light'
 * console.log(resolvedTheme) // 'light'
 * ```
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
