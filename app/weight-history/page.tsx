'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { WeightHistoryTable } from '@/components/charts/WeightHistoryTable'
import { useAuth } from '@/hooks/useAuth'
import { useUserProfile } from '@/hooks/useUserProfile'
import { WeightLog } from '@/types'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { db } from '@/lib/firebase'
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore'

export default function WeightHistoryPage() {
  return (
    <AuthGuard>
      <WeightHistoryContent />
    </AuthGuard>
  )
}

type TimeRange = '7d' | '30d' | '90d' | 'all'

function WeightHistoryContent() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile } = useUserProfile()

  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Real-time subscription to weight logs
  useEffect(() => {
    if (!user) return

    setLoading(true)

    try {
      // Build Firestore query
      const weightLogsRef = collection(db, 'users', user.uid, 'weightLogs')
      let q = query(weightLogsRef, orderBy('loggedAt', 'desc'), limit(100))

      // Add date filter based on time range
      if (timeRange !== 'all') {
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        q = query(weightLogsRef, where('loggedAt', '>=', Timestamp.fromDate(startDate)), orderBy('loggedAt', 'desc'), limit(100))
      }

      // Subscribe to real-time updates
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const logs: WeightLog[] = snapshot.docs.map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              userId: user.uid,
              weight: data.weight,
              unit: data.unit,
              loggedAt: data.loggedAt?.toDate ? data.loggedAt.toDate() : new Date(data.loggedAt),
              notes: data.notes,
              dataSource: data.dataSource || 'manual',
              photoUrl: data.photoUrl,
              scaleDeviceId: data.scaleDeviceId
            }
          })
          setWeightLogs(logs)
          setLoading(false)
        },
        (error) => {
          logger.error('Error in weight logs snapshot', error as Error)
          toast.error('Failed to load weight history')
          setLoading(false)
        }
      )

      // Cleanup subscription on unmount
      return () => unsubscribe()
    } catch (error) {
      logger.error('Error setting up weight logs listener', error as Error)
      toast.error('Failed to load weight history')
      setLoading(false)
    }
  }, [user, timeRange])

  const handleExportCSV = () => {
    if (weightLogs.length === 0) {
      toast.error('No data to export')
      return
    }

    // Create CSV content
    const headers = ['Date', 'Weight', 'Unit', 'Notes']
    const rows = weightLogs.map(log => [
      new Date(log.loggedAt).toLocaleDateString(),
      log.weight.toString(),
      log.unit,
      log.notes || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `weight-history-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    toast.success('Weight history exported')
    setShowExportMenu(false)
  }

  // Calculate stats
  const stats = {
    totalEntries: weightLogs.length,
    startWeight: weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : 0,
    currentWeight: weightLogs.length > 0 ? weightLogs[0].weight : 0,
    totalChange: 0,
    unit: (weightLogs.length > 0 ? weightLogs[0].unit : profile?.preferences?.units === 'metric' ? 'kg' : 'lbs') as 'kg' | 'lbs'
  }

  if (stats.totalEntries >= 2) {
    stats.totalChange = stats.currentWeight - stats.startWeight
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Weight History"
        subtitle="Track your weight progress over time"
        backHref="/dashboard"
        actions={
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
            >
              Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-background rounded-lg shadow-lg border border-border z-10">
                <button
                  onClick={handleExportCSV}
                  className="w-full text-left px-4 py-2 hover:bg-background text-sm text-foreground"
                >
                  Export as CSV
                </button>
              </div>
            )}
          </div>
        }
      />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Summary Stats */}
        {weightLogs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card rounded-lg shadow-sm p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Total Entries</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalEntries}</p>
            </div>
            <div className="bg-card rounded-lg shadow-sm p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Start Weight</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.startWeight} {stats.unit}
              </p>
            </div>
            <div className="bg-card rounded-lg shadow-sm p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Current Weight</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.currentWeight} {stats.unit}
              </p>
            </div>
            <div className="bg-card rounded-lg shadow-sm p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Total Change</p>
              <p className={`text-2xl font-bold ${
                stats.totalChange < 0 ? 'text-success dark:text-green-400' :
                stats.totalChange > 0 ? 'text-error' :
                'text-foreground'
              }`}>
                {stats.totalChange > 0 ? '+' : ''}{Math.round(stats.totalChange * 10) / 10} {stats.unit}
              </p>
            </div>
          </div>
        )}

        {/* Time Range Filter */}
        <div className="bg-card rounded-lg shadow-sm p-4 mb-6 border border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">Show:</span>
            <div className="flex gap-2">
              {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-primary text-white'
                      : 'bg-muted text-foreground hover:bg-gray-200'
                  }`}
                >
                  {range === '7d' ? 'Last 7 Days' :
                   range === '30d' ? 'Last 30 Days' :
                   range === '90d' ? 'Last 90 Days' :
                   'All Time'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Weight History Table */}
        <div className="bg-card rounded-lg shadow-sm p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Weight Entries</h2>
            <Link
              href="/log-weight"
              className="px-4 py-2 bg-primary-light text-primary-dark rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
            >
              + Add Entry
            </Link>
          </div>

          <WeightHistoryTable
            weightLogs={weightLogs}
            loading={loading}
          />
        </div>

        {/* Best Practices Tip */}
        {weightLogs.length === 0 && !loading && (
          <div className="mt-6 bg-primary-light border border-primary-light rounded-lg p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div className="flex-1">
                <p className="font-medium text-foreground mb-2">Start Tracking Your Weight</p>
                <p className="text-sm text-foreground mb-3">
                  Regular weight tracking helps you stay accountable and identify trends in your progress.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Weigh yourself at the same time each day</li>
                  <li>Use the same scale for consistency</li>
                  <li>Weigh yourself before eating or drinking</li>
                  <li>Don't worry about daily fluctuations - focus on trends</li>
                </ul>
                <Link
                  href="/log-weight"
                  className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm"
                >
                  Log Your First Weight
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
