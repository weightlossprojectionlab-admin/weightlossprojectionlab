'use client'

import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface TrendData {
  date: string
  wasted: number
  expiring: number
}

interface ExpirationTrendChartProps {
  data: TrendData[]
}

export function ExpirationTrendChart({ data }: ExpirationTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
        <XAxis
          dataKey="date"
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: '12px' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: 'none',
            borderRadius: '8px',
            color: 'hsl(var(--card-foreground))'
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="wasted"
          stroke="hsl(var(--error))"
          strokeWidth={2}
          name="Wasted"
        />
        <Line
          type="monotone"
          dataKey="expiring"
          stroke="hsl(var(--warning))"
          strokeWidth={2}
          name="Expiring"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
