'use client'

import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface TimelineData {
  date: string
  cache: number
  api: number
  total: number
  cacheHitRate: string
}

interface APIUsageTimelineProps {
  data: TimelineData[]
}

export function APIUsageTimeline({ data }: APIUsageTimelineProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          stroke="hsl(var(--muted-foreground))"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        />
        <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
          labelStyle={{ color: 'hsl(var(--card-foreground))' }}
          itemStyle={{ color: 'hsl(var(--card-foreground))' }}
        />
        <Legend wrapperStyle={{ color: 'hsl(var(--muted-foreground))' }} />
        <Line type="monotone" dataKey="cache" stroke="hsl(var(--success))" strokeWidth={2} name="Cache Hits" />
        <Line type="monotone" dataKey="api" stroke="hsl(var(--error))" strokeWidth={2} name="API Calls" />
        <Line type="monotone" dataKey="total" stroke="hsl(var(--secondary))" strokeWidth={2} name="Total" />
      </LineChart>
    </ResponsiveContainer>
  )
}
