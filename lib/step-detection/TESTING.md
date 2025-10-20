# Step Detection Testing Guide

This guide provides comprehensive testing procedures for validating the step detection system.

## Quick Start Testing

### 1. Basic Functionality Test

```typescript
// In browser console on /log-steps page
import { testSensor } from '@/lib/step-detection'

// Test sensor for 5 seconds while walking
const samples = await testSensor(5000)
console.log('Samples collected:', samples.length)
console.log('Average sample rate:', samples.length / 5, 'Hz')
```

### 2. Real Walking Test

1. Navigate to `/log-steps`
2. Click "Start Counting"
3. Walk normally for 20 steps while counting manually
4. Compare detected count vs. actual count
5. Expected accuracy: 95% (±1 step)

### 3. False Positive Test

1. Start counting
2. Shake phone vigorously for 10 seconds
3. Result: Should count 0-2 steps max (filters high frequency)

## Detailed Test Cases

### Test 1: Normal Walking

**Objective**: Verify accurate step counting during normal walking

**Procedure**:
1. Start step counter
2. Walk at normal pace (100 steps/min)
3. Count 50 steps manually
4. Compare with detected count

**Expected Result**:
- Detected: 48-52 steps (95-105% accuracy)
- No false positives from arm swing

**Pass Criteria**: Within ±5% of actual count

---

### Test 2: Fast Walking

**Objective**: Verify detection works at high cadence

**Procedure**:
1. Start step counter
2. Walk quickly (120-140 steps/min)
3. Count 30 steps manually

**Expected Result**:
- Detected: 28-32 steps
- All steps above minStepInterval (300ms)

**Pass Criteria**: Within ±7% of actual count

---

### Test 3: Slow Walking

**Objective**: Verify detection works at low cadence

**Procedure**:
1. Start step counter
2. Walk slowly (60-80 steps/min)
3. Count 20 steps manually

**Expected Result**:
- Detected: 18-22 steps
- All steps below maxStepInterval (800ms)

**Pass Criteria**: Within ±10% of actual count

---

### Test 4: Phone Shaking (False Positive)

**Objective**: Verify filtering of high-frequency movement

**Procedure**:
1. Start step counter
2. Shake phone rapidly for 10 seconds
3. Note step count

**Expected Result**:
- Detected: 0-2 steps maximum
- Filtered due to interval < 300ms

**Pass Criteria**: < 3 steps detected

---

### Test 5: Driving/Riding (False Positive)

**Objective**: Verify filtering of continuous vibration

**Procedure**:
1. Start step counter in car/bus
2. Drive for 2 minutes
3. Note step count

**Expected Result**:
- Detected: 0-5 steps maximum
- Filtered due to low magnitude delta

**Pass Criteria**: < 10 steps detected

---

### Test 6: Stairs Climbing

**Objective**: Verify accuracy on stairs

**Procedure**:
1. Start step counter
2. Climb one flight of stairs (10-15 steps)
3. Count steps manually

**Expected Result**:
- Detected: Within ±2 steps
- May be slightly less accurate than flat walking

**Pass Criteria**: Within ±15% of actual count

---

### Test 7: Phone Placement

**Objective**: Verify orientation-independence

**Procedure**:
Test with phone in different positions:
- Pocket (vertical)
- Bag (random orientation)
- Hand (screen up)
- Hand (screen down)

Each position: Walk 20 steps

**Expected Result**:
- Similar accuracy in all positions
- Magnitude calculation is orientation-independent

**Pass Criteria**: < 10% variance between positions

---

### Test 8: Running

**Objective**: Verify detection during running

**Procedure**:
1. Start step counter
2. Run at moderate pace (160-180 steps/min)
3. Count 40 steps manually

**Expected Result**:
- Detected: 36-44 steps
- Higher cadence may miss some steps

**Pass Criteria**: Within ±10% of actual count

---

### Test 9: Persistence

**Objective**: Verify localStorage saves count

**Procedure**:
1. Start counting and walk 50 steps
2. Close tab
3. Reopen `/log-steps`
4. Check step count

**Expected Result**:
- Count restored from localStorage
- Only if same day

**Pass Criteria**: Count matches within ±1 step

---

### Test 10: Auto-Save

**Objective**: Verify Firebase auto-save

**Procedure**:
1. Start counting
2. Walk until count > 10 steps
3. Check Firebase console
4. Verify step log created

**Expected Result**:
- Step log saved every 10 steps
- Source marked as 'device'

**Pass Criteria**: Log exists in Firebase with correct count

---

## Performance Testing

### Battery Impact Test

**Procedure**:
1. Fully charge device
2. Start step counter
3. Leave running for 1 hour
4. Measure battery drain

**Expected Result**:
- < 5% battery drain per hour
- Minimal CPU usage

---

### Sample Rate Test

**Procedure**:
```typescript
const samples = []
const startTime = Date.now()

// Collect for 10 seconds
window.addEventListener('devicemotion', (e) => {
  samples.push(Date.now())
})

setTimeout(() => {
  const endTime = Date.now()
  const duration = (endTime - startTime) / 1000
  const rate = samples.length / duration
  console.log('Actual sample rate:', rate, 'Hz')
}, 10000)
```

**Expected Result**:
- Throttled rate: ~15 Hz
- Consistent timing (no large gaps)

---

## Calibration Testing

### Calibration Accuracy Test

**Procedure**:
1. Start calibration mode
2. Walk exactly 20 steps
3. Review calculated sensitivity
4. Test with new config

**Expected Result**:
- Sensitivity = 0.8 × avg magnitude
- Improved accuracy after calibration

---

## Platform-Specific Tests

### iOS 13+ Permission Test

**Procedure**:
1. Open on iOS device
2. Click "Start Counting"
3. Verify permission dialog appears
4. Grant permission
5. Verify counting starts

**Expected Result**:
- Permission dialog shown
- Counting works after grant
- Error shown if denied

---

### Android Test

**Procedure**:
1. Open on Android device
2. Click "Start Counting"
3. Verify no permission needed

**Expected Result**:
- No permission dialog
- Counting starts immediately

---

## Edge Cases

### Test: No Sensor Available

**Procedure**: Test on desktop browser

**Expected Result**:
- "Sensor not supported" message shown
- Manual entry still works
- No JavaScript errors

---

### Test: Sensor Disconnect

**Procedure**:
1. Start counting
2. Lock device screen
3. Unlock and resume

**Expected Result**:
- Sensor auto-reconnects
- Count continues from last value

---

### Test: Rapid Start/Stop

**Procedure**:
1. Click Start → Stop → Start → Stop rapidly
2. Verify no errors

**Expected Result**:
- Clean state management
- No duplicate listeners
- Count resets properly

---

## Debugging Tools

### Enable Debug Logging

Uncomment console.log statements in:
- `algorithm.ts` - Peak detection decisions
- `sensor.ts` - Sensor events
- `useStepCounter.ts` - State changes

### Magnitude Visualization

```typescript
const magnitudes = []

window.addEventListener('devicemotion', (e) => {
  const a = e.accelerationIncludingGravity
  if (a) {
    const mag = Math.sqrt(a.x**2 + a.y**2 + a.z**2) / 9.81
    magnitudes.push(mag)
    console.log('Magnitude:', mag.toFixed(3), 'g')
  }
})

// After walking, plot:
console.log('Min:', Math.min(...magnitudes))
console.log('Max:', Math.max(...magnitudes))
console.log('Avg:', magnitudes.reduce((a,b) => a+b) / magnitudes.length)
```

---

## Known Issues & Limitations

### Issue 1: Very Slow Walking

**Problem**: Steps < 75/min may not be detected
**Workaround**: Increase maxStepInterval to 1000ms

### Issue 2: Running at High Speed

**Problem**: Steps > 200/min may miss some
**Workaround**: Decrease minStepInterval to 250ms

### Issue 3: Device in Bag

**Problem**: Reduced accuracy due to dampened motion
**Workaround**: Keep device in pocket

### Issue 4: Uneven Terrain

**Problem**: Irregular step patterns harder to detect
**Workaround**: Calibrate on similar terrain

---

## Acceptance Criteria

For production release, the system must pass:

- ✅ Normal walking: 95% accuracy
- ✅ Fast walking: 90% accuracy
- ✅ False positive rate: < 2%
- ✅ Battery drain: < 5%/hour
- ✅ Cross-platform: Works on iOS & Android
- ✅ Persistence: Saves to localStorage
- ✅ Auto-save: Syncs to Firebase
- ✅ Error handling: Graceful degradation

---

## Regression Testing Checklist

Before each release, verify:

- [ ] Normal walking test (50 steps)
- [ ] Phone shaking test (should not count)
- [ ] Persistence test (reload page)
- [ ] Auto-save test (check Firebase)
- [ ] Permission flow (iOS)
- [ ] Manual entry (when sensor unavailable)
- [ ] Reset function
- [ ] Start/stop controls

---

## Continuous Monitoring

### Metrics to Track

1. **Accuracy Rate**: Detected / Actual
2. **False Positive Rate**: Invalid / Total
3. **Crash Rate**: Sensor errors
4. **Battery Impact**: Drain per hour
5. **User Engagement**: Daily active users

### Analytics Events

```typescript
// Track key events
analytics.logEvent('step_counter_started')
analytics.logEvent('step_detected', { count: stepCount })
analytics.logEvent('false_positive_filtered', { reason })
analytics.logEvent('calibration_completed')
```

---

## Contributing Test Cases

When adding new test cases:

1. Document objective clearly
2. Provide step-by-step procedure
3. Define expected results
4. Set pass/fail criteria
5. Note any setup requirements
6. Include cleanup steps

Format:
```markdown
### Test N: [Name]

**Objective**: [What you're testing]

**Procedure**:
1. Step 1
2. Step 2

**Expected Result**:
- Result 1
- Result 2

**Pass Criteria**: [Specific metric]
```
