'use client'

import { ReactNode } from 'react'

interface ThemeProviderProps {
  children: ReactNode
}

/**
 * Provider component for light theme only
 * Dark mode has been removed platform-wide
 *
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>
}
