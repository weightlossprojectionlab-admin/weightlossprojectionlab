/**
 * Camera-related helper functions shared by all camera-using surfaces
 * (BarcodeScanner, ReceiptCaptureSurface, future photo-capture flows).
 *
 * Extracted so we don't duplicate the secure-context / capability checks
 * across components — same logic everywhere, single place to update if
 * browser support shifts.
 */

/**
 * True when the browser exposes navigator.mediaDevices.getUserMedia.
 * False on legacy browsers, some webviews, and HTTP contexts (which
 * strip mediaDevices entirely).
 */
export function isCameraSupported(): boolean {
  return !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  )
}

/**
 * Coarse platform detection used to tailor permission-error copy
 * (iOS sends users to Settings → Safari → Camera; Android sends them to
 * the address-bar lock icon). Not a security boundary — just for UX text.
 */
export function detectPlatform(): 'ios' | 'android' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop'
  const userAgent = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios'
  if (/android/.test(userAgent)) return 'android'
  return 'desktop'
}

/**
 * True when the page is served from a secure context (HTTPS, localhost).
 * getUserMedia is blocked on insecure origins; surfaces that need camera
 * use this to short-circuit to the file-upload / manual-entry fallback.
 */
export function isSecureContext(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.isSecureContext ||
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost'
  )
}

/**
 * Platform-specific permission-denied copy. Tells the user where to go
 * in their browser/OS settings to re-enable the camera. Falls back to a
 * generic message on desktop.
 */
export function permissionErrorMessage(): string {
  switch (detectPlatform()) {
    case 'ios':
      return 'Camera access denied. In iOS Settings, go to Safari > Camera and select "Allow". Then refresh this page.'
    case 'android':
      return 'Camera access denied. In Chrome, tap the lock icon in the address bar > Permissions > Camera > Allow.'
    default:
      return "Camera access denied. Click the camera icon in your browser's address bar to enable camera access."
  }
}
