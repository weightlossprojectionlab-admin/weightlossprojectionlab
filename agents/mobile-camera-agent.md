# Mobile Camera Agent - WPL v2

## Role: Mobile Camera Optimization Specialist

### Core Responsibilities:
- Ensure camera works on iOS Safari and Chrome Android
- Optimize mobile camera constraints (front/back camera)
- Handle mobile-specific permission flows
- Implement touch-optimized camera controls
- Test across various mobile devices and browsers

### Key Technologies:
- **Mobile Browsers**: iOS Safari, Chrome Android, Samsung Internet
- **Camera Facing**: Front (user) vs Rear (environment) camera
- **Touch Events**: Touch-optimized UI controls
- **Viewport**: Mobile viewport and orientation handling

### Mobile-Specific Focus:

#### 1. **iOS Safari Camera Implementation**
```typescript
// iOS Safari requires special handling
function isiOSSafari(): boolean {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS/i.test(ua)
}

async function startCameraIOS(): Promise<MediaStream> {
  // iOS Safari best practices
  const constraints: MediaStreamConstraints = {
    video: {
      facingMode: 'environment', // Rear camera
      // iOS Safari doesn't support all constraints
      // Keep it simple for maximum compatibility
    },
    audio: false // Don't request audio on iOS for camera-only use
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    return stream
  } catch (error) {
    console.error('iOS camera error:', error)

    // Fallback: Try without facingMode constraint
    try {
      return await navigator.mediaDevices.getUserMedia({ video: true })
    } catch (fallbackError) {
      throw fallbackError
    }
  }
}

// iOS requires video element to have playsInline attribute
// <video ref={videoRef} autoPlay playsInline muted />
```

#### 2. **Camera Facing Mode Toggle (Front/Back)**
```typescript
type CameraFacing = 'user' | 'environment'

function useCameraFacing() {
  const [facing, setFacing] = useState<CameraFacing>('environment')
  const streamRef = useRef<MediaStream | null>(null)

  const toggleFacing = async () => {
    const newFacing: CameraFacing = facing === 'user' ? 'environment' : 'user'

    try {
      // Stop current stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      // Request new stream with different facing mode
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: newFacing }
        }
      })

      streamRef.current = stream
      setFacing(newFacing)

      return stream
    } catch (error: any) {
      console.error('Camera facing toggle error:', error)

      // If exact facing mode fails, try ideal
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: newFacing }
          }
        })

        streamRef.current = stream
        setFacing(newFacing)
        return stream
      } catch (fallbackError) {
        console.error('Fallback facing mode also failed:', fallbackError)
        throw fallbackError
      }
    }
  }

  const getCurrentFacing = (): CameraFacing => facing

  return { facing, toggleFacing, getCurrentFacing }
}

// UI Component for camera flip button
function CameraFlipButton({ onFlip }: { onFlip: () => void }) {
  return (
    <button
      onClick={onFlip}
      className="absolute top-4 right-4 bg-white/80 backdrop-blur p-3 rounded-full shadow-lg active:scale-95 transition-transform"
      aria-label="Flip camera"
    >
      <svg
        className="w-6 h-6 text-gray-800"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </button>
  )
}
```

#### 3. **Mobile Permission Flow**
```typescript
// Mobile-specific permission handling
async function requestCameraPermissionMobile(): Promise<{
  granted: boolean
  stream?: MediaStream
  errorType?: string
}> {
  try {
    // On mobile, getUserMedia IS the permission request
    // There's no separate Permissions API check on iOS
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment'
      }
    })

    return {
      granted: true,
      stream
    }
  } catch (error: any) {
    const errorType = error.name

    // Handle mobile-specific errors
    if (errorType === 'NotAllowedError') {
      // User denied - show mobile settings instructions
      return {
        granted: false,
        errorType: 'denied'
      }
    } else if (errorType === 'NotFoundError') {
      // No camera (unlikely on phones, but possible on tablets)
      return {
        granted: false,
        errorType: 'no_camera'
      }
    } else {
      return {
        granted: false,
        errorType: 'unknown'
      }
    }
  }
}
```

#### 4. **Touch-Optimized Camera Controls**
```typescript
// Large touch targets for mobile (minimum 44x44px)
function MobileCameraControls({
  onCapture,
  onCancel,
  onFlip
}: {
  onCapture: () => void
  onCancel: () => void
  onFlip: () => void
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur p-6 safe-area-bottom">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="w-14 h-14 rounded-full bg-gray-600 flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Cancel"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Capture Button */}
        <button
          onClick={onCapture}
          className="w-20 h-20 rounded-full bg-white border-4 border-blue-500 flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Capture photo"
        >
          <div className="w-16 h-16 rounded-full bg-white" />
        </button>

        {/* Flip Camera Button */}
        <button
          onClick={onFlip}
          className="w-14 h-14 rounded-full bg-gray-600 flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Flip camera"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  )
}
```

#### 5. **Viewport and Orientation Handling**
```typescript
// Full-screen camera view for mobile
function MobileCameraView() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')

  useEffect(() => {
    // Detect orientation changes
    const handleOrientationChange = () => {
      const isPortrait = window.innerHeight > window.innerWidth
      setOrientation(isPortrait ? 'portrait' : 'landscape')
    }

    handleOrientationChange()
    window.addEventListener('resize', handleOrientationChange)
    window.addEventListener('orientationchange', handleOrientationChange)

    return () => {
      window.removeEventListener('resize', handleOrientationChange)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Full-screen video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${
          orientation === 'landscape' ? 'object-contain' : 'object-cover'
        }`}
        aria-label="Camera preview"
      />

      {/* Overlay with camera guide */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 border-4 border-white/50 rounded-2xl" />
      </div>
    </div>
  )
}
```

#### 6. **Mobile Browser Detection**
```typescript
export const detectMobileBrowser = () => {
  const ua = navigator.userAgent

  return {
    isIOS: /iPhone|iPad|iPod/i.test(ua),
    isIOSSafari: /iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS/i.test(ua),
    isAndroid: /Android/i.test(ua),
    isChromeAndroid: /Android/i.test(ua) && /Chrome/i.test(ua),
    isSamsungBrowser: /SamsungBrowser/i.test(ua),
    isFirefoxMobile: /Android/i.test(ua) && /Firefox/i.test(ua),
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
    supportsTouch: 'ontouchstart' in window,
    userAgent: ua
  }
}

// Usage
const browser = detectMobileBrowser()
if (browser.isIOSSafari) {
  // Use iOS-specific camera implementation
} else if (browser.isChromeAndroid) {
  // Use Android Chrome implementation
}
```

#### 7. **Mobile Settings Instructions**
```typescript
function getMobileSettingsInstructions(): string {
  const browser = detectMobileBrowser()

  if (browser.isIOS) {
    return `To enable camera on iPhone/iPad:

1. Open Settings app
2. Scroll down and tap Safari
3. Tap Camera
4. Select "Allow"
5. Return to this page and try again

Note: You may need to close and reopen Safari.`
  }

  if (browser.isAndroid) {
    if (browser.isSamsungBrowser) {
      return `To enable camera on Samsung Internet:

1. Open Settings
2. Go to Apps
3. Find "Samsung Internet"
4. Tap Permissions
5. Enable Camera
6. Return to this page and try again`
    }

    return `To enable camera on Android:

1. Open Settings
2. Go to Apps
3. Find your browser (Chrome/Firefox)
4. Tap Permissions
5. Enable Camera
6. Return to this page and try again`
  }

  return `To enable camera, check your browser settings and allow camera access for this website.`
}
```

#### 8. **Safe Area Insets for iOS**
```typescript
// Add to global CSS for iOS notch/safe area support
const safAreaStyles = `
  /* Support for iOS safe areas */
  .safe-area-top {
    padding-top: env(safe-area-inset-top);
  }

  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }

  .safe-area-left {
    padding-left: env(safe-area-inset-left);
  }

  .safe-area-right {
    padding-right: env(safe-area-inset-right);
  }

  /* Full viewport height accounting for mobile browser chrome */
  .h-screen-mobile {
    height: 100vh;
    height: -webkit-fill-available;
  }
`
```

### Mobile Testing Checklist:

#### iOS Testing
- [ ] iPhone Safari (latest iOS)
- [ ] iPhone Safari (iOS 15+)
- [ ] iPad Safari
- [ ] Camera permission prompt appears
- [ ] Rear camera activates by default
- [ ] Camera flip works (front/back)
- [ ] Photo capture works
- [ ] playsInline attribute prevents fullscreen

#### Android Testing
- [ ] Chrome on Android (latest)
- [ ] Samsung Internet Browser
- [ ] Firefox on Android
- [ ] Camera permission prompt appears
- [ ] Rear camera activates by default
- [ ] Camera flip works
- [ ] Different screen sizes (small, medium, large)

#### Touch & Gestures
- [ ] All buttons have 44x44px touch targets
- [ ] Touch feedback (active states) works
- [ ] No accidental taps due to small targets
- [ ] Pinch-to-zoom disabled on camera view
- [ ] Orientation change handled smoothly

#### Performance
- [ ] Camera starts within 2 seconds
- [ ] No lag when capturing photo
- [ ] Smooth camera flip transition
- [ ] Memory cleanup on exit
- [ ] Works on 3G/4G connection

### Common Mobile Issues & Solutions:

#### Issue 1: iOS Safari Camera Shows Black Screen
**Cause**: Missing `playsInline` attribute
**Solution**: Add `playsInline` to video element
```html
<video autoPlay playsInline muted />
```

#### Issue 2: Android Camera Wrong Orientation
**Cause**: Device rotation not detected
**Solution**: Listen to orientationchange event and adjust

#### Issue 3: Permission Denied on Mobile
**Cause**: User denied permission in system settings
**Solution**: Show detailed settings instructions

#### Issue 4: Camera Flip Not Working
**Cause**: `facingMode: { exact: 'environment' }` too strict
**Solution**: Use `ideal` instead of `exact`

### Success Criteria:
- ✅ Camera works on iOS Safari (iPhone/iPad)
- ✅ Camera works on Chrome Android
- ✅ Front/back camera toggle functional
- ✅ Touch controls optimized (44x44px minimum)
- ✅ Safe area insets respected on iOS
- ✅ Clear mobile settings instructions provided
