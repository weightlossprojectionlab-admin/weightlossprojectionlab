'use client'

/**
 * Analytics Dashboard Component
 *
 * Shows inventory analytics and waste tracking
 * Features:
 * - Total waste metrics (items, cost)
 * - Waste by category breakdown
 * - Expiration rate trends over time
 * - Top wasted items
 * - Inventory turnover rate
 * - Usage patterns
 */

import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { PieLabelRenderProps } from 'recharts'
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'
import { TrashIcon, CurrencyDollarIcon, ClockIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import type { ShoppingItem, ProductCategory } from '@/types/shopping'
import { getCategoryMetadata } from '@/lib/product-categories'

interface AnalyticsDashboardProps {
  items: ShoppingItem[]
  className?: string
}

interface WasteMetrics {
  totalWasted: number
  totalCost: number
  wasteByCategory: { category: ProductCategory; count: number; cost: number }[]
  topWastedItems: { name: string; count: number; category: ProductCategory }[]
  expirationRate: number
  averageDaysToExpiry: number
}

const CHART_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#f59e0b', // yellow
  '#10b981', // green
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

export function AnalyticsDashboard({ items, className = '' }: AnalyticsDashboardProps) {
  /**
   * Calculate waste metrics
   */
  const metrics = useMemo((): WasteMetrics => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Find expired items (past expiration date)
    const expiredItems = items.filter(item => {
      if (!item.expiresAt) return false
      const expiryDate = new Date(item.expiresAt)
      return expiryDate < now && !item.inStock // Expired and no longer in stock (wasted)
    })

    // Count by category
    const categoryMap = new Map<ProductCategory, { count: number; cost: number }>()
    let totalCost = 0

    expiredItems.forEach(item => {
      const category = item.category
      const existing = categoryMap.get(category) || { count: 0, cost: 0 }
      const itemCost = item.expectedPriceCents ? item.expectedPriceCents / 100 : 5 // Default $5

      categoryMap.set(category, {
        count: existing.count + 1,
        cost: existing.cost + itemCost
      })
      totalCost += itemCost
    })

    // Top wasted items (by product name)
    const productMap = new Map<string, { count: number; category: ProductCategory }>()
    expiredItems.forEach(item => {
      const key = item.productName
      const existing = productMap.get(key) || { count: 0, category: item.category }
      productMap.set(key, {
        count: existing.count + 1,
        category: item.category
      })
    })

    const topWastedItems = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, count: data.count, category: data.category }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Expiration rate: % of items that expired within 30 days
    const itemsWithExpiry = items.filter(item => item.expiresAt)
    const expiredInLast30Days = expiredItems.filter(item => {
      if (!item.expiresAt) return false
      const expiryDate = new Date(item.expiresAt)
      return expiryDate >= thirtyDaysAgo
    })

    const expirationRate = itemsWithExpiry.length > 0
      ? (expiredInLast30Days.length / itemsWithExpiry.length) * 100
      : 0

    // Average days to expiry for current inventory
    const currentItems = items.filter(item => item.inStock && item.expiresAt)
    const totalDays = currentItems.reduce((sum, item) => {
      if (!item.expiresAt) return sum
      const daysUntilExpiry = Math.floor((new Date(item.expiresAt).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      return sum + Math.max(0, daysUntilExpiry)
    }, 0)

    const averageDaysToExpiry = currentItems.length > 0
      ? Math.round(totalDays / currentItems.length)
      : 0

    return {
      totalWasted: expiredItems.length,
      totalCost,
      wasteByCategory: Array.from(categoryMap.entries())
        .map(([category, data]) => ({ category, count: data.count, cost: data.cost }))
        .sort((a, b) => b.count - a.count),
      topWastedItems,
      expirationRate,
      averageDaysToExpiry
    }
  }, [items])

  /**
   * Prepare chart data
   */
  const chartData = useMemo(() => {
    // Waste by category for pie chart
    const categoryData = metrics.wasteByCategory.map((item, index) => ({
      name: getCategoryMetadata(item.category).displayName,
      value: item.count,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }))

    // Waste trend over last 7 days
    const trendData: { date: string; wasted: number; expiring: number }[] = []
    const now = new Date()

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const wastedCount = items.filter(item => {
        if (!item.expiresAt || item.inStock) return false
        const expiryDate = new Date(item.expiresAt)
        return expiryDate >= date && expiryDate < nextDate
      }).length

      const expiringCount = items.filter(item => {
        if (!item.expiresAt || !item.inStock) return false
        const expiryDate = new Date(item.expiresAt)
        return expiryDate >= date && expiryDate < nextDate
      }).length

      trendData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        wasted: wastedCount,
        expiring: expiringCount
      })
    }

    return { categoryData, trendData }
  }, [metrics, items])

  return (
    <div className={className}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Wasted */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.totalWasted}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Items Wasted
              </div>
            </div>
          </div>
        </div>

        {/* Total Cost */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                ${metrics.totalCost.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Estimated Waste Cost
              </div>
            </div>
          </div>
        </div>

        {/* Expiration Rate */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.expirationRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Expiration Rate (30d)
              </div>
            </div>
          </div>
        </div>

        {/* Avg Days to Expiry */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ClockIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.averageDaysToExpiry}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Avg Days to Expiry
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waste by Category - Pie Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Waste by Category
          </h3>
          {chartData.categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: PieLabelRenderProps) => {
                    const name = props.name || ''
                    const percent = typeof props.percent === 'number'
                      ? props.percent
                      : Number(props.percent ?? 0)
                    return `${name} ${(percent * 100).toFixed(0)}%`
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
              No waste data available
            </div>
          )}
        </div>

        {/* Expiration Trend - Line Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            7-Day Expiration Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="wasted"
                stroke="#ef4444"
                strokeWidth={2}
                name="Wasted"
              />
              <Line
                type="monotone"
                dataKey="expiring"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Expiring"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Wasted Items */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Wasted Items
          </h3>
          {metrics.topWastedItems.length > 0 ? (
            <div className="space-y-3">
              {metrics.topWastedItems.map((item, index) => {
                const categoryMeta = getCategoryMetadata(item.category)
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-xl">
                      {categoryMeta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {item.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {categoryMeta.displayName}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="text-lg font-bold text-red-600 dark:text-red-400">
                        {item.count}×
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 py-8">
              No waste data available
            </div>
          )}
        </div>

        {/* Waste by Category - Bar Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Waste Cost by Category
          </h3>
          {metrics.wasteByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.wasteByCategory.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis
                  dataKey="category"
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => getCategoryMetadata(value).displayName}
                />
                <YAxis
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: ValueType) => {
                    const numValue = typeof value === 'number' ? value : 0
                    return [`$${numValue.toFixed(2)}`, 'Cost']
                  }}
                  labelFormatter={(label: NameType) => {
                    return getCategoryMetadata(label as ProductCategory).displayName
                  }}
                />
                <Bar dataKey="cost" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
              No waste data available
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💡 Reduce Food Waste Tips
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Plan meals ahead to use expiring items first</li>
          <li>• Store perishables properly to extend shelf life</li>
          <li>• Freeze items before they expire</li>
          <li>• Buy smaller quantities of items you waste frequently</li>
          <li>• Use the FIFO method: First In, First Out</li>
        </ul>
      </div>
    </div>
  )
}
