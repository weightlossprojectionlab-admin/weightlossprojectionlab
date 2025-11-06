'use client'

import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface DailyCaloriesData {
  date: string
  calories: number
}

interface AdminDailyCaloriesChartProps {
  data: DailyCaloriesData[]
  formatDate: (date: string) => string
}

export function AdminDailyCaloriesChart({ data, formatDate }: AdminDailyCaloriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
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
          formatter={(value: any) => [`${value.toLocaleString()} cal`, 'Calories']}
        />
        <Bar dataKey="calories" fill="#F97316" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
