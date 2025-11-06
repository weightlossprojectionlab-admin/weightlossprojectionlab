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
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
        <XAxis
          dataKey="date"
          stroke="#9ca3af"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#9ca3af"
          style={{ fontSize: '12px' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: 'none',
            borderRadius: '8px',
            color: '#fff'
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="wasted"
          stroke="#ef4444"
          strokeWidth={2}
          name="Wasted"
        />
        <Line
          type="monotone"
          dataKey="expiring"
          stroke="#f59e0b"
          strokeWidth={2}
          name="Expiring"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
