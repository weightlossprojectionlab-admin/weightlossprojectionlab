'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { WeightDataPoint } from '@/lib/chart-data-aggregator'
import { useTheme } from '@/hooks/useTheme'

interface WeightTrendChartProps {
  data: WeightDataPoint[]
  targetWeight?: number
  loading?: boolean
}

export function WeightTrendChart({ data, targetWeight, loading }: WeightTrendChartProps) {
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
          <p className="text-foreground font-medium mb-1">No weight data available</p>
          <p className="text-sm text-muted-foreground">Log your weight to see your progress!</p>
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

  // Theme-aware colors
  const isDark = resolvedTheme === 'dark'
  const gridColor = 'hsl(var(--border))'
  const axisColor = 'hsl(var(--muted-foreground))'
  const tooltipBg = 'hsl(var(--card))'
  const tooltipBorder = 'hsl(var(--border))'
  const tooltipText = 'hsl(var(--card-foreground))'

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="date"
            stroke={axisColor}
            style={{ fontSize: '12px' }}
          />
          <YAxis
            domain={yDomain}
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
            formatter={(value: number) => [`${value.toFixed(1)} lbs`, 'Weight']}
          />

          {/* Target weight reference line */}
          {targetWeight && (
            <ReferenceLine
              y={targetWeight}
              stroke="hsl(var(--primary))"
              strokeDasharray="5 5"
              label={{
                value: `Goal: ${targetWeight} lbs`,
                position: 'right',
                fill: 'hsl(var(--primary))',
                fontSize: 12
              }}
            />
          )}

          {/* Weight trend line */}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-primary rounded" />
          <span className="text-foreground">Weight Trend</span>
        </div>
        {targetWeight && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-primary border-t-2 border-dashed" />
            <span className="text-foreground">Goal Weight</span>
          </div>
        )}
      </div>
    </div>
  )
}
