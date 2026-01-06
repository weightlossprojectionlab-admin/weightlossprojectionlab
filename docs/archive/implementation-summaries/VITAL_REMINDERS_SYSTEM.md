# Vital Reminders System Documentation

## Overview

The Wellness Projection Lab supports **two distinct reminder systems** for vital sign monitoring:

1. **Profile-Based Frequency Reminders** (Simple) - This Document
2. **Wizard-Based Schedules** (Advanced) - See `types/vital-schedules.ts`

This document covers the **Simple Frequency-Based Reminders** configured through the user profile page.

---

## Architecture

### Two-Tier Reminder System

```
┌─────────────────────────────────────────────────────────┐
│                    REMINDER HIERARCHY                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Priority 1: VitalMonitoringSchedule (Wizard)           │
│  ├─ Multi-time daily schedules (8am, 12pm, 4pm, 8pm)   │
│  ├─ Compliance tracking & reporting                     │
│  ├─ Doctor-prescribed monitoring                        │
│  └─ Advanced notification channels                      │
│                                                           │
│  Priority 2: Profile Frequency Reminders (This System)  │
│  ├─ Simple frequency selection (daily, weekly, etc.)    │
│  ├─ User-friendly toggle per vital type                 │
│  ├─ Casual health monitoring                            │
│  └─ Stored in UserProfile.preferences                   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

**Design Principle:**
- Profile reminders are for **casual, general health monitoring**
- Wizard schedules are for **medical compliance and doctor-prescribed monitoring**
- If both exist for the same vital type, wizard schedule takes precedence

---

## Data Schema

### UserPreferences Interface

**Location:** `types/index.ts` (lines 170-191)

```typescript
export interface UserPreferences {
  // ... other fields

  // VITAL REMINDERS - Simple frequency-based reminders
  vitalReminders?: {
    blood_pressure?: {
      enabled: boolean
      frequency: 'daily' | 'twice-daily' | 'weekly' | 'monthly'
    }
    blood_sugar?: {
      enabled: boolean
      frequency: 'daily' | 'twice-daily' | 'three-times-daily' | 'four-times-daily'
    }
    temperature?: {
      enabled: boolean
      frequency: 'daily' | 'weekly' | 'biweekly'
    }
    pulse_oximeter?: {
      enabled: boolean
      frequency: 'daily' | 'twice-daily' | 'weekly'
    }
    weight?: {
      enabled: boolean
      frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
    }
  }

  // Legacy (kept for backward compatibility)
  disableWeightReminders?: boolean
  weightCheckInFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly'
}
```

### Firestore Path

```
/users/{userId}/profile
  └─ preferences
      └─ vitalReminders
          ├─ blood_pressure: { enabled: true, frequency: 'daily' }
          ├─ blood_sugar: { enabled: true, frequency: 'twice-daily' }
          ├─ temperature: { enabled: false, frequency: 'weekly' }
          ├─ pulse_oximeter: { enabled: true, frequency: 'daily' }
          └─ weight: { enabled: true, frequency: 'weekly' }
```

---

## Vital Types & Frequencies

### Supported Vital Types

| Vital Type | Icon | Display Name | Default Frequency |
|------------|------|--------------|-------------------|
| `blood_pressure` | 💓 | Blood Pressure | Daily |
| `blood_sugar` | 🩸 | Blood Sugar | Daily |
| `temperature` | 🌡️ | Temperature | Weekly |
| `pulse_oximeter` | ❤️ | Pulse Oximeter | Daily |
| `weight` | ⚖️ | Weight | Weekly |

### Available Frequencies per Vital Type

**Blood Pressure:**
- Daily
- Twice Daily
- Weekly
- Monthly

**Blood Sugar:**
- Daily
- Twice Daily (2x)
- Three Times Daily (3x)
- Four Times Daily (4x)

**Temperature:**
- Daily
- Weekly
- Bi-weekly

**Pulse Oximeter:**
- Daily
- Twice Daily
- Weekly

**Weight:**
- Daily
- Weekly
- Bi-weekly
- Monthly

---

## Reminder Logic

### Core Algorithm

**File:** `lib/vital-reminder-logic.ts`

```typescript
function shouldShowVitalReminder(
  vitalType: VitalType,
  lastVitalLog: VitalSign | null,
  frequency: VitalFrequency,
  lastActivityDate?: Date | null
): VitalReminderResult
```

### Reminder Decision Flow

```
1. No logs exist?
   └─ DON'T show reminder (let users discover naturally)

2. User inactive (14+ days no activity)?
   └─ Show re-engagement message

3. Daily frequency?
   ├─ Logged today? → No reminder
   ├─ Logged yesterday? → Due soon reminder
   └─ 2+ days? → Overdue reminder

4. Multi-daily frequency (2x, 3x, 4x)?
   ├─ Logged today?
   │  ├─ Hours since last >= target hours? → Due soon
   │  └─ Otherwise → No reminder
   └─ Not logged today? → Overdue

5. Weekly/Biweekly/Monthly?
   ├─ Days since >= target days? → Overdue
   ├─ Days since >= target days - 1? → Due soon
   └─ Otherwise → On track
```

### Reminder Statuses

| Status | Color | Meaning |
|--------|-------|---------|
| `on-track` | 🟢 Green | No action needed |
| `due-soon` | 🟡 Yellow | Due within 1 day |
| `overdue` | 🔴 Red | Past due date |
| `inactive` | 🔵 Blue | User re-engagement needed |

---

## User Interface

### Profile Page Location

**File:** `app/profile/page.tsx` (lines 756-911)

### UI Components

**Layout:** Option A - Individual Toggle + Frequency per Vital

```
⏰ Vital Sign Reminders
┌──────────────────────────────────────────────────────┐
│ 💓 Blood Pressure Reminders              [Toggle ON] │
│ Get reminded to log your blood pressure...           │
│                                                       │
│    Check-in Frequency: [Daily ▼]                    │
│    You'll be reminded to log...                      │
├──────────────────────────────────────────────────────┤
│ 🩸 Blood Sugar Reminders                 [Toggle ON] │
│ Get reminded to log your blood sugar...              │
│                                                       │
│    Check-in Frequency: [Twice Daily ▼]              │
│    You'll be reminded to log...                      │
├──────────────────────────────────────────────────────┤
│ 🌡️ Temperature Reminders                [Toggle OFF]│
│ Get reminded to log your temperature...              │
└──────────────────────────────────────────────────────┘
```

**Why Option A?**
- **Flexibility:** Different vitals need different monitoring frequencies
- **Clarity:** Clear mental model - each vital is independent
- **Medical Context:** Diabetes patients need 4x daily blood sugar but weekly weight
- **Progressive Disclosure:** Only show frequency when toggle is enabled

### Key Features

1. **Visual Icons:** Each vital type has a recognizable emoji icon
2. **Toggle Switches:** Clear enabled/disabled state with smooth animations
3. **Contextual Help:** Explanatory text for each vital type
4. **Smart Defaults:** Weight enabled by default, others opt-in
5. **Tip Callout:** Directs users to Vitals Wizard for advanced scheduling

---

## Implementation Details

### Migration from Legacy Weight Reminders

**Function:** `migrateLegacyWeightReminders()`

Auto-migrates old weight-only settings to new unified format:

```typescript
// Old format (legacy)
preferences: {
  disableWeightReminders: false,
  weightCheckInFrequency: 'weekly'
}

// Auto-migrated to new format
preferences: {
  vitalReminders: {
    weight: {
      enabled: true,
      frequency: 'weekly'
    }
  }
}
```

### Data Update Flow

```
User toggles reminder
    ↓
Update local state (optimistic UI)
    ↓
Update Firestore (userProfileOperations.updateUserProfile)
    ↓
Show success/error toast
    ↓
Persist updated state
```

### Frequency Change Flow

```
User selects frequency
    ↓
Validate frequency option for vital type
    ↓
Update Firestore with new frequency
    ↓
Update local state
    ↓
Show confirmation toast
```

---

## Integration Points

### Dashboard Integration

The dashboard should check profile reminders and display banners when vitals are due:

```typescript
import { shouldShowVitalReminder, getVitalReminderMessage } from '@/lib/vital-reminder-logic'

// Get user's vital reminder preferences
const vitalReminders = userProfile.preferences?.vitalReminders || {}

// Check each enabled vital
for (const [vitalType, config] of Object.entries(vitalReminders)) {
  if (config.enabled) {
    const lastLog = await getLastVitalLog(patientId, vitalType)
    const reminder = shouldShowVitalReminder(vitalType, lastLog, config.frequency)

    if (reminder.shouldShow) {
      displayReminderBanner(reminder)
    }
  }
}
```

### Notification Service Integration

Future: Integrate with notification service to send push/email reminders:

```typescript
// Pseudo-code for notification service
async function checkAndSendReminders(userId: string) {
  const profile = await getUserProfile(userId)
  const vitalReminders = profile.preferences?.vitalReminders || {}

  for (const [vitalType, config] of Object.entries(vitalReminders)) {
    if (!config.enabled) continue

    const lastLog = await getLastVitalLog(userId, vitalType)
    const reminder = shouldShowVitalReminder(vitalType, lastLog, config.frequency)

    if (reminder.shouldShow && reminder.status === 'overdue') {
      await sendPushNotification(userId, {
        title: `${VITAL_DISPLAY_NAMES[vitalType]} Check-In`,
        body: getVitalReminderMessage(reminder, config.frequency)
      })
    }
  }
}
```

---

## User Flows

### First-Time User Flow

1. User completes onboarding
2. Weight reminders enabled by default (legacy behavior preserved)
3. User navigates to Profile → Settings
4. Sees "Vital Sign Reminders" section
5. Clicks toggle to enable blood pressure reminders
6. Selects "Daily" frequency
7. Dashboard now shows blood pressure reminder when due

### Existing User Migration Flow

1. User has legacy `disableWeightReminders: false` and `weightCheckInFrequency: 'weekly'`
2. Opens profile page
3. System auto-migrates to new format:
   ```typescript
   vitalReminders: {
     weight: { enabled: true, frequency: 'weekly' }
   }
   ```
4. User sees weight reminders in new UI (no disruption)
5. Can now enable other vital reminders

### Medical Compliance Flow

1. User's doctor recommends daily blood pressure monitoring
2. **Option 1: Simple Reminder**
   - User enables blood pressure reminders in profile
   - Selects "Daily" frequency
   - Gets daily reminders (no specific time)

3. **Option 2: Advanced Schedule** (Recommended for medical compliance)
   - User navigates to patient detail page
   - Opens Vitals Wizard
   - Creates schedule: "Blood Pressure - Daily at 8am and 8pm"
   - Gets compliance tracking and reports

---

## Testing Checklist

- [ ] Toggle reminder on/off for each vital type
- [ ] Change frequency for each vital type
- [ ] Verify Firestore updates correctly
- [ ] Test legacy weight reminder migration
- [ ] Verify reminders show on dashboard when due
- [ ] Test with no vital logs (should not show reminder)
- [ ] Test daily frequency (logged today → no reminder)
- [ ] Test multi-daily frequency (2x, 3x, 4x)
- [ ] Test weekly/biweekly/monthly frequencies
- [ ] Verify correct frequency options per vital type
- [ ] Test UI responsiveness (mobile/tablet/desktop)
- [ ] Verify dark mode compatibility
- [ ] Test with inactive user (14+ days no activity)

---

## Future Enhancements

### Phase 1: Notification Service
- Push notifications for overdue vitals
- Email reminders for due-soon vitals
- SMS reminders (opt-in)

### Phase 2: Smart Reminders
- ML-based optimal reminder times
- User behavior learning (when they typically log)
- Adaptive frequency suggestions

### Phase 3: Family Coordination
- Caregiver receives reminders for patient vitals
- Multi-user notification routing
- Compliance reports for caregivers

### Phase 4: Integration with Wizard Schedules
- Auto-promote frequent profile reminders to wizard schedules
- Suggest wizard upgrade for medical compliance needs
- Unified reminder dashboard view

---

## API Reference

### Core Functions

#### `shouldShowVitalReminder()`
```typescript
shouldShowVitalReminder(
  vitalType: VitalType,
  lastVitalLog: VitalSign | null,
  frequency: VitalFrequency,
  lastActivityDate?: Date | null
): VitalReminderResult
```

Determines if reminder should be shown based on last log and frequency.

#### `getVitalReminderMessage()`
```typescript
getVitalReminderMessage(
  result: VitalReminderResult,
  frequency: VitalFrequency
): string
```

Generates user-friendly reminder message.

#### `getVitalReminderColor()`
```typescript
getVitalReminderColor(
  status: 'on-track' | 'due-soon' | 'overdue' | 'inactive'
): { border: string, bg: string, text: string, badge: string }
```

Returns Tailwind CSS classes for reminder status.

#### `migrateLegacyWeightReminders()`
```typescript
migrateLegacyWeightReminders(
  disableWeightReminders?: boolean,
  weightCheckInFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly'
): { enabled: boolean; frequency: VitalFrequency } | undefined
```

Auto-migrates legacy weight reminder settings to new format.

### Constants

```typescript
VITAL_DISPLAY_NAMES: Record<VitalType, string>
VITAL_ICONS: Record<VitalType, string>
DEFAULT_FREQUENCIES: Record<VitalType, VitalFrequency>
FREQUENCY_OPTIONS: Record<VitalType, VitalFrequency[]>
FREQUENCY_LABELS: Record<VitalFrequency, string>
```

---

## Troubleshooting

### Reminders Not Showing

**Problem:** User enabled reminders but not seeing them on dashboard

**Solutions:**
1. Verify `vitalReminders` saved to Firestore:
   ```typescript
   await getUserProfile(userId)
   console.log(profile.preferences?.vitalReminders)
   ```
2. Check if vital logs exist (reminders only show for established habits)
3. Verify dashboard is calling `shouldShowVitalReminder()`
4. Check if wizard schedule exists (takes precedence)

### Frequency Options Missing

**Problem:** Expected frequency not available for vital type

**Solution:** Check `FREQUENCY_OPTIONS` in `vital-reminder-logic.ts` - each vital has specific allowed frequencies.

### Migration Not Working

**Problem:** Legacy weight settings not migrating

**Solution:** Migration only happens in profile page UI. Manually trigger:
```typescript
const migratedWeight = migrateLegacyWeightReminders(
  profile.preferences?.disableWeightReminders,
  profile.preferences?.weightCheckInFrequency
)
```

---

## Related Documentation

- **Advanced Schedules:** `types/vital-schedules.ts`
- **Vital Schedule Service:** `lib/vital-schedule-service.ts`
- **Compliance Tracking:** `app/api/patients/[patientId]/compliance/route.ts`
- **Profile Completeness:** `lib/profile-completeness.ts`

---

## Changelog

**Version 1.0.0 - 2025-12-19**
- Initial implementation of unified vital reminders
- Support for all 5 vital types (blood pressure, blood sugar, temperature, pulse oximeter, weight)
- Profile page UI with toggle + frequency selector
- Auto-migration from legacy weight reminders
- Documentation and testing guidelines
