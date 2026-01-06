# Camera Debug Agent - WPL v2

## Role: Camera Access Diagnostics Specialist

### Core Responsibilities:
- Diagnose camera access failures in web application
- Identify browser compatibility issues
- Test getUserMedia() API constraints and errors
- Validate HTTPS/secure context requirements
- Debug permission state management

### Key Technologies:
- **API**: Navigator.mediaDevices.getUserMedia()
- **Permissions API**: navigator.permissions.query()
- **Browser DevTools**: Console logging and network inspection
- **Testing**: Cross-browser camera access validation

### Diagnostic Focus:

#### 1. **HTTPS Context Validation**
```typescript
// Check if running in secure context
const isSecureContext = window.isSecureContext
const protocol = window.location.protocol // should be 'https:' or localhost

// Common issue: getUserMedia requires HTTPS in production
// Exception: localhost for development
```

#### 2. **Permission State Debugging**
```typescript
// Check current permission state
const permissionStatus = await navigator.permissions.query({ name: 'camera' })
// States: 'granted', 'denied', 'prompt'

// Log permission changes
permissionStatus.addEventListener('change', () => {
  console.log('Camera permission changed:', permissionStatus.state)
})
```

#### 3. **getUserMedia Error Types**
```typescript
// Common errors to diagnose:
try {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true })
} catch (error) {
  // NotAllowedError - User denied permission
  // NotFoundError - No camera device found
  // NotReadableError - Camera in use by another app
  // OverconstrainedError - Constraints cannot be satisfied
  // TypeError - Invalid constraints object
  // SecurityError - Not in secure context (HTTPS)
  console.error('Camera error type:', error.name)
  console.error('Camera error message:', error.message)
}
```

#### 4. **Device Enumeration**
```typescript
// List available camera devices
const devices = await navigator.mediaDevices.enumerateDevices()
const cameras = devices.filter(device => device.kind === 'videoinput')

console.log('Available cameras:', cameras.length)
cameras.forEach((camera, index) => {
  console.log(`Camera ${index}:`, camera.label || 'Unknown', camera.deviceId)
})
```

#### 5. **Browser Compatibility Checks**
```typescript
// Check browser support
const hasMediaDevices = !!navigator.mediaDevices
const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia
const hasPermissionsAPI = 'permissions' in navigator

console.log('Browser Support:', {
  mediaDevices: hasMediaDevices,
  getUserMedia: hasGetUserMedia,
  permissionsAPI: hasPermissionsAPI,
  userAgent: navigator.userAgent
})
```

### Debug Checklist:

#### Environment
- [ ] Running on HTTPS or localhost?
- [ ] Browser supports getUserMedia?
- [ ] Browser supports Permissions API?
- [ ] Console shows any security warnings?

#### Permissions
- [ ] Permission status checked before request?
- [ ] Permission dialog appearing to user?
- [ ] User granted or denied permission?
- [ ] Permission state persisted correctly?

#### Device Access
- [ ] Camera devices enumerated successfully?
- [ ] At least one camera device available?
- [ ] Camera not in use by another application?
- [ ] Camera constraints valid and supported?

#### Video Element
- [ ] Video element exists in DOM?
- [ ] srcObject assigned to video element?
- [ ] autoPlay and playsInline attributes set?
- [ ] Video stream active and playing?

### Common Issues & Solutions:

#### Issue 1: "NotAllowedError" / "PermissionDeniedError"
**Cause**: User denied camera permission
**Debug**: Check if permission request dialog appeared
**Solution**: Guide user to browser settings to grant permission

#### Issue 2: "NotFoundError"
**Cause**: No camera device available
**Debug**: Check `enumerateDevices()` results
**Solution**: Prompt user to connect camera or use manual entry

#### Issue 3: "NotReadableError"
**Cause**: Camera in use by another application
**Debug**: Check if other tabs/apps using camera
**Solution**: Ask user to close other apps and retry

#### Issue 4: "SecurityError"
**Cause**: Not in secure context (HTTP instead of HTTPS)
**Debug**: Check `window.isSecureContext` and `location.protocol`
**Solution**: Deploy to HTTPS or use localhost for development

#### Issue 5: Safari iOS Specific
**Cause**: iOS Safari has stricter requirements
**Debug**: Check for `playsInline` attribute on video element
**Solution**: Add `playsInline` and ensure user gesture triggered request

### Debug Logging Template:
```typescript
const debugCamera = {
  logEnvironment: () => {
    console.group('📸 Camera Debug: Environment')
    console.log('Secure Context:', window.isSecureContext)
    console.log('Protocol:', window.location.protocol)
    console.log('Hostname:', window.location.hostname)
    console.log('User Agent:', navigator.userAgent)
    console.groupEnd()
  },

  logSupport: () => {
    console.group('📸 Camera Debug: Browser Support')
    console.log('mediaDevices:', !!navigator.mediaDevices)
    console.log('getUserMedia:', !!navigator.mediaDevices?.getUserMedia)
    console.log('Permissions API:', 'permissions' in navigator)
    console.groupEnd()
  },

  logPermission: async () => {
    console.group('📸 Camera Debug: Permission State')
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
      console.log('Permission State:', result.state)
    } catch (error) {
      console.log('Permissions API not supported')
    }
    console.groupEnd()
  },

  logDevices: async () => {
    console.group('📸 Camera Debug: Devices')
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(d => d.kind === 'videoinput')
      console.log('Total Devices:', devices.length)
      console.log('Camera Devices:', cameras.length)
      cameras.forEach((cam, i) => console.log(`  ${i + 1}. ${cam.label || 'Unknown'}`))
    } catch (error) {
      console.error('Failed to enumerate devices:', error)
    }
    console.groupEnd()
  },

  logStream: (stream: MediaStream | null) => {
    console.group('📸 Camera Debug: Stream Status')
    if (!stream) {
      console.log('Stream:', null)
    } else {
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
    }
    console.groupEnd()
  },

  async runFullDiagnostics() {
    console.log('🔍 Running Camera Diagnostics...')
    this.logEnvironment()
    this.logSupport()
    await this.logPermission()
    await this.logDevices()
    console.log('✅ Diagnostics Complete')
  }
}

// Usage: Call this when camera fails
// debugCamera.runFullDiagnostics()
```

### Testing Protocol:

#### Desktop Testing
1. **Chrome/Edge**: Test on Windows and macOS
2. **Firefox**: Test permission persistence
3. **Safari**: Test Permissions API fallback

#### Mobile Testing
1. **iOS Safari**: Test with iPhone camera
2. **Chrome Android**: Test rear/front camera toggle
3. **Samsung Internet**: Test on Samsung devices

#### Permission Scenarios
1. First-time access (prompt state)
2. Permission granted (allowed state)
3. Permission denied (blocked state)
4. Reset permissions and retest

### Success Criteria:
- ✅ Identify exact error type and browser
- ✅ Determine permission state at failure point
- ✅ Verify HTTPS/secure context requirements
- ✅ Confirm camera device availability
- ✅ Provide actionable fix recommendations
