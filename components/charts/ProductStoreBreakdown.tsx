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
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="store" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
          labelStyle={{ color: 'hsl(var(--card-foreground))' }}
          itemStyle={{ color: 'hsl(var(--card-foreground))' }}
        />
        <Bar dataKey="scans" fill="hsl(var(--success))" name="Scans" />
      </BarChart>
    </ResponsiveContainer>
  )
}
