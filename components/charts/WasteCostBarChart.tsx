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
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
        <XAxis
          dataKey="category"
          stroke="#9ca3af"
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => getCategoryMetadata(value).displayName}
        />
        <YAxis
          stroke="#9ca3af"
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: 'none',
            borderRadius: '8px',
            color: '#fff'
          }}
          formatter={(value: ValueType) => {
            const numValue = typeof value === 'number' ? value : 0
            return [`$${numValue.toFixed(2)}`, 'Cost']
          }}
          labelFormatter={(label: NameType) => {
            return getCategoryMetadata(label as ProductCategory).displayName
          }}
        />
        <Bar dataKey="cost" fill="#3b82f6" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
