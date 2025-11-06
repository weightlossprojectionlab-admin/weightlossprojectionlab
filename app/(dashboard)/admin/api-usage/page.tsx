'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { logger } from '@/lib/logger'
import { auth } from '@/lib/firebase'
import { ChartBarIcon, CloudIcon, ClockIcon, CurrencyDollarIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

// Dynamic imports for Recharts components to reduce bundle size
const APIUsageTimeline = dynamic(() => import('@/components/charts/APIUsageTimeline').then(m => ({ default: m.APIUsageTimeline })), {
  loading: () => <div className="h-[300px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />,
  ssr: false
})

const CacheFreshnessChart = dynamic(() => import('@/components/charts/CacheFreshnessChart').then(m => ({ default: m.CacheFreshnessChart })), {
  loading: () => <div className="h-[300px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />,
  ssr: false
})

interface APIUsageData {
  summary: {
    totalRequests: number
    cacheHits: number
    apiCalls: number
    cacheHitRate: number
    estimatedLatencySavingsMs: number
    estimatedBandwidthSavedKB: number
  }
  dailyTimeline: Array<{
    date: string
    cache: number
    api: number
    total: number
    cacheHitRate: string
  }>
  productStats: {
    totalProducts: number
    verifiedProducts: number
    productsWithPricing: number
    avgScansPerProduct: number
  }
  cacheFreshnessDistribution: Record<string, number>
  recentLogs: any[]
}

export default function APIUsagePage() {
  const { isAdmin } = useAdminAuth()
  const [data, setData] = useState<APIUsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  const getAuthToken = async () => {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')
    return await user.getIdToken()
  }

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin, days])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      const response = await fetch(`/api/admin/api-usage?days=${days}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load data' }))
        throw new Error(errorData.error || 'Failed to load data')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      logger.error('Load API usage error:', err as Error)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Access Denied</h2>
          <p className="text-red-700 dark:text-red-300">
            You do not have permission to access API usage analytics.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading API usage data...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-red-900 dark:text-red-200 font-semibold mb-2">Error Loading Data</h3>
          <p className="text-red-700 dark:text-red-300">{error || 'Failed to load data'}</p>
        </div>
      </div>
    )
  }

  const freshnessDistribution = Object.entries(data.cacheFreshnessDistribution).map(([name, value]) => ({
    name,
    value
  }))

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">API Usage & Cost Reduction</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor cache performance and OpenFoodFacts API usage
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <ChartBarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Requests</div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {data.summary.totalRequests.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {data.summary.cacheHits.toLocaleString()} cached • {data.summary.apiCalls.toLocaleString()} API calls
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg shadow p-6 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            <div className="text-sm text-gray-600 dark:text-gray-400">Cache Hit Rate</div>
          </div>
          <div className="text-3xl font-bold text-green-700 dark:text-green-300">
            {data.summary.cacheHitRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {data.summary.cacheHits.toLocaleString()} served from cache
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <ClockIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <div className="text-sm text-gray-600 dark:text-gray-400">Latency Savings</div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {(data.summary.estimatedLatencySavingsMs / 1000).toFixed(1)}s
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Avg {data.summary.cacheHits > 0 ? (data.summary.estimatedLatencySavingsMs / data.summary.cacheHits).toFixed(0) : 0}ms per cache hit
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <CloudIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            <div className="text-sm text-gray-600 dark:text-gray-400">Bandwidth Saved</div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {(data.summary.estimatedBandwidthSavedKB / 1024).toFixed(1)} MB
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {data.summary.estimatedBandwidthSavedKB.toLocaleString()} KB total
          </div>
        </div>
      </div>

      {/* Product Database Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Products in Database</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {data.productStats.totalProducts.toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Verified Products</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {data.productStats.verifiedProducts.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {data.productStats.totalProducts > 0
              ? ((data.productStats.verifiedProducts / data.productStats.totalProducts) * 100).toFixed(1)
              : 0}% verified
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Products with Pricing</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {data.productStats.productsWithPricing.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {data.productStats.totalProducts > 0
              ? ((data.productStats.productsWithPricing / data.productStats.totalProducts) * 100).toFixed(1)
              : 0}% with prices
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Avg Scans per Product</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {data.productStats.avgScansPerProduct}
          </div>
        </div>
      </div>

      {/* Daily Timeline */}
      {data.dailyTimeline.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Daily Usage Timeline</h2>
          <APIUsageTimeline data={data.dailyTimeline} />
        </div>
      )}

      {/* Cache Freshness Distribution */}
      {freshnessDistribution.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Cache Freshness Distribution</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CacheFreshnessChart data={freshnessDistribution} />
            <div className="flex items-center">
              <div className="space-y-3 w-full">
                {freshnessDistribution.map((item, idx) => {
                  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
                  return (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: colors[idx % colors.length] }}></div>
                        <span className="text-gray-900 dark:text-gray-100">{item.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{item.value.toLocaleString()}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            Cache entries older than 30 days are refreshed from OpenFoodFacts automatically.
          </p>
        </div>
      )}
    </div>
  )
}
