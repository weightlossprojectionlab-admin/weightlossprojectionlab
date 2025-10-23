'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import toast from 'react-hot-toast'

export interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
  isOpen: boolean
}

/**
 * Barcode Scanner Component
 * Uses html5-qrcode library for scanning 1D/2D barcodes
 */
export function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      stopScanning()
      return
    }

    startScanning()

    return () => {
      stopScanning()
    }
  }, [isOpen])

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
      console.error('Failed to start scanner:', err)
      setError(err.message || 'Failed to access camera')
      toast.error('Failed to access camera. Please check permissions.')
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (err) {
        console.error('Failed to stop scanner:', err)
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Scan Barcode
          </h2>
          <button
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
          Position the barcode within the frame. The scanner will automatically detect and read it.
        </p>

        {/* Scanner Container */}
        <div className="relative mb-4">
          <div id="barcode-reader" className="rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-700"></div>

          {/* Overlay instructions */}
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-white bg-black/50 px-4 py-2 rounded-lg">
                <p className="text-sm font-medium">Scanning...</p>
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

        {/* Cancel Button */}
        <button
          onClick={handleClose}
          className="w-full mt-4 px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
