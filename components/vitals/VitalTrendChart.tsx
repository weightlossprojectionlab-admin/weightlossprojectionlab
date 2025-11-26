/**
 * VitalTrendChart Component
 * Displays trend chart for vital signs using Recharts
 */

'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { VitalSign, VitalType } from '@/types/medical'
import { isBloodPressureValue, isPulseOximeterValue } from '@/types/medical'

interface VitalTrendChartProps {
  vitals: VitalSign[]
  type: VitalType
  height?: number
}

export function VitalTrendChart({ vitals, type, height = 300 }: VitalTrendChartProps) {
  // Prepare chart data
  const chartData = useMemo(() => {
    return vitals
      .filter(v => v.type === type)
      .reverse() // Chronological order (oldest first)
      .map(vital => {
        const date = new Date(vital.recordedAt)
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

        if (type === 'blood_pressure' && isBloodPressureValue(vital.value)) {
          return {
            date: dateStr,
            systolic: vital.value.systolic,
            diastolic: vital.value.diastolic,
            fullDate: date.toLocaleString()
          }
        } else if (type === 'pulse_oximeter' && isPulseOximeterValue(vital.value)) {
          return {
            date: dateStr,
            spo2: vital.value.spo2,
            pulseRate: vital.value.pulseRate,
            fullDate: date.toLocaleString()
          }
        } else if (typeof vital.value === 'number') {
          return {
            date: dateStr,
            value: vital.value,
            fullDate: date.toLocaleString()
          }
        }
        return null
      })
      .filter(Boolean)
  }, [vitals, type])

  // Get chart config based on vital type
  const getChartConfig = () => {
    switch (type) {
      case 'blood_pressure':
        return {
          lines: [
            { dataKey: 'systolic', stroke: 'hsl(var(--error))', name: 'Systolic' },
            { dataKey: 'diastolic', stroke: 'hsl(var(--secondary))', name: 'Diastolic' }
          ],
          unit: 'mmHg',
          yDomain: [40, 200]
        }
      case 'blood_sugar':
        return {
          lines: [{ dataKey: 'value', stroke: 'hsl(var(--primary))', name: 'Glucose' }],
          unit: 'mg/dL',
          yDomain: [50, 300]
        }
      case 'pulse_oximeter':
        return {
          lines: [
            { dataKey: 'spo2', stroke: 'hsl(var(--success))', name: 'SpO₂ (%)' },
            { dataKey: 'pulseRate', stroke: 'hsl(var(--accent))', name: 'Pulse (bpm)' }
          ],
          unit: 'SpO₂% / bpm',
          yDomain: [0, 120]
        }
      case 'temperature':
        return {
          lines: [{ dataKey: 'value', stroke: 'hsl(var(--warning))', name: 'Temperature' }],
          unit: '°F',
          yDomain: [95, 105]
        }
      case 'weight':
        return {
          lines: [{ dataKey: 'value', stroke: 'hsl(var(--accent))', name: 'Weight' }],
          unit: 'lbs',
          yDomain: undefined // Auto-scale
        }
      default:
        return {
          lines: [{ dataKey: 'value', stroke: 'hsl(var(--primary))', name: 'Value' }],
          unit: '',
          yDomain: undefined
        }
    }
  }

  const config = getChartConfig()

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-background rounded-lg">
        <p className="text-muted-foreground dark:text-muted-foreground">No data to display</p>
      </div>
    )
  }

  return (
    <div className="w-full" style={{ minWidth: 0 }}>
      <ResponsiveContainer width="100%" height={height} minWidth={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
            domain={config.yDomain}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: 'none',
              borderRadius: '8px',
              color: 'hsl(var(--card-foreground))'
            }}
            labelStyle={{ color: 'hsl(var(--card-foreground))' }}
          />
          <Legend />
          {config.lines.map((line, index) => (
            <Line
              key={index}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.stroke}
              strokeWidth={2}
              dot={{ fill: line.stroke, r: 4 }}
              activeDot={{ r: 6 }}
              name={line.name}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
