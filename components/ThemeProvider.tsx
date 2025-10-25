'use client'

import { createContext, useEffect, useState, ReactNode } from 'react'
import { auth } from '@/lib/firebase'
import { userProfileOperations } from '@/lib/firebase-operations'
import type { Theme, ThemeContextType } from '@/hooks/useTheme'

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
  const [mounted, setMounted] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Calculate the actual theme to render
  const resolvedTheme = theme === 'system' ? systemTheme : theme

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid || null)
    })
    return unsubscribe
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

  // Load theme from Firestore for authenticated users, or localStorage for unauthenticated
  useEffect(() => {
    const loadTheme = async () => {
      try {
        if (userId) {
          // Load from Firestore
          const profile = await userProfileOperations.getUserProfile()
          const savedTheme = profile.data?.preferences?.themePreference
          if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
            setThemeState(savedTheme)
          }
        } else {
          // Load from localStorage
          const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null
          if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
            setThemeState(savedTheme)
          }
        }
      } catch (error) {
        console.error('Failed to load theme:', error)
        // Fallback to localStorage
        try {
          const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null
          if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
            setThemeState(savedTheme)
          }
        } catch (err) {
          console.error('Failed to load from localStorage:', err)
        }
      } finally {
        setMounted(true)
      }
    }

    loadTheme()
  }, [userId])

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return

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
  }, [resolvedTheme, mounted])

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
      console.error('Failed to save theme:', error)
      // Even if Firestore fails, we saved to localStorage
    }
  }

  const value: ThemeContextType = {
    theme,
    setTheme,
    systemTheme,
    resolvedTheme,
  }

  // Prevent flash of unstyled content by not rendering until theme is loaded
  if (!mounted) {
    return null
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
