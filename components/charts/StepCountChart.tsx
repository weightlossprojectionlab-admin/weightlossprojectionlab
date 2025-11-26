'use client'

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import { StepDataPoint } from '@/lib/chart-data-aggregator'
import { useTheme } from '@/hooks/useTheme'

interface StepCountChartProps {
  data: StepDataPoint[]
  loading?: boolean
  isTrackingEnabled?: boolean
  todaysSteps?: number
}

export function StepCountChart({ data, loading, isTrackingEnabled, todaysSteps }: StepCountChartProps) {
  const { resolvedTheme } = useTheme()

  if (loading) {
    return (
      <div className="w-full h-64 bg-muted rounded-lg animate-pulse flex items-center justify-center">
        <p className="text-muted-foreground">Loading chart...</p>
      </div>
    )
  }

  if (data.length === 0) {
    // Tracking disabled - guide user to enable it
    if (isTrackingEnabled === false) {
      return (
        <div className="w-full h-64 bg-background rounded-lg border-2 border-dashed border-border flex items-center justify-center">
          <div className="text-center px-6">
            <div className="text-5xl mb-3">👟</div>
            <p className="text-foreground font-bold mb-2">Step Tracking Not Enabled</p>
            <p className="text-sm text-muted-foreground mb-4">
              Enable automatic step tracking to see your daily activity
            </p>
            <a
              href="/dashboard"
              className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm"
            >
              Go to Dashboard to Enable
            </a>
          </div>
        </div>
      )
    }

    // Tracking enabled but no steps yet - encourage movement
    if (todaysSteps !== undefined && todaysSteps === 0) {
      return (
        <div className="w-full h-64 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border-2 border-green-200 dark:border-green-800 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="text-5xl mb-3">🚶</div>
            <p className="text-foreground font-bold mb-2">Start Moving!</p>
            <p className="text-sm text-muted-foreground mb-2">
              Tracking is active. Walk around to see your steps counted!
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full text-xs font-medium text-success-dark dark:text-green-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success-light0"></span>
              </span>
              Tracking Active
            </div>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-3">
              Steps save automatically after 100 steps or 5 minutes
            </p>
          </div>
        </div>
      )
    }

    // Tracking enabled, has some steps, but not saved to history yet
    if (todaysSteps !== undefined && todaysSteps > 0) {
      return (
        <div className="w-full h-64 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border-2 border-primary-light flex items-center justify-center">
          <div className="text-center px-6">
            <div className="text-5xl mb-3">⏳</div>
            <p className="text-foreground font-bold mb-2">Building Your History...</p>
            <p className="text-sm text-muted-foreground mb-3">
              You have <span className="font-bold text-primary">{todaysSteps} steps</span> today!
            </p>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground">
              Keep walking! Your step history will appear here after reaching 100 steps or 5 minutes.
            </p>
          </div>
        </div>
      )
    }

    // Default fallback (tracking status unknown)
    return (
      <div className="w-full h-64 bg-background rounded-lg border-2 border-dashed border-border flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-5xl mb-3">📊</div>
          <p className="text-foreground font-medium mb-1">No Step Data Yet</p>
          <p className="text-sm text-muted-foreground">Start tracking steps to see your activity!</p>
        </div>
      </div>
    )
  }

  // Format data for Recharts
  const chartData = data.map(point => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    steps: point.steps,
    goal: point.goal,
    fullDate: point.date,
    metGoal: point.steps >= point.goal
  }))

  // Calculate average goal
  const avgGoal = data.length > 0 ? data[0].goal : 10000

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
              if (name === 'steps') return [`${value.toLocaleString()} steps`, 'Daily Steps']
              if (name === 'goal') return [`${value.toLocaleString()} steps`, 'Goal']
              return [value, name]
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
            formatter={(value) => {
              if (value === 'steps') return 'Daily Steps'
              if (value === 'goal') return 'Goal'
              return value
            }}
          />
          <ReferenceLine
            y={avgGoal}
            stroke="hsl(var(--success))"
            strokeDasharray="3 3"
          />
          <Bar
            dataKey="steps"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="goal"
            fill="transparent"
            stroke="hsl(var(--success))"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Total Steps</p>
          <p className="text-lg font-semibold text-foreground">
            {data.reduce((sum, d) => sum + d.steps, 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Daily Average</p>
          <p className="text-lg font-semibold text-foreground">
            {Math.round(data.reduce((sum, d) => sum + d.steps, 0) / data.length).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Days Met Goal</p>
          <p className="text-lg font-semibold text-foreground">
            {data.filter(d => d.steps >= d.goal).length} / {data.length}
          </p>
        </div>
      </div>
    </div>
  )
}
