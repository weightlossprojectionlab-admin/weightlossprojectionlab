/**
 * Step Detection Demo Component
 *
 * Visual demonstration of step detection algorithm
 * Shows real-time magnitude graph and peak detection
 *
 * Usage: Import and use in development/testing
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useStepCounter } from '@/hooks/useStepCounter'
import { calculateMagnitude } from './algorithm'
import type { AccelerometerData } from './types'

interface MagnitudePoint {
  timestamp: number
  magnitude: number
  isPeak: boolean
}

export function StepDetectionDemo() {
  const {
    stepCount,
    isActive,
    sensorStatus,
    startCounting,
    stopCounting,
    resetCount
  } = useStepCounter()

  const [magnitudeHistory, setMagnitudeHistory] = useState<MagnitudePoint[]>([])
  const [currentMagnitude, setCurrentMagnitude] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Collect magnitude data for visualization
  useEffect(() => {
    if (!isActive) return

    let lastPeakTime = 0
    const PEAK_COOLDOWN = 300 // ms

    const handleMotion = (event: DeviceMotionEvent) => {
      const accel = event.accelerationIncludingGravity
      if (!accel || accel.x === null || accel.y === null || accel.z === null) return

      const data: AccelerometerData = {
        x: accel.x,
        y: accel.y,
        z: accel.z,
        timestamp: Date.now()
      }

      const magnitude = calculateMagnitude(data)
      setCurrentMagnitude(magnitude)

      // Detect if this is likely a peak (simple threshold check)
      const now = Date.now()
      const isPeak = magnitude > 1.2 && (now - lastPeakTime) > PEAK_COOLDOWN

      if (isPeak) {
        lastPeakTime = now
      }

      setMagnitudeHistory(prev => {
        const newHistory = [
          ...prev,
          { timestamp: data.timestamp, magnitude, isPeak }
        ]

        // Keep last 100 points (about 6-7 seconds at 15 Hz)
        return newHistory.slice(-100)
      })
    }

    window.addEventListener('devicemotion', handleMotion)

    return () => {
      window.removeEventListener('devicemotion', handleMotion)
    }
  }, [isActive])

  // Draw magnitude graph
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || magnitudeHistory.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.fillStyle = '#f9fafb'
    ctx.fillRect(0, 0, width, height)

    // Draw grid
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1

    // Horizontal grid lines (magnitude levels)
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * height
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Find min/max for scaling
    const magnitudes = magnitudeHistory.map(p => p.magnitude)
    const minMag = Math.min(...magnitudes)
    const maxMag = Math.max(...magnitudes)
    const range = maxMag - minMag || 1

    // Draw magnitude line
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.beginPath()

    magnitudeHistory.forEach((point, index) => {
      const x = (index / (magnitudeHistory.length - 1)) * width
      const normalizedMag = (point.magnitude - minMag) / range
      const y = height - (normalizedMag * height * 0.8) - (height * 0.1)

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Draw peaks
    ctx.fillStyle = '#ef4444'
    magnitudeHistory.forEach((point, index) => {
      if (point.isPeak) {
        const x = (index / (magnitudeHistory.length - 1)) * width
        const normalizedMag = (point.magnitude - minMag) / range
        const y = height - (normalizedMag * height * 0.8) - (height * 0.1)

        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fill()
      }
    })

    // Draw threshold line
    const thresholdMag = 1.2
    const normalizedThreshold = (thresholdMag - minMag) / range
    const thresholdY = height - (normalizedThreshold * height * 0.8) - (height * 0.1)

    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(0, thresholdY)
    ctx.lineTo(width, thresholdY)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw labels
    ctx.fillStyle = '#374151'
    ctx.font = '12px system-ui'
    ctx.fillText(`Max: ${maxMag.toFixed(2)}g`, 10, 20)
    ctx.fillText(`Min: ${minMag.toFixed(2)}g`, 10, height - 10)
    ctx.fillText(`Current: ${currentMagnitude.toFixed(2)}g`, width - 120, 20)
  }, [magnitudeHistory, currentMagnitude])

  return (
    <div className="bg-background rounded-lg p-6 shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-foreground mb-4">
        Step Detection Demo
      </h2>

      {/* Status */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-secondary-light rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-900">{stepCount}</div>
          <div className="text-sm text-blue-700">Steps Detected</div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-3xl font-bold text-purple-900">
            {currentMagnitude.toFixed(2)}g
          </div>
          <div className="text-sm text-primary-dark">Current Magnitude</div>
        </div>

        <div className="bg-success-light rounded-lg p-4">
          <div className="text-3xl font-bold text-green-900">
            {magnitudeHistory.filter(p => p.isPeak).length}
          </div>
          <div className="text-sm text-success-dark">Peaks Detected</div>
        </div>
      </div>

      {/* Graph */}
      <div className="bg-background rounded-lg p-4 mb-4">
        <h3 className="text-sm font-medium text-foreground mb-2">
          Acceleration Magnitude (Real-time)
        </h3>
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full border border-border rounded"
        />
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>← Past (7 seconds)</span>
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <span className="w-4 h-0.5 bg-secondary mr-1"></span>
              Magnitude
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 bg-error rounded-full mr-1"></span>
              Peak
            </span>
            <span className="flex items-center">
              <span className="w-4 h-0.5 border-t border-dashed border-success mr-1"></span>
              Threshold
            </span>
          </div>
          <span>Now →</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={isActive ? stopCounting : startCounting}
          className={`flex-1 py-3 px-4 rounded-lg font-medium ${
            isActive
              ? 'bg-error hover:bg-red-700 text-white'
              : 'bg-secondary hover:bg-secondary-hover text-white'
          }`}
        >
          {isActive ? '⏸️ Stop' : '▶️ Start'}
        </button>

        <button
          onClick={() => {
            resetCount()
            setMagnitudeHistory([])
          }}
          className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-foreground rounded-lg font-medium"
        >
          🔄 Reset
        </button>
      </div>

      {/* Sensor Info */}
      {sensorStatus && (
        <div className="mt-4 p-3 bg-background rounded text-sm text-foreground">
          <strong>Sensor Status:</strong>{' '}
          {sensorStatus.isAvailable ? '✅ Available' : '❌ Not Available'} |{' '}
          <strong>Sample Rate:</strong> {sensorStatus.sampleRate} Hz |{' '}
          <strong>Permission:</strong>{' '}
          {sensorStatus.needsPermission
            ? sensorStatus.hasPermission
              ? '✅ Granted'
              : '⚠️ Required'
            : '➖ Not Required'}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 p-4 bg-secondary-light border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">How to Use:</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Click "Start" to begin detecting steps</li>
          <li>Walk normally while holding your device</li>
          <li>Watch the graph show acceleration magnitude</li>
          <li>Red dots indicate detected step peaks</li>
          <li>Green dashed line shows the detection threshold</li>
        </ol>
      </div>

      {/* Algorithm Info */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-foreground">
          Algorithm Details
        </summary>
        <div className="mt-2 p-4 bg-background rounded text-sm text-foreground space-y-2">
          <p>
            <strong>Peak Detection:</strong> Local maxima above 1.2g threshold
          </p>
          <p>
            <strong>Smoothing:</strong> 3-sample moving average filter
          </p>
          <p>
            <strong>Step Interval:</strong> 300-800ms (75-200 steps/min)
          </p>
          <p>
            <strong>Magnitude Delta:</strong> Minimum 0.15g peak prominence
          </p>
          <p>
            <strong>Sample Rate:</strong> 15 Hz (throttled from ~60 Hz)
          </p>
        </div>
      </details>
    </div>
  )
}
