'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { MacroDataPoint } from '@/lib/chart-data-aggregator'
import { MacroPieChart } from './MacroPieChart'
import { useTheme } from '@/hooks/useTheme'

interface MacroDistributionChartProps {
  data: MacroDataPoint[]
  loading?: boolean
}

export function MacroDistributionChart({ data, loading }: MacroDistributionChartProps) {
  const { resolvedTheme } = useTheme()
  if (loading) {
    return (
      <div className="w-full h-64 bg-muted rounded-lg animate-pulse flex items-center justify-center">
        <p className="text-muted-foreground">Loading chart...</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-64 bg-background rounded-lg border-2 border-dashed border-border flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground font-medium mb-1">No macro data available</p>
          <p className="text-sm text-muted-foreground">Log meals to track your macronutrients!</p>
        </div>
      </div>
    )
  }

  // Format data for Recharts
  const chartData = data.map(point => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    protein: point.protein,
    carbs: point.carbs,
    fat: point.fat,
    fullDate: point.date
  }))

  // Calculate totals for legend percentages
  const totals = data.reduce((acc, point) => ({
    protein: acc.protein + point.protein,
    carbs: acc.carbs + point.carbs,
    fat: acc.fat + point.fat
  }), { protein: 0, carbs: 0, fat: 0 })

  const grandTotal = totals.protein + totals.carbs + totals.fat
  const percentages = grandTotal > 0 ? {
    protein: Math.round((totals.protein / grandTotal) * 100),
    carbs: Math.round((totals.carbs / grandTotal) * 100),
    fat: Math.round((totals.fat / grandTotal) * 100)
  } : { protein: 0, carbs: 0, fat: 0 }

  // Theme-aware colors
  const isDark = resolvedTheme === 'dark'
  const gridColor = 'hsl(var(--border))'
  const axisColor = 'hsl(var(--muted-foreground))'
  const tooltipBg = 'hsl(var(--card))'
  const tooltipBorder = 'hsl(var(--border))'
  const tooltipText = 'hsl(var(--card-foreground))'

  return (
    <div className="w-full space-y-8">
      {/* Pie Chart - Aggregate Macro Split */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Overall Macro Split
        </h3>
        <MacroPieChart
          protein={totals.protein}
          carbs={totals.carbs}
          fat={totals.fat}
          loading={loading}
        />
      </div>

      {/* Area Chart - Daily Trend */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Daily Macro Trend
        </h3>
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorProtein" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--error))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--error))" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorCarbs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="date"
                stroke={axisColor}
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke={axisColor}
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '8px',
                  padding: '8px 12px'
                }}
                labelStyle={{ color: tooltipText, fontWeight: 600 }}
                formatter={(value: number, name: string) => [`${value}g`, name.charAt(0).toUpperCase() + name.slice(1)]}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="rect"
              />

              {/* Stacked areas for protein, carbs, fat */}
              <Area
                type="monotone"
                dataKey="protein"
                stackId="1"
                stroke="hsl(var(--error))"
                fill="url(#colorProtein)"
                name="Protein"
              />
              <Area
                type="monotone"
                dataKey="carbs"
                stackId="1"
                stroke="hsl(var(--warning))"
                fill="url(#colorCarbs)"
                name="Carbs"
              />
              <Area
                type="monotone"
                dataKey="fat"
                stackId="1"
                stroke="hsl(var(--success))"
                fill="url(#colorFat)"
                name="Fat"
              />
            </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
