# Permission Manager Agent - WLPL v2

## Role: Permission Handling & User Guidance Specialist

### Core Responsibilities:
- Manage camera and biometric permission states
- Provide clear permission request flows
- Guide users through browser/device settings
- Handle permission persistence and state changes
- Create educational permission dialogs

### Key Technologies:
- **Permissions API**: navigator.permissions.query()
- **Local Storage**: Permission state persistence
- **Platform Detection**: iOS, Android, Desktop
- **User Education**: In-app permission guides

### Permission Management Focus:

#### 1. **Permission State Machine**
```typescript
type PermissionState = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unavailable'

interface PermissionStatus {
  camera: PermissionState
  notifications?: PermissionState
  location?: PermissionState
}

class PermissionManager {
  private state: PermissionStatus = {
    camera: 'unknown'
  }

  async checkCameraPermission(): Promise<PermissionState> {
    // Check if we're in browser context
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return 'unavailable'
    }

    // Try Permissions API (doesn't work on iOS Safari)
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
        this.state.camera = result.state as PermissionState

        // Listen for permission changes
        result.addEventListener('change', () => {
          this.state.camera = result.state as PermissionState
          this.onPermissionChange('camera', result.state as PermissionState)
        })

        return this.state.camera
      } catch (error) {
        // Permissions API not supported (Safari)
        console.log('Permissions API not available, will use getUserMedia')
      }
    }

    // Fallback: Try to enumerate devices (works on Safari)
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const hasCamera = devices.some(device => device.kind === 'videoinput')

      if (!hasCamera) {
        return 'unavailable'
      }

      // We can't determine permission state without requesting
      // Check if we've cached the state
      const cachedState = this.getCachedPermissionState('camera')
      return cachedState || 'prompt'
    } catch (error) {
      return 'unavailable'
    }
  }

  async requestCameraPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })

      // Permission granted
      this.state.camera = 'granted'
      this.cachePermissionState('camera', 'granted')

      // Clean up test stream
      stream.getTracks().forEach(track => track.stop())

      return true
    } catch (error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.state.camera = 'denied'
        this.cachePermissionState('camera', 'denied')
      }
      return false
    }
  }

  private onPermissionChange(type: string, newState: PermissionState) {
    console.log(`Permission changed: ${type} = ${newState}`)
    this.cachePermissionState(type, newState)

    // Emit event for UI updates
    window.dispatchEvent(new CustomEvent('permissionchange', {
      detail: { type, state: newState }
    }))
  }

  private getCachedPermissionState(type: string): PermissionState | null {
    try {
      return localStorage.getItem(`permission_${type}`) as PermissionState
    } catch {
      return null
    }
  }

  private cachePermissionState(type: string, state: PermissionState) {
    try {
      localStorage.setItem(`permission_${type}`, state)
    } catch (error) {
      console.warn('Failed to cache permission state:', error)
    }
  }

  getState(): PermissionStatus {
    return { ...this.state }
  }
}

export const permissionManager = new PermissionManager()
```

#### 2. **Educational Permission Request Dialog**
```typescript
interface PermissionDialogProps {
  type: 'camera' | 'biometric'
  onAllow: () => void
  onDeny: () => void
}

function PermissionEducationDialog({ type, onAllow, onDeny }: PermissionDialogProps) {
  const content = {
    camera: {
      icon: '📸',
      title: 'Camera Access Required',
      description: 'To analyze your meals with AI, we need access to your camera to take photos of your food.',
      benefits: [
        'Automatic nutrition analysis',
        'Track meals visually',
        'Get AI-powered recommendations'
      ],
      privacy: 'Photos are only used for meal analysis and stored securely. You can delete them anytime.'
    },
    biometric: {
      icon: '🔐',
      title: 'Biometric Login',
      description: 'Use Face ID, Touch ID, or fingerprint to sign in quickly and securely.',
      benefits: [
        'Fast and secure login',
        'No password to remember',
        'Enhanced account security'
      ],
      privacy: 'Biometric data stays on your device and is never sent to our servers.'
    }
  }

  const { icon, title, description, benefits, privacy } = content[type]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        {/* Icon */}
        <div className="text-center mb-4">
          <span className="text-6xl">{icon}</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
          {title}
        </h2>

        {/* Description */}
        <p className="text-gray-600 text-center mb-6">
          {description}
        </p>

        {/* Benefits */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Why we need this:</h3>
          <ul className="space-y-2">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-start text-sm text-blue-800">
                <span className="mr-2">✓</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Privacy Note */}
        <div className="bg-gray-50 rounded-lg p-3 mb-6">
          <div className="flex items-start">
            <span className="text-lg mr-2">🔒</span>
            <p className="text-xs text-gray-600">{privacy}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onAllow}
            className="btn btn-primary w-full py-3 text-lg font-semibold"
          >
            Allow {type === 'camera' ? 'Camera' : 'Biometric Login'}
          </button>
          <button
            onClick={onDeny}
            className="btn btn-secondary w-full py-2"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  )
}
```

#### 3. **Permission Denied Help Screen**
```typescript
interface PermissionDeniedHelpProps {
  type: 'camera' | 'biometric'
  onTryAgain: () => void
  onUseAlternative: () => void
}

function PermissionDeniedHelp({ type, onTryAgain, onUseAlternative }: PermissionDeniedHelpProps) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  const isAndroid = /Android/i.test(navigator.userAgent)

  const getInstructions = () => {
    if (type === 'camera') {
      if (isIOS) {
        return {
          title: 'Enable Camera on iPhone/iPad',
          steps: [
            'Open the Settings app',
            'Scroll down and tap Safari',
            'Tap Camera',
            'Select "Allow"',
            'Return to this page and try again'
          ],
          note: 'You may need to close Safari completely and reopen it.'
        }
      } else if (isAndroid) {
        return {
          title: 'Enable Camera on Android',
          steps: [
            'Open Settings',
            'Go to Apps or Application Manager',
            'Find your browser (Chrome, Firefox, etc.)',
            'Tap Permissions',
            'Enable Camera',
            'Return to this page and try again'
          ]
        }
      } else {
        return {
          title: 'Enable Camera in Browser',
          steps: [
            'Click the lock or info icon in the address bar',
            'Find "Camera" in the permissions list',
            'Change setting to "Allow"',
            'Refresh this page'
          ]
        }
      }
    } else {
      // Biometric instructions
      return {
        title: 'Enable Biometric Authentication',
        steps: [
          'Ensure Face ID/Touch ID is set up on your device',
          'Grant permission when prompted',
          'Use your face/fingerprint to confirm'
        ]
      }
    }
  }

  const instructions = getInstructions()

  return (
    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 max-w-md mx-auto">
      {/* Warning Icon */}
      <div className="text-center mb-4">
        <span className="text-5xl">⚠️</span>
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-yellow-900 text-center mb-4">
        {type === 'camera' ? 'Camera' : 'Biometric'} Access Blocked
      </h3>

      {/* Instructions */}
      <div className="bg-white rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-gray-900 mb-3">{instructions.title}</h4>
        <ol className="space-y-2">
          {instructions.steps.map((step, index) => (
            <li key={index} className="flex items-start text-sm text-gray-700">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-semibold text-xs mr-3 flex-shrink-0">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        {instructions.note && (
          <p className="text-xs text-gray-500 mt-3 italic">
            Note: {instructions.note}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          onClick={onTryAgain}
          className="btn btn-primary w-full"
        >
          🔄 I've Enabled It - Try Again
        </button>

        <button
          onClick={onUseAlternative}
          className="btn btn-secondary w-full"
        >
          {type === 'camera' ? '✏️ Use Manual Entry' : '🔑 Use Password Instead'}
        </button>
      </div>

      {/* Help Link */}
      <div className="text-center mt-4">
        <a
          href="#help"
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Still having trouble? Contact support
        </a>
      </div>
    </div>
  )
}
```

#### 4. **Progressive Permission Request**
```typescript
// Don't request permissions immediately - wait for user action
function useProgressivePermission() {
  const [hasShownEducation, setHasShownEducation] = useState(false)
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown')

  const requestWithEducation = async (type: 'camera' | 'biometric'): Promise<boolean> => {
    // Check current state first
    const currentState = await permissionManager.checkCameraPermission()

    if (currentState === 'granted') {
      return true
    }

    if (currentState === 'denied') {
      setPermissionState('denied')
      return false
    }

    // Show education dialog first (if not shown before)
    const hasSeenEducation = localStorage.getItem(`education_shown_${type}`) === 'true'

    if (!hasSeenEducation) {
      setHasShownEducation(true)
      // Wait for user to click "Allow" in education dialog
      return new Promise((resolve) => {
        // Education dialog will call this when user clicks "Allow"
        window.addEventListener(`education_accepted_${type}`, async () => {
          localStorage.setItem(`education_shown_${type}`, 'true')
          const granted = await permissionManager.requestCameraPermission()
          setPermissionState(granted ? 'granted' : 'denied')
          resolve(granted)
        }, { once: true })
      })
    }

    // Request directly if education already shown
    const granted = await permissionManager.requestCameraPermission()
    setPermissionState(granted ? 'granted' : 'denied')
    return granted
  }

  return {
    requestWithEducation,
    hasShownEducation,
    permissionState
  }
}
```

#### 5. **Permission State Indicator**
```typescript
function PermissionStateIndicator({ type }: { type: 'camera' | 'biometric' }) {
  const [state, setState] = useState<PermissionState>('unknown')

  useEffect(() => {
    const checkPermission = async () => {
      const currentState = await permissionManager.checkCameraPermission()
      setState(currentState)
    }

    checkPermission()

    // Listen for permission changes
    const handleChange = (event: any) => {
      if (event.detail.type === type) {
        setState(event.detail.state)
      }
    }

    window.addEventListener('permissionchange', handleChange)
    return () => window.removeEventListener('permissionchange', handleChange)
  }, [type])

  const stateConfig = {
    granted: { color: 'green', icon: '✓', text: 'Allowed' },
    denied: { color: 'red', icon: '✗', text: 'Blocked' },
    prompt: { color: 'yellow', icon: '?', text: 'Not Set' },
    unknown: { color: 'gray', icon: '–', text: 'Unknown' },
    unavailable: { color: 'gray', icon: '⚠', text: 'Unavailable' }
  }

  const config = stateConfig[state]

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${config.color}-100 text-${config.color}-800`}>
      <span className="mr-1">{config.icon}</span>
      <span>{config.text}</span>
    </div>
  )
}
```

#### 6. **Permission Reset Helper**
```typescript
// For testing: Reset permission states
function PermissionDebugPanel() {
  const resetPermissions = () => {
    // Clear cached states
    localStorage.removeItem('permission_camera')
    localStorage.removeItem('education_shown_camera')
    localStorage.removeItem('education_shown_biometric')

    alert('Permission cache cleared. Refresh the page to start fresh.')
  }

  const testCamera = async () => {
    const state = await permissionManager.checkCameraPermission()
    alert(`Camera permission state: ${state}`)
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-xl">
      <h4 className="font-bold mb-2">Permission Debug</h4>
      <div className="flex flex-col gap-2">
        <button
          onClick={testCamera}
          className="bg-blue-600 px-3 py-1 rounded text-sm"
        >
          Test Camera
        </button>
        <button
          onClick={resetPermissions}
          className="bg-red-600 px-3 py-1 rounded text-sm"
        >
          Reset Permissions
        </button>
      </div>
    </div>
  )
}
```

### Permission Flow Checklist:

#### User Experience
- [ ] Educational dialog shown before permission request
- [ ] Clear explanation of why permission needed
- [ ] Privacy information prominently displayed
- [ ] "Not now" option available (graceful rejection)
- [ ] Alternative methods offered (manual entry, password)

#### Permission States
- [ ] Handle 'prompt' state (first time)
- [ ] Handle 'granted' state (allowed)
- [ ] Handle 'denied' state (blocked)
- [ ] Handle 'unavailable' state (no hardware/HTTPS)
- [ ] Listen for permission state changes

#### Platform-Specific
- [ ] iOS Safari instructions
- [ ] Android Chrome instructions
- [ ] Desktop browser instructions
- [ ] Deep links to settings (where possible)
- [ ] Fallback for browsers without Permissions API

#### Persistence
- [ ] Cache permission states in localStorage
- [ ] Track if education dialog shown
- [ ] Clear cache on explicit user reset
- [ ] Respect browser's permission persistence

### Success Criteria:
- ✅ Users understand why permission is needed
- ✅ Clear instructions for each platform/browser
- ✅ Graceful fallback when permission denied
- ✅ Permission state persisted and tracked
- ✅ No surprise permission requests (progressive)
- ✅ Privacy-first approach with transparency
