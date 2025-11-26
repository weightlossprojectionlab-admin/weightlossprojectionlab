'use client'

import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface WeightLogData {
  date: string
  weight: number
  unit?: string
}

interface AdminWeightLogsChartProps {
  data: WeightLogData[]
  formatDate: (date: string) => string
}

export function AdminWeightLogsChart({ data, formatDate }: AdminWeightLogsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.1} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: '12px' }}
          domain={['dataMin - 2', 'dataMax + 2']}
        />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: 'none', borderRadius: '8px' }}
          labelFormatter={formatDate}
          formatter={(value: any) => [`${value.toFixed(1)} ${data[0]?.unit || 'kg'}`, 'Weight']}
        />
        <Line type="monotone" dataKey="weight" stroke="hsl(var(--secondary))" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
