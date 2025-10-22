'use client'

import {Bar

BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import { CalorieDataPoint } from '@/lib/chart-data-aggregator'

interface CalorieIntakeChartProps {
  data: CalorieDataPoint[]
  loading?: boolean
}

export function CalorieIntakeChart({ data, loading }: CalorieIntakeChartProps) {
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
          <p className="text-gray-900 dark:text-gray-100 font-medium mb-1">No calorie data available</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Log meals to track your calorie intake!</p>
        </div>
      </div>
    )
  }

  // Format data for Recharts
  const chartData = data.map(point => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    calories: point.calories,
    goal: point.goal,
    fullDate: point.date,
    overGoal: point.calories > point.goal
  }))

  // Calculate average goal (they should all be the same, but just in case)
  const avgGoal = data.length > 0 ? data[0].goal : 2000

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            label={{ value: 'Calories', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#6b7280' } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px'
            }}
            labelStyle={{ color: '#111827', fontWeight: 600 }}
            formatter={(value: number, name: string) => {
              if (name === 'calories') return [`${value} cal`, 'Intake']
              if (name === 'goal') return [`${value} cal`, 'Goal']
              return [value, name]
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="rect"
          />

          {/* Goal reference line */}
          <ReferenceLine
            y={avgGoal}
            stroke="#10b981"
            strokeDasharray="5 5"
            label={{
              value: `Goal: ${avgGoal} cal`,
              position: 'right',
              fill: '#10b981',
              fontSize: 12
            }}
          />

          {/* Calorie bars */}
          <Bar
            dataKey="calories"
            fill="#8b5cf6"
            radius={[4, 4, 0, 0]}
            name="Calories"
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Stats summary */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#8b5cf6] rounded" />
          <span className="text-gray-900 dark:text-gray-100">Daily Intake</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-[#10b981] border-t-2 border-dashed" />
          <span className="text-gray-900 dark:text-gray-100">Calorie Goal</span>
        </div>
      </div>
    </div>
  )
}
