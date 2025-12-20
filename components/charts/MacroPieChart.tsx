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
  protein: 'hsl(var(--error))', // Red
  carbs: 'hsl(var(--warning))',   // Orange/Yellow
  fat: 'hsl(var(--success))'      // Green
}

export function MacroPieChart({ protein, carbs, fat, loading }: MacroPieChartProps) {
  const { resolvedTheme } = useTheme()

  if (loading) {
    return (
      <div className="w-full h-64 bg-muted rounded-lg animate-pulse flex items-center justify-center">
        <p className="text-muted-foreground">Loading chart...</p>
      </div>
    )
  }

  const total = protein + carbs + fat

  if (total === 0) {
    return (
      <div className="w-full h-64 bg-background rounded-lg border-2 border-dashed border-border flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground font-medium mb-1">No macro data available</p>
          <p className="text-sm text-muted-foreground">Log meals to track your macronutrients!</p>
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

  // Theme-aware colors (always light mode)
  const isDark = false
  const tooltipBg = 'hsl(var(--card))'
  const tooltipBorder = 'hsl(var(--border))'
  const tooltipText = 'hsl(var(--card-foreground))'
  const labelColor = 'hsl(var(--card-foreground))'

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ percent }) => `${((percent as number) * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="hsl(var(--primary))"
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
          <p className="text-sm text-muted-foreground">Protein</p>
          <p className="text-lg font-bold text-error">{Math.round(protein)}g</p>
          <p className="text-xs text-muted-foreground">{percentages.protein}%</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Carbs</p>
          <p className="text-lg font-bold text-warning">{Math.round(carbs)}g</p>
          <p className="text-xs text-muted-foreground">{percentages.carbs}%</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Fat</p>
          <p className="text-lg font-bold text-success">{Math.round(fat)}g</p>
          <p className="text-xs text-muted-foreground">{percentages.fat}%</p>
        </div>
      </div>
    </div>
  )
}
