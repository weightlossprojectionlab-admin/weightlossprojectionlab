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
  // Tap-to-focus: a 0-1 normalized point inside the camera frame.
  // When supported (most modern Android Chrome + some iOS), the
  // camera re-acquires focus around that point. Sometimes also
  // accepted as an array of points; we always pass one.
  pointsOfInterest?: Array<{ x: number; y: number }>
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
  maxCaptures = 10,
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
  // Real-time sharpness signal. Sampled ~4 Hz from the live video to a
  // small offscreen canvas; cheap edge-magnitude proxy for Laplacian
  // variance. Drives the viewfinder indicator and gates the capture
  // button so users don't burn captures on out-of-focus frames.
  //   'measuring' — first ~250 ms after the stream goes live
  //   'blurry'    — out of focus / hands moving / receipt too far
  //   'ok'        — usable but not pristine; capture allowed
  //   'sharp'     — crisp; capture encouraged
  const [sharpness, setSharpness] = useState<'measuring' | 'blurry' | 'ok' | 'sharp'>('measuring')
  // Reusable offscreen canvas for the sharpness sample — kept across
  // intervals so we don't churn DOM nodes 4× a second.
  const focusCanvasRef = useRef<HTMLCanvasElement | null>(null)
  // Tap-to-focus visual ring — { x, y } in viewport pixels (relative
  // to the video element), { ts } so the ring fades out after 1s.
  const [focusRing, setFocusRing] = useState<{ x: number; y: number; ts: number } | null>(null)
  // Track how long sharpness has been 'blurry' so we can nudge the
  // user to "step back" — autofocus can't help if the receipt is
  // inside the phone's minimum focus distance (~10-30 cm). When we've
  // been blurry for >4 seconds in a row, surface the hint.
  const blurStartRef = useRef<number | null>(null)
  const [showTooCloseHint, setShowTooCloseHint] = useState(false)
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
      setSharpness('measuring')
      trackDimsRef.current = null
    }
  }, [isOpen])

  /**
   * Real-time sharpness check — samples the live video to a 120×120
   * offscreen canvas every 300 ms and computes two signals on the
   * region inside the dashed frame (NOT the whole frame, since the
   * outside of the frame is dimmed and irrelevant to OCR):
   *
   *   • edgeScore — sum of absolute differences between adjacent
   *     grayscale pixels (BT.601 luma). Cheap Laplacian proxy.
   *   • meanLuma  — average brightness 0-255.
   *
   * Both signals are needed because edges alone false-positive on
   * cluttered backgrounds (wood grain, kitchen counter) — those have
   * high edge density and look "sharp" to a naïve detector even
   * when there's no receipt. Receipts are uniquely BRIGHT (white
   * thermal paper) AND TEXTURED (small black text). Require both.
   *
   * Thresholds tuned for thermal receipts:
   *   sharp  ← edgeScore >= 14 AND meanLuma >= 120
   *   ok     ← edgeScore >= 8  AND meanLuma >= 90
   *   blurry ← everything else (low edges OR dim scene)
   *
   * Cost: ~14k pixel reads + arithmetic per tick at 4 Hz. Sub-ms on
   * a mid-tier phone. Pauses at maxCaptures.
   */
  useEffect(() => {
    if (!isLive || !isOpen) return
    if (captures.length >= maxCaptures) return
    if (!focusCanvasRef.current) {
      focusCanvasRef.current = document.createElement('canvas')
    }
    const tick = () => {
      const video = videoRef.current
      const canvas = focusCanvasRef.current
      if (!video || !canvas) return
      const srcW = video.videoWidth
      const srcH = video.videoHeight
      if (srcW === 0 || srcH === 0) return
      const W = 120
      const H = 120
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      try {
        // Sample only the ROI matching the dashed alignment frame
        // (90% width × 93% height, centered — sized so the user
        // doesn't have to get closer than the camera's minimum focus
        // distance to fill it). Skinny margin still excludes the
        // black-dimmed border + any UI chrome at top/bottom edges.
        const roiW = srcW * 0.90
        const roiH = srcH * 0.93
        const roiX = (srcW - roiW) / 2
        const roiY = (srcH - roiH) / 2
        ctx.drawImage(video, roiX, roiY, roiW, roiH, 0, 0, W, H)
        const data = ctx.getImageData(0, 0, W, H).data
        let edgeSum = 0
        let lumaSum = 0
        let lumaCount = 0
        for (let y = 1; y < H - 1; y++) {
          for (let x = 1; x < W - 1; x++) {
            const i = (y * W + x) * 4
            const center = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
            const right = 0.299 * data[i + 4] + 0.587 * data[i + 5] + 0.114 * data[i + 6]
            const below =
              0.299 * data[i + W * 4] + 0.587 * data[i + W * 4 + 1] + 0.114 * data[i + W * 4 + 2]
            edgeSum += Math.abs(center - right) + Math.abs(center - below)
            lumaSum += center
            lumaCount++
          }
        }
        const edgeScore = edgeSum / ((W - 2) * (H - 2))
        const meanLuma = lumaSum / lumaCount

        let next: 'measuring' | 'blurry' | 'ok' | 'sharp'
        if (edgeScore >= 14 && meanLuma >= 120) next = 'sharp'
        else if (edgeScore >= 8 && meanLuma >= 90) next = 'ok'
        else next = 'blurry'

        setSharpness((prev) => (prev === next ? prev : next))

        // "Step back" / too-close detector. If we've been 'blurry'
        // for 4+ seconds continuously AND luma is healthy (so it's
        // not just a dim scene), the most likely cause is the phone
        // is closer than its minimum focus distance. Hint the user.
        const now = Date.now()
        if (next === 'blurry' && meanLuma >= 90) {
          if (blurStartRef.current == null) blurStartRef.current = now
          else if (now - blurStartRef.current > 4000) setShowTooCloseHint(true)
        } else {
          blurStartRef.current = null
          if (showTooCloseHint) setShowTooCloseHint(false)
        }
      } catch {
        // getImageData can throw on tainted canvases; non-fatal.
      }
    }
    // First tick after a short delay so the camera has a frame ready.
    const t0 = setTimeout(tick, 250)
    const interval = setInterval(tick, 300)
    return () => {
      clearTimeout(t0)
      clearInterval(interval)
    }
  }, [isLive, isOpen, captures.length, maxCaptures])

  /**
   * Tap-to-focus — translate a viewport tap on the video into a 0-1
   * normalized point and ask the camera to re-acquire focus there.
   * Standard pattern in every native camera app; the browser-side
   * equivalent uses `pointsOfInterest` in MediaTrackConstraints.
   *
   * Browser support is partial: most modern Android Chrome accepts
   * it; iOS Safari quietly ignores. We feature-detect by setting
   * focusMode to 'single-shot' alongside the point — when that's
   * not supported, the camera at minimum gets a fresh autofocus
   * kick from the constraint application itself. The visual ring
   * fires regardless so the user gets feedback even on browsers
   * where the underlying focus call is a no-op.
   */
  const handleTapToFocus = async (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = e.currentTarget
    const rect = video.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    setFocusRing({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      ts: Date.now(),
    })
    const stream = streamRef.current
    if (!stream) return
    const track = stream.getVideoTracks()[0]
    if (!track) return
    try {
      const caps = (typeof track.getCapabilities === 'function'
        ? track.getCapabilities()
        : {}) as ExtendedTrackCapabilities
      const advanced: ExtendedConstraintSet[] = []
      // Some browsers accept pointsOfInterest only on the same
      // constraint set as a focusMode flip — try single-shot first
      // so the camera re-acquires; fall back to a bare POI write.
      if (caps.focusMode?.includes('single-shot')) {
        advanced.push({ focusMode: 'single-shot', pointsOfInterest: [{ x, y }] })
      } else if (caps.focusMode?.includes('continuous')) {
        // Some implementations re-focus on a continuous-mode constraint
        // re-application even without single-shot — worth a try.
        advanced.push({ focusMode: 'continuous', pointsOfInterest: [{ x, y }] })
      } else {
        advanced.push({ pointsOfInterest: [{ x, y }] })
      }
      await track.applyConstraints({ advanced } as MediaTrackConstraints)
    } catch (err) {
      logger.debug('[ReceiptCapture] tap-to-focus failed', {
        message: (err as Error).message,
      })
    }
  }

  // Auto-clear the focus ring after 900 ms so it fades out cleanly.
  useEffect(() => {
    if (!focusRing) return
    const timer = setTimeout(() => setFocusRing(null), 900)
    return () => clearTimeout(timer)
  }, [focusRing])

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
    // Soft-gate on sharpness: warn but don't block. The scoring is a
    // heuristic, not authoritative — locking the user out would be
    // worse than a borderline capture. Best-of-both: surface the
    // warning, then take the shot.
    if (sharpness === 'blurry') {
      toast(
        'That looks out of focus — hold steady, give autofocus a beat, and try again.',
        { icon: '👀', duration: 3500 },
      )
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

    // Brightness + contrast boost — every receipt capture gets a modest
    // baseline lift (1.15 / 1.10) since thermal receipts are mostly
    // white-on-white with low natural contrast. Cheap, no per-pixel
    // math; CSS filter is applied at draw time. Without this, marginally
    // dim captures fail OCR's JSON parse because Gemini gives up.
    ctx.filter = 'brightness(1.15) contrast(1.10)'

    if (needsRotation) {
      canvas.width = srcH
      canvas.height = srcW
      ctx.save()
      // Re-apply filter after save/restore since it would be reset.
      ctx.filter = 'brightness(1.15) contrast(1.10)'
      ctx.translate(canvas.width, 0)
      ctx.rotate(Math.PI / 2)
      ctx.drawImage(video, 0, 0, srcW, srcH)
      ctx.restore()
    } else {
      canvas.width = srcW
      canvas.height = srcH
      ctx.filter = 'brightness(1.15) contrast(1.10)'
      ctx.drawImage(video, 0, 0, srcW, srcH)
    }
    // Clear filter so any downstream reads / draws aren't tinted.
    ctx.filter = 'none'

    // Post-capture luminance sample — if the corrected frame is STILL
    // dark, warn the user before they tap Done. Sampling a stride keeps
    // this cheap (~200 reads vs. millions). Threshold of 75 was picked
    // empirically: receipts in good light average ~160, kitchen light
    // ~120, dim ~80, "OCR will fail" ~50.
    try {
      const sampleW = canvas.width
      const sampleH = canvas.height
      const sample = ctx.getImageData(0, 0, sampleW, sampleH).data
      const stride = Math.max(4, Math.floor(sample.length / (4 * 400)) * 4)
      let sum = 0
      let n = 0
      for (let i = 0; i < sample.length; i += stride) {
        sum += 0.299 * sample[i] + 0.587 * sample[i + 1] + 0.114 * sample[i + 2]
        n++
      }
      const meanLuma = n > 0 ? sum / n : 255
      if (meanLuma < 75) {
        toast('That photo looks dark — flash on, or more light, will help OCR read it.', {
          icon: '💡',
          duration: 4000,
        })
      }
    } catch (lumaErr) {
      // getImageData can throw on tainted canvases or other edge cases.
      // Non-fatal — capture proceeds without the warning.
      logger.warn('[ReceiptCapture] luminance sample failed', {
        message: (lumaErr as Error).message,
      })
    }

    // JPEG 0.96 preserves fine text edges (esp. thermal-receipt
    // small print) at modest bandwidth cost vs the prior 0.92. Pure
    // win for OCR accuracy on borderline captures.
    const dataUrl = canvas.toDataURL('image/jpeg', 0.96)
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
          <div className="text-xs text-white/90 font-medium">
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
              onClick={handleTapToFocus}
              className="absolute inset-0 w-full h-full object-cover bg-black cursor-pointer"
            />
            {/* Tap-to-focus ring — visual feedback for the moment the
                user taps. Persists ~900 ms then fades, matching the
                native iOS / Android camera affordance. Pointer-events-
                none so the ring doesn't eat subsequent taps. */}
            {focusRing && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: focusRing.x - 28,
                  top: focusRing.y - 28,
                  width: 56,
                  height: 56,
                }}
                aria-hidden
              >
                <div className="w-full h-full rounded-full border-2 border-yellow-300 animate-ping opacity-80" />
                <div
                  className="absolute inset-0 m-auto rounded-full border-2 border-yellow-300"
                  style={{ width: 32, height: 32, top: 12, left: 12 }}
                />
              </div>
            )}
            {/* Frame guide: dashed rectangle, ~70% width × 80% height
                so the user gets a strong "put the receipt here" hint.
                White stroke + soft outer shadow makes it readable on
                both bright and dark receipts. */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className={`border-2 border-dashed rounded-lg transition-colors ${
                  sharpness === 'sharp'
                    ? 'border-green-400/90'
                    : sharpness === 'ok'
                      ? 'border-amber-300/85'
                      : 'border-white/85'
                }`}
                style={{
                  // Wider + taller alignment box: phones can't focus
                  // closer than ~10-30 cm, so a small box forced users
                  // inside that range and the image blurred. 90×93%
                  // lets a long receipt fill the frame from a focusable
                  // distance. ROI sharpness sampling above tracks the
                  // same dimensions.
                  width: '90%',
                  height: '93%',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.25)',
                }}
              />
            </div>

            {/* Sharpness indicator — overlay chip at the top of the
                viewfinder reporting the real-time focus signal.
                Color-coded with the dashed frame: red ring = blurry,
                amber = ok, green = sharp. Helps users learn what
                "in focus" looks like before tapping capture. */}
            {captures.length < maxCaptures && (
              <div className="absolute inset-x-0 top-3 flex items-center justify-center pointer-events-none px-4">
                <div
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 ${
                    sharpness === 'sharp'
                      ? 'bg-green-500/95 text-white'
                      : sharpness === 'ok'
                        ? 'bg-amber-400/95 text-black'
                        : sharpness === 'blurry'
                          ? 'bg-rose-500/95 text-white'
                          : 'bg-white/80 text-black'
                  }`}
                  data-testid="receipt-capture-focus-indicator"
                  data-focus-state={sharpness}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sharpness === 'sharp'
                        ? 'bg-white'
                        : sharpness === 'ok'
                          ? 'bg-black/60'
                          : sharpness === 'blurry'
                            ? 'bg-white animate-pulse'
                            : 'bg-black/40'
                    }`}
                    aria-hidden
                  />
                  <span>
                    {sharpness === 'sharp'
                      ? 'In focus — capture now'
                      : sharpness === 'ok'
                        ? 'Almost — hold steady'
                        : sharpness === 'blurry'
                          ? 'Out of focus — hold still'
                          : 'Checking focus…'}
                  </span>
                </div>
              </div>
            )}

            {/* Step-back hint — fires after ~4s of continuous 'blurry'
                with healthy luma. Most common cause of "I can't get it
                in focus": the phone is closer than its minimum focus
                distance (~10-30 cm). Sits under the focus chip with a
                "tap to focus" tip so the user has a clear next action. */}
            {showTooCloseHint && captures.length < maxCaptures && (
              <div className="absolute inset-x-0 top-14 flex items-center justify-center pointer-events-none px-4">
                <div className="bg-yellow-400/95 text-black px-3 py-2 rounded-lg text-xs font-medium text-center max-w-[90%] shadow-md">
                  Can&apos;t focus? Step back ~6&quot; or tap the receipt to focus.
                </div>
              </div>
            )}
            {/* Aim hint at the bottom of the viewfinder area, above the
                thumbnail strip. */}
            {captures.length === 0 ? (
              <div className="absolute inset-x-0 bottom-3 flex items-center justify-center pointer-events-none px-4">
                <div
                  className="text-center bg-black/85 px-4 py-2.5 rounded-lg max-w-[92%] shadow-lg"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                >
                  {/* Explicit text-white on each <p> — relying on
                      inheritance from a parent text-white was getting
                      overridden by some global <p> reset in production,
                      surfacing the title in a muted color over the
                      dark video. Set the color at every leaf. */}
                  <p className="text-sm font-bold leading-tight text-white">
                    Hold steady · fill the box with the receipt
                  </p>
                  <p className="text-xs leading-snug mt-1 text-white font-medium">
                    Long receipt? Capture in sections — overlap each shot by ~20% so we don&apos;t miss a line.
                  </p>
                </div>
              </div>
            ) : captures.length < maxCaptures ? (
              <div className="absolute inset-x-0 bottom-3 flex items-center justify-center pointer-events-none px-4">
                <div
                  className="text-center bg-black/85 px-3 py-2 rounded-lg max-w-[92%] shadow-lg"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                >
                  <p className="text-xs font-bold leading-snug text-white">
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
          <p className="text-center text-xs text-white/90 font-medium">
            Max captures reached. Tap Done to process.
          </p>
        )}
      </footer>
    </div>
  )
}
