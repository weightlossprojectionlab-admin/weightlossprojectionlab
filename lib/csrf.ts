/**
 * CSRF Token Management (SEC-005)
 *
 * Client-side CSRF token generation and management using double-submit cookie pattern.
 * Tokens are cryptographically random and stored in both cookie and sent as header.
 *
 * Security Properties:
 * - Tokens are cryptographically random (using Web Crypto API)
 * - SameSite=Strict cookie prevents cross-site submission
 * - Secure flag enabled in production (HTTPS only)
 * - HttpOnly is NOT set (JavaScript needs to read token)
 * - Token rotation on auth state change (future enhancement)
 */

/**
 * Generate cryptographically secure random token
 * Uses Web Crypto API for unpredictable random generation
 */
export function generateCSRFToken(): string {
  // Generate 32 bytes (256 bits) of random data
  const array = new Uint8Array(32)

  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array)
  } else if (typeof global !== 'undefined' && global.crypto) {
    // Node.js environment (SSR)
    global.crypto.getRandomValues(array)
  } else {
    // Fallback for older environments (less secure)
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }

  // Convert to base64 for URL safety
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Get CSRF token from cookie, or generate new one if not present
 *
 * @returns CSRF token string
 */
export function getCSRFToken(): string {
  // Server-side rendering: return empty string
  if (typeof document === 'undefined') {
    return ''
  }

  // Try to get existing token from cookie
  const existingToken = getTokenFromCookie()
  if (existingToken) {
    return existingToken
  }

  // Generate new token and store in cookie
  const newToken = generateCSRFToken()
  setTokenCookie(newToken)
  return newToken
}

/**
 * Read CSRF token from cookie
 */
function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'csrf-token') {
      return value
    }
  }
  return null
}

/**
 * Set CSRF token in cookie with secure attributes
 */
function setTokenCookie(token: string): void {
  if (typeof document === 'undefined') return

  // Determine if we're in production (HTTPS)
  const isProduction = process.env.NODE_ENV === 'production'
  const isSecure = isProduction || (typeof window !== 'undefined' && window.location.protocol === 'https:')

  // Build cookie with secure attributes
  const cookieAttributes = [
    `csrf-token=${token}`,
    'path=/',
    'SameSite=Strict', // Prevents cross-site submission
  ]

  // Add Secure flag if using HTTPS
  if (isSecure) {
    cookieAttributes.push('Secure')
  }

  // Set max-age to 24 hours (86400 seconds)
  // Tokens are valid for the session but will auto-rotate daily
  cookieAttributes.push('max-age=86400')

  document.cookie = cookieAttributes.join('; ')
}

/**
 * Rotate CSRF token (call on login/logout for added security)
 *
 * Future enhancement: Automatically rotate on auth state changes
 * This prevents token fixation attacks
 */
export function rotateCSRFToken(): string {
  if (typeof document === 'undefined') return ''

  // Delete old token
  document.cookie = 'csrf-token=; path=/; max-age=0'

  // Generate and set new token
  const newToken = generateCSRFToken()
  setTokenCookie(newToken)
  return newToken
}

/**
 * Initialize CSRF protection on page load
 * Call this in your app's root component or _app.tsx
 *
 * @example
 * ```tsx
 * // In _app.tsx or layout component
 * useEffect(() => {
 *   initCSRFProtection()
 * }, [])
 * ```
 */
export function initCSRFProtection(): void {
  // Generate token on first load
  getCSRFToken()
}

/**
 * Check if CSRF token is present in cookie
 * Useful for debugging or conditional logic
 */
export function hasCSRFToken(): boolean {
  return getTokenFromCookie() !== null
}
