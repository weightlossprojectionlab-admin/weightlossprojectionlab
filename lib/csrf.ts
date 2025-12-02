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
  const existingToken = getTokenFromCookie()
  if (existingToken) return existingToken
  const newToken = generateCSRFToken()
  setTokenCookie(newToken)
  return newToken
}

function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'csrf-token') return value
  }
  return null
}

function setTokenCookie(token: string): void {
  if (typeof document === 'undefined') return
  const isProduction = process.env.NODE_ENV === 'production'
  const isSecure = isProduction || (typeof window !== 'undefined' && window.location.protocol === 'https:')
  const cookieAttributes = [`csrf-token=${token}`, 'path=/', 'SameSite=Strict']
  if (isSecure) cookieAttributes.push('Secure')
  cookieAttributes.push('max-age=86400')
  document.cookie = cookieAttributes.join('; ')
}

export function rotateCSRFToken(): string {
  if (typeof document === 'undefined') return ''
  document.cookie = 'csrf-token=; path=/; max-age=0'
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
