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
 * Provider component for managing app theme with three-tier system
 *
 * Supports:
 * - Light mode
 * - Dark mode
 * - System preference (auto)
 *
 * Features:
 * - Firestore sync for authenticated users
 * - localStorage fallback for unauthenticated users
 * - System preference detection
 * - Live system preference updates
 * - No flash of unstyled content (FOUC)
 *
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  // Start with 'system' as default, will be updated on mount
  const [theme, setThemeState] = useState<Theme>('system')
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light')
  const [userId, setUserId] = useState<string | null>(null)

  // Calculate the actual theme to render
  const resolvedTheme = theme === 'system' ? systemTheme : theme

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

  // Detect system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    // Fallback for older browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [])

  // Load theme from localStorage first (instant), then sync with Firestore in background
  // This prevents blocking on Firestore/auth initialization and avoids Listen channel errors
  useEffect(() => {
    const loadTheme = async () => {
      // ALWAYS try localStorage first for instant theme application
      try {
        const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
          setThemeState(savedTheme)
        }
      } catch (err) {
        logger.error('Failed to load from localStorage:', err as Error)
      }

      // If authenticated, sync with Firestore in background (non-blocking)
      if (userId) {
        try {
          const profile = await userProfileOperations.getUserProfile()
          const firestoreTheme = profile.data?.preferences?.themePreference

          if (firestoreTheme && ['light', 'dark', 'system'].includes(firestoreTheme)) {
            // Only update if different from localStorage (avoid unnecessary re-renders)
            const currentLocalTheme = localStorage.getItem(STORAGE_KEY)
            if (firestoreTheme !== currentLocalTheme) {
              setThemeState(firestoreTheme)
              localStorage.setItem(STORAGE_KEY, firestoreTheme)
            }
          }
        } catch (error) {
          // Firestore errors are non-critical - we already have theme from localStorage
          logger.error('Failed to sync theme from Firestore (non-critical):', error as Error)
        }
      }
    }

    loadTheme()
  }, [userId])

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement

    // Remove both classes first
    root.classList.remove('light', 'dark')

    // Add the resolved theme class
    root.classList.add(resolvedTheme)

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        resolvedTheme === 'dark' ? '#111827' : '#ffffff'
      )
    }
  }, [resolvedTheme])

  // Update theme and save to Firestore (if authenticated) or localStorage
  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme)

    try {
      if (userId) {
        // Save to Firestore
        await userProfileOperations.updateUserProfile({
          preferences: { themePreference: newTheme }
        })
      }

      // Always save to localStorage as backup
      localStorage.setItem(STORAGE_KEY, newTheme)
    } catch (error) {
      logger.error('Failed to save theme:', error as Error)
      // Even if Firestore fails, we saved to localStorage
    }
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
