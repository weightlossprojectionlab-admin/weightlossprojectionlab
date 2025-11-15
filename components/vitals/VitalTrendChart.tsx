/**
 * VitalTrendChart Component
 * Displays trend chart for vital signs using Recharts
 */

'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { VitalSign, VitalType } from '@/types/medical'
import { isBloodPressureValue } from '@/types/medical'

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
            { dataKey: 'systolic', stroke: '#ef4444', name: 'Systolic' },
            { dataKey: 'diastolic', stroke: '#3b82f6', name: 'Diastolic' }
          ],
          unit: 'mmHg',
          yDomain: [40, 200]
        }
      case 'blood_sugar':
        return {
          lines: [{ dataKey: 'value', stroke: '#8b5cf6', name: 'Glucose' }],
          unit: 'mg/dL',
          yDomain: [50, 300]
        }
      case 'heart_rate':
        return {
          lines: [{ dataKey: 'value', stroke: '#ec4899', name: 'Heart Rate' }],
          unit: 'bpm',
          yDomain: [40, 200]
        }
      case 'blood_oxygen':
        return {
          lines: [{ dataKey: 'value', stroke: '#10b981', name: 'O₂ Saturation' }],
          unit: '%',
          yDomain: [85, 100]
        }
      case 'temperature':
        return {
          lines: [{ dataKey: 'value', stroke: '#f59e0b', name: 'Temperature' }],
          unit: '°F',
          yDomain: [95, 105]
        }
      case 'weight':
        return {
          lines: [{ dataKey: 'value', stroke: '#6366f1', name: 'Weight' }],
          unit: 'lbs',
          yDomain: undefined // Auto-scale
        }
      default:
        return {
          lines: [{ dataKey: 'value', stroke: '#8b5cf6', name: 'Value' }],
          unit: '',
          yDomain: undefined
        }
    }
  }

  const config = getChartConfig()

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">No data to display</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
          <XAxis
            dataKey="date"
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            domain={config.yDomain}
            label={{ value: config.unit, angle: -90, position: 'insideLeft', style: { fill: '#9ca3af' } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: 'none',
              borderRadius: '8px',
              color: '#f3f4f6'
            }}
            labelStyle={{ color: '#f3f4f6' }}
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
