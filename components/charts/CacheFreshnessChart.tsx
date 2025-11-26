'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface FreshnessData {
  name: string
  value: number
  [key: string]: string | number
}

interface CacheFreshnessChartProps {
  data: FreshnessData[]
}

const COLORS = [
  'hsl(var(--success))',
  'hsl(var(--secondary))',
  'hsl(var(--warning))',
  'hsl(var(--error))',
  'hsl(var(--primary))'
]

export function CacheFreshnessChart({ data }: CacheFreshnessChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={(entry) => `${entry.name}: ${entry.value}`}
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
