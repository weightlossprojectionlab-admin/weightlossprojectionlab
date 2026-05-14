'use client'

/**
 * ReceiptCaptureSurface — Phase A of the receipt OCR feature.
 *
 * Long-aspect camera viewfinder + dashed frame guide + multi-shot
 * thumbnail stack. User captures one or more frames of a receipt
 * (long receipts need multiple shots) and taps Done; the parent
 * receives an array of base64 data URLs.
 *
 * Phase A intentionally stops at the data URLs — no OCR, no parsing.
 * Phase B will add /api/ocr/receipt that consumes the same array shape.
 * Phase C wires the parsed result into the trip-summary apply flow.
 *
 * Camera lifecycle is owned locally (getUserMedia on open, stop on
 * close / unmount). Same pattern BarcodeScanner uses today — could be
 * unified into a useCameraStream hook later but the architectural
 * rework was reverted earlier; both surfaces own their own stream for
 * now.
 *
 * iOS Safari rules respected:
 *   - playsInline so the video doesn't go fullscreen on tap
 *   - getUserMedia called from inside a click-driven mount (parent's
 *     menu-tap kicks off this component, which mounts on a real user
 *     gesture)
 *   - capture button uses canvas.toDataURL('image/jpeg', 0.85) so
 *     payload size stays manageable for upload
 */

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  CameraIcon,
  XMarkIcon,
  TrashIcon,
  CheckIcon,
  BoltIcon,
  BoltSlashIcon,
} from '@heroicons/react/24/outline'
import { logger } from '@/lib/logger'
import {
  isCameraSupported,
  isSecureContext,
  permissionErrorMessage,
} from '@/lib/camera-helpers'

/**
 * MediaTrackCapabilities / Constraints lack standardized typings for the
 * vendor-extension fields we use (focusMode, exposureMode, torch, etc.).
 * These shapes are consistent across Chromium-based browsers and iOS 17+.
 */
type ExtendedTrackCapabilities = MediaTrackCapabilities & {
  focusMode?: string[]
  exposureMode?: string[]
  whiteBalanceMode?: string[]
  torch?: boolean
}
type ExtendedConstraintSet = MediaTrackConstraintSet & {
  focusMode?: string
  exposureMode?: string
  whiteBalanceMode?: string
  torch?: boolean
}

export interface ReceiptCaptureSurfaceProps {
  isOpen: boolean
  onClose: () => void
  /**
   * Called when the user taps Done with at least one capture.
   * Receives an array of base64 image data URLs (image/jpeg) ready to
   * post to the OCR endpoint or process locally.
   */
  onComplete: (images: string[]) => void
  /**
   * Cap on captures per session. Long Costco receipts can run ~6 sections;
   * default 8 is generous. Past this, the capture button disables and
   * surfaces a "Done capturing" hint.
   */
  maxCaptures?: number
}

export function ReceiptCaptureSurface({
  isOpen,
  onClose,
  onComplete,
  maxCaptures = 8,
}: ReceiptCaptureSurfaceProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [captures, setCaptures] = useState<string[]>([])
  const [isLive, setIsLive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Camera-control state — only meaningful once the stream is live.
  // torchSupported is feature-detected via MediaTrackCapabilities; on
  // iOS Safari it's almost always false (Apple gates this), on Android
  // Chrome it's usually true on devices with a flash.
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  // Native track dimensions captured after the stream starts. Used to
  // decide whether the captured frame needs a 90° rotation to come out
  // portrait — on many phones the browser ignores our portrait
  // aspectRatio constraint and hands us a landscape track, even though
  // the user is holding the phone vertically.
  const trackDimsRef = useRef<{ width: number; height: number } | null>(null)

  // Mount/teardown — getUserMedia on open, stop tracks on close.
  useEffect(() => {
    if (!isOpen) return

    let cancelled = false

    if (!isSecureContext()) {
      setError(
        'Camera access requires HTTPS. Receipt capture only works on a secure connection.',
      )
      return
    }
    if (!isCameraSupported()) {
      setError('Camera not available on this device.')
      return
    }

    setError(null)
    setCaptures([])
    setIsLive(false)

    ;(async () => {
      try {
        // Receipts are tall and narrow. Ask for portrait + the highest
        // resolution we can get so OCR has crisp text to work with.
        // Browsers fall back transparently if the camera can't honor
        // the constraint — many will hand back a landscape track
        // anyway, which we correct on capture (see handleCapture).
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            aspectRatio: { ideal: 9 / 16 },
            width: { ideal: 1440, max: 2160 },
            height: { ideal: 2560, max: 3840 },
          },
          audio: false,
        })
        if (cancelled) {
          for (const t of stream.getTracks()) t.stop()
          return
        }
        streamRef.current = stream

        // Continuous autofocus + auto-exposure + auto-white-balance —
        // the three biggest sharpness wins on mobile. Without these the
        // camera locks at the first focus and never re-focuses as the
        // user moves the phone closer to the receipt, producing the
        // blur the user reported. Feature-detect first; not all
        // browsers expose every mode.
        const track = stream.getVideoTracks()[0]
        if (track) {
          try {
            const caps = (typeof track.getCapabilities === 'function'
              ? track.getCapabilities()
              : {}) as ExtendedTrackCapabilities
            const advanced: ExtendedConstraintSet[] = []
            if (caps.focusMode?.includes('continuous')) {
              advanced.push({ focusMode: 'continuous' })
            }
            if (caps.exposureMode?.includes('continuous')) {
              advanced.push({ exposureMode: 'continuous' })
            }
            if (caps.whiteBalanceMode?.includes('continuous')) {
              advanced.push({ whiteBalanceMode: 'continuous' })
            }
            if (advanced.length > 0) {
              await track.applyConstraints({ advanced } as MediaTrackConstraints)
            }
            // Torch capability is independent — record it so we can
            // render the toggle button only on devices that support it.
            setTorchSupported(caps.torch === true)

            const settings = track.getSettings()
            if (settings.width && settings.height) {
              trackDimsRef.current = { width: settings.width, height: settings.height }
            }
          } catch (capsErr) {
            // Capability application failures are non-fatal — the
            // stream still works, just without auto-focus/exposure.
            logger.warn('[ReceiptCapture] applyConstraints failed', {
              message: (capsErr as Error).message,
            })
          }
        }

        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          video.setAttribute('playsinline', 'true')
          video.muted = true
          await video.play().catch((playErr) => {
            // Autoplay blocked is rare with muted+playsinline but possible.
            logger.warn('[ReceiptCapture] video.play failed', {
              error: (playErr as Error).message,
            })
          })
          setIsLive(true)
        }
      } catch (err) {
        const e = err as DOMException
        const isDenied = e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError'
        setError(isDenied ? permissionErrorMessage() : (e?.message || 'Camera failed to start'))
        logger.warn('[ReceiptCapture] getUserMedia failed', {
          name: e?.name,
          message: e?.message,
        })
      }
    })()

    return () => {
      cancelled = true
      const stream = streamRef.current
      if (stream) {
        for (const t of stream.getTracks()) t.stop()
        streamRef.current = null
      }
      const video = videoRef.current
      if (video) {
        try {
          video.pause()
        } catch {
          // ignore
        }
        video.srcObject = null
      }
      setIsLive(false)
      setTorchOn(false)
      setTorchSupported(false)
      trackDimsRef.current = null
    }
  }, [isOpen])

  /**
   * Toggle the device torch (rear flash). Only available when the
   * camera capability + browser advertises it. Useful in dim kitchens
   * and grocery-store aisles where the receipt is hard to read.
   */
  const toggleTorch = async () => {
    const stream = streamRef.current
    if (!stream || !torchSupported) return
    const track = stream.getVideoTracks()[0]
    if (!track) return
    const next = !torchOn
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as ExtendedConstraintSet],
      } as MediaTrackConstraints)
      setTorchOn(next)
    } catch (err) {
      logger.warn('[ReceiptCapture] torch toggle failed', {
        message: (err as Error).message,
      })
      toast.error('Torch unavailable on this device')
    }
  }

  /**
   * Capture the current video frame to a base64 JPEG.
   *
   * Two complications worth noting:
   *
   * 1. Orientation correction — most mobile browsers ignore the
   *    portrait aspectRatio constraint we ask for and hand back a
   *    landscape track (e.g. 1920×1080) even when the user is holding
   *    the phone vertically. The viewport is portrait so the user
   *    *sees* a portrait-cropped preview via object-cover, but the
   *    raw frame is landscape with the receipt sitting sideways.
   *    Capturing as-is would store the image rotated 90°, which is
   *    both visually wrong and degrades OCR (Gemini handles rotation
   *    but with measurable accuracy loss). When the source is
   *    landscape we rotate the canvas 90° clockwise so the saved
   *    image matches what the user pointed at.
   *
   * 2. JPEG quality — bumped from 0.85 to 0.92. Receipt thermal print
   *    is small and low-contrast; the extra ~30% file size is worth
   *    the OCR accuracy improvement. Even a 12-shot Costco receipt
   *    stays well under the 10MB request limit.
   */
  const handleCapture = () => {
    const video = videoRef.current
    if (!video || !isLive) return
    if (captures.length >= maxCaptures) {
      toast(`Max ${maxCaptures} captures — tap Done to continue`, { icon: '✋' })
      return
    }
    const srcW = video.videoWidth || 1080
    const srcH = video.videoHeight || 1920
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      toast.error("Couldn't capture — canvas context unavailable")
      return
    }

    // If the camera handed back a landscape track but the user is
    // clearly holding the phone in portrait (which is the only
    // orientation we render this UI in), rotate to portrait.
    const needsRotation = srcW > srcH
    if (needsRotation) {
      canvas.width = srcH
      canvas.height = srcW
      ctx.save()
      // Move to the new (rotated) center, rotate 90° CW, then draw the
      // source frame centered on the origin.
      ctx.translate(canvas.width, 0)
      ctx.rotate(Math.PI / 2)
      ctx.drawImage(video, 0, 0, srcW, srcH)
      ctx.restore()
    } else {
      canvas.width = srcW
      canvas.height = srcH
      ctx.drawImage(video, 0, 0, srcW, srcH)
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setCaptures((prev) => [...prev, dataUrl])
    // Haptic confirm — same pattern BarcodeScanner uses on scan-success.
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(50)
      } catch {
        // ignore
      }
    }
  }

  const handleRemoveCapture = (index: number) => {
    setCaptures((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDone = () => {
    if (captures.length === 0) {
      toast('Take at least one photo first', { icon: '📷' })
      return
    }
    setSubmitting(true)
    try {
      onComplete(captures)
    } finally {
      // Parent decides whether to close + reset; we don't auto-close here
      // so a parent that wants to show a loading/processing UI on top can.
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const canCaptureMore = isLive && captures.length < maxCaptures

  return (
    // Full-bleed always — receipt capture is a focused task, no
    // breadcrumb back to the page below until Done or X close.
    <div className="fixed inset-0 z-[70] bg-black flex flex-col">
      {/* Header — close + title + capture count + torch + Done. The
          torch button only renders on devices that advertise the
          capability (most Android Chrome, almost no iOS Safari). */}
      <header className="flex items-center justify-between px-3 py-3 bg-black/80 text-white gap-2">
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full active:bg-white/20 flex-shrink-0"
          aria-label="Close receipt capture"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
        <div className="text-center min-w-0 flex-1">
          <div className="text-base font-semibold">Snap receipt</div>
          <div className="text-xs text-white/70">
            {captures.length === 0
              ? torchSupported
                ? 'Hold flat in good light · tap 💡 if it’s dim'
                : 'Hold flat in good light'
              : `${captures.length} of ${maxCaptures} captures`}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {torchSupported && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`p-2 rounded-full active:bg-white/20 ${torchOn ? 'bg-white/20' : ''}`}
              aria-label={torchOn ? 'Turn torch off' : 'Turn torch on'}
              title={torchOn ? 'Torch on' : 'Torch off'}
            >
              {torchOn ? (
                <BoltIcon className="w-6 h-6 text-yellow-300" />
              ) : (
                <BoltSlashIcon className="w-6 h-6" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handleDone}
            disabled={captures.length === 0 || submitting}
            className="px-3 py-2 min-h-[40px] rounded-lg bg-success text-white font-semibold text-sm disabled:opacity-40 active:bg-success-hover"
          >
            {submitting ? '…' : 'Done'}
          </button>
        </div>
      </header>

      {/* Viewfinder + frame guide — fills available space between header
          and footer. Frame guide is a dashed rectangle with a tall
          aspect ratio matching a typical receipt; user aligns the
          receipt inside it. pointer-events-none so it doesn't block
          the capture button. */}
      <div className="relative flex-1 overflow-hidden">
        {error ? (
          <div className="h-full flex items-center justify-center px-6">
            <div className="bg-card text-foreground rounded-lg p-5 max-w-md text-center">
              <CameraIcon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="absolute inset-0 w-full h-full object-cover bg-black"
            />
            {/* Frame guide: dashed rectangle, ~70% width × 80% height
                so the user gets a strong "put the receipt here" hint.
                White stroke + soft outer shadow makes it readable on
                both bright and dark receipts. */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="border-2 border-dashed border-white/80 rounded-lg"
                style={{
                  width: '72%',
                  height: '78%',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
                }}
              />
            </div>
            {/* Aim hint at the bottom of the viewfinder area, above the
                thumbnail strip. */}
            {captures.length === 0 ? (
              <div className="absolute inset-x-0 bottom-3 flex items-center justify-center pointer-events-none px-4">
                <div className="text-center text-white bg-black/60 px-4 py-2 rounded-lg max-w-[90%]">
                  <p className="text-sm font-medium leading-tight">
                    Hold steady · fill the box with the receipt
                  </p>
                  <p className="text-[11px] opacity-80 leading-tight mt-0.5">
                    Long receipt? Capture in sections — overlap each shot by ~20% so we don&apos;t miss a line.
                  </p>
                </div>
              </div>
            ) : captures.length < maxCaptures ? (
              <div className="absolute inset-x-0 bottom-3 flex items-center justify-center pointer-events-none px-4">
                <div className="text-center text-white bg-black/60 px-3 py-1.5 rounded-lg max-w-[90%]">
                  <p className="text-[11px] opacity-90 leading-tight">
                    Slide the receipt up so this shot overlaps the previous one
                  </p>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Footer — thumbnail strip + capture button. The strip lets the
          user verify each shot caught the right section and remove
          mis-captures before sending to OCR. */}
      <footer className="bg-black/85 text-white px-4 pt-3 pb-4 flex flex-col gap-3">
        {captures.length > 0 && (
          <div
            className="flex items-center gap-2 overflow-x-auto py-1"
            aria-label="Captured frames"
          >
            {captures.map((src, i) => (
              <div
                key={i}
                className="relative flex-shrink-0 rounded-md overflow-hidden border border-white/20"
              >
                <img
                  src={src}
                  alt={`Capture ${i + 1}`}
                  className="h-20 w-14 object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveCapture(i)}
                  className="absolute top-0.5 right-0.5 p-1 rounded-full bg-black/70 text-white active:bg-black"
                  aria-label={`Remove capture ${i + 1}`}
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Prominent "Turn on flash" prompt — surfaces above the
            capture button when the device supports torch but it's
            currently off. The small toggle in the top-right corner
            wasn't discoverable enough; users reported repeatedly
            scanning under poor light without realizing the flash
            was available. This stays visible until the user toggles
            torch on (or off via the corner button), so it's a
            persistent reminder, not a one-time hint. */}
        {torchSupported && !torchOn && isLive && (
          <div className="flex items-center justify-center mb-3">
            <button
              type="button"
              onClick={toggleTorch}
              className="px-4 py-2 min-h-[40px] bg-yellow-400/95 hover:bg-yellow-300 active:scale-[0.97] text-black rounded-full text-sm font-semibold flex items-center gap-2 shadow-md"
            >
              <BoltIcon className="w-4 h-4" />
              <span>Turn on flash</span>
            </button>
          </div>
        )}

        {/* Capture button — large, centered, primary-tinted ring.
            Disabled when stream isn't live or max reached; the
            disabled state still has a tap target so the user gets
            visual + haptic feedback (well, none here — but native
            disabled is sufficient cue). */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={handleCapture}
            disabled={!canCaptureMore}
            className={`relative h-16 w-16 rounded-full flex items-center justify-center transition-all ${
              canCaptureMore
                ? 'bg-white active:scale-95'
                : 'bg-white/40 cursor-not-allowed'
            }`}
            aria-label="Capture frame"
          >
            <span className="absolute inset-0 rounded-full ring-2 ring-white" />
            <span
              className={`block h-12 w-12 rounded-full ${
                canCaptureMore ? 'bg-primary' : 'bg-primary/50'
              }`}
            />
            {captures.length > 0 && (
              <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-success text-white text-xs font-bold flex items-center justify-center ring-2 ring-black">
                <CheckIcon className="w-3.5 h-3.5" />
              </span>
            )}
          </button>
        </div>

        {!canCaptureMore && captures.length >= maxCaptures && (
          <p className="text-center text-xs text-white/70">
            Max captures reached. Tap Done to process.
          </p>
        )}
      </footer>
    </div>
  )
}
