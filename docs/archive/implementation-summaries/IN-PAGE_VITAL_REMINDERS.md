# In-Page Vital Reminders System

## Overview

The in-page vital reminders system provides **proactive, contextual prompts** on the patient detail page (`/patients/[patientId]`) when vitals are due for logging today.

**Key Features:**
- ✅ Only shows vitals that are **DUE TODAY** (not logged yet)
- ✅ Appears automatically when user visits patient page
- ✅ Two dismissal options: "Remind later" vs "Don't remind again"
- ✅ Integrates with user's vital reminder preferences from `/profile`
- ✅ One-click "Log Vitals Now" button opens the wizard
- ✅ Smart logic prevents nagging inactive users

---

## User Experience Flow

### Scenario 1: User Has Vitals Due Today

1. User navigates to `/patients/[patientId]`
2. Page loads with patient vitals data
3. **VitalReminderPrompt appears** at top of page (if vitals are due)
4. Shows which vitals need to be logged (e.g., "Blood Pressure", "Weight")
5. User has 3 options:
   - **"Log Vitals Now"** - Opens SupervisedVitalsWizard
   - **Clock icon** - "Remind me later" (dismisses for session only)
   - **X icon** - "Don't remind me again" (permanently disables reminder)

### Scenario 2: User Dismisses with "Remind Me Later"

1. User clicks **clock icon** on a vital reminder card
2. That vital's reminder disappears **for this browser session**
3. Reminder will reappear next time user visits the page
4. No changes to user's `/profile` settings

### Scenario 3: User Dismisses with "Don't Remind Me Again"

1. User clicks **X icon** on a vital reminder card
2. System updates user's profile preferences:
   ```typescript
   preferences.vitalReminders.blood_pressure.enabled = false
   ```
3. Reminder disappears and will NOT reappear
4. User sees toast: "Blood Pressure reminders disabled"
5. User can re-enable in `/profile` settings anytime

### Scenario 4: No Vitals Are Due

1. User navigates to `/patients/[patientId]`
2. **VitalReminderPrompt does NOT appear** (component returns null)
3. User sees normal patient page without reminder banner

---

## Component Architecture

### VitalReminderPrompt Component

**File:** `components/vitals/VitalReminderPrompt.tsx`

**Props:**
```typescript
interface VitalReminderPromptProps {
  patientId: string
  patientName: string
  vitals: VitalSign[]         // All vitals for this patient
  userId: string              // Current logged-in user ID
  userPreferences?: {         // User's vital reminder preferences
    vitalReminders?: {
      blood_pressure?: { enabled: boolean; frequency: string }
      blood_sugar?: { enabled: boolean; frequency: string }
      temperature?: { enabled: boolean; frequency: string }
      pulse_oximeter?: { enabled: boolean; frequency: string }
      weight?: { enabled: boolean; frequency: string }
    }
  }
  onLogVitalsClick: () => void  // Callback to open vitals wizard
}
```

**Rendering Logic:**
1. Loop through all 5 vital types
2. For each vital:
   - Check if reminder is enabled in user preferences
   - Get last log for this vital type
   - Call `shouldShowVitalReminder()` to determine if due today
3. Build array of vitals needing reminders
4. If array is empty, return null (don't render)
5. Otherwise, render reminder banner with vital cards

---

## Integration Points

### Patient Page Integration

**File:** `app/patients/[patientId]/page.tsx` (lines 698-708)

```typescript
{/* Vital Reminder Prompt - Shows when vitals are due today */}
{canLogVitals && user && (
  <VitalReminderPrompt
    patientId={patientId}
    patientName={patient.name}
    vitals={vitals}
    userId={user.uid}
    userPreferences={userProfile?.preferences}
    onLogVitalsClick={() => setShowVitalsWizard(true)}
  />
)}
```

**Placement:** Between mobile tab navigation and health overview cards (top of main content area)

**Visibility Conditions:**
- User must have `canLogVitals` permission (owner or caregiver with permission)
- User must be logged in (`user` exists)
- Component's internal logic determines if there are vitals due today

---

## Reminder Decision Logic

### shouldShowVitalReminder()

**File:** `lib/vital-reminder-logic.ts`

**Function Signature:**
```typescript
function shouldShowVitalReminder(
  vitalType: VitalType,
  lastLog: VitalSign | null,
  frequency: 'daily' | 'twice-daily' | 'weekly' | 'biweekly' | 'monthly'
): {
  shouldShow: boolean
  message: string
  status: 'due_soon' | 'overdue' | 'on_track'
}
```

**Decision Algorithm:**

1. **No logs exist:**
   - `shouldShow = false`
   - Reason: Let users discover naturally, don't nag new users

2. **User inactive (14+ days since last log):**
   - `shouldShow = true`
   - Message: "It's been a while since you logged. Resume tracking?"
   - Status: Re-engagement flow

3. **Daily frequency:**
   - Last log is today → `shouldShow = false`
   - Last log was yesterday or earlier → `shouldShow = true`
   - Message: "Daily check-in due"

4. **Multi-daily (2x, 3x, 4x):**
   - Calculate hours between required logs
   - If current time >= last log + required interval → `shouldShow = true`
   - Example: 2x daily (12 hours) → Show if last log was 12+ hours ago

5. **Weekly/Biweekly/Monthly:**
   - Calculate expected next log date
   - If current date >= next log date → `shouldShow = true`
   - Message: "Weekly check-in due" / "Overdue by X days"

---

## Visual Design

### Reminder Banner

**Colors:**
- Background: Blue gradient (`from-blue-50 to-indigo-50`)
- Border: Blue 200 (`border-blue-200`)
- Icon background: Blue 100

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ 🔔 Time to Check Vitals for [Patient Name]         │
│    2 vitals are due today                          │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ 💓 Blood Pressure                     🕐  ❌ │   │
│ │ Daily check-in due                           │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ ⚖️ Weight                              🕐  ❌ │   │
│ │ Weekly check-in due                          │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ [🔔 Log Vitals Now]  [Dismiss All]                │
│                                                     │
│ 💡 Tip: Click 🕐 to remind later, ❌ to disable    │
└─────────────────────────────────────────────────────┘
```

### Vital Card

Each vital card has:
- **Left side:** Icon + Name + Message
- **Right side:** Remind Later button (🕐) + Disable button (❌)
- **Border:** Left border with status color (blue/yellow/red)

**Status Colors:**
- Due Soon (yellow): `border-yellow-400`
- Overdue (red): `border-red-400`
- On Track (blue): `border-blue-400`

---

## State Management

### Session-Level State (Temporary Dismiss)

**Managed with:** `useState<Set<VitalType>>(new Set())`

```typescript
const [dismissedVitals, setDismissedVitals] = useState<Set<VitalType>>(new Set())

// User clicks "Remind me later"
const handleRemindLater = (vitalType: VitalType) => {
  setDismissedVitals(prev => new Set(prev).add(vitalType))
}
```

**Behavior:**
- Vitals added to `dismissedVitals` set won't show in reminder prompt
- State is reset when user navigates away or refreshes page
- No database changes

### Persistent State (Permanent Disable)

**Managed with:** Firestore user profile update

```typescript
const handleDisableReminder = async (vitalType: VitalType) => {
  await userProfileOperations.updateUserProfile(userId, {
    preferences: {
      vitalReminders: {
        [vitalType]: {
          enabled: false,
          frequency: currentFrequency
        }
      }
    }
  })
}
```

**Behavior:**
- Updates `users/{userId}/preferences/vitalReminders`
- Changes persist across sessions
- User must manually re-enable in `/profile` settings

---

## Interaction with Profile Settings

### Two-Way Sync

**Profile → Patient Page:**
1. User enables "Blood Pressure" reminder in `/profile`
2. Sets frequency to "Daily"
3. Next visit to patient page shows blood pressure reminder (if due)

**Patient Page → Profile:**
1. User clicks "Don't remind me again" on blood pressure card
2. System updates profile: `vitalReminders.blood_pressure.enabled = false`
3. Reminder no longer appears on patient page
4. Profile page shows blood pressure toggle as "OFF"

### Frequency Settings

**Where configured:** `/profile` page
**How used:** VitalReminderPrompt reads frequency to determine if vital is due

Example:
- User sets blood sugar to "Twice Daily" in profile
- Logs blood sugar at 8:00 AM
- Visits patient page at 2:00 PM (6 hours later)
- Twice daily = 12-hour interval
- Reminder does NOT show yet (only 6 hours passed)
- At 8:00 PM (12 hours), reminder WILL show

---

## Benefits Over Profile-Only Reminders

| Feature | Profile Reminders | In-Page Reminders |
|---------|------------------|-------------------|
| **Visibility** | User must visit /profile | Automatic when visiting patient |
| **Context** | Generic settings page | Patient-specific, actionable |
| **Action** | No direct action | One-click "Log Now" button |
| **Dismissal** | Toggle on/off | Flexible: temporary or permanent |
| **Engagement** | Passive | Proactive, contextual |

**Combined Benefits:**
- Profile = **Configure** what vitals to track and frequency
- Patient Page = **Remind** when vitals are due with immediate action

---

## Testing Scenarios

### Test 1: Daily Blood Pressure Reminder

**Setup:**
1. Enable blood pressure reminders in profile with "Daily" frequency
2. Log blood pressure vital today at 8:00 AM
3. Visit patient page at 8:00 AM

**Expected:** No reminder (already logged today)

**Setup:**
1. Same settings
2. Last blood pressure log was yesterday
3. Visit patient page

**Expected:** Blood pressure reminder appears

### Test 2: Twice Daily Blood Sugar Reminder

**Setup:**
1. Enable blood sugar with "Twice Daily" frequency
2. Log blood sugar at 8:00 AM
3. Visit patient page at 2:00 PM (6 hours later)

**Expected:** No reminder (only 6 hours, need 12)

**Setup:**
1. Same settings
2. Visit patient page at 8:01 PM (12+ hours later)

**Expected:** Blood sugar reminder appears

### Test 3: Dismiss with "Remind Later"

**Setup:**
1. Blood pressure reminder is showing
2. Click clock icon (Remind later)

**Expected:**
- Reminder disappears
- No database update
- Refresh page → Reminder reappears (because it's still due)

### Test 4: Dismiss with "Don't Remind Again"

**Setup:**
1. Blood pressure reminder is showing
2. Click X icon (Don't remind again)

**Expected:**
- Reminder disappears
- Toast: "Blood Pressure reminders disabled"
- Firestore updated: `vitalReminders.blood_pressure.enabled = false`
- Refresh page → Reminder does NOT reappear
- Profile page shows blood pressure toggle as "OFF"

### Test 5: Multiple Vitals Due

**Setup:**
1. Enable blood pressure (daily), weight (weekly), temperature (daily)
2. Last logs: BP (yesterday), weight (8 days ago), temp (today)
3. Visit patient page

**Expected:**
- Reminder shows 2 vitals: Blood Pressure (due) + Weight (overdue)
- Temperature NOT shown (logged today)
- "2 vitals are due today" in header

### Test 6: No Vitals Due

**Setup:**
1. All vitals logged today
2. Visit patient page

**Expected:**
- VitalReminderPrompt does NOT render
- No reminder banner
- Normal patient page

---

## Future Enhancements

### 1. Smart Scheduling
- Learn user's typical logging times
- Show reminders only during user's active hours
- Adaptive frequency based on compliance history

### 2. Family Coordination
- Show reminders to caregivers when patient vitals are due
- Notification routing to family members
- Delegation: "Remind Sarah to log Mom's blood pressure"

### 3. Push Notifications
- Background job checks for overdue vitals
- Send push notifications to user's device
- "Barbara, it's time to log weight for Mom"

### 4. Snooze Options
- "Remind me in 1 hour"
- "Remind me at 8:00 PM"
- Temporary custom snooze times

### 5. Analytics Dashboard
- Track reminder effectiveness (show rate, log rate)
- Identify which vitals users ignore most
- Optimize reminder timing and messaging

---

## Troubleshooting

### Issue: Reminder appears but vital was logged today

**Cause:** Date/timezone mismatch between client and server

**Debug:**
```javascript
// In VitalReminderPrompt.tsx
console.log('Last log date:', new Date(lastLog.recordedAt))
console.log('Today date:', new Date().setHours(0,0,0,0))
```

**Solution:** Ensure `recordedAt` uses consistent timezone (UTC)

### Issue: Reminder doesn't appear when vital is due

**Cause:** Reminder not enabled in user preferences

**Debug:**
```javascript
console.log('User preferences:', userPreferences?.vitalReminders)
console.log('Blood pressure config:', userPreferences?.vitalReminders?.blood_pressure)
```

**Solution:** Enable reminder in `/profile` settings

### Issue: "Don't remind again" doesn't persist

**Cause:** Firestore update failed or security rules blocking write

**Debug:** Check browser console for Firestore errors

**Solution:** Verify Firestore security rules allow writes to `users/{userId}/preferences`

### Issue: All vitals show as due even after logging

**Cause:** `shouldShowVitalReminder()` logic error

**Debug:**
```javascript
const result = shouldShowVitalReminder(vitalType, lastLog, frequency)
console.log('Reminder result:', result)
```

**Solution:** Check frequency calculation logic in `vital-reminder-logic.ts`

---

## Related Documentation

- **Profile Reminders:** `docs/VITAL_REMINDERS_SYSTEM.md`
- **Wizard Schedules:** `docs/VITAL_MONITORING_SCHEDULES.md`
- **Reminder Logic:** `lib/vital-reminder-logic.ts`
- **Component:** `components/vitals/VitalReminderPrompt.tsx`

---

## Summary

The in-page vital reminders system provides a **proactive, contextual, and user-friendly** way to encourage users to log vitals when they're due. By appearing directly on the patient page with actionable "Log Now" buttons and flexible dismissal options, it bridges the gap between passive profile settings and active health tracking.

**Key Benefits:**
✅ Proactive reminders in context (patient page)
✅ Flexible dismissal (temporary or permanent)
✅ One-click action to log vitals
✅ Smart logic prevents nagging
✅ Integrates with profile preferences
✅ Respects user choices and privacy
