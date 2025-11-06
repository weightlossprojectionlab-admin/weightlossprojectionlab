'use client'

import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface StepLogData {
  date: string
  steps: number
}

interface AdminStepLogsChartProps {
  data: StepLogData[]
  formatDate: (date: string) => string
}

export function AdminStepLogsChart({ data, formatDate }: AdminStepLogsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          stroke="#6B7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#6B7280"
          style={{ fontSize: '12px' }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
          labelFormatter={formatDate}
          formatter={(value: any) => [`${value.toLocaleString()} steps`, 'Steps']}
        />
        <Line type="monotone" dataKey="steps" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
