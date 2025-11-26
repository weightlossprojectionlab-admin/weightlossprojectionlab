'use client'

import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'
import type { ProductCategory } from '@/types/shopping'
import { getCategoryMetadata } from '@/lib/product-categories'

interface WasteCostData {
  category: ProductCategory
  count: number
  cost: number
}

interface WasteCostBarChartProps {
  data: WasteCostData[]
}

export function WasteCostBarChart({ data }: WasteCostBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data.slice(0, 8)}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
        <XAxis
          dataKey="category"
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => getCategoryMetadata(value).displayName}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: 'none',
            borderRadius: '8px',
            color: 'hsl(var(--card-foreground))'
          }}
          formatter={(value: ValueType) => {
            const numValue = typeof value === 'number' ? value : 0
            return [`$${numValue.toFixed(2)}`, 'Cost']
          }}
          labelFormatter={(label: NameType) => {
            return getCategoryMetadata(label as ProductCategory).displayName
          }}
        />
        <Bar dataKey="cost" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
