# Step Detection System

A production-ready step counter using device accelerometer data with advanced signal processing and false-positive filtering.

## Features

- **Real-time step detection** using DeviceMotionEvent API
- **Peak detection algorithm** with moving average smoothing
- **False-positive filtering** removes phone shaking, driving, etc.
- **Auto-calibration** adapts to user's walking pattern
- **Cross-platform support** (iOS 13+ with permission, Android)
- **Auto-save** to localStorage and Firebase
- **Battery efficient** throttled to 15 Hz sample rate

## Architecture

### Core Components

1. **types.ts** - TypeScript interfaces and type definitions
2. **algorithm.ts** - Step detection algorithm with signal processing
3. **sensor.ts** - Device sensor access and permission handling
4. **calibration.ts** - Auto-calibration system
5. **useStepCounter.ts** - React hook for easy integration

## Algorithm Overview

### Signal Processing Pipeline

```
DeviceMotionEvent
    ↓
Accelerometer Data (x, y, z)
    ↓
Magnitude Calculation: |a| = √(x² + y² + z²)
    ↓
Moving Average Filter (window = 3 samples)
    ↓
Peak Detection (local maxima)
    ↓
Step Validation (timing + magnitude)
    ↓
Increment Counter
```

### Peak Detection

The algorithm identifies steps by detecting peaks in the acceleration magnitude:

1. **Magnitude Calculation**: Convert 3D acceleration to scalar value
2. **Smoothing Filter**: Apply 3-sample moving average to reduce noise
3. **Peak Detection**: Find local maxima above sensitivity threshold
4. **Validation**: Check timing (300-800ms) and magnitude (>0.15g)

### False-Positive Filtering

The system rejects non-step movements:

- **Phone shaking**: Interval < 300ms (too fast)
- **Sitting/standing**: Interval > 800ms (too slow)
- **Small movements**: Magnitude delta < 0.15g (too subtle)
- **Continuous vibration**: Regular patterns without proper peaks

## Algorithm Parameters

### Default Configuration

```typescript
{
  sensitivity: 1.2,          // g-force threshold
  minStepInterval: 300,      // ms (200 steps/min max)
  maxStepInterval: 800,      // ms (75 steps/min min)
  smoothingWindow: 3,        // samples
  minMagnitudeDelta: 0.15    // g-force
}
```

### Parameter Tuning

- **sensitivity**: Higher = fewer steps detected (use 1.0-1.5)
- **minStepInterval**: Lower = faster walking allowed
- **maxStepInterval**: Higher = slower walking allowed
- **smoothingWindow**: Higher = smoother but slower response
- **minMagnitudeDelta**: Higher = only prominent peaks count

## Usage

### Basic Usage

```typescript
import { useStepCounter } from '@/hooks/useStepCounter'

function MyComponent() {
  const {
    stepCount,
    isActive,
    startCounting,
    stopCounting,
    resetCount
  } = useStepCounter()

  return (
    <div>
      <h1>Steps: {stepCount}</h1>
      <button onClick={startCounting}>Start</button>
      <button onClick={stopCounting}>Stop</button>
      <button onClick={resetCount}>Reset</button>
    </div>
  )
}
```

### With Custom Configuration

```typescript
const { stepCount } = useStepCounter({
  sensitivity: 1.5,        // Less sensitive
  minStepInterval: 250,    // Allow faster walking
  smoothingWindow: 5       // More smoothing
})
```

### Manual Algorithm Usage

```typescript
import {
  processSample,
  DEFAULT_CONFIG,
  INITIAL_STATE
} from '@/lib/step-detection'

let state = INITIAL_STATE

const handleMotion = (event: DeviceMotionEvent) => {
  const accel = event.accelerationIncludingGravity
  if (!accel) return

  const data = {
    x: accel.x || 0,
    y: accel.y || 0,
    z: accel.z || 0,
    timestamp: Date.now()
  }

  const { newState, stepDetected } = processSample(
    data,
    DEFAULT_CONFIG,
    state
  )

  state = newState

  if (stepDetected) {
    console.log('Step detected! Total:', state.totalSteps)
  }
}
```

## Calibration

The calibration system optimizes detection for individual users:

### How It Works

1. User walks normally for 20 steps
2. System records magnitude values
3. Calculates optimal sensitivity (80% of average)
4. Saves to localStorage for persistence

### Usage

```typescript
import {
  startCalibration,
  recordCalibrationStep,
  finishCalibration,
  saveCalibration
} from '@/lib/step-detection'

// Start calibration
startCalibration()

// During step detection, record each step
if (stepDetected) {
  const isComplete = recordCalibrationStep()

  if (isComplete) {
    const config = finishCalibration()
    saveCalibration(userId, config)
  }
}
```

## Platform Support

### iOS 13+

Requires permission request:

```typescript
import { requestMotionPermission } from '@/lib/step-detection'

// Must be called from user gesture (button click)
const granted = await requestMotionPermission()
if (!granted) {
  console.log('Permission denied')
}
```

### Android

Works without permission. DeviceMotionEvent available by default.

### Desktop/Unsupported

Falls back to manual entry with graceful error handling.

## Testing

### Recommended Test Cases

1. **Normal walking**: Should count accurately (±5% error)
2. **Phone shaking**: Should NOT count (filters high frequency)
3. **Driving/riding**: Should NOT count (filters continuous vibration)
4. **Stairs**: Should count accurately
5. **Running**: Should count accurately (may need lower sensitivity)
6. **Phone in pocket/bag**: Should still work (orientation-independent)

### Manual Testing

```typescript
import { testSensor } from '@/lib/step-detection'

// Collect 2 seconds of samples
const samples = await testSensor(2000)
console.log('Samples collected:', samples.length)
console.log('Sample rate:', samples.length / 2, 'Hz')
```

### Debug Logging

Uncomment console.log statements in algorithm.ts to see:
- Peak detection decisions
- Step validation failures
- Magnitude values

## Performance

- **Sample rate**: 15 Hz (throttled from ~60 Hz)
- **CPU usage**: Minimal (simple math operations)
- **Battery impact**: Low (event-driven, no polling)
- **Memory**: < 1 KB (small buffer arrays)

## Accuracy

Expected accuracy under ideal conditions:

- **Normal walking**: 95-98% accurate
- **Running**: 90-95% accurate
- **Stairs**: 85-90% accurate
- **Uneven terrain**: 80-85% accurate

Factors affecting accuracy:

- Device placement (pocket vs. bag)
- Walking speed (very slow/fast may miss steps)
- Phone orientation (algorithm is orientation-independent)
- Device quality (sensor noise varies by device)

## Troubleshooting

### No steps detected

1. Check sensor availability: `getSensorStatus()`
2. Verify permission granted (iOS)
3. Check sensitivity threshold (may be too high)
4. Ensure device has accelerometer

### Too many false positives

1. Increase `sensitivity` (1.5-2.0)
2. Increase `minMagnitudeDelta` (0.2-0.3)
3. Reduce `maxStepInterval` (600-700ms)

### Too few steps counted

1. Decrease `sensitivity` (0.8-1.0)
2. Decrease `minMagnitudeDelta` (0.1-0.15)
3. Increase sample rate (20 Hz)

## Future Enhancements

- [ ] Machine learning-based step detection
- [ ] Gait analysis (cadence, stride length)
- [ ] Activity classification (walking vs. running)
- [ ] Background step counting (Service Worker)
- [ ] Stride length estimation for distance
- [ ] Calorie calculation based on step intensity

## References

- [W3C DeviceMotionEvent Specification](https://w3c.github.io/deviceorientation/)
- [Peak Detection Algorithms](https://en.wikipedia.org/wiki/Peak_detection)
- [Moving Average Filter](https://en.wikipedia.org/wiki/Moving_average)
