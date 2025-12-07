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
 * Check if we're in a secure context (HTTPS or localhost)
 */
function isSecureContext(): boolean {
  return window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost'
}

/**
 * Barcode Scanner Component
 * Uses html5-qrcode library for scanning 1D/2D barcodes
 */
export function BarcodeScanner({ onScan, onClose, isOpen, context = 'meal', title }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown')
  const [cameraSupported, setCameraSupported] = useState(true)
  const [secureContext, setSecureContext] = useState(true)

  useEffect(() => {
    if (!isOpen) {
      stopScanning()
      setShowManualEntry(false)
      setShowFileUpload(false)
      setManualBarcode('')
      return
    }

    // Check secure context
    const isSecure = isSecureContext()
    setSecureContext(isSecure)

    if (!isSecure) {
      setError('Camera access requires HTTPS. Use manual entry or file upload instead.')
      toast.error('Camera requires secure connection (HTTPS)')
      return
    }

    // Set camera support flag
    const cameraAvailable = isCameraSupported()
    setCameraSupported(cameraAvailable)

    if (!cameraAvailable) {
      setError('Camera not available on this device. Use manual entry or file upload instead.')
      toast.error('Camera not available on this device')
      return
    }

    // Start scanner - getUserMedia will prompt for permission
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

      // Get camera list first (better mobile compatibility)
      const devices = await Html5Qrcode.getCameras()

      if (!devices || devices.length === 0) {
        throw new Error('No cameras found on this device')
      }

      // Find back camera (prefer environment facing camera on mobile)
      const backCamera = devices.find(device =>
        device.label?.toLowerCase().includes('back') ||
        device.label?.toLowerCase().includes('environment')
      )

      const cameraId = backCamera?.id || devices[0].id

      console.log('[BarcodeScanner] Starting camera:', {
        totalCameras: devices.length,
        selectedCamera: backCamera?.label || devices[0].label,
        platform: detectPlatform()
      })

      // Start scanning with specific camera ID (better than facingMode on some devices)
      await scannerRef.current.start(
        cameraId,
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
      setPermissionState('granted')
    } catch (err: any) {
      // Log detailed error info for debugging
      console.error('[BarcodeScanner] Scanner error details:', {
        name: err?.name,
        message: err?.message,
        code: err?.code,
        stack: err?.stack,
        platform: detectPlatform(),
        secureContext: isSecureContext(),
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
      } else if (err.name === 'NotFoundError' || err.message?.includes('not found') || err.message?.includes('No cameras')) {
        errorMessage = 'No camera found. Please use photo upload or manual entry below.'
        toastMessage = 'No camera detected on this device'
      } else if (err.name === 'NotReadableError' || err.message?.includes('use')) {
        errorMessage = 'Camera is already in use by another application. Please close other apps using the camera.'
        toastMessage = 'Camera is already in use'
      } else if (err.name === 'NotSupportedError' || err.message?.includes('not support')) {
        errorMessage = 'Camera not supported on this device/browser. Please use photo upload or manual entry.'
        toastMessage = 'Camera not supported'
      } else if (err.message?.includes('secure') || err.message?.includes('https')) {
        errorMessage = 'Camera requires HTTPS connection. Use photo upload or manual entry instead.'
        toastMessage = 'Camera requires secure connection'
      } else {
        errorMessage = err.message || err.toString() || 'Failed to access camera. Please try photo upload or manual entry below.'
        toastMessage = 'Camera unavailable. Try photo upload or manual entry.'
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

  /**
   * Handle file upload for scanning
   * Fallback for devices where camera doesn't work
   */
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      toast.loading('Scanning image...', { id: 'file-scan' })

      // Initialize scanner if needed
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

      // Scan the file
      const result = await scannerRef.current.scanFile(file, false)

      toast.success('Barcode found!', { id: 'file-scan' })
      handleScanSuccess(result)
    } catch (err: any) {
      console.error('[BarcodeScanner] File scan error:', err)
      toast.error('No barcode found in image. Try manual entry instead.', { id: 'file-scan' })
    }
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
      <div className="bg-card rounded-lg shadow-xl max-w-lg w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">
            {getContextTitle()}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Instructions */}
        <p className="text-sm text-muted-foreground mb-4">
          {getContextInstructions()}. The scanner will automatically detect and read it.
        </p>

        {/* Scanner Container */}
        <div className="relative mb-4">
          {/* Scanner View - Always render the div so html5-qrcode can find it */}
          <div
            id="barcode-reader"
            className={`rounded-lg overflow-hidden border-2 border-border ${
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
            <div className="bg-muted rounded-lg p-6">
              <h3 className="font-semibold text-foreground mb-3">Enter Barcode Manually</h3>
              <p className="text-sm text-muted-foreground mb-4">
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
                className="w-full px-4 py-3 border border-border rounded-lg mb-4 text-center text-lg tracking-wider"
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
                  className="px-4 py-3 border border-border text-foreground rounded-lg hover:bg-background transition-colors"
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
        <div className="bg-secondary-light rounded-lg p-4">
          <p className="text-xs text-blue-900">
            <strong>Tips:</strong> Ensure good lighting, hold the barcode steady, and keep it flat. Works with EAN, UPC, QR codes, and more.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 mt-4">
          {/* File Upload (Hidden Input) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Camera not working options */}
          {!isScanning && !showManualEntry && (
            <>
              {/* Upload Photo Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-3 bg-secondary text-white rounded-lg hover:bg-secondary-hover transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Take/Upload Photo
              </button>

              {/* Manual Entry Toggle */}
              <button
                type="button"
                onClick={() => setShowManualEntry(true)}
                className="w-full px-4 py-3 bg-muted text-foreground rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Enter barcode manually
              </button>
            </>
          )}

          {/* Cancel Button */}
          <button
            type="button"
            onClick={handleClose}
            className="w-full px-4 py-3 border border-border text-foreground rounded-lg hover:bg-background transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
