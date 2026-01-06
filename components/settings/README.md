# Notification Preferences Component

A comprehensive UI component for managing notification preferences in the Weight Loss Projection Lab (WPL) application.

## Overview

The `NotificationPreferences` component provides a user-friendly interface for users to customize their notification settings across multiple channels (email, push, in-app) for various health and family-related events.

## Location

- **Component:** `components/settings/NotificationPreferences.tsx`
- **Integrated In:** `app/profile/page.tsx`

## Features

### 1. Master Toggle
- Global enable/disable switch for all notifications
- When disabled, all notification types are muted
- Provides quick way to pause all notifications

### 2. Notification Categories

#### Medication & Health
- Medication Added - When new medication is added to a patient's profile
- Medication Updated - When medication information is changed
- Medication Deleted - When a medication is removed
- Medication Reminders - Time-based reminders to take medication
- Vital Signs Logged - When vitals (BP, blood sugar, etc.) are recorded
- Vital Sign Alerts - When vitals are out of normal range
- Weight Logged - When weight measurements are recorded
- Meal Logged - When meals are logged with photos/details

#### Documents & Reports
- Document Uploaded - When new documents are uploaded (insurance, medical records, etc.)
- Health Report Generated - When weekly/monthly health reports are created

#### Appointments
- Appointment Scheduled - When new appointments are booked
- Appointment Updated - When appointment details change
- Appointment Cancelled - When appointments are cancelled
- Appointment Reminders - Upcoming appointment notifications

#### Family & Account
- Family Member Invited - When someone is invited to join the family circle
- Family Member Joined - When invitation is accepted
- Patient Added - When new patient is added to the family

### 3. Channel-Specific Controls

Each notification type supports independent toggles for:
- **Email** - Receive notifications via email
- **Push** - Receive browser/mobile push notifications
- **In-App** - Show notifications within the application (always enabled)

### 4. Quiet Hours

Configure a time window during which push notifications are paused:
- Enable/disable quiet hours
- Set start time (0-23 hours)
- Set end time (0-23 hours)
- Supports overnight periods (e.g., 10 PM to 7 AM)

### 5. Test Notification

- Send a test notification to verify settings are working
- Uses browser Notification API
- Requests permission if not already granted
- Displays helpful error messages

### 6. Save Indication

- Tracks unsaved changes
- Displays a sticky save bar when changes are detected
- Provides visual feedback during save operation

## Integration with Notification Service

The component integrates with:
- `lib/notification-service.ts` - Core notification logic
- `types/notifications.ts` - TypeScript definitions
- Firestore collection: `notification_preferences`

### API Functions Used

```typescript
import {
  getNotificationPreferences,
  updateNotificationPreferences
} from '@/lib/notification-service'
```

## Usage

### In Profile Page

```tsx
import { NotificationPreferences } from '@/components/settings/NotificationPreferences'

function ProfilePage() {
  const { user } = useAuth()

  return (
    <div>
      {user?.uid && <NotificationPreferences userId={user.uid} />}
    </div>
  )
}
```

### Standalone Settings Page

```tsx
import { NotificationPreferences } from '@/components/settings'

export default function SettingsPage() {
  const { user } = useAuth()

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        <NotificationPreferences userId={user!.uid} />
        {/* Other settings sections */}
      </div>
    </main>
  )
}
```

## Data Structure

### NotificationPreferences Type

```typescript
interface NotificationPreferences {
  // Per-type channel preferences
  medication_added: { email: boolean; push: boolean; inApp: boolean }
  medication_updated: { email: boolean; push: boolean; inApp: boolean }
  // ... all notification types

  // Quiet hours configuration
  quietHours?: {
    enabled: boolean
    startHour: number // 0-23
    endHour: number // 0-23
  }

  // Global settings
  globallyEnabled: boolean
  timezone?: string
}
```

### Default Preferences

The system provides sensible defaults:
- Critical alerts (medication reminders, vital alerts) → All channels enabled
- High-priority (appointments, medication changes) → Email + Push enabled
- Routine updates (meal logs) → In-app only
- Quiet hours enabled by default (10 PM - 7 AM)

## Styling

The component uses Tailwind CSS with support for:
- Light/Dark mode
- Responsive design (mobile-first)
- Accessible color contrasts
- Focus states for keyboard navigation

## Accessibility

- Proper ARIA labels
- Keyboard navigation support
- Screen reader friendly
- Clear visual indicators for toggle states
- Descriptive help text for each option

## Error Handling

- Graceful fallback to default preferences on load error
- Toast notifications for user feedback
- Comprehensive error logging
- Network error recovery

## Performance

- Lazy loading of preferences
- Optimistic UI updates
- Debounced save operations (via manual save button)
- Minimal re-renders

## Future Enhancements

- [ ] Schedule-based preferences (different settings for weekdays/weekends)
- [ ] Notification digest mode (batch notifications into daily/weekly summaries)
- [ ] Per-patient notification overrides
- [ ] SMS channel support
- [ ] Smart notification grouping
- [ ] A/B testing for notification timing
- [ ] Preview notification examples
- [ ] Import/Export preferences

## Related Components

- `NotificationBell.tsx` - Notification list and badge
- `NotificationPrompt.tsx` - Legacy notification settings (will be deprecated)
- `NotificationSettings` - Simplified toggle interface

## Testing

To test the component:

1. Navigate to `/profile` page
2. Scroll to "Notification Preferences" section
3. Toggle various settings
4. Click "Save Preferences"
5. Use "Send Test Notification" to verify browser notifications work
6. Check email notifications are sent according to preferences

## Support

For issues or questions:
- Check `docs/NOTIFICATION_SYSTEM_USAGE.md`
- Review Firebase Firestore rules for `notification_preferences` collection
- Verify email service is configured (`lib/email-service.ts`)
- Check browser notification permissions
