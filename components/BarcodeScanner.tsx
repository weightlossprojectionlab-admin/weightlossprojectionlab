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
 * Barcode formats the scanner attempts to decode. Shared between the live
 * camera scanner and the file-upload fallback path so they stay in sync.
 *
 * Coverage rationale (grocery / kitchen inventory context):
 * - UPC-A/E + EAN-13/8: standard retail barcodes (US/intl).
 * - UPC_EAN_EXTENSION: 2/5-digit add-ons next to magazines/books.
 * - CODE_128/39/93: general industrial; some private-label products use these.
 * - ITF: multi-pack case codes / shipping cartons (often 14-digit).
 * - RSS_14 / RSS_EXPANDED: GS1 DataBar — used on produce stickers, fresh
 *   meat, deli items, coupons. Critical for grocery.
 * - DATA_MATRIX: increasingly used on small packaged goods.
 * - QR_CODE: future-proof (recipe links, in-pkg promos, etc.).
 *
 * Skipped: AZTEC (boarding passes), MAXICODE (UPS), PDF_417 (driver's
 * licenses), CODABAR (libraries) — irrelevant for this app.
 */
const SUPPORTED_BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.RSS_14,
  Html5QrcodeSupportedFormats.RSS_EXPANDED,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.QR_CODE
]

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
  // The active MediaStreamTrack from the camera. Captured by reaching into
  // html5-qrcode's <video> element after .start() resolves; the library
  // doesn't expose it directly. Held in a ref because torch/focus calls
  // don't need to trigger re-renders.
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const capsRef = useRef<any>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown')
  const [cameraSupported, setCameraSupported] = useState(true)
  const [secureContext, setSecureContext] = useState(true)
  // Capability-gated UI: only render the torch button when the active track
  // reports torch support, and only attempt applyConstraints for focus when
  // pointsOfInterest is exposed. iOS Safari currently exposes neither, so
  // the buttons stay hidden and tap-to-focus silently no-ops there.
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [focusSupported, setFocusSupported] = useState(false)
  const [focusRing, setFocusRing] = useState<{ x: number; y: number; key: number } | null>(null)
  // Delayed prompt that nudges the user toward the OS camera (capture="environment")
  // when the live decoder hasn't decoded anything within 8s. Native autofocus
  // on a still photo is far more reliable than html5-qrcode's continuous stream.
  const [showTroubleCallout, setShowTroubleCallout] = useState(false)

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
          formatsToSupport: SUPPORTED_BARCODE_FORMATS,
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

      // Start scanning with specific camera ID (better than facingMode on some devices).
      // qrbox is a function so the acquisition area scales to the viewfinder's
      // shorter dimension on every device. We use a wide-and-short rectangle
      // (85% × 40%) because UPC/EAN barcodes are ~2:1 rectangles — the dotted
      // overlay now visually matches what users are aiming at, and the
      // smaller decode area speeds up per-frame processing. Still tall
      // enough to enclose a QR code at typical hold distance.
      // fps bumped from 10 → 15: hand-shake at 10fps frequently skipped the
      // decode window. 15 is supported on essentially all devices.
      await scannerRef.current.start(
        cameraId,
        {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minDim = Math.min(viewfinderWidth, viewfinderHeight)
            return {
              width: Math.floor(minDim * 0.85),
              height: Math.floor(minDim * 0.4)
            }
          },
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

      // Capture the live MediaStreamTrack so torch / tap-to-focus can call
      // applyConstraints on it. The library mounts the <video> element
      // asynchronously; poll briefly until it's there.
      void captureMediaStreamTrack()
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
    // Reset capability-driven state — the track is gone, so torch/focus
    // affordances must hide and re-detect on the next start.
    trackRef.current = null
    capsRef.current = null
    setTorchOn(false)
    setTorchSupported(false)
    setFocusSupported(false)
    setFocusRing(null)
    setShowTroubleCallout(false)
  }

  /**
   * Reach into html5-qrcode's <video> element to grab the underlying
   * MediaStreamTrack. The library doesn't expose it through its public API,
   * so we DOM-query it. Polls briefly because the video element is mounted
   * asynchronously after .start() resolves.
   */
  const captureMediaStreamTrack = async () => {
    const maxAttempts = 20
    for (let i = 0; i < maxAttempts; i++) {
      const containerEl = document.getElementById('barcode-reader')
      const video = containerEl?.querySelector('video') as HTMLVideoElement | null
      const stream = video?.srcObject as MediaStream | null
      const track = stream?.getVideoTracks?.()[0] ?? null
      if (track) {
        trackRef.current = track
        const caps = (track.getCapabilities?.() as any) || {}
        capsRef.current = caps
        setTorchSupported(!!caps.torch)
        setFocusSupported(!!(caps.focusMode && caps.pointsOfInterest))
        return
      }
      await new Promise(r => setTimeout(r, 50))
    }
    // Couldn't grab the track — torch/focus features stay hidden, no error
    // surfaced to the user. Still scans normally.
    logger.debug('[BarcodeScanner] Could not capture MediaStreamTrack — torch/focus disabled')
  }

  /**
   * Toggle the camera torch (phone flashlight). Feature-gated by
   * capabilities; the button doesn't render unless torch is supported.
   */
  const toggleTorch = async () => {
    const track = trackRef.current
    if (!track) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as any] })
      setTorchOn(next)
    } catch (err) {
      logger.error('[BarcodeScanner] Torch toggle failed', err as Error)
      toast.error("Couldn't toggle flashlight")
    }
  }

  /**
   * Re-trigger autofocus at the tap location. Mobile cameras frequently
   * lock focus once the stream is held; tap-to-focus is the standard way
   * to nudge them back. The visual ring renders on every supported
   * platform; the actual applyConstraints call is gated on capabilities
   * so iOS Safari (which doesn't expose pointsOfInterest) silently
   * no-ops the constraint while still showing the ring.
   */
  const handleTapToFocus = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const localX = e.clientX - rect.left
    const localY = e.clientY - rect.top
    setFocusRing({ x: localX, y: localY, key: Date.now() })

    const track = trackRef.current
    const caps = capsRef.current
    if (!track || !caps?.focusMode || !caps?.pointsOfInterest) return

    const x = localX / rect.width
    const y = localY / rect.height
    const focusMode = Array.isArray(caps.focusMode) && caps.focusMode.includes('single-shot')
      ? 'single-shot'
      : 'manual'

    track.applyConstraints({
      advanced: [{ pointsOfInterest: [{ x, y }], focusMode } as any]
    }).catch(() => {
      // Best-effort — silently swallow failures. The user already saw the
      // ring, so the interaction feels acknowledged either way.
    })
  }

  // Auto-clear the focus ring after 700ms.
  useEffect(() => {
    if (!focusRing) return
    const timer = setTimeout(() => setFocusRing(null), 700)
    return () => clearTimeout(timer)
  }, [focusRing])

  // Show the "Having trouble?" callout 8s after a scan session starts and
  // hasn't decoded anything yet. Re-armed on every fresh scan session.
  useEffect(() => {
    if (!isScanning || showManualEntry) {
      setShowTroubleCallout(false)
      return
    }
    const timer = setTimeout(() => setShowTroubleCallout(true), 8000)
    return () => clearTimeout(timer)
  }, [isScanning, showManualEntry])

  const handleScanSuccess = (barcode: string) => {
    // Validate length BEFORE firing onScan. ZXing occasionally returns a
    // partial decode (6–7 digits) when the user moves the camera away
    // before the full read completes. Those partials look like real
    // success to the parent surface, which then sends the fragment to
    // /api/products/lookup, gets a 404, and shows "item not found" — a
    // dead-end the user has to recover from. Better to reject here and
    // ask them to keep aiming. UPC-E (8) / UPC-A (12) / EAN-13 (13) /
    // ITF-14 (14) are the legitimate retail lengths.
    const cleaned = (barcode || '').replace(/\D/g, '')
    if (cleaned.length < 8) {
      // Don't close the scanner — let it keep trying. Tell the user the
      // last read was short so they know to hold steadier / move closer.
      logger.debug('[BarcodeScanner] rejecting short partial', { length: cleaned.length })
      toast('Hold steady — barcode wasn\'t fully read', {
        icon: '📏',
        duration: 1500,
      })
      return
    }

    // Vibrate on success (if supported)
    if (navigator.vibrate) {
      navigator.vibrate(200)
    }

    // Play success sound
    const audio = new Audio('/sounds/beep.mp3')
    audio.play().catch(() => {
      // Ignore audio errors
    })

    // No toast here — the scanner doesn't know the product yet, so showing
    // the raw barcode digits ("Scanned: 0016000170032") was unsemantic.
    // The parent surface looks up the barcode and is responsible for any
    // user-facing success message (which can carry the actual product name).
    onScan(cleaned)

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

    // Same reasoning as handleScanSuccess — no raw-barcode toast here.
    // The parent looks up the product and toasts the human-readable name.
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

      // Html5Qrcode only allows one operation at a time. If the live camera
      // scan is still running, scanFile() rejects with "Cannot start file scan
      // - ongoing camera scan". Stop the camera first so file upload works as
      // a fallback when the camera can't decode.
      await stopScanning()

      // Initialize scanner if needed
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('barcode-reader', {
          formatsToSupport: SUPPORTED_BARCODE_FORMATS,
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

          {/* Animated scan line. Visual cue that the camera is actively
              decoding — without it, users with a borderline scan don't know
              whether to hold steady or move. Sized to match the qrbox
              (85% × 40% of the square viewfinder). pointer-events-none so
              taps still reach the tap-to-focus overlay below. */}
          {isScanning && !showManualEntry && (
            <>
              <style>{`
                @keyframes barcodeScanLine {
                  0%, 100% { top: 0%;                  opacity: 0.55; }
                  50%      { top: calc(100% - 2px);   opacity: 1;    }
                }
              `}</style>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="relative"
                  style={{ width: '85%', aspectRatio: '85 / 40' }}
                >
                  <div
                    className="absolute inset-x-0 h-0.5 bg-red-500 rounded-full"
                    style={{
                      top: 0,
                      animation: 'barcodeScanLine 1.6s ease-in-out infinite',
                      boxShadow: '0 0 8px rgba(239, 68, 68, 0.85)'
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Tap-to-focus overlay. Sits over the entire scanner area, captures
              taps to nudge autofocus, and hosts the visual focus ring.
              Pointer events are limited to this layer so the OS keyboard /
              page scroll outside aren't affected. */}
          {isScanning && !showManualEntry && (
            <div
              className="absolute inset-0 cursor-crosshair touch-manipulation"
              onPointerDown={handleTapToFocus}
              role="button"
              aria-label="Tap to focus"
            >
              {focusRing && (
                <div
                  key={focusRing.key}
                  className="absolute pointer-events-none rounded-full border-2 border-white"
                  style={{
                    left: focusRing.x - 25,
                    top: focusRing.y - 25,
                    width: 50,
                    height: 50,
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.5)'
                  }}
                />
              )}
            </div>
          )}

          {/* Torch toggle. Only renders when the active MediaStreamTrack
              reports torch capability — Android Chrome typically does, iOS
              Safari currently doesn't. */}
          {torchSupported && isScanning && !showManualEntry && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`absolute top-2 right-2 z-10 p-2 rounded-full text-white transition-colors ${
                torchOn ? 'bg-amber-500 hover:bg-amber-600' : 'bg-black/60 hover:bg-black/80'
              }`}
              aria-label={torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
              aria-pressed={torchOn}
            >
              <svg className="w-6 h-6" fill={torchOn ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 2h6l-1 5h-4L9 2zm1 5h4v3a2 2 0 01-2 2 2 2 0 01-2-2V7zm0 7h4v8h-4v-8z" />
              </svg>
            </button>
          )}

          {/* Aim guidance — concrete positioning instructions instead of a
              generic "Scanning" label. The most common partial-decode cause
              is the user holding the barcode too close (camera can't focus)
              or moving while it locks; this copy nudges both at once.
              Mobile-first: the text sits over the lower portion of the
              video so it's still legible against typical packaging. */}
          {isScanning && !showManualEntry && (
            <div className="absolute inset-x-0 bottom-2 flex items-center justify-center pointer-events-none px-3">
              <div className="text-center text-white bg-black/65 px-4 py-2 rounded-lg max-w-[90%]">
                <p className="text-sm font-medium leading-tight">
                  Center the barcode in the box · hold steady
                </p>
                <p className="text-[11px] opacity-80 leading-tight mt-0.5">
                  Keep ~6 inches away
                  {focusSupported ? ' · tap to focus' : ''}
                </p>
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

        {/* "Having trouble?" callout — appears 8s into a still-scanning
            session to nudge the user toward a still photo, which uses the
            OS's native autofocus + flash and decodes far more reliably than
            the live html5-qrcode stream. */}
        {showTroubleCallout && isScanning && !showManualEntry && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-900 dark:text-amber-100 mb-3">
              <span className="font-semibold">Having trouble scanning?</span> Snap a photo instead — your camera's autofocus usually catches it on the first try.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Take a photo
            </button>
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

          {/* Camera-failed fallback options. Previously rendered on
              !isScanning, which included the brief camera-init
              window — so users saw the buttons flash up, then
              disappear when the camera kicked in (the "starts here,
              goes here" jank). Now gated on actual failure modes
              (error set, camera unsupported, or insecure context)
              so the buttons appear only when the camera truly
              can't work. The 8-second showTroubleCallout above
              still surfaces "Take a photo" inline once the camera
              IS running but isn't decoding. */}
          {/* Photo upload — only when the camera path itself failed (no
              camera, insecure context, or hard error). For working-camera-
              but-no-decode, the 8-second showTroubleCallout above already
              surfaces a "Take a photo" button inline. */}
          {(error || !cameraSupported || !secureContext) && !showManualEntry && (
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
          )}

          {/* Manual entry — always available (lifted out of the camera-failed
              gate). Real grocery barcodes get torn, glare-y, or smudged; even
              a working camera can fail on those, and damp/cold hands make
              held-steady aiming hard. Users need a manual escape that doesn't
              require waiting 8 seconds or hoping the camera fails. */}
          {!showManualEntry && (
            <button
              type="button"
              onClick={() => setShowManualEntry(true)}
              className="w-full px-4 py-3 bg-muted text-foreground rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Enter barcode manually
            </button>
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
