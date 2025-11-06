'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { PieLabelRenderProps } from 'recharts'

interface CategoryData {
  name: string
  value: number
  color: string
  [key: string]: string | number
}

interface WasteByCategoryPieChartProps {
  data: CategoryData[]
}

export function WasteByCategoryPieChart({ data }: WasteByCategoryPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(props: PieLabelRenderProps) => {
            const name = props.name || ''
            const percent = typeof props.percent === 'number'
              ? props.percent
              : Number(props.percent ?? 0)
            return `${name} ${(percent * 100).toFixed(0)}%`
          }}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}
