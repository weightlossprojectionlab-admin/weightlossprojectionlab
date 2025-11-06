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
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="date"
          stroke="#9ca3af"
          tick={{ fill: '#9ca3af' }}
          tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        />
        <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
          labelStyle={{ color: '#f3f4f6' }}
          itemStyle={{ color: '#f3f4f6' }}
        />
        <Legend wrapperStyle={{ color: '#9ca3af' }} />
        <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} name="Scans" />
      </LineChart>
    </ResponsiveContainer>
  )
}
