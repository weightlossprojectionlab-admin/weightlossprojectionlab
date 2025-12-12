'use client'

import { createContext, useEffect, useState, ReactNode } from 'react'
import { userProfileOperations } from '@/lib/firebase-operations'
import type { Theme, ThemeContextType } from '@/hooks/useTheme'
import { logger } from '@/lib/logger'

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const STORAGE_KEY = 'wlpl-theme'

interface ThemeProviderProps {
  children: ReactNode
}

/**
 * Provider component for managing app theme
 *
 * LIGHT MODE ONLY - Dark mode disabled
 *
 * Features:
 * - Firestore sync for authenticated users
 * - localStorage fallback for unauthenticated users
 *
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  // Always use light mode
  const [theme] = useState<Theme>('light')
  const [userId, setUserId] = useState<string | null>(null)

  // Always resolve to light
  const resolvedTheme = 'light' as const
  const systemTheme = 'light' as const

  // Listen for auth state changes (lazy-loaded)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    // Dynamically import auth to avoid loading Firebase on every page
    import('@/lib/auth').then((authModule) => {
      unsubscribe = authModule.onAuthStateChange((user) => {
        setUserId(user?.uid || null)
      })
    }).catch((error) => {
      logger.error('Failed to load auth module:', error)
    })

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

  // Light mode only - no system preference detection needed

  // Apply light theme to document
  useEffect(() => {
    const root = document.documentElement

    // Remove both classes first
    root.classList.remove('light', 'dark')

    // Add light class
    root.classList.add('light')

    // Update meta theme-color for mobile browsers (always light)
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#ffffff')
    }
  }, [])

  // No-op setTheme since theme is always light
  const setTheme = async (newTheme: Theme) => {
    // Theme is always light - no-op
    logger.debug('Theme change requested but light mode is enforced', { requestedTheme: newTheme })
  }

  const value: ThemeContextType = {
    theme,
    setTheme,
    systemTheme,
    resolvedTheme,
  }

  // No need to block rendering - the inline script in layout.tsx already prevents FOUC
  // by setting the theme class before React hydrates
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
