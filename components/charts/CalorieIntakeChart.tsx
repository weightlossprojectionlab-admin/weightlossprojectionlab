'use client'

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import { CalorieDataPoint } from '@/lib/chart-data-aggregator'
import { useTheme } from '@/hooks/useTheme'

interface CalorieIntakeChartProps {
  data: CalorieDataPoint[]
  loading?: boolean
  /**
   * Forward-looking projection points. When present, rendered as
   * lighter-opacity bars to the right of "Today" — same data-shape
   * as `data` but representing what the user is projected to eat
   * if their recent pattern continues. Caller computes via linear
   * fit on the historical daily totals; the chart just draws.
   */
  projectionData?: CalorieDataPoint[]
}

export function CalorieIntakeChart({ data, loading, projectionData }: CalorieIntakeChartProps) {
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
          <p className="text-foreground font-medium mb-1">No calorie data available</p>
          <p className="text-sm text-muted-foreground">Log meals to track your calorie intake!</p>
        </div>
      </div>
    )
  }

  const hasProjection = (projectionData?.length ?? 0) > 0

  // Merge historical + projection bars. Two dataKeys ("calories"
  // vs "projected") let each segment use its own Bar element with
  // its own styling — recharts skips null values, so each Bar only
  // draws its segment of chartData. Order matters: historical first,
  // projection appended — that places projected bars to the right of
  // the "Today" divider.
  const chartData = [
    ...data.map((point) => ({
      date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      calories: point.calories,
      projected: null as number | null,
      goal: point.goal,
      fullDate: point.date,
      overGoal: point.calories > point.goal,
    })),
    ...(hasProjection ? projectionData! : []).map((point) => ({
      date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      calories: null as number | null,
      projected: point.calories,
      goal: point.goal,
      fullDate: point.date,
      overGoal: point.calories > point.goal,
    })),
  ]
  const todayLabel = chartData[data.length - 1]?.date

  // Calculate average goal (they should all be the same, but just in case)
  const avgGoal = data.length > 0 ? data[0].goal : 2000

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
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
            stroke="hsl(var(--success))"
            strokeDasharray="5 5"
            label={{
              value: `Goal: ${avgGoal} cal`,
              position: 'right',
              fill: 'hsl(var(--success))',
              fontSize: 12
            }}
          />

          {/* "Today" boundary — vertical divider between historical
              bars and projected bars. Only rendered when there's a
              projection to divide from. */}
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

          {/* Historical calorie bars — solid primary. */}
          <Bar
            dataKey="calories"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
            name="Calories"
            isAnimationActive={false}
          />

          {/* Projected calorie bars — same primary but lower opacity
              so they read as "predicted, not measured." Rendered to
              the right of the Today divider. */}
          {hasProjection && (
            <Bar
              dataKey="projected"
              fill="hsl(var(--primary))"
              fillOpacity={0.35}
              radius={[4, 4, 0, 0]}
              name="Projected"
              isAnimationActive={false}
            />
          )}
        </BarChart>
      </ResponsiveContainer>

      {/* Stats summary */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary rounded" />
          <span className="text-foreground">Daily Intake</span>
        </div>
        {hasProjection && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary rounded opacity-35" />
            <span className="text-foreground">Projected (if pattern continues)</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-success border-t-2 border-dashed" />
          <span className="text-foreground">Calorie Goal</span>
        </div>
      </div>
    </div>
  )
}
