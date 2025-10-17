'use client'

// WebAuthn utility functions for biometric authentication

export interface BiometricCredential {
  id: string
  rawId: ArrayBuffer
  response: AuthenticatorAttestationResponse | AuthenticatorAssertionResponse
  type: 'public-key'
}

// Check if WebAuthn is supported
export const isWebAuthnSupported = (): boolean => {
  return typeof window !== 'undefined' &&
         'credentials' in navigator &&
         'create' in navigator.credentials &&
         typeof window.PublicKeyCredential !== 'undefined'
}

// Check if the device supports biometric authentication
export const isBiometricSupported = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) return false

  try {
    // Check if platform authenticator (Touch ID, Face ID, Windows Hello) is available
    const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    return available
  } catch (error) {
    console.error('Error checking biometric support:', error)
    return false
  }
}

// Check biometric permission status with detailed result
export const checkBiometricPermissionStatus = async (): Promise<{
  supported: boolean
  available: boolean
  message: string
}> => {
  if (!isWebAuthnSupported()) {
    return {
      supported: false,
      available: false,
      message: 'Biometric authentication is not supported in this browser. Please use a browser that supports WebAuthn.'
    }
  }

  try {
    const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()

    if (!available) {
      // Detect platform for specific message
      const userAgent = navigator.userAgent.toLowerCase()
      let deviceMessage = 'Your device does not support biometric authentication.'

      if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
        deviceMessage = 'Face ID or Touch ID is not available on this device. Please ensure it is set up in Settings > Face ID & Passcode (or Touch ID & Passcode).'
      } else if (userAgent.includes('android')) {
        deviceMessage = 'Fingerprint authentication is not available. Please ensure it is set up in Settings > Security > Fingerprint.'
      } else if (userAgent.includes('windows')) {
        deviceMessage = 'Windows Hello is not available. Please set it up in Settings > Accounts > Sign-in options.'
      } else if (userAgent.includes('mac')) {
        deviceMessage = 'Touch ID is not available on this Mac or not set up in System Preferences > Touch ID.'
      }

      return {
        supported: true, // WebAuthn is supported
        available: false, // But no biometric authenticator
        message: deviceMessage
      }
    }

    return {
      supported: true,
      available: true,
      message: 'Biometric authentication is ready to use.'
    }
  } catch (error) {
    console.error('Error checking biometric permission:', error)
    return {
      supported: false,
      available: false,
      message: 'Unable to check biometric authentication. Please try again.'
    }
  }
}

// Generate a random challenge
const generateChallenge = (): Uint8Array => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return array
}

// Convert ArrayBuffer to base64url
const arrayBufferToBase64url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Convert base64url to ArrayBuffer
const base64urlToArrayBuffer = (base64url: string): ArrayBuffer => {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Register a new biometric credential
export const registerBiometric = async (userId: string, userEmail: string): Promise<string> => {
  // Check permission status first
  const permissionStatus = await checkBiometricPermissionStatus()

  if (!permissionStatus.supported) {
    throw new Error('Biometric authentication is not supported in this browser. Please use a modern browser.')
  }

  if (!permissionStatus.available) {
    throw new Error(permissionStatus.message)
  }

  const challenge = generateChallenge()

  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: 'Weight Loss Progress Lab',
      id: window.location.hostname,
    },
    user: {
      id: new TextEncoder().encode(userId),
      name: userEmail,
      displayName: userEmail,
    },
    pubKeyCredParams: [
      {
        alg: -7, // ES256
        type: 'public-key',
      },
      {
        alg: -257, // RS256
        type: 'public-key',
      },
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Built-in authenticators only
      userVerification: 'required', // Require biometric verification
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'direct',
  }

  try {
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    }) as PublicKeyCredential

    if (!credential) {
      throw new Error('Failed to create credential')
    }

    // Return the credential ID for storage
    const credentialId = arrayBufferToBase64url(credential.rawId)

    // In a real app, you'd send this to your server to associate with the user
    console.log('Biometric credential registered:', credentialId)

    // Store credential ID locally for demo purposes
    localStorage.setItem(`biometric_${userId}`, credentialId)

    return credentialId

  } catch (error: any) {
    console.error('Biometric registration failed:', error)

    if (error.name === 'NotAllowedError') {
      throw new Error('Biometric registration was cancelled or denied')
    } else if (error.name === 'InvalidStateError') {
      throw new Error('This device is already registered for biometric authentication')
    } else if (error.name === 'NotSupportedError') {
      throw new Error('Biometric authentication is not supported on this device')
    } else {
      throw new Error('Failed to register biometric authentication')
    }
  }
}

// Authenticate using biometric
export const authenticateBiometric = async (userId: string): Promise<boolean> => {
  // Check permission status first
  const permissionStatus = await checkBiometricPermissionStatus()

  if (!permissionStatus.supported) {
    throw new Error('Biometric authentication is not supported in this browser. Please use a modern browser.')
  }

  if (!permissionStatus.available) {
    throw new Error(permissionStatus.message)
  }

  // Get stored credential ID
  const credentialId = localStorage.getItem(`biometric_${userId}`)
  if (!credentialId) {
    throw new Error('No biometric credentials found. Please register first.')
  }

  const challenge = generateChallenge()

  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials: [
      {
        id: base64urlToArrayBuffer(credentialId),
        type: 'public-key',
        transports: ['internal'], // Platform authenticator
      },
    ],
    userVerification: 'required',
    timeout: 60000,
  }

  try {
    const credential = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    }) as PublicKeyCredential

    if (!credential) {
      throw new Error('Authentication failed')
    }

    console.log('Biometric authentication successful')
    return true

  } catch (error: any) {
    console.error('Biometric authentication failed:', error)

    if (error.name === 'NotAllowedError') {
      throw new Error('Biometric authentication was cancelled or denied')
    } else if (error.name === 'InvalidStateError') {
      throw new Error('Invalid biometric authentication state')
    } else {
      throw new Error('Biometric authentication failed')
    }
  }
}

// Check if user has registered biometric authentication
export const hasBiometricCredential = (userId: string): boolean => {
  const credentialId = localStorage.getItem(`biometric_${userId}`)
  return !!credentialId
}

// Remove biometric credential
export const removeBiometricCredential = (userId: string): void => {
  localStorage.removeItem(`biometric_${userId}`)
}

// Get biometric status for a user
export const getBiometricStatus = async (userId: string): Promise<{
  supported: boolean
  enabled: boolean
  deviceType: string
}> => {
  const supported = await isBiometricSupported()
  const enabled = hasBiometricCredential(userId)

  let deviceType = 'Unknown'
  if (typeof window !== 'undefined') {
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      deviceType = 'iOS (Touch ID / Face ID)'
    } else if (userAgent.includes('android')) {
      deviceType = 'Android (Fingerprint)'
    } else if (userAgent.includes('windows')) {
      deviceType = 'Windows (Windows Hello)'
    } else if (userAgent.includes('mac')) {
      deviceType = 'macOS (Touch ID)'
    }
  }

  return { supported, enabled, deviceType }
}

// Get user-friendly error messages
export const getBiometricErrorMessage = (error: any): string => {
  if (!error) return 'Unknown error occurred'

  switch (error.name) {
    case 'NotAllowedError':
      return 'Permission denied. Please allow biometric authentication and try again.'
    case 'InvalidStateError':
      return 'Biometric authentication is already set up for this device.'
    case 'NotSupportedError':
      return 'Biometric authentication is not supported on this device or browser.'
    case 'SecurityError':
      return 'Security error. Please ensure you are using HTTPS and try again.'
    case 'AbortError':
      return 'Authentication was cancelled. Please try again.'
    case 'ConstraintError':
      return 'Device constraints not met. Please check your biometric settings.'
    case 'NotReadableError':
      return 'Biometric sensor is not available. Please try again later.'
    case 'UnknownError':
      return 'An unknown error occurred. Please try again.'
    default:
      return error.message || 'Biometric authentication failed. Please try again.'
  }
}

// Test biometric availability with detailed info
export const testBiometricCapabilities = async (): Promise<{
  webauthnSupported: boolean
  platformAuthenticatorAvailable: boolean
  conditionalMediationSupported: boolean
  userVerifyingPlatformAuthenticatorAvailable: boolean
}> => {
  const result = {
    webauthnSupported: false,
    platformAuthenticatorAvailable: false,
    conditionalMediationSupported: false,
    userVerifyingPlatformAuthenticatorAvailable: false
  }

  if (!isWebAuthnSupported()) {
    return result
  }

  result.webauthnSupported = true

  try {
    result.userVerifyingPlatformAuthenticatorAvailable =
      await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch (error) {
    console.warn('Could not check platform authenticator availability:', error)
  }

  try {
    // Check for conditional mediation support (future feature)
    result.conditionalMediationSupported =
      await PublicKeyCredential.isConditionalMediationAvailable?.() || false
  } catch (error) {
    console.warn('Conditional mediation not supported:', error)
  }

  return result
}