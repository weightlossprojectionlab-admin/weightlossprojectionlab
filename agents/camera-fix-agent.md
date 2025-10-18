# Camera Fix Agent - WLPL v2

## Role: Camera Functionality Implementation Specialist

### Core Responsibilities:
- Implement robust camera access with error handling
- Fix getUserMedia() lifecycle and cleanup issues
- Improve user feedback for permission errors
- Ensure cross-browser camera compatibility
- Add fallback mechanisms for camera failures

### Key Technologies:
- **API**: Navigator.mediaDevices.getUserMedia()
- **React Hooks**: useRef, useEffect, useState
- **TypeScript**: Strict error typing
- **Video Element**: HTML5 video with proper lifecycle

### Implementation Focus:

#### 1. **Proper Video Stream Lifecycle**
```typescript
import { useRef, useEffect } from 'react'

function useCameraStream() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = async () => {
    try {
      // Stop existing stream before requesting new one
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Rear camera on mobile
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        }
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Wait for video to be ready
        await videoRef.current.play()
      }

      return stream
    } catch (error) {
      console.error('Camera start error:', error)
      throw error
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        console.log('Camera track stopped:', track.label)
      })
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return { videoRef, startCamera, stopCamera }
}
```

#### 2. **Comprehensive Error Handling**
```typescript
type CameraError = {
  type: 'permission' | 'not_found' | 'in_use' | 'constraint' | 'security' | 'unknown'
  message: string
  userMessage: string
  canRetry: boolean
  requiresSettings: boolean
}

function parseCameraError(error: any): CameraError {
  const errorName = error.name || 'UnknownError'

  switch (errorName) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return {
        type: 'permission',
        message: error.message,
        userMessage: 'Camera access was denied. Please enable camera permissions in your browser settings.',
        canRetry: false,
        requiresSettings: true
      }

    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return {
        type: 'not_found',
        message: error.message,
        userMessage: 'No camera was found on this device. Please connect a camera or use manual entry.',
        canRetry: false,
        requiresSettings: false
      }

    case 'NotReadableError':
    case 'TrackStartError':
      return {
        type: 'in_use',
        message: error.message,
        userMessage: 'Camera is currently in use by another application. Please close other apps and try again.',
        canRetry: true,
        requiresSettings: false
      }

    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return {
        type: 'constraint',
        message: error.message,
        userMessage: 'Camera does not support the required resolution. Trying with default settings...',
        canRetry: true,
        requiresSettings: false
      }

    case 'SecurityError':
      return {
        type: 'security',
        message: error.message,
        userMessage: 'Camera access requires a secure connection (HTTPS). Please ensure you are using HTTPS.',
        canRetry: false,
        requiresSettings: false
      }

    default:
      return {
        type: 'unknown',
        message: error.message || 'Unknown error',
        userMessage: 'Unable to access camera. Please try manual entry or contact support.',
        canRetry: true,
        requiresSettings: false
      }
  }
}
```

#### 3. **Retry Logic with Fallback Constraints**
```typescript
async function startCameraWithFallback(): Promise<MediaStream> {
  // Primary constraints: High quality rear camera
  const primaryConstraints: MediaStreamConstraints = {
    video: {
      facingMode: 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  }

  // Fallback constraints: Basic camera
  const fallbackConstraints: MediaStreamConstraints = {
    video: true
  }

  try {
    // Try primary constraints first
    return await navigator.mediaDevices.getUserMedia(primaryConstraints)
  } catch (error: any) {
    console.warn('Primary camera constraints failed, trying fallback:', error.name)

    if (error.name === 'OverconstrainedError') {
      // Try basic constraints
      try {
        return await navigator.mediaDevices.getUserMedia(fallbackConstraints)
      } catch (fallbackError) {
        console.error('Fallback camera constraints also failed:', fallbackError)
        throw fallbackError
      }
    }

    throw error
  }
}
```

#### 4. **Secure Context Check**
```typescript
function checkSecureContext(): { secure: boolean; message: string } {
  if (typeof window === 'undefined') {
    return { secure: false, message: 'Not in browser context' }
  }

  // Check if secure context
  if (!window.isSecureContext) {
    const isLocalhost = window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1'

    if (isLocalhost) {
      return { secure: true, message: 'Localhost is allowed' }
    }

    return {
      secure: false,
      message: 'Camera requires HTTPS. Please use a secure connection.'
    }
  }

  return { secure: true, message: 'Secure context verified' }
}
```

#### 5. **Camera State Management**
```typescript
type CameraState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'active'; stream: MediaStream }
  | { status: 'error'; error: CameraError }
  | { status: 'denied' }

function useCameraState() {
  const [state, setState] = useState<CameraState>({ status: 'idle' })

  const requestCamera = async () => {
    setState({ status: 'requesting' })

    // Check secure context first
    const securityCheck = checkSecureContext()
    if (!securityCheck.secure) {
      const error: CameraError = {
        type: 'security',
        message: securityCheck.message,
        userMessage: securityCheck.message,
        canRetry: false,
        requiresSettings: false
      }
      setState({ status: 'error', error })
      return
    }

    try {
      const stream = await startCameraWithFallback()
      setState({ status: 'active', stream })
    } catch (error: any) {
      const cameraError = parseCameraError(error)

      if (cameraError.type === 'permission') {
        setState({ status: 'denied' })
      } else {
        setState({ status: 'error', error: cameraError })
      }
    }
  }

  const resetCamera = () => {
    setState({ status: 'idle' })
  }

  return { state, requestCamera, resetCamera }
}
```

#### 6. **User-Friendly Error UI Component**
```typescript
interface CameraErrorProps {
  error: CameraError
  onRetry?: () => void
  onManualEntry?: () => void
}

function CameraErrorDisplay({ error, onRetry, onManualEntry }: CameraErrorProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <span className="text-red-600 text-2xl">⚠️</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800 mb-1">
            Camera Access Issue
          </h3>
          <p className="text-sm text-red-700 mb-3">
            {error.userMessage}
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            {error.canRetry && onRetry && (
              <button
                onClick={onRetry}
                className="btn btn-sm bg-red-600 text-white hover:bg-red-700"
              >
                🔄 Try Again
              </button>
            )}

            {error.requiresSettings && (
              <button
                onClick={() => alert(getSettingsInstructions())}
                className="btn btn-sm bg-red-100 text-red-800 hover:bg-red-200"
              >
                ⚙️ Open Settings Guide
              </button>
            )}

            {onManualEntry && (
              <button
                onClick={onManualEntry}
                className="btn btn-sm bg-gray-600 text-white hover:bg-gray-700"
              >
                ✏️ Manual Entry Instead
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getSettingsInstructions(): string {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  const isAndroid = /Android/i.test(navigator.userAgent)

  if (isIOS) {
    return 'To enable camera:\n\n1. Open Settings app\n2. Scroll to Safari\n3. Tap Camera\n4. Select "Allow"'
  } else if (isAndroid) {
    return 'To enable camera:\n\n1. Open Settings\n2. Go to Apps\n3. Find your browser\n4. Tap Permissions\n5. Enable Camera'
  } else {
    return 'To enable camera:\n\n1. Click the lock icon in address bar\n2. Find Camera permissions\n3. Select "Allow"\n4. Refresh the page'
  }
}
```

#### 7. **Photo Capture with Quality Control**
```typescript
interface CapturePhotoOptions {
  quality?: number // 0.0 to 1.0
  maxWidth?: number
  maxHeight?: number
}

function capturePhoto(
  videoElement: HTMLVideoElement,
  options: CapturePhotoOptions = {}
): string | null {
  const {
    quality = 0.85,
    maxWidth = 1920,
    maxHeight = 1080
  } = options

  try {
    const canvas = document.createElement('canvas')

    // Calculate dimensions maintaining aspect ratio
    let width = videoElement.videoWidth
    let height = videoElement.videoHeight

    if (width > maxWidth) {
      height = (height * maxWidth) / width
      width = maxWidth
    }

    if (height > maxHeight) {
      width = (width * maxHeight) / height
      height = maxHeight
    }

    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    // Draw video frame to canvas
    ctx.drawImage(videoElement, 0, 0, width, height)

    // Convert to JPEG with quality setting
    const imageData = canvas.toDataURL('image/jpeg', quality)

    console.log('Photo captured:', { width, height, quality, size: imageData.length })

    return imageData
  } catch (error) {
    console.error('Photo capture error:', error)
    return null
  }
}
```

### Implementation Checklist:

#### Core Fixes
- [x] Proper stream lifecycle (start/stop/cleanup)
- [x] Comprehensive error type handling
- [x] Retry logic with fallback constraints
- [x] Secure context validation
- [x] State management for camera status

#### User Experience
- [x] User-friendly error messages
- [x] Platform-specific settings instructions
- [x] Retry and manual entry fallbacks
- [x] Loading states during camera initialization

#### Quality & Performance
- [x] Photo capture with quality control
- [x] Resolution constraints optimization
- [x] Memory cleanup on unmount
- [x] Error logging for debugging

### Success Criteria:
- ✅ Camera starts successfully on supported browsers
- ✅ Graceful error handling with helpful messages
- ✅ Automatic retry with fallback constraints
- ✅ Clean stream cleanup preventing memory leaks
- ✅ Fallback to manual entry when camera unavailable
