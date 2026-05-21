'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { WeightDataPoint } from '@/lib/chart-data-aggregator'
import { useTheme } from '@/hooks/useTheme'

interface WeightTrendChartProps {
  data: WeightDataPoint[]
  targetWeight?: number
  loading?: boolean
  /**
   * Forward-looking projection points. When present, rendered as a
   * dashed continuation of the historical line and a vertical "Today"
   * reference line is drawn at the boundary. Caller computes these
   * (typically a linear-fit extrapolation from `data`); the chart
   * just draws what it's given.
   */
  projectionData?: WeightDataPoint[]
}

export function WeightTrendChart({ data, targetWeight, loading, projectionData }: WeightTrendChartProps) {
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

  const hasProjection = (projectionData?.length ?? 0) > 0
  // Format data for Recharts. Merge historical + projection into a
  // single array so they share the X-axis; the two metrics use
  // different dataKeys (weight vs projected) so each <Line> can pick
  // up only its own segment. The boundary between them is the last
  // historical point — that's where the dashed projection picks up.
  const chartData = [
    ...data.map((point) => ({
      date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: point.weight,
      projected: null as number | null,
      fullDate: point.date,
    })),
    ...(hasProjection ? projectionData! : []).map((point) => ({
      date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: null as number | null,
      projected: point.weight,
      fullDate: point.date,
    })),
  ]
  // The last historical point is the "today" anchor where the dashed
  // projection picks up. Use its formatted label for the ReferenceLine
  // so it lands on the right tick.
  const todayLabel = chartData[data.length - 1]?.date

  // Calculate min/max for Y-axis domain — include projection so the
  // dashed line doesn't clip out of view when the trend extends far.
  const allWeights = [
    ...data.map((d) => d.weight),
    ...(hasProjection ? projectionData!.map((d) => d.weight) : []),
  ]
  const minWeight = Math.min(...allWeights, targetWeight || Infinity)
  const maxWeight = Math.max(...allWeights)
  const padding = (maxWeight - minWeight) * 0.1 || 5
  const yDomain = [
    Math.floor(minWeight - padding),
    Math.ceil(maxWeight + padding)
  ]

  // Theme-aware colors (always light mode)
  const isDark = false
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

          {/* "Today" boundary — vertical divider between history and
              projection. Only rendered when there's a projection to
              divide from. */}
          {hasProjection && todayLabel && (
            <ReferenceLine
              x={todayLabel}
              stroke={axisColor}
              strokeDasharray="2 4"
              label={{
                value: 'Today',
                position: 'top',
                fill: axisColor,
                fontSize: 11,
              }}
            />
          )}

          {/* Historical weight line — solid, with dots for actual
              logged readings. Recharts skips null values, so this line
              only draws across the historical segment of chartData. */}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
            activeDot={{ r: 6 }}
            connectNulls={false}
            isAnimationActive={false}
          />

          {/* Forward projection — dashed, no dots (these are predicted,
              not measured). Connects from the last historical point
              because we duplicate the last value at projection[0] via
              the page's slope math. */}
          {hasProjection && (
            <Line
              type="monotone"
              dataKey="projected"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={{ r: 5, strokeDasharray: '0' }}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-1 bg-primary rounded" />
          <span className="text-foreground">Weight Trend (so far)</span>
        </div>
        {hasProjection && (
          <div className="flex items-center gap-2">
            <svg width="24" height="6" aria-hidden>
              <line x1="0" y1="3" x2="24" y2="3" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="6 4" />
            </svg>
            <span className="text-foreground">Projected (if trend continues)</span>
          </div>
        )}
        {targetWeight && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-primary border-t-2 border-dashed" />
            <span className="text-foreground">Goal Weight</span>
          </div>
        )}
      </div>
    </div>
  )
}
