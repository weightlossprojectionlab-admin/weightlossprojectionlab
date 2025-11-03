'use client'

/**
 * Expiration Scanner Component
 *
 * Uses Tesseract.js OCR to scan expiration dates from product packaging
 * Features:
 * - Camera capture or image upload
 * - Smart date detection (MM/DD/YYYY, DD/MM/YYYY, expiry text patterns)
 * - Real-time OCR processing with progress feedback
 * - Manual correction UI
 */

import { useState, useRef, useCallback } from 'react'
import { createWorker, Worker, LoggerMessage } from 'tesseract.js'
import { CameraIcon, XMarkIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface ExpirationScannerProps {
  isOpen: boolean
  onClose: () => void
  onDateDetected: (date: Date) => void
  productName?: string
}

interface DetectedDate {
  date: Date
  confidence: 'high' | 'medium' | 'low'
  rawText: string
}

interface DatePattern {
  regex: RegExp
  formatter: (match: RegExpMatchArray) => Date
  confidence: 'high' | 'medium' | 'low'
}

export function ExpirationScanner({
  isOpen,
  onClose,
  onDateDetected,
  productName = 'product'
}: ExpirationScannerProps) {
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [detectedDates, setDetectedDates] = useState<DetectedDate[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [ocrText, setOcrText] = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  /**
   * Parse potential expiration date from text
   */
  const parseExpirationDate = (text: string): DetectedDate[] => {
    const dates: DetectedDate[] = []
    const now = new Date()

    // Common date patterns
    const patterns: DatePattern[] = [
      // MM/DD/YYYY, MM-DD-YYYY, MM.DD.YYYY
      {
        regex: /\b(0?[1-9]|1[0-2])[\/\-.](0?[1-9]|[12][0-9]|3[01])[\/\-.](\d{4}|\d{2})\b/g,
        formatter: (match: RegExpMatchArray) => {
          const month = parseInt(match[1], 10)
          const day = parseInt(match[2], 10)
          let year = parseInt(match[3], 10)
          if (year < 100) year += 2000
          return new Date(year, month - 1, day)
        },
        confidence: 'high'
      },
      // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (European format)
      {
        regex: /\b(0?[1-9]|[12][0-9]|3[01])[\/\-.](0?[1-9]|1[0-2])[\/\-.](\d{4}|\d{2})\b/g,
        formatter: (match: RegExpMatchArray) => {
          const day = parseInt(match[1], 10)
          const month = parseInt(match[2], 10)
          let year = parseInt(match[3], 10)
          if (year < 100) year += 2000
          return new Date(year, month - 1, day)
        },
        confidence: 'medium'
      },
      // YYYY-MM-DD, YYYY/MM/DD (ISO format)
      {
        regex: /\b(\d{4})[\/-](0?[1-9]|1[0-2])[\/-](0?[1-9]|[12][0-9]|3[01])\b/g,
        formatter: (match: RegExpMatchArray) => {
          const year = parseInt(match[1], 10)
          const month = parseInt(match[2], 10)
          const day = parseInt(match[3], 10)
          return new Date(year, month - 1, day)
        },
        confidence: 'high'
      },
      // MM/YYYY, MM-YYYY (month/year only - assume last day of month)
      {
        regex: /\b(0?[1-9]|1[0-2])[\/-](\d{4})\b/g,
        formatter: (match: RegExpMatchArray) => {
          const month = parseInt(match[1], 10)
          const year = parseInt(match[2], 10)
          // Last day of the month
          return new Date(year, month, 0)
        },
        confidence: 'low'
      },
      // Text patterns: "EXP 01/15/2025", "USE BY 01-15-2025", "BEST BEFORE 01.15.2025"
      {
        regex: /(?:exp|expir|use by|best before|sell by)[\s:]*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/gi,
        formatter: (match: RegExpMatchArray) => {
          const datePart = match[1]
          const parts = datePart.split(/[\/\-.]/)
          const month = parseInt(parts[0], 10)
          const day = parseInt(parts[1], 10)
          let year = parseInt(parts[2], 10)
          if (year < 100) year += 2000
          return new Date(year, month - 1, day)
        },
        confidence: 'high'
      }
    ]

    patterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern.regex))
      matches.forEach(match => {
        try {
          const date = pattern.formatter(match)
          // Only include dates in the future and within 5 years
          if (date > now && date < new Date(now.getFullYear() + 5, now.getMonth(), now.getDate())) {
            dates.push({
              date,
              confidence: pattern.confidence,
              rawText: match[0]
            })
          }
        } catch (error) {
          // Invalid date, skip
        }
      })
    })

    // Sort by confidence and date
    return dates.sort((a, b) => {
      const confScore = { high: 3, medium: 2, low: 1 }
      if (confScore[a.confidence] !== confScore[b.confidence]) {
        return confScore[b.confidence] - confScore[a.confidence]
      }
      return a.date.getTime() - b.date.getTime()
    })
  }

  /**
   * Process image with OCR
   */
  const processImage = async (imageSrc: string) => {
    setProcessing(true)
    setProgress(0)
    setOcrText('')
    setDetectedDates([])

    let worker: Worker | null = null

    try {
      worker = await createWorker('eng', 1, {
        logger: (m: LoggerMessage) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            setProgress(Math.round(m.progress * 100))
          }
        }
      })

      const { data: { text } } = await worker.recognize(imageSrc)
      setOcrText(text)

      // Parse dates from OCR text
      const dates = parseExpirationDate(text)
      setDetectedDates(dates)

      if (dates.length > 0) {
        setSelectedDate(dates[0].date)
        toast.success(`Found ${dates.length} potential expiration date${dates.length > 1 ? 's' : ''}`)
      } else {
        toast.error('No expiration date found. Try another angle or enter manually.')
      }
    } catch (error) {
      console.error('[ExpirationScanner] OCR error:', error)
      toast.error('Failed to process image')
    } finally {
      if (worker) {
        await worker.terminate()
      }
      setProcessing(false)
      setProgress(0)
    }
  }

  /**
   * Capture photo from camera
   */
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to data URL
    const imageSrc = canvas.toDataURL('image/jpeg', 0.95)
    setCapturedImage(imageSrc)

    // Stop camera stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }

    // Process the captured image
    processImage(imageSrc)
  }, [stream])

  /**
   * Start camera
   */
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        setStream(mediaStream)
      }
    } catch (error) {
      console.error('[ExpirationScanner] Camera error:', error)
      toast.error('Failed to access camera. Please allow camera permissions.')
    }
  }

  /**
   * Handle file upload
   */
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageSrc = e.target?.result as string
      setCapturedImage(imageSrc)
      processImage(imageSrc)
    }
    reader.readAsDataURL(file)
  }

  /**
   * Confirm selected date
   */
  const handleConfirm = () => {
    if (!selectedDate) return
    onDateDetected(selectedDate)
    handleClose()
  }

  /**
   * Reset and try again
   */
  const handleRetry = () => {
    setCapturedImage(null)
    setDetectedDates([])
    setSelectedDate(null)
    setOcrText('')
    if (!stream) {
      startCamera()
    }
  }

  /**
   * Close modal and cleanup
   */
  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setCapturedImage(null)
    setDetectedDates([])
    setSelectedDate(null)
    setOcrText('')
    setProcessing(false)
    onClose()
  }

  // Auto-start camera when modal opens
  if (isOpen && !capturedImage && !stream && videoRef.current) {
    startCamera()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Scan Expiration Date
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {!capturedImage ? (
            <>
              {/* Camera View */}
              <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '4/3' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-white/50 rounded-lg w-4/5 h-2/3 flex items-center justify-center">
                    <p className="text-white text-center px-4 bg-black/50 rounded-lg py-2">
                      Position expiration date within frame
                    </p>
                  </div>
                </div>
              </div>

              {/* Capture Button */}
              <button
                onClick={capturePhoto}
                disabled={!stream}
                className="w-full bg-primary text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CameraIcon className="h-5 w-5" />
                Capture Photo
              </button>

              {/* File Upload Option */}
              <div className="mt-3 text-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Or upload an image instead
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </>
          ) : (
            <>
              {/* Captured Image */}
              <div className="mb-4">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full rounded-lg"
                />
              </div>

              {/* Processing Progress */}
              {processing && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Processing image...
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Detected Dates */}
              {!processing && detectedDates.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Detected Dates
                  </h3>
                  <div className="space-y-2">
                    {detectedDates.map((detected, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedDate(detected.date)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                          selectedDate?.getTime() === detected.date.getTime()
                            ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {detected.date.toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              From: "{detected.rawText}" • Confidence: {detected.confidence}
                            </div>
                          </div>
                          {selectedDate?.getTime() === detected.date.getTime() && (
                            <CheckIcon className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No Dates Found */}
              {!processing && detectedDates.length === 0 && (
                <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    No expiration date detected. Try another photo or enter the date manually.
                  </p>
                </div>
              )}

              {/* OCR Debug Text (collapsible) */}
              {ocrText && (
                <details className="mb-4">
                  <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-white">
                    View raw OCR text
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-32">
                    {ocrText}
                  </pre>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleRetry}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  Try Again
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!selectedDate || processing}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckIcon className="h-5 w-5" />
                  Confirm
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
