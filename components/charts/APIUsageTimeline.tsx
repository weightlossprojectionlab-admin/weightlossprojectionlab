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
        <Line type="monotone" dataKey="cache" stroke="#10b981" strokeWidth={2} name="Cache Hits" />
        <Line type="monotone" dataKey="api" stroke="#ef4444" strokeWidth={2} name="API Calls" />
        <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="Total" />
      </LineChart>
    </ResponsiveContainer>
  )
}
