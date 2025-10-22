'use client'

import { useState, useEffect, useRef } from 'react'
import { formatDuration } from '@/lib/recipe-timer-parser'

interface CookingTimerProps {
  duration: number // Duration in seconds
  onComplete?: () => void
  autoStart?: boolean
  stepText: string
}

export function CookingTimer({ duration, onComplete, autoStart = false, stepText }: CookingTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const [isRunning, setIsRunning] = useState(autoStart)
  const [isCompleted, setIsCompleted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!isRunning || isCompleted) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false)
          setIsCompleted(true)

          // Play notification sound
          if (audioRef.current) {
            audioRef.current.play().catch(err => console.log('Audio play failed:', err))
          }

          // Trigger completion callback
          if (onComplete) {
            onComplete()
          }

          // Show browser notification if permitted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Timer Complete!', {
              body: stepText,
              icon: '/icon-192x192.png',
              tag: 'cooking-timer'
            })
          }

          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, isCompleted, onComplete, stepText])

  const startTimer = () => {
    setIsRunning(true)
  }

  const pauseTimer = () => {
    setIsRunning(false)
  }

  const resetTimer = () => {
    setTimeLeft(duration)
    setIsRunning(false)
    setIsCompleted(false)
  }

  const addTime = (seconds: number) => {
    setTimeLeft(prev => prev + seconds)
  }

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Calculate progress percentage
  const progress = ((duration - timeLeft) / duration) * 100

  // Determine color based on time remaining
  const getTimerColor = () => {
    const percentRemaining = (timeLeft / duration) * 100
    if (percentRemaining <= 10) return 'text-error'
    if (percentRemaining <= 30) return 'text-orange-600'
    return 'text-success'
  }

  return (
    <div className="bg-gradient-to-r from-primary-light to-blue-50 border-2 border-primary rounded-lg p-6">
      {/* Hidden audio element for notification sound */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      <div className="text-center mb-4">
        {/* Timer Display */}
        <div className={`text-5xl font-bold mb-2 ${isCompleted ? 'text-success' : getTimerColor()}`}>
          {isCompleted ? '✓ Done!' : formatDuration(timeLeft)}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2 mb-3">
          <div
            className={`h-2 rounded-full transition-all duration-1000 ${
              isCompleted ? 'bg-success' : 'bg-primary'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        <p className="text-sm text-muted-foreground">{stepText}</p>
      </div>

      {/* Timer Controls */}
      <div className="flex items-center justify-center space-x-2 mb-3">
        {!isCompleted ? (
          <>
            {!isRunning ? (
              <button
                onClick={startTimer}
                className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success-hover transition-colors font-medium flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Start</span>
              </button>
            ) : (
              <button
                onClick={pauseTimer}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Pause</span>
              </button>
            )}

            <button
              onClick={resetTimer}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted-hover transition-colors font-medium"
            >
              Reset
            </button>
          </>
        ) : (
          <button
            onClick={resetTimer}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
          >
            Restart Timer
          </button>
        )}
      </div>

      {/* Quick Add Time Buttons */}
      {!isCompleted && (
        <div className="flex items-center justify-center space-x-2">
          <span className="text-xs text-muted-foreground mr-2">Quick add:</span>
          {[30, 60, 120, 300].map((seconds) => (
            <button
              key={seconds}
              onClick={() => addTime(seconds)}
              className="text-xs px-2 py-1 bg-background border border-border rounded hover:bg-muted transition-colors"
            >
              +{seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
