'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

export interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
  isOpen: boolean
  context?: 'meal' | 'purchase' | 'consume' | 'inventory' // Scan purpose
  title?: string // Override default title
}

/**
 * Check if camera API is supported
 */
function isCameraSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

/**
 * Detect user's platform for better error messages
 */
function detectPlatform(): 'ios' | 'android' | 'desktop' {
  const userAgent = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios'
  if (/android/.test(userAgent)) return 'android'
  return 'desktop'
}

/**
 * Barcode Scanner Component
 * Uses html5-qrcode library for scanning 1D/2D barcodes
 */
export function BarcodeScanner({ onScan, onClose, isOpen, context = 'meal', title }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown')
  const [cameraSupported, setCameraSupported] = useState(true)

  useEffect(() => {
    if (!isOpen) {
      stopScanning()
      setShowManualEntry(false)
      setManualBarcode('')
      return
    }

    // Set camera support flag (for UI purposes only, don't block)
    setCameraSupported(isCameraSupported())

    // Start scanner directly - getUserMedia will prompt for permission
    // iOS Safari doesn't support navigator.permissions.query for camera
    startScanning()

    return () => {
      stopScanning()
    }
  }, [isOpen])

  /**
   * Show platform-specific permission error
   */
  const showPermissionError = () => {
    const platform = detectPlatform()
    let errorMessage = ''

    if (platform === 'ios') {
      errorMessage = 'Camera access denied. In iOS Settings, go to Safari > Camera and select "Allow". Then refresh this page.'
    } else if (platform === 'android') {
      errorMessage = 'Camera access denied. In Chrome, tap the lock icon in the address bar > Permissions > Camera > Allow.'
    } else {
      errorMessage = 'Camera access denied. Click the camera icon in your browser\'s address bar to enable camera access.'
    }

    setError(errorMessage)
    toast.error('Camera permission denied', { duration: 5000 })
  }

  const startScanning = async () => {
    try {
      setError(null)

      // Initialize scanner
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('barcode-reader', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE
          ],
          verbose: false
        })
      }

      // Start scanning
      await scannerRef.current.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          // Success callback
          handleScanSuccess(decodedText)
        },
        (errorMessage) => {
          // Error callback (fires frequently, ignore)
          // Only log actual errors, not "No code found"
        }
      )

      setIsScanning(true)
    } catch (err: any) {
      // Log detailed error info for debugging
      console.error('Scanner error details:', {
        name: err?.name,
        message: err?.message,
        code: err?.code,
        stack: err?.stack,
        fullError: err
      })
      logger.error('Failed to start scanner', err as Error)

      // Provide user-friendly error messages based on error type
      let errorMessage = 'Failed to access camera'
      let toastMessage = 'Camera access failed'

      if (err.name === 'NotAllowedError' || err.message?.includes('Permission') || err.message?.includes('permission')) {
        setPermissionState('denied')
        showPermissionError()
        return
      } else if (err.name === 'NotFoundError' || err.message?.includes('not found')) {
        errorMessage = 'No camera found. Please use manual entry below or try a different device.'
        toastMessage = 'No camera detected on this device'
      } else if (err.name === 'NotReadableError' || err.message?.includes('use')) {
        errorMessage = 'Camera is already in use by another application. Please close other apps using the camera.'
        toastMessage = 'Camera is already in use'
      } else if (err.name === 'NotSupportedError' || err.message?.includes('not support')) {
        errorMessage = 'Camera not supported on this device/browser. Please use manual entry.'
        toastMessage = 'Camera not supported'
      } else {
        errorMessage = err.message || err.toString() || 'Failed to access camera. Please try manual entry below.'
        toastMessage = err.message || 'Failed to access camera. Try manual entry.'
      }

      setError(errorMessage)
      toast.error(toastMessage, { duration: 5000 })
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        // Check if scanner is actually running before stopping
        const state = scannerRef.current.getState()
        if (state === 2 || state === 3) { // 2 = SCANNING, 3 = PAUSED
          await scannerRef.current.stop()
          scannerRef.current.clear()
        }
      } catch (err) {
        // Ignore errors when stopping - scanner might already be stopped
      }
      setIsScanning(false)
    }
  }

  const handleScanSuccess = (barcode: string) => {
    // Vibrate on success (if supported)
    if (navigator.vibrate) {
      navigator.vibrate(200)
    }

    // Play success sound
    const audio = new Audio('/sounds/beep.mp3')
    audio.play().catch(() => {
      // Ignore audio errors
    })

    toast.success(`Scanned: ${barcode}`)
    onScan(barcode)

    // Stop scanning after successful scan
    stopScanning()
    onClose()
  }

  const handleClose = () => {
    stopScanning()
    onClose()
  }

  /**
   * Handle manual barcode entry
   */
  const handleManualSubmit = () => {
    if (!manualBarcode.trim()) {
      toast.error('Please enter a barcode')
      return
    }

    // Validate barcode (should be numeric and reasonable length)
    if (!/^\d{8,14}$/.test(manualBarcode.trim())) {
      toast.error('Invalid barcode format. Should be 8-14 digits.')
      return
    }

    toast.success(`Entered: ${manualBarcode}`)
    onScan(manualBarcode.trim())
    setManualBarcode('')
    setShowManualEntry(false)
    onClose()
  }


  // Get context-specific messaging
  const getContextTitle = () => {
    if (title) return title
    switch (context) {
      case 'meal':
        return 'Scan Food Barcode'
      case 'purchase':
        return 'Scan Item'
      case 'consume':
        return 'Scan Used Item'
      case 'inventory':
        return 'Scan Inventory Item'
      default:
        return 'Scan Barcode'
    }
  }

  const getContextInstructions = () => {
    switch (context) {
      case 'meal':
        return 'Scan a product barcode to log it as a meal'
      case 'purchase':
        return 'Position the barcode within the frame to start scanning'
      case 'consume':
        return 'Scan items you finished or threw away'
      case 'inventory':
        return 'Scan items to add to your kitchen inventory'
      default:
        return 'Position the barcode within the frame'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {getContextTitle()}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Instructions */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {getContextInstructions()}. The scanner will automatically detect and read it.
        </p>

        {/* Scanner Container */}
        <div className="relative mb-4">
          {/* Scanner View - Always render the div so html5-qrcode can find it */}
          <div
            id="barcode-reader"
            className={`rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-700 ${
              showManualEntry ? 'hidden' : ''
            }`}
          ></div>

          {/* Overlay instructions */}
          {isScanning && !showManualEntry && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-white bg-black/50 px-4 py-2 rounded-lg">
                <p className="text-sm font-medium">Scanning...</p>
              </div>
            </div>
          )}

          {/* Manual Entry Form */}
          {showManualEntry && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Enter Barcode Manually</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Type the barcode number (usually found below the barcode)
              </p>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value.replace(/\D/g, ''))}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                placeholder="e.g. 012345678912"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg mb-4 text-center text-lg tracking-wider"
                autoFocus
              />
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleManualSubmit}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualEntry(false)}
                  className="px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-error-light dark:bg-red-900/20 border border-error dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-error-dark dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Tips */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <p className="text-xs text-blue-900 dark:text-blue-200">
            <strong>Tips:</strong> Ensure good lighting, hold the barcode steady, and keep it flat. Works with EAN, UPC, QR codes, and more.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Manual Entry Toggle */}
          {!showManualEntry && cameraSupported && (
            <button
              type="button"
              onClick={() => setShowManualEntry(true)}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Can't scan? Enter barcode manually
            </button>
          )}

          {/* Cancel Button */}
          <button
            type="button"
            onClick={handleClose}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
