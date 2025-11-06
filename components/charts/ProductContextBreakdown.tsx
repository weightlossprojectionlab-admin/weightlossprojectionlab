'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface ContextBreakdownData {
  context: string
  count: number
  [key: string]: string | number
}

interface ProductContextBreakdownProps {
  data: ContextBreakdownData[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function ProductContextBreakdown({ data }: ProductContextBreakdownProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="context"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={(entry) => `${entry.context}: ${entry.count}`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
          itemStyle={{ color: '#f3f4f6' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
