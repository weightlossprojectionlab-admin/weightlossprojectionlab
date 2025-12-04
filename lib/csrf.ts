/**
 * CSRF Token Management (SEC-005)
 *
 * Client-side CSRF token generation and management using double-submit cookie pattern.
 */

export function generateCSRFToken(): string {
  const array = new Uint8Array(32)
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array)
  } else if (typeof global !== 'undefined' && global.crypto) {
    global.crypto.getRandomValues(array)
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return btoa(String.fromCharCode.apply(null, Array.from(array)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export function getCSRFToken(): string {
  if (typeof document === 'undefined') return ''

  // Try to get from cookie first
  const existingToken = getTokenFromCookie()
  if (existingToken) {
    return existingToken
  }

  // Fallback to sessionStorage if cookie doesn't work
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const sessionToken = sessionStorage.getItem('csrf-token')
    if (sessionToken) {
      console.log('[CSRF] Using token from sessionStorage (cookie fallback)')
      return sessionToken
    }
  }

  // Generate new token if none exists
  const newToken = generateCSRFToken()
  setTokenCookie(newToken)
  return newToken
}

function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null

  try {
    const cookies = document.cookie.split(';')

    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      // Try both csrf-token and csrf_token (underscore version)
      if (name === 'csrf_token' || name === 'csrf-token') {
        return value
      }
    }

    return null
  } catch (error) {
    console.error('[CSRF] Error reading cookies:', error)
    return null
  }
}

function setTokenCookie(token: string): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return

  try {
    // Try multiple approaches to set the token
    // Use underscore instead of hyphen (some browsers block hyphens)
    const cookieName = 'csrf_token'

    // 1. Try setting as a regular cookie (without any special attributes first)
    document.cookie = `${cookieName}=${token}; path=/`

    // 2. Also store in sessionStorage as backup (not sent to server, but available client-side)
    try {
      sessionStorage.setItem('csrf-token', token)
    } catch (storageError) {
      console.warn('[CSRF] Could not store in sessionStorage:', storageError)
    }

    // Verify after a short delay (only in development)
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        const verification = getTokenFromCookie()
        const success = token === verification
        if (!success) {
          console.error('[CSRF] Failed to set cookie! Using sessionStorage fallback.')
        }
      }, 10)
    }

  } catch (error) {
    console.error('[CSRF] Exception setting cookie:', error)
  }
}

export function rotateCSRFToken(): string {
  if (typeof document === 'undefined') return ''
  // Clear both old and new cookie names
  document.cookie = 'csrf-token=; path=/; max-age=0'
  document.cookie = 'csrf_token=; path=/; max-age=0'
  sessionStorage.removeItem('csrf-token')
  const newToken = generateCSRFToken()
  setTokenCookie(newToken)
  return newToken
}

export function initCSRFProtection(): void {
  getCSRFToken()
}

export function hasCSRFToken(): boolean {
  return getTokenFromCookie() !== null
}
