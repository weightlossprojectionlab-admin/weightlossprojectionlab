/**
 * Biometric Adapter
 *
 * Provides a unified biometric authentication interface across web and native platforms.
 * - Web: Uses WebAuthn API (browser-based, less reliable on mobile)
 * - Native: Uses Capacitor BiometricAuth plugin (FaceID, TouchID, Fingerprint - much more reliable)
 *
 * This adapter enables secure biometric authentication across all platforms.
 */

import { BiometricAuth as NativeBiometric, BiometryType, AuthenticateOptions } from '@aparajita/capacitor-biometric-auth'
import { isNative, isServer, isPluginAvailable } from '@/lib/platform'

export type BiometricType = 'faceId' | 'touchId' | 'fingerprint' | 'iris' | 'none'

export interface BiometricInfo {
  isAvailable: boolean
  biometricType: BiometricType
  strongBiometryAvailable: boolean
}

export interface BiometricAdapter {
  checkAvailability(): Promise<BiometricInfo>
  authenticate(reason: string): Promise<boolean>
}

/**
 * Web Biometric Adapter (uses WebAuthn)
 *
 * Note: WebAuthn has limited mobile browser support. This is primarily for desktop browsers.
 * On native, we use the more reliable NativeBiometric plugin.
 */
class WebBiometricAdapter implements BiometricAdapter {
  async checkAvailability(): Promise<BiometricInfo> {
    // Check if WebAuthn is available
    const isAvailable =
      typeof window !== 'undefined' &&
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential === 'function'

    // Can't detect specific biometric type in browser
    return {
      isAvailable,
      biometricType: 'none',
      strongBiometryAvailable: isAvailable,
    }
  }

  async authenticate(reason: string): Promise<boolean> {
    try {
      // Check availability first
      const info = await this.checkAvailability()
      if (!info.isAvailable) {
        throw new Error('WebAuthn not available')
      }

      // For web, we'll implement a simplified version
      // Full WebAuthn implementation should use existing lib/webauthn.ts
      console.warn('Web biometric authentication: Use lib/webauthn.ts for full implementation')

      // Return false for now - full implementation should integrate with existing WebAuthn
      return false
    } catch (error) {
      console.error('Web biometric authentication failed:', error)
      return false
    }
  }
}

/**
 * Native Biometric Adapter (uses Capacitor BiometricAuth)
 */
class NativeBiometricAdapter implements BiometricAdapter {
  async checkAvailability(): Promise<BiometricInfo> {
    try {
      if (!isPluginAvailable('NativeBiometric')) {
        return {
          isAvailable: false,
          biometricType: 'none',
          strongBiometryAvailable: false,
        }
      }

      const result = await NativeBiometric.checkBiometry()

      // Map Capacitor BiometryType to our BiometricType
      let biometricType: BiometricType = 'none'
      if (result.isAvailable) {
        switch (result.biometryType) {
          case BiometryType.faceId:
            biometricType = 'faceId'
            break
          case BiometryType.touchId:
            biometricType = 'touchId'
            break
          case BiometryType.fingerprintAuthentication:
            biometricType = 'fingerprint'
            break
          case BiometryType.irisAuthentication:
            biometricType = 'iris'
            break
          default:
            biometricType = 'none'
        }
      }

      return {
        isAvailable: result.isAvailable,
        biometricType,
        strongBiometryAvailable: result.strongBiometryIsAvailable ?? result.isAvailable,
      }
    } catch (error) {
      console.error('Failed to check biometric availability:', error)
      return {
        isAvailable: false,
        biometricType: 'none',
        strongBiometryAvailable: false,
      }
    }
  }

  async authenticate(reason: string): Promise<boolean> {
    try {
      // Check availability first
      const info = await this.checkAvailability()
      if (!info.isAvailable) {
        throw new Error('Biometric authentication not available')
      }

      // Perform biometric authentication
      const options: AuthenticateOptions = {
        reason,
        cancelTitle: 'Cancel',
        iosFallbackTitle: 'Use Passcode',
        androidTitle: 'Biometric Authentication',
        androidSubtitle: reason,
        androidConfirmationRequired: false,
        allowDeviceCredential: true, // Allow PIN/pattern/password fallback
      }

      await NativeBiometric.authenticate(options)
      return true
    } catch (error: any) {
      console.error('Biometric authentication failed:', error)

      // Check if user cancelled
      if (error.code === 'userCancel' || error.message?.includes('cancel')) {
        console.log('User cancelled biometric authentication')
        return false
      }

      // Other errors (sensor failure, etc.)
      throw error
    }
  }
}

/**
 * Server Biometric Adapter (no-op for SSR)
 */
class ServerBiometricAdapter implements BiometricAdapter {
  async checkAvailability(): Promise<BiometricInfo> {
    return {
      isAvailable: false,
      biometricType: 'none',
      strongBiometryAvailable: false,
    }
  }

  async authenticate(reason: string): Promise<boolean> {
    console.warn('Biometric authentication not available on server')
    return false
  }
}

/**
 * Get the appropriate biometric adapter for the current platform
 */
function getBiometricAdapter(): BiometricAdapter {
  if (isServer()) {
    return new ServerBiometricAdapter()
  }

  if (isNative()) {
    return new NativeBiometricAdapter()
  }

  return new WebBiometricAdapter()
}

// Export singleton instance
export const biometric = getBiometricAdapter()

/**
 * Utility: Get user-friendly biometric type name
 */
export function getBiometricTypeName(type: BiometricType): string {
  switch (type) {
    case 'faceId':
      return 'Face ID'
    case 'touchId':
      return 'Touch ID'
    case 'fingerprint':
      return 'Fingerprint'
    case 'iris':
      return 'Iris'
    case 'none':
      return 'None'
    default:
      return 'Unknown'
  }
}

/**
 * Utility: Get biometric icon name (for UI)
 */
export function getBiometricIcon(type: BiometricType): string {
  switch (type) {
    case 'faceId':
      return 'face'
    case 'touchId':
    case 'fingerprint':
      return 'fingerprint'
    case 'iris':
      return 'eye'
    default:
      return 'lock'
  }
}
