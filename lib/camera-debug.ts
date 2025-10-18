/**
 * Camera Debugging Utilities
 * Comprehensive diagnostic tools for camera access issues
 *
 * Usage:
 * import { debugCamera } from '@/lib/camera-debug'
 * await debugCamera.runFullDiagnostics()
 */

export interface CameraDiagnostics {
  environment: {
    isSecureContext: boolean
    protocol: string
    hostname: string
    userAgent: string
    isMobile: boolean
    isIOS: boolean
    isAndroid: boolean
  }
  support: {
    hasMediaDevices: boolean
    hasGetUserMedia: boolean
    hasPermissionsAPI: boolean
    hasEnumerateDevices: boolean
  }
  permission?: {
    state: string
    supportsQuery: boolean
  }
  devices?: {
    total: number
    cameras: number
    cameraList: Array<{
      label: string
      deviceId: string
      groupId: string
    }>
  }
  stream?: {
    active: boolean
    videoTracks: number
    tracks: Array<{
      enabled: boolean
      muted: boolean
      readyState: string
      label: string
    }>
  }
  errors: string[]
}

class CameraDebugger {
  private diagnostics: CameraDiagnostics = {
    environment: {
      isSecureContext: false,
      protocol: '',
      hostname: '',
      userAgent: '',
      isMobile: false,
      isIOS: false,
      isAndroid: false
    },
    support: {
      hasMediaDevices: false,
      hasGetUserMedia: false,
      hasPermissionsAPI: false,
      hasEnumerateDevices: false
    },
    errors: []
  }

  /**
   * Check environment (HTTPS, browser, platform)
   */
  checkEnvironment(): void {
    if (typeof window === 'undefined') {
      this.diagnostics.errors.push('Not in browser context')
      return
    }

    this.diagnostics.environment = {
      isSecureContext: window.isSecureContext,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      userAgent: navigator.userAgent,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
      isAndroid: /Android/i.test(navigator.userAgent)
    }

    console.group('📸 Camera Debug: Environment')
    console.log('Secure Context:', this.diagnostics.environment.isSecureContext)
    console.log('Protocol:', this.diagnostics.environment.protocol)
    console.log('Hostname:', this.diagnostics.environment.hostname)
    console.log('Mobile:', this.diagnostics.environment.isMobile)
    console.log('iOS:', this.diagnostics.environment.isIOS)
    console.log('Android:', this.diagnostics.environment.isAndroid)
    console.groupEnd()

    // Check for HTTPS requirement
    if (!this.diagnostics.environment.isSecureContext) {
      const isLocalhost = this.diagnostics.environment.hostname === 'localhost' ||
                         this.diagnostics.environment.hostname === '127.0.0.1'
      if (!isLocalhost) {
        this.diagnostics.errors.push('Camera requires HTTPS in production (not localhost)')
      }
    }
  }

  /**
   * Check browser API support
   */
  checkSupport(): void {
    if (typeof navigator === 'undefined') {
      this.diagnostics.errors.push('Navigator API not available')
      return
    }

    this.diagnostics.support = {
      hasMediaDevices: !!navigator.mediaDevices,
      hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
      hasPermissionsAPI: 'permissions' in navigator,
      hasEnumerateDevices: !!navigator.mediaDevices?.enumerateDevices
    }

    console.group('📸 Camera Debug: Browser Support')
    console.log('mediaDevices:', this.diagnostics.support.hasMediaDevices)
    console.log('getUserMedia:', this.diagnostics.support.hasGetUserMedia)
    console.log('Permissions API:', this.diagnostics.support.hasPermissionsAPI)
    console.log('enumerateDevices:', this.diagnostics.support.hasEnumerateDevices)
    console.groupEnd()

    if (!this.diagnostics.support.hasMediaDevices) {
      this.diagnostics.errors.push('MediaDevices API not supported')
    }
    if (!this.diagnostics.support.hasGetUserMedia) {
      this.diagnostics.errors.push('getUserMedia not supported')
    }
  }

  /**
   * Check camera permission status
   */
  async checkPermission(): Promise<void> {
    console.group('📸 Camera Debug: Permission State')

    if (!this.diagnostics.support.hasPermissionsAPI) {
      console.log('Permissions API not supported (common on iOS Safari)')
      this.diagnostics.permission = {
        state: 'unknown',
        supportsQuery: false
      }
      console.groupEnd()
      return
    }

    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
      this.diagnostics.permission = {
        state: result.state,
        supportsQuery: true
      }
      console.log('Permission State:', result.state)
    } catch (error: any) {
      console.log('Permission query failed:', error.message)
      this.diagnostics.permission = {
        state: 'error',
        supportsQuery: false
      }
      this.diagnostics.errors.push(`Permission query failed: ${error.message}`)
    }

    console.groupEnd()
  }

  /**
   * Enumerate available camera devices
   */
  async checkDevices(): Promise<void> {
    console.group('📸 Camera Debug: Devices')

    if (!this.diagnostics.support.hasEnumerateDevices) {
      console.log('enumerateDevices not supported')
      console.groupEnd()
      return
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(d => d.kind === 'videoinput')

      this.diagnostics.devices = {
        total: devices.length,
        cameras: cameras.length,
        cameraList: cameras.map(cam => ({
          label: cam.label || 'Unknown',
          deviceId: cam.deviceId,
          groupId: cam.groupId
        }))
      }

      console.log('Total Devices:', devices.length)
      console.log('Camera Devices:', cameras.length)
      cameras.forEach((cam, i) => {
        console.log(`  ${i + 1}. ${cam.label || 'Unknown'} (${cam.deviceId.substring(0, 20)}...)`)
      })

      if (cameras.length === 0) {
        this.diagnostics.errors.push('No camera devices found')
      }
    } catch (error: any) {
      console.error('Failed to enumerate devices:', error)
      this.diagnostics.errors.push(`Device enumeration failed: ${error.message}`)
    }

    console.groupEnd()
  }

  /**
   * Test camera stream
   */
  async testStream(): Promise<MediaStream | null> {
    console.group('📸 Camera Debug: Stream Test')

    try {
      console.log('Requesting camera stream...')

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })

      this.diagnostics.stream = {
        active: stream.active,
        videoTracks: stream.getVideoTracks().length,
        tracks: stream.getVideoTracks().map(track => ({
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label
        }))
      }

      console.log('✅ Stream obtained successfully!')
      console.log('Stream Active:', stream.active)
      console.log('Video Tracks:', stream.getVideoTracks().length)
      stream.getVideoTracks().forEach((track, i) => {
        console.log(`  Track ${i + 1}:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label
        })
      })

      console.groupEnd()
      return stream
    } catch (error: any) {
      console.error('❌ Stream request failed:', error)
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)

      this.diagnostics.errors.push(`Stream failed: ${error.name} - ${error.message}`)

      // Provide specific error guidance
      switch (error.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          console.log('💡 User denied camera permission or permission was blocked')
          break
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          console.log('💡 No camera device found')
          break
        case 'NotReadableError':
        case 'TrackStartError':
          console.log('💡 Camera is already in use by another application')
          break
        case 'OverconstrainedError':
          console.log('💡 Constraints cannot be satisfied. Try simpler constraints.')
          break
        case 'SecurityError':
          console.log('💡 Camera blocked for security reasons (HTTPS required)')
          break
        default:
          console.log('💡 Unknown error:', error.name)
      }

      console.groupEnd()
      return null
    }
  }

  /**
   * Run complete diagnostics
   */
  async runFullDiagnostics(): Promise<CameraDiagnostics> {
    console.log('🔍 Running Complete Camera Diagnostics...')
    console.log('='.repeat(50))

    this.diagnostics.errors = [] // Reset errors

    this.checkEnvironment()
    this.checkSupport()
    await this.checkPermission()
    await this.checkDevices()

    const stream = await this.testStream()

    // Clean up test stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      console.log('✓ Test stream cleaned up')
    }

    console.log('='.repeat(50))
    console.log('✅ Diagnostics Complete')

    if (this.diagnostics.errors.length > 0) {
      console.group('⚠️ Issues Found')
      this.diagnostics.errors.forEach((error, i) => {
        console.error(`${i + 1}. ${error}`)
      })
      console.groupEnd()
    } else {
      console.log('✅ No issues detected')
    }

    return this.diagnostics
  }

  /**
   * Get diagnostic results
   */
  getResults(): CameraDiagnostics {
    return { ...this.diagnostics }
  }

  /**
   * Export diagnostics as text report
   */
  generateReport(): string {
    const d = this.diagnostics
    let report = '📸 CAMERA DIAGNOSTICS REPORT\n'
    report += '='.repeat(50) + '\n\n'

    report += 'ENVIRONMENT:\n'
    report += `  Secure Context: ${d.environment.isSecureContext}\n`
    report += `  Protocol: ${d.environment.protocol}\n`
    report += `  Hostname: ${d.environment.hostname}\n`
    report += `  Mobile: ${d.environment.isMobile}\n`
    report += `  iOS: ${d.environment.isIOS}\n`
    report += `  Android: ${d.environment.isAndroid}\n\n`

    report += 'BROWSER SUPPORT:\n'
    report += `  MediaDevices API: ${d.support.hasMediaDevices}\n`
    report += `  getUserMedia: ${d.support.hasGetUserMedia}\n`
    report += `  Permissions API: ${d.support.hasPermissionsAPI}\n`
    report += `  enumerateDevices: ${d.support.hasEnumerateDevices}\n\n`

    if (d.permission) {
      report += 'PERMISSION:\n'
      report += `  State: ${d.permission.state}\n`
      report += `  Supports Query: ${d.permission.supportsQuery}\n\n`
    }

    if (d.devices) {
      report += 'DEVICES:\n'
      report += `  Total Devices: ${d.devices.total}\n`
      report += `  Camera Devices: ${d.devices.cameras}\n`
      d.devices.cameraList.forEach((cam, i) => {
        report += `    ${i + 1}. ${cam.label}\n`
      })
      report += '\n'
    }

    if (d.stream) {
      report += 'STREAM TEST:\n'
      report += `  Active: ${d.stream.active}\n`
      report += `  Video Tracks: ${d.stream.videoTracks}\n`
      d.stream.tracks.forEach((track, i) => {
        report += `    Track ${i + 1}: ${track.label} (${track.readyState})\n`
      })
      report += '\n'
    }

    if (d.errors.length > 0) {
      report += 'ISSUES FOUND:\n'
      d.errors.forEach((error, i) => {
        report += `  ${i + 1}. ${error}\n`
      })
    } else {
      report += 'NO ISSUES DETECTED ✓\n'
    }

    report += '\n' + '='.repeat(50)

    return report
  }
}

// Export singleton instance
export const debugCamera = new CameraDebugger()
