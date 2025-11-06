'use client'

import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface StoreBreakdownData {
  store: string
  scans: number
}

interface ProductStoreBreakdownProps {
  data: StoreBreakdownData[]
}

export function ProductStoreBreakdown({ data }: ProductStoreBreakdownProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="store" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
        <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
          labelStyle={{ color: '#f3f4f6' }}
          itemStyle={{ color: '#f3f4f6' }}
        />
        <Bar dataKey="scans" fill="#10b981" name="Scans" />
      </BarChart>
    </ResponsiveContainer>
  )
}
