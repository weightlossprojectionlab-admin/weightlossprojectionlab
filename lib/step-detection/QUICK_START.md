# Step Detection - Quick Start Guide

## 5-Minute Integration

### 1. Import the Hook

```typescript
import { useStepCounter } from '@/hooks/useStepCounter'
```

### 2. Use in Your Component

```typescript
function MyStepCounter() {
  const {
    stepCount,      // Current step count
    isActive,       // Is counting?
    sensorStatus,   // Sensor availability
    error,          // Error message if any
    startCounting,  // Start detection
    stopCounting,   // Stop detection
    resetCount      // Reset counter
  } = useStepCounter()

  return (
    <div>
      <h1>Steps: {stepCount}</h1>
      <button onClick={startCounting}>Start</button>
      <button onClick={stopCounting}>Stop</button>
    </div>
  )
}
```

### 3. That's It!

The hook handles:
- ✅ Sensor initialization
- ✅ Permission requests (iOS)
- ✅ Step detection algorithm
- ✅ Auto-save to localStorage
- ✅ Firebase sync
- ✅ Error handling

---

## Common Use Cases

### Case 1: Simple Step Display

```typescript
function SimpleCounter() {
  const { stepCount, startCounting } = useStepCounter()

  useEffect(() => {
    startCounting() // Auto-start on mount
  }, [])

  return <h1>{stepCount} steps today</h1>
}
```

### Case 2: Manual Start/Stop

```typescript
function ManualCounter() {
  const { stepCount, isActive, startCounting, stopCounting } = useStepCounter()

  return (
    <>
      <div>{stepCount} steps</div>
      <button onClick={isActive ? stopCounting : startCounting}>
        {isActive ? 'Stop' : 'Start'}
      </button>
    </>
  )
}
```

### Case 3: With Progress Bar

```typescript
function ProgressCounter() {
  const { stepCount } = useStepCounter()
  const goal = 10000
  const progress = Math.min((stepCount / goal) * 100, 100)

  return (
    <div>
      <div>{stepCount} / {goal}</div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
```

### Case 4: Custom Configuration

```typescript
function SensitiveCounter() {
  const { stepCount } = useStepCounter({
    sensitivity: 1.5,        // Less sensitive (fewer false positives)
    minStepInterval: 250,    // Allow faster walking
    smoothingWindow: 5       // More smoothing
  })

  return <div>{stepCount}</div>
}
```

### Case 5: Save to Firebase

```typescript
function SaveableCounter() {
  const { stepCount, saveToFirebase } = useStepCounter()

  const handleSave = async () => {
    await saveToFirebase() // Saves to current date
    // Or specify date:
    // await saveToFirebase('2025-10-19')
  }

  return (
    <>
      <div>{stepCount} steps</div>
      <button onClick={handleSave}>Save</button>
    </>
  )
}
```

---

## Troubleshooting

### Problem: No steps detected

```typescript
function DebugCounter() {
  const { sensorStatus, error } = useStepCounter()

  if (!sensorStatus?.isAvailable) {
    return <div>Sensor not available on this device</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return <div>Sensor working!</div>
}
```

### Problem: Permission denied (iOS)

```typescript
function PermissionHandler() {
  const { sensorStatus, startCounting } = useStepCounter()

  const handleStart = async () => {
    // Must be called from user gesture
    await startCounting()
  }

  return (
    <button onClick={handleStart}>
      {sensorStatus?.needsPermission ? 'Grant Permission & Start' : 'Start'}
    </button>
  )
}
```

### Problem: Too many false positives

```typescript
// Reduce sensitivity
const { stepCount } = useStepCounter({
  sensitivity: 2.0,           // Higher threshold
  minMagnitudeDelta: 0.25     // Require larger peaks
})
```

### Problem: Missing some steps

```typescript
// Increase sensitivity
const { stepCount } = useStepCounter({
  sensitivity: 0.8,           // Lower threshold
  minMagnitudeDelta: 0.1      // Allow smaller peaks
})
```

---

## Algorithm Parameters

### Default Values

```typescript
{
  sensitivity: 1.2,          // g-force threshold
  minStepInterval: 300,      // ms (fastest step)
  maxStepInterval: 800,      // ms (slowest step)
  smoothingWindow: 3,        // samples to average
  minMagnitudeDelta: 0.15    // g-force (peak size)
}
```

### Parameter Tuning Guide

**sensitivity** (0.8 - 2.0)
- Lower → More steps detected (may have false positives)
- Higher → Fewer steps detected (may miss real steps)
- Default: 1.2

**minStepInterval** (200 - 400 ms)
- Lower → Allow faster walking/running
- Higher → Reject high-frequency shaking
- Default: 300

**maxStepInterval** (600 - 1000 ms)
- Lower → Require consistent pace
- Higher → Allow slower walking
- Default: 800

**smoothingWindow** (1 - 5 samples)
- Lower → More responsive, noisier
- Higher → Smoother, slower response
- Default: 3

**minMagnitudeDelta** (0.1 - 0.3 g)
- Lower → Detect subtle steps
- Higher → Only prominent steps
- Default: 0.15

---

## Testing Checklist

Before deploying:

- [ ] Test normal walking (95% accuracy)
- [ ] Test phone shaking (should not count)
- [ ] Test in pocket vs. hand
- [ ] Test on iOS (permission flow)
- [ ] Test on Android (no permission)
- [ ] Test localStorage persistence
- [ ] Test Firebase save
- [ ] Test error handling (no sensor)

---

## Performance Tips

### Battery Optimization

The system already throttles to 15 Hz (vs. 60 Hz native). For further optimization:

```typescript
// Lower sample rate by increasing throttle
const MIN_SAMPLE_INTERVAL = 100 // 10 Hz instead of 15 Hz
```

### Memory Optimization

The system keeps a small buffer (5 samples ≈ 0.3s). No optimization needed for normal use.

---

## API Reference

### Hook Return Values

```typescript
interface UseStepCounterReturn {
  // State
  stepCount: number          // Total steps detected
  sessionSteps: number       // Steps in current session
  isActive: boolean          // Is currently counting
  isCalibrated: boolean      // Has been calibrated
  sensorStatus: SensorStatus | null
  error: string | null       // Error message if any

  // Actions
  startCounting: () => Promise<void>
  stopCounting: () => void
  pauseCounting: () => void
  resumeCounting: () => Promise<void>
  resetCount: () => void
  saveToFirebase: (date?: string) => Promise<void>

  // Calibration
  startCalibration: () => void
  isCalibrating: boolean
}
```

### Configuration Options

```typescript
interface StepDetectionConfig {
  sensitivity: number         // 0.8 - 2.0 (default: 1.2)
  minStepInterval: number     // milliseconds (default: 300)
  maxStepInterval: number     // milliseconds (default: 800)
  smoothingWindow: number     // samples (default: 3)
  minMagnitudeDelta: number   // g-force (default: 0.15)
}
```

---

## Next Steps

1. **Read Full Docs**: See `README.md` for detailed algorithm explanation
2. **Run Tests**: See `TESTING.md` for comprehensive test suite
3. **Try Demo**: Use `demo.tsx` to visualize step detection in real-time
4. **Customize**: Adjust parameters for your use case
5. **Deploy**: System is production-ready!

---

## Support

For issues or questions:
1. Check `TESTING.md` for common problems
2. Enable debug logging in `algorithm.ts`
3. Use `testSensor()` to verify sensor works
4. Review browser console for errors

---

## License & Credits

Built with:
- **DeviceMotionEvent API** - W3C standard
- **Peak detection algorithm** - Signal processing
- **Moving average filter** - Noise reduction
- **TypeScript** - Type safety
- **React Hooks** - State management
