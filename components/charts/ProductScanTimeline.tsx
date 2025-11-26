'use client'

import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ScanTimelineData {
  date: string
  count: number
}

interface ProductScanTimelineProps {
  data: ScanTimelineData[]
}

export function ProductScanTimeline({ data }: ProductScanTimelineProps) {
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
        <Line type="monotone" dataKey="count" stroke="hsl(var(--secondary))" strokeWidth={2} name="Scans" />
      </LineChart>
    </ResponsiveContainer>
  )
}
