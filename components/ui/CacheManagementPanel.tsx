'use client'

import { useState, useEffect } from 'react'
import { getMedicalCacheSize, getMedicalCacheQuota, getCachedPatients, removeCachedPatient } from '@/lib/offline-medical-cache'
import { getShoppingCacheStats } from '@/lib/offline-shopping-cache'
import { getQueueStats } from '@/lib/offline-queue'
import toast from 'react-hot-toast'
import { TrashIcon } from '@heroicons/react/24/outline'

/**
 * Cache Management Panel
 *
 * Shows storage usage and allows users to manage offline cache
 */
export function CacheManagementPanel() {
  const [loading, setLoading] = useState(true)
  const [storageInfo, setStorageInfo] = useState<{
    usage: number
    quota: number
    medicalPatients: number
    shoppingItems: number
    queuedItems: number
  }>({
    usage: 0,
    quota: 0,
    medicalPatients: 0,
    shoppingItems: 0,
    queuedItems: 0
  })
  const [cachedPatients, setCachedPatients] = useState<Array<{ patientId: string; patientName: string; cachedAt: number }>>([])

  useEffect(() => {
    loadStorageInfo()
  }, [])

  const loadStorageInfo = async () => {
    try {
      const [usage, quota, patients, shoppingStats, queueStats] = await Promise.all([
        getMedicalCacheSize(),
        getMedicalCacheQuota(),
        getCachedPatients(),
        getShoppingCacheStats(),
        getQueueStats()
      ])

      setStorageInfo({
        usage,
        quota,
        medicalPatients: patients.length,
        shoppingItems: shoppingStats.cachedProducts,
        queuedItems: queueStats.unsynced
      })

      setCachedPatients(patients)
    } catch (error) {
      console.error('Failed to load storage info:', error)
      toast.error('Failed to load cache information')
    } finally {
      setLoading(false)
    }
  }

  const handleRemovePatient = async (patientId: string, patientName: string) => {
    if (!confirm(`Remove cached data for ${patientName}? This will free up storage space but you'll need to re-download when going offline.`)) {
      return
    }

    try {
      await removeCachedPatient(patientId)
      toast.success(`Removed cached data for ${patientName}`)
      await loadStorageInfo()
    } catch (error) {
      console.error('Failed to remove patient cache:', error)
      toast.error('Failed to remove cached data')
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const usagePercent = storageInfo.quota > 0 ? (storageInfo.usage / storageInfo.quota) * 100 : 0

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-muted rounded w-full mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Offline Cache Management</h3>

      {/* Storage Usage */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Storage Usage</span>
          <span className="text-sm text-muted-foreground">
            {formatBytes(storageInfo.usage)} / {formatBytes(storageInfo.quota)}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              usagePercent > 80 ? 'bg-error' : usagePercent > 60 ? 'bg-warning-dark' : 'bg-success'
            }`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          ></div>
        </div>
        {usagePercent > 80 && (
          <p className="text-xs text-error mt-2">
            Storage is running low. Consider removing some cached data.
          </p>
        )}
      </div>

      {/* Cache Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="text-2xl font-bold text-foreground">{storageInfo.medicalPatients}</div>
          <div className="text-xs text-muted-foreground mt-1">Patients Cached</div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="text-2xl font-bold text-foreground">{storageInfo.shoppingItems}</div>
          <div className="text-xs text-muted-foreground mt-1">Products Cached</div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="text-2xl font-bold text-foreground">{storageInfo.queuedItems}</div>
          <div className="text-xs text-muted-foreground mt-1">Queued Items</div>
        </div>
      </div>

      {/* Cached Patients List */}
      {cachedPatients.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-foreground mb-3">Cached Patients</h4>
          <div className="space-y-2">
            {cachedPatients.map((patient) => (
              <div
                key={patient.patientId}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{patient.patientName}</p>
                  <p className="text-xs text-muted-foreground">
                    Cached {new Date(patient.cachedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRemovePatient(patient.patientId, patient.patientName)}
                  className="ml-3 p-2 text-error hover:bg-error-light rounded-md transition-colors"
                  aria-label="Remove cached data"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {cachedPatients.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            No patients cached for offline access.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Visit a patient's page while online to cache their data.
          </p>
        </div>
      )}
    </div>
  )
}
