'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { WeightDataPoint } from '@/lib/chart-data-aggregator'

interface WeightTrendChartProps {
  data: WeightDataPoint[]
  targetWeight?: number
  loading?: boolean
}

export function WeightTrendChart({ data, targetWeight, loading }: WeightTrendChartProps) {
  if (loading) {
    return (
      <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading chart...</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-64 bg-gray-50 dark:bg-gray-950 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-900 dark:text-gray-100 font-medium mb-1">No weight data available</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Log your weight to see your progress!</p>
        </div>
      </div>
    )
  }

  // Format data for Recharts
  const chartData = data.map(point => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: point.weight,
    fullDate: point.date
  }))

  // Calculate min/max for Y-axis domain
  const weights = data.map(d => d.weight)
  const minWeight = Math.min(...weights, targetWeight || Infinity)
  const maxWeight = Math.max(...weights)
  const padding = (maxWeight - minWeight) * 0.1 || 5
  const yDomain = [
    Math.floor(minWeight - padding),
    Math.ceil(maxWeight + padding)
  ]

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            domain={yDomain}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            label={{ value: 'Weight (lbs)', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#6b7280' } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px'
            }}
            labelStyle={{ color: '#111827', fontWeight: 600 }}
            formatter={(value: number) => [`${value.toFixed(1)} lbs`, 'Weight']}
          />

          {/* Target weight reference line */}
          {targetWeight && (
            <ReferenceLine
              y={targetWeight}
              stroke="#8b5cf6"
              strokeDasharray="5 5"
              label={{
                value: `Goal: ${targetWeight} lbs`,
                position: 'right',
                fill: '#8b5cf6',
                fontSize: 12
              }}
            />
          )}

          {/* Weight trend line */}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#8b5cf6"
            strokeWidth={3}
            dot={{ fill: '#8b5cf6', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-[#8b5cf6] rounded" />
          <span className="text-gray-900 dark:text-gray-100">Weight Trend</span>
        </div>
        {targetWeight && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-[#8b5cf6] border-t-2 border-dashed" />
            <span className="text-gray-900 dark:text-gray-100">Goal Weight</span>
          </div>
        )}
      </div>
    </div>
  )
}
