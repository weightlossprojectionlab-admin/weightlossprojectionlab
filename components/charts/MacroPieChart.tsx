'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { useTheme } from '@/hooks/useTheme'

interface MacroPieChartProps {
  protein: number
  carbs: number
  fat: number
  loading?: boolean
}

const COLORS = {
  protein: '#ef4444', // Red
  carbs: '#f59e0b',   // Orange/Yellow
  fat: '#10b981'      // Green
}

export function MacroPieChart({ protein, carbs, fat, loading }: MacroPieChartProps) {
  const { resolvedTheme } = useTheme()

  if (loading) {
    return (
      <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading chart...</p>
      </div>
    )
  }

  const total = protein + carbs + fat

  if (total === 0) {
    return (
      <div className="w-full h-64 bg-gray-50 dark:bg-gray-950 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-900 dark:text-gray-100 font-medium mb-1">No macro data available</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Log meals to track your macronutrients!</p>
        </div>
      </div>
    )
  }

  // Calculate percentages
  const percentages = {
    protein: Math.round((protein / total) * 100),
    carbs: Math.round((carbs / total) * 100),
    fat: Math.round((fat / total) * 100)
  }

  // Format data for pie chart
  const data = [
    { name: 'Protein', value: percentages.protein, grams: Math.round(protein), color: COLORS.protein },
    { name: 'Carbs', value: percentages.carbs, grams: Math.round(carbs), color: COLORS.carbs },
    { name: 'Fat', value: percentages.fat, grams: Math.round(fat), color: COLORS.fat }
  ]

  // Theme-aware colors
  const isDark = resolvedTheme === 'dark'
  const tooltipBg = isDark ? '#1f2937' : '#ffffff'
  const tooltipBorder = isDark ? '#374151' : '#e5e7eb'
  const tooltipText = isDark ? '#f9fafb' : '#111827'
  const labelColor = isDark ? '#f9fafb' : '#111827'

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: '8px',
              padding: '8px 12px'
            }}
            labelStyle={{ color: tooltipText, fontWeight: 600 }}
            formatter={(value: number, name: string, props: any) => [
              `${value}% (${props.payload.grams}g)`,
              name
            ]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Summary stats below chart */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Protein</p>
          <p className="text-lg font-bold text-[#ef4444]">{Math.round(protein)}g</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">{percentages.protein}%</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Carbs</p>
          <p className="text-lg font-bold text-[#f59e0b]">{Math.round(carbs)}g</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">{percentages.carbs}%</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Fat</p>
          <p className="text-lg font-bold text-[#10b981]">{Math.round(fat)}g</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">{percentages.fat}%</p>
        </div>
      </div>
    </div>
  )
}
