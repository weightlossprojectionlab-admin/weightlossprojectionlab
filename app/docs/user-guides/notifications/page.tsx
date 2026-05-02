import type { Metadata } from 'next'
import { GuideTemplate } from '@/components/docs/GuideTemplate'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Notifications Guide | Wellness Projection Lab',
  description: 'Manage reminders, alerts, and notification preferences.',
}

export default function NotificationsPage() {
  return (
    <GuideTemplate
      appRoute="/notifications"
      title="Notifications"
      description="Manage reminders, alerts, and notification preferences"
    >
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-8 rounded-r-lg">
        <p className="font-semibold text-yellow-900 mb-2">🔔 Stay on Track</p>
        <p className="text-yellow-800 m-0">
          Customizable notifications keep you accountable without being overwhelming. Set reminders for the actions that matter most to your health journey.
        </p>
      </div>

      <h2 id="overview">Overview</h2>
      <p>
        WPL's notification system helps you stay consistent with health tracking and care tasks. Configure what notifications you receive, when, and how (push, email, SMS).
      </p>

      <h2 id="notification-types">Types of Notifications</h2>

      <h3>Health Tracking Reminders</h3>
      <ul>
        <li><strong>Weight Check-In:</strong> Reminder to log your weight (daily, weekly, or custom)</li>
        <li><strong>Meal Logging:</strong> Prompts to log meals if you haven't</li>
        <li><strong>Vital Signs:</strong> Blood pressure, blood sugar, temperature reminders</li>
        <li><strong>Medication Reminders:</strong> Times to take medications</li>
        <li><strong>Hydration:</strong> Drink water reminders throughout the day</li>
      </ul>

      <h3>Care Coordination</h3>
      <ul>
        <li><strong>Household Duty Assignments:</strong> When duty is assigned to you</li>
        <li><strong>Duty Due Soon:</strong> 24 hours before duty deadline</li>
        <li><strong>Duty Overdue:</strong> When assigned duty passes due date</li>
        <li><strong>Duty Completed:</strong> When someone completes a duty</li>
        <li><strong>Caregiver Activity:</strong> Updates on caregiver actions</li>
      </ul>

      <h3>Appointments & Scheduling</h3>
      <ul>
        <li><strong>Upcoming Appointments:</strong> Reminders 24 hours, 2 hours, and 30 minutes before</li>
        <li><strong>Appointment Changes:</strong> When appointments are rescheduled</li>
        <li><strong>Provider Messages:</strong> Communications from healthcare providers</li>
      </ul>

      <h3>Goals & Milestones</h3>
      <ul>
        <li><strong>Goal Progress:</strong> Weekly summary of goal progress</li>
        <li><strong>Milestone Reached:</strong> Celebrations when hitting targets</li>
        <li><strong>Streak Notifications:</strong> Logging streak achievements</li>
        <li><strong>Encouragement:</strong> Motivational messages when falling behind</li>
      </ul>

      <h3>Family & Sharing</h3>
      <ul>
        <li><strong>Caregiver Invitations:</strong> When invited to be a caregiver</li>
        <li><strong>Family Member Added:</strong> New patient profile created</li>
        <li><strong>Shared Recipes:</strong> When someone shares a recipe with you</li>
        <li><strong>Shopping List Updates:</strong> Changes to shared shopping lists</li>
      </ul>

      <h3>System & Account</h3>
      <ul>
        <li><strong>Data Export Ready:</strong> When export file is complete</li>
        <li><strong>Subscription Changes:</strong> Billing and subscription updates</li>
        <li><strong>Security Alerts:</strong> Login from new device</li>
        <li><strong>Feature Announcements:</strong> New features and updates</li>
      </ul>

      <h2 id="delivery-methods">Notification Delivery Methods</h2>

      <h3>Push Notifications</h3>
      <p>Browser/device notifications:</p>
      <ul>
        <li><strong>Instant:</strong> Appears immediately on your device</li>
        <li><strong>Non-Intrusive:</strong> Doesn't interrupt current activity</li>
        <li><strong>Actionable:</strong> Click to go directly to relevant page</li>
        <li><strong>Works Offline:</strong> Queued when offline, delivered when back online</li>
      </ul>

      <h3>Email Notifications</h3>
      <p>Detailed notifications sent to your email:</p>
      <ul>
        <li><strong>Comprehensive:</strong> More detail than push notifications</li>
        <li><strong>Archivable:</strong> Keep records in email</li>
        <li><strong>Links:</strong> Direct links to act on notification</li>
        <li><strong>Batching Option:</strong> Receive daily digest instead of individual emails</li>
      </ul>

      <h3>SMS (Text Messages)</h3>
      <p>Critical reminders via text:</p>
      <ul>
        <li><strong>High Priority Only:</strong> Medications, appointments</li>
        <li><strong>Reliable:</strong> Works even when app isn't open</li>
        <li><strong>Quick:</strong> Short, action-oriented messages</li>
        <li><strong>Optional:</strong> Opt-in feature (standard SMS rates apply)</li>
      </ul>

      <h2 id="configuring">Configuring Notifications</h2>

      <h3>Global Notification Settings</h3>
      <ol>
        <li>Navigate to <strong>Settings → Notifications</strong></li>
        <li>See all notification categories</li>
        <li>Toggle each category on/off</li>
        <li>Choose delivery method (push, email, SMS) per category</li>
        <li>Set quiet hours (time when notifications are paused)</li>
        <li>Save preferences</li>
      </ol>

      <h3>Per-Patient Notification Settings</h3>
      <p>Different reminder preferences for each family member:</p>
      <ol>
        <li>Open patient profile</li>
        <li>Go to <strong>Settings → Reminders</strong></li>
        <li>Configure patient-specific reminders:
          <ul>
            <li>Weight check-in frequency</li>
            <li>Meal logging reminders</li>
            <li>Vital signs schedules</li>
            <li>Medication times</li>
          </ul>
        </li>
        <li>Set preferred notification times</li>
        <li>Save</li>
      </ol>

      <h3>Medication Reminders</h3>
      <p>Highly customizable medication notifications:</p>
      <ul>
        <li>Set multiple times per day</li>
        <li>Snooze options (5, 15, 30 minutes)</li>
        <li>Persistent reminders until marked taken</li>
        <li>Different sounds/vibrations per medication</li>
        <li>Photo of medication shown in reminder</li>
      </ul>

      <h2 id="quiet-hours">Quiet Hours</h2>
      <p>Pause non-urgent notifications during specified times:</p>

      <h3>Setting Quiet Hours</h3>
      <ol>
        <li>Go to <strong>Settings → Notifications</strong></li>
        <li>Enable <strong>"Quiet Hours"</strong></li>
        <li>Set start time (e.g., 10:00 PM)</li>
        <li>Set end time (e.g., 7:00 AM)</li>
        <li>Choose which notifications can override quiet hours:
          <ul>
            <li>Critical medication reminders</li>
            <li>Emergency caregiver alerts</li>
            <li>Urgent appointment reminders (within 1 hour)</li>
          </ul>
        </li>
        <li>Save settings</li>
      </ol>

      <h3>Weekend vs. Weekday</h3>
      <ul>
        <li>Set different quiet hours for weekends</li>
        <li>Sleep in without missing important weekday reminders</li>
        <li>Example: Weekdays 10 PM - 6 AM, Weekends 11 PM - 9 AM</li>
      </ul>

      <h2 id="managing">Managing Notifications</h2>

      <h3>Notification Center</h3>
      <p>In-app notification hub:</p>
      <ul>
        <li>Click bell icon (top-right corner)</li>
        <li>See all recent notifications</li>
        <li>Mark as read/unread</li>
        <li>Click to act on notification</li>
        <li>Clear all or clear individually</li>
      </ul>

      <h3>Snoozing Notifications</h3>
      <p>Delay non-critical reminders:</p>
      <ul>
        <li>Click "Snooze" on notification</li>
        <li>Choose duration (15 min, 1 hour, 3 hours, tomorrow)</li>
        <li>Notification reappears after snooze period</li>
        <li>Max 3 snoozes per notification</li>
      </ul>

      <h3>Dismissing Notifications</h3>
      <ul>
        <li><strong>Swipe Away:</strong> Quick dismiss on mobile</li>
        <li><strong>Mark Complete:</strong> Complete the action, notification clears</li>
        <li><strong>Disable:</strong> Turn off specific notification type</li>
      </ul>

      <h2 id="best-practices">Best Practices</h2>

      <div className="space-y-4 my-6">
        <div className="border-l-4 border-green-500 bg-green-50 p-4">
          <p className="font-semibold text-green-900 mb-2">✅ Do This</p>
          <ul className="text-sm text-green-800 space-y-2 m-0">
            <li>• Enable critical health reminders (medications, vitals)</li>
            <li>• Set quiet hours to avoid notification fatigue</li>
            <li>• Use push for urgent, email for informational</li>
            <li>• Customize per-patient reminders for family members</li>
            <li>• Review notification settings monthly</li>
          </ul>
        </div>

        <div className="border-l-4 border-red-500 bg-red-50 p-4">
          <p className="font-semibold text-red-900 mb-2">❌ Avoid This</p>
          <ul className="text-sm text-red-800 space-y-2 m-0">
            <li>• Don't enable every notification type</li>
            <li>• Don't set too many daily reminders</li>
            <li>• Don't ignore notifications for weeks</li>
            <li>• Don't disable all notifications (defeats the purpose)</li>
            <li>• Don't use SMS for non-critical reminders (costs money)</li>
          </ul>
        </div>
      </div>

      <h2 id="customization">Advanced Customization</h2>

      <h3>Notification Schedules</h3>
      <p>Fine-tune when you receive reminders:</p>
      <ul>
        <li><strong>Morning Routine:</strong> Weight, breakfast logging (7:00 AM)</li>
        <li><strong>Midday Check:</strong> Hydration, lunch logging (12:00 PM)</li>
        <li><strong>Evening Routine:</strong> Dinner logging, evening vitals (6:00 PM)</li>
        <li><strong>Bedtime:</strong> Medication, next-day prep (9:00 PM)</li>
      </ul>

      <h3>Notification Sounds</h3>
      <ul>
        <li>Choose different sounds for different notification types</li>
        <li>Assign urgent tone to medication reminders</li>
        <li>Gentle chime for meal logging suggestions</li>
        <li>Silent vibration for low-priority updates</li>
      </ul>

      <h3>Grouping & Batching</h3>
      <p>Reduce notification volume:</p>
      <ul>
        <li><strong>Group by Type:</strong> All meal reminders in one notification</li>
        <li><strong>Daily Digest:</strong> One email per day with all updates</li>
        <li><strong>Weekly Summary:</strong> Friday email with week's progress</li>
        <li><strong>Smart Batching:</strong> Related notifications are grouped automatically</li>
      </ul>

      <h2 id="caregiver-notifications">Caregiver-Specific Notifications</h2>

      <h3>Duty Notifications</h3>
      <ul>
        <li><strong>Assignment:</strong> When duty is assigned</li>
        <li><strong>Due Soon:</strong> 24 hours before due</li>
        <li><strong>Overdue:</strong> Immediate notification when overdue</li>
        <li><strong>Completion:</strong> When someone else completes your assigned duty</li>
      </ul>

      <h3>Patient Updates</h3>
      <p>Stay informed about patient changes:</p>
      <ul>
        <li>New medications added</li>
        <li>Vital signs outside normal range</li>
        <li>Missed meal loggings</li>
        <li>Weight changes (sudden increase/decrease)</li>
        <li>Appointment reminders for patients you manage</li>
      </ul>

      <h3>Coordination Alerts</h3>
      <ul>
        <li>Other caregiver completed a task</li>
        <li>New note added to patient record</li>
        <li>Shopping list updated by family member</li>
        <li>Account owner changed permissions</li>
      </ul>

      <h2 id="troubleshooting">Troubleshooting</h2>

      <h3>Not receiving notifications</h3>
      <ul>
        <li>Check notification settings in WPL (Settings → Notifications)</li>
        <li>Verify browser/device notification permissions granted</li>
        <li>Check if quiet hours are active</li>
        <li>Ensure notification type is enabled</li>
        <li>Check email spam folder (for email notifications)</li>
        <li>Verify phone number is correct (for SMS)</li>
      </ul>

      <h3>Too many notifications</h3>
      <ul>
        <li>Enable quiet hours</li>
        <li>Switch to daily digest for email</li>
        <li>Disable low-priority notification types</li>
        <li>Reduce reminder frequency (e.g., weekly instead of daily)</li>
        <li>Enable notification grouping</li>
      </ul>

      <h3>Notifications delayed</h3>
      <ul>
        <li>Check internet connection</li>
        <li>Push notifications require active connection</li>
        <li>Email may be delayed by email provider</li>
        <li>SMS depends on carrier speed</li>
        <li>Device battery saver mode can delay notifications</li>
      </ul>

      <h3>Wrong notification times</h3>
      <ul>
        <li>Verify timezone in profile settings</li>
        <li>Check device clock is set correctly</li>
        <li>Daylight saving time may cause temporary issues</li>
        <li>Update reminder times in patient preferences</li>
      </ul>

      <h2 id="browser-device">Browser & Device Permissions</h2>

      <h3>Enabling Browser Notifications</h3>
      <p><strong>Chrome/Edge:</strong></p>
      <ol>
        <li>Visit WPL</li>
        <li>Click lock icon in address bar</li>
        <li>Click "Site settings"</li>
        <li>Find "Notifications"</li>
        <li>Select "Allow"</li>
      </ol>

      <p><strong>Safari (Mac):</strong></p>
      <ol>
        <li>Safari → Preferences → Websites</li>
        <li>Click "Notifications"</li>
        <li>Find WPL domain</li>
        <li>Select "Allow"</li>
      </ol>

      <h3>Mobile Device Settings</h3>
      <p><strong>iOS:</strong></p>
      <ol>
        <li>Settings → Notifications</li>
        <li>Find browser app (Safari/Chrome)</li>
        <li>Enable "Allow Notifications"</li>
        <li>Choose alert style</li>
      </ol>

      <p><strong>Android:</strong></p>
      <ol>
        <li>Settings → Apps → Browser</li>
        <li>Notifications</li>
        <li>Enable notification categories</li>
      </ol>

      <h2 id="tips">Notification Tips</h2>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Start Minimal, Add As Needed</p>
            <p className="text-sm text-gray-600 m-0">
              Begin with only critical reminders (meds, appointments). Add more gradually based on what you actually need.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">⏰</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Align With Your Routine</p>
            <p className="text-sm text-gray-600 m-0">
              Set reminder times that match your daily schedule. 7 AM weight reminder doesn't help if you wake up at 9 AM.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🔕</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Use Quiet Hours Religiously</p>
            <p className="text-sm text-gray-600 m-0">
              Protect your sleep and focus time. Notifications during meetings or sleep cause stress and get ignored anyway.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">📱</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Different Methods for Different Priorities</p>
            <p className="text-sm text-gray-600 m-0">
              SMS for critical meds, push for daily reminders, email for summaries. Match delivery method to urgency.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🔄</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Review Monthly</p>
            <p className="text-sm text-gray-600 m-0">
              Life changes. Review notification settings monthly and adjust as your routine or needs evolve.
            </p>
          </div>
        </div>
      </div>

      <h2 id="next-steps">Next Steps</h2>
      <div className="grid md:grid-cols-2 gap-4 not-prose">
        <Link
          href="/docs/user-guides/goals"
          className="block p-4 border border-gray-200 rounded-lg hover:border-yellow-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Set Goals →</h3>
          <p className="text-sm text-gray-600">
            Goal progress notifications keep you motivated
          </p>
        </Link>
        <Link
          href="/docs/user-guides/household-duties"
          className="block p-4 border border-gray-200 rounded-lg hover:border-yellow-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Household Duties →</h3>
          <p className="text-sm text-gray-600">
            Configure duty reminders and alerts
          </p>
        </Link>
      </div>
    </GuideTemplate>
  )
}
