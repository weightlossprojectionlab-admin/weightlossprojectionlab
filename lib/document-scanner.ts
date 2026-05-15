/**
 * Document scanner — lazy-loaded perspective correction for receipt
 * (and other document-style) captures.
 *
 * Wraps jscanify + opencv.js. Both libraries are heavy (opencv.js
 * alone is ~8 MB WASM); we load them dynamically from a CDN the
 * first time someone opens the receipt scanner, then they're cached
 * by the browser (and the service worker, if configured) for the
 * rest of the session and beyond.
 *
 * Why CDN instead of bundling: bundling 8 MB of WASM through Next's
 * pipeline would balloon every build artifact + bog down cold loads
 * even for users who never scan a receipt. Loading from jsDelivr
 * keeps the main bundle untouched and lets the browser's standard
 * cache handle re-use across sessions.
 *
 * Failure semantics: every call falls back gracefully. If the library
 * can't load (CDN down, offline), or jscanify can't find a paper
 * contour (low-contrast background, receipt out of frame), or any
 * other unexpected error, `correctReceiptPerspective` returns the
 * raw input dataUrl unchanged. The OCR pipeline never sees a broken
 * image because of this layer.
 */

import { logger } from '@/lib/logger'

const OPENCV_SRC = 'https://docs.opencv.org/4.10.0/opencv.js'
const JSCANIFY_SRC = 'https://cdn.jsdelivr.net/npm/jscanify@1.3.0/dist/jscanify.min.js'

// Module-level singletons so multiple callers share one load.
let scannerPromise: Promise<JScanifyCtor | null> | null = null

/**
 * Constructor-shape we care about from jscanify. The real lib has
 * more, but we only use these.
 */
interface JScanifyCtor {
  new (): JScanifyInstance
}
interface JScanifyInstance {
  extractPaper(
    src: HTMLImageElement | HTMLCanvasElement,
    outputWidth: number,
    outputHeight: number,
  ): HTMLCanvasElement
}

/**
 * Lazy-load opencv.js + jscanify from CDN. Idempotent — second call
 * resolves immediately if the first succeeded. Returns null on
 * failure so callers can fall back.
 */
export function loadDocumentScanner(): Promise<JScanifyCtor | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (scannerPromise) return scannerPromise
  scannerPromise = (async () => {
    try {
      // Load OpenCV.js first — jscanify expects window.cv to exist.
      const w = window as any
      if (!w.cv || !w.cv.Mat) {
        await loadScript(OPENCV_SRC)
        await waitForCv()
      }
      // Load jscanify after cv is ready.
      if (!w.jscanify) {
        await loadScript(JSCANIFY_SRC)
      }
      const Ctor = w.jscanify as JScanifyCtor | undefined
      if (!Ctor) {
        logger.warn('[document-scanner] jscanify failed to register on window')
        return null
      }
      return Ctor
    } catch (err) {
      logger.warn('[document-scanner] lazy-load failed', {
        error: (err as Error).message,
      })
      scannerPromise = null // allow retry next time
      return null
    }
  })()
  return scannerPromise
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[data-document-scanner="${src}"]`,
    ) as HTMLScriptElement | null
    if (existing) {
      if (existing.dataset.loaded === '1') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`Script load failed: ${src}`)), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.documentScanner = src
    script.onload = () => {
      script.dataset.loaded = '1'
      resolve()
    }
    script.onerror = () => reject(new Error(`Script load failed: ${src}`))
    document.head.appendChild(script)
  })
}

/**
 * OpenCV.js's loader sets window.cv synchronously to a partial object
 * and emits onRuntimeInitialized when the WASM is fully ready. Poll
 * until Mat is constructable or we time out.
 */
function waitForCv(timeoutMs = 30_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const tick = () => {
      const cv = (window as any).cv
      if (cv && typeof cv.Mat === 'function') {
        resolve()
        return
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error('OpenCV.js failed to initialize within 30s'))
        return
      }
      setTimeout(tick, 100)
    }
    tick()
  })
}

/**
 * Apply perspective correction to a captured receipt frame. Detects
 * the largest 4-corner contour in the image (the receipt's edges)
 * and unwarps it to a flat top-down rectangular crop.
 *
 * Always falls back to the raw input on failure — callers can treat
 * the return value as "best available". The OCR pipeline never sees
 * a broken image from this layer.
 */
export async function correctReceiptPerspective(rawDataUrl: string): Promise<string> {
  if (typeof window === 'undefined') return rawDataUrl
  const Scanner = await loadDocumentScanner()
  if (!Scanner) return rawDataUrl
  try {
    const img = await loadImage(rawDataUrl)
    const scanner = new Scanner()
    // Output dimensions: match the source aspect so we don't squash
    // anything. extractPaper draws onto its own canvas at the
    // requested size; we hand off the original natural dimensions
    // so text density doesn't drop.
    const corrected = scanner.extractPaper(
      img,
      img.naturalWidth || 1080,
      img.naturalHeight || 1920,
    )
    if (!corrected || typeof corrected.toDataURL !== 'function') {
      return rawDataUrl
    }
    return corrected.toDataURL('image/jpeg', 0.96)
  } catch (err) {
    logger.debug('[document-scanner] correction failed, using raw frame', {
      error: (err as Error).message,
    })
    return rawDataUrl
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = src
  })
}

/**
 * Lightweight check the UI can poll to know whether the scanner
 * library is ready. Used to flip a "scanner ready" indicator in the
 * viewfinder once load completes, without forcing a re-render storm.
 */
export function isDocumentScannerReady(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as any
  return !!(w.cv && typeof w.cv.Mat === 'function' && w.jscanify)
}
