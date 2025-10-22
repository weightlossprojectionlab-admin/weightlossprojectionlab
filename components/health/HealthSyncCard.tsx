'use client'

import { useState, useEffect } from 'react'
import {
  detectPlatform,
  getHealthAppForPlatform,
  getHealthAppName,
  getHealthAppIcon,
  isHealthSyncSupported,
  getHealthSyncLimitations,
  formatLastSync,
  type Platform,
  type HealthApp
} from '@/lib/health-sync-utils'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import toast from 'react-hot-toast'

export interface HealthSyncCardProps {
  onSetupClick?: () => void
}

/**
 * Card showing health sync status with enable/disable toggle
 */
export function HealthSyncCard({ onSetupClick }: HealthSyncCardProps) {
  const [platform, setPlatform] = useState<Platform>('unknown')
  const [healthApp, setHealthApp] = useState<HealthApp>('none')
  const [syncEnabled, setSyncEnabled] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Detect platform
    const detectedPlatform = detectPlatform()
    const detectedHealthApp = getHealthAppForPlatform(detectedPlatform)

    setPlatform(detectedPlatform)
    setHealthApp(detectedHealthApp)

    // Load sync preferences from Firestore
    loadSyncPreferences()
  }, [])

  const loadSyncPreferences = async () => {
    if (!auth.currentUser) return

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        const data = userSnap.data()
        const healthSync = data.healthSync

        if (healthSync) {
          setSyncEnabled(healthSync.enabled || false)
          setLastSyncAt(healthSync.lastSyncAt?.toDate() || null)
        }
      }
    } catch (error) {
      console.error('Error loading sync preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSync = async () => {
    if (!auth.currentUser) return

    const newValue = !syncEnabled

    // If enabling, show setup modal first
    if (newValue && onSetupClick) {
      onSetupClick()
      return
    }

    setSaving(true)

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid)

      await setDoc(userRef, {
        healthSync: {
          enabled: newValue,
          platform,
          healthApp,
          lastSyncAt: newValue ? serverTimestamp() : null,
          updatedAt: serverTimestamp()
        }
      }, { merge: true })

      setSyncEnabled(newValue)

      if (newValue) {
        setLastSyncAt(new Date())
        toast.success(`${getHealthAppName(healthApp)} sync enabled!`)
      } else {
        toast.success(`${getHealthAppName(healthApp)} sync disabled`)
      }
    } catch (error) {
      console.error('Error toggling sync:', error)
      toast.error('Failed to update sync settings')
    } finally {
      setSaving(false)
    }
  }

  const supported = isHealthSyncSupported()

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
    )
  }

  if (!supported) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl">📱</div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Health App Sync
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {getHealthSyncLimitations(platform)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Current platform: <span className="font-medium capitalize">{platform}</span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{getHealthAppIcon(healthApp)}</div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {getHealthAppName(healthApp)}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sync steps automatically
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={handleToggleSync}
          disabled={saving}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            syncEnabled ? 'bg-success' : 'bg-gray-300 dark:bg-gray-700'
          } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          aria-label={syncEnabled ? 'Disable sync' : 'Enable sync'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              syncEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Status</span>
          <span className={`font-medium ${syncEnabled ? 'text-success' : 'text-gray-500 dark:text-gray-400'}`}>
            {syncEnabled ? '✓ Connected' : 'Not connected'}
          </span>
        </div>

        {syncEnabled && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Last sync</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              {formatLastSync(lastSyncAt || undefined)}
            </span>
          </div>
        )}

        {/* Setup Button (when disabled) */}
        {!syncEnabled && onSetupClick && (
          <button
            onClick={onSetupClick}
            className="w-full mt-3 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Setup Instructions
          </button>
        )}

        {/* Info Note */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-900 dark:text-blue-200">
            💡 {syncEnabled
              ? `Your steps are being synced with ${getHealthAppName(healthApp)}. Keep the app permissions enabled.`
              : `Enable sync to automatically track steps from ${getHealthAppName(healthApp)}.`
            }
          </p>
        </div>
      </div>
    </div>
  )
}
