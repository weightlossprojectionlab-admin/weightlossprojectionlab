'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface InstallPromptState {
  isInstallable: boolean
  isInstalled: boolean
  promptInstall: () => Promise<boolean>
}

/**
 * Hook to handle PWA install prompt
 */
export function useInstallPrompt(): InstallPromptState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      // Check for standalone mode (iOS)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
        return true
      }

      // Check for standalone mode (Android)
      if ((window.navigator as any).standalone) {
        setIsInstalled(true)
        return true
      }

      return false
    }

    if (checkInstalled()) {
      console.log('[InstallPrompt] App is already installed')
      return
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      const event = e as BeforeInstallPromptEvent
      console.log('[InstallPrompt] beforeinstallprompt fired')

      // Prevent the default browser install prompt
      e.preventDefault()

      // Store the event for later use
      setDeferredPrompt(event)
      setIsInstallable(true)
    }

    // Listen for successful install
    const handleAppInstalled = () => {
      console.log('[InstallPrompt] App installed successfully')
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  /**
   * Trigger the install prompt
   */
  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.warn('[InstallPrompt] No install prompt available')
      return false
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt()

      // Wait for user response
      const choiceResult = await deferredPrompt.userChoice

      console.log('[InstallPrompt] User choice:', choiceResult.outcome)

      if (choiceResult.outcome === 'accepted') {
        setIsInstallable(false)
        setDeferredPrompt(null)
        return true
      } else {
        return false
      }
    } catch (error) {
      console.error('[InstallPrompt] Error showing prompt:', error)
      return false
    }
  }

  return {
    isInstallable,
    isInstalled,
    promptInstall
  }
}
