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

const COLORS = [
  'hsl(var(--secondary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--error))',
  'hsl(var(--primary))',
  'hsl(var(--accent))'
]

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
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
          itemStyle={{ color: 'hsl(var(--card-foreground))' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
