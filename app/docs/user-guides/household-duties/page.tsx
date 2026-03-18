import type { Metadata } from 'next'
import { GuideTemplate } from '@/components/docs/GuideTemplate'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Household Duties Guide | Wellness Projection Lab',
  description: 'Manage and assign household tasks like laundry, shopping, and cleaning.',
}

export default function HouseholdDutiesPage() {
  return (
    <GuideTemplate
      title="Household Duties"
      description="Manage and assign household tasks like laundry, shopping, and cleaning"
    >
      <div className="bg-orange-50 border-l-4 border-orange-500 p-6 mb-8 rounded-r-lg">
        <p className="font-semibold text-orange-900 mb-2">✅ Task Management</p>
        <p className="text-orange-800 m-0">
          Household duties help coordinate care tasks between family members and professional caregivers. Assign, track, and complete tasks with notifications and completion history.
        </p>
      </div>

      <h2 id="overview">Overview</h2>
      <p>
        Household duties are tasks that caregivers perform as part of patient care. WPL's duty management system helps coordinate who does what, when, and tracks completion for accountability.
      </p>

      <h2 id="accessing-duties">Accessing Household Duties</h2>
      <p>There are two ways to access duties:</p>
      <ul>
        <li>
          <strong>Family Dashboard:</strong> Go to <strong>Family → Household Duties</strong> tab. Select the household to manage duties for.
        </li>
        <li>
          <strong>Patient Profile:</strong> Open a patient's profile and navigate to the <strong>Duties</strong> section.
        </li>
      </ul>

      <h2 id="duty-types">Types of Household Duties</h2>
      <p>WPL includes predefined duties across multiple categories:</p>

      <div className="grid md:grid-cols-2 gap-4 my-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">🧺 Laundry</h4>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Wash laundry</li>
            <li>• Fold and put away</li>
            <li>• Iron clothes</li>
            <li>• Change bedding</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">🛒 Shopping</h4>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Household supplies</li>
            <li>• General errands</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">🛒 Grocery Shopping</h4>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Weekly grocery run</li>
            <li>• Linked to shopping list</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">💊 Medication Pickup</h4>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Pharmacy pickup</li>
            <li>• Prescription refills</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">🛏️ Bedroom Cleaning</h4>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Clean bedroom</li>
            <li>• Vacuum and dust</li>
            <li>• Change bedding</li>
            <li>• Organize belongings</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">🚿 Bathroom Cleaning</h4>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Clean bathroom</li>
            <li>• Deep clean (monthly)</li>
            <li>• Restock supplies</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">🍳 Kitchen Cleaning</h4>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Daily kitchen cleaning</li>
            <li>• Deep clean appliances</li>
            <li>• Organize refrigerator</li>
            <li>• Wash dishes</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">🛋️ Living Areas Cleaning</h4>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Vacuum living room</li>
            <li>• Dust surfaces</li>
            <li>• Tidy common areas</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">🍽️ Meal Preparation</h4>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Breakfast, lunch, dinner</li>
            <li>• Weekly meal prep</li>
            <li>• Special dietary needs</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">🚗 Transportation</h4>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Medical appointments</li>
            <li>• Errands</li>
            <li>• Social activities</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">💅 Personal Care</h4>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Bathing assistance</li>
            <li>• Dressing assistance</li>
            <li>• Grooming help</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">🐕 Pet Care</h4>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Feed pet</li>
            <li>• Walk pet</li>
            <li>• Clean litter box</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">🌳 Yard Work</h4>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Mow lawn</li>
            <li>• Rake leaves</li>
            <li>• Water plants</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">✨ Custom</h4>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Add any custom duty</li>
            <li>• Define your own tasks</li>
            <li>• Patient-specific needs</li>
          </ul>
        </div>
      </div>

      <h2 id="creating-duties">Creating Household Duties</h2>

      <h3>From Predefined List</h3>
      <ol>
        <li>Navigate to <strong>Family → Household Duties</strong> tab and select a household</li>
        <li>Click <strong>Add Duty</strong></li>
        <li>Choose a category (e.g., Laundry, Grocery Shopping, Bedroom Cleaning)</li>
        <li>Select a specific duty from the predefined options — name, description, and estimated time auto-populate</li>
        <li>Customize as needed (frequency, priority, caregiver assignment)</li>
        <li>Click <strong>Create Duty</strong></li>
      </ol>

      <h3>Creating Custom Duties</h3>
      <ol>
        <li>Click <strong>Add Duty</strong> and select the <strong>Custom Duty</strong> category</li>
        <li>Skip the template step — you go straight to the details form</li>
        <li>Enter duty name and description</li>
        <li>Set estimated duration, frequency, and priority</li>
        <li>Add subtasks (optional)</li>
        <li>Assign to caregiver(s)</li>
        <li>Click <strong>Create Duty</strong></li>
      </ol>

      <h2 id="assigning-duties">Assigning Duties to Caregivers</h2>
      <ol>
        <li>Create or edit a duty</li>
        <li>In the <strong>Assign To</strong> section, check one or more caregivers</li>
        <li>Only caregivers with access to the household are listed</li>
        <li>Assigned caregivers receive a notification</li>
        <li>Duty appears in their task list</li>
      </ol>

      <p>Assign to multiple caregivers when any available caregiver can complete the task — the first to complete it marks it done for all.</p>

      <h2 id="scheduling">Duty Scheduling & Frequency</h2>

      <h3>Frequency Options</h3>
      <ul>
        <li><strong>Daily:</strong> Repeats every day (e.g., meal preparation, pet care)</li>
        <li><strong>Weekly:</strong> Once per week (e.g., laundry, grocery shopping)</li>
        <li><strong>Biweekly:</strong> Every two weeks (e.g., deep cleaning)</li>
        <li><strong>Monthly:</strong> Once per month (e.g., appliance deep clean)</li>
        <li><strong>As Needed:</strong> No automatic recurrence, completed on demand</li>
        <li><strong>Custom:</strong> Define your own schedule with specific days, times, or intervals</li>
      </ul>

      <h3>Due Dates</h3>
      <ul>
        <li>Automatically calculated based on frequency after each completion</li>
        <li>Overdue duties are highlighted in the list</li>
        <li>Stats panel shows total overdue count</li>
      </ul>

      <h2 id="priority">Priority Levels</h2>
      <p>Set priority to communicate urgency:</p>

      <div className="space-y-3 my-6">
        <div className="border-l-4 border-red-500 bg-red-50 p-3">
          <p className="font-semibold text-red-900 mb-1">🔴 Urgent</p>
          <p className="text-sm text-red-800 m-0">
            Must be done immediately. Used for critical care tasks or time-sensitive needs.
          </p>
        </div>
        <div className="border-l-4 border-orange-500 bg-orange-50 p-3">
          <p className="font-semibold text-orange-900 mb-1">🟠 High</p>
          <p className="text-sm text-orange-800 m-0">
            Important and should be completed today. Examples: medication pickup, meal preparation.
          </p>
        </div>
        <div className="border-l-4 border-yellow-500 bg-yellow-50 p-3">
          <p className="font-semibold text-yellow-900 mb-1">🟡 Medium</p>
          <p className="text-sm text-yellow-800 m-0">
            Should be done soon but not urgent. Examples: weekly laundry, routine cleaning.
          </p>
        </div>
        <div className="border-l-4 border-blue-500 bg-blue-50 p-3">
          <p className="font-semibold text-blue-900 mb-1">🔵 Low</p>
          <p className="text-sm text-blue-800 m-0">
            Can wait. Nice to have. Examples: organizing closets, non-essential errands.
          </p>
        </div>
      </div>

      <h2 id="completing-duties">Completing Duties</h2>
      <ol>
        <li>Navigate to the household duties list</li>
        <li>Find the duty to complete</li>
        <li>Click <strong>Complete</strong></li>
        <li>Duty status updates and the completion is logged</li>
        <li>Next due date is automatically recalculated based on frequency</li>
      </ol>

      <h2 id="subtasks">Working with Subtasks</h2>
      <p>
        When creating or editing a duty, you can add subtasks to break work into smaller steps. Subtasks are displayed in the duty details and help caregivers track progress through multi-step tasks.
      </p>
      <p>Example subtasks for "Clean Kitchen":</p>
      <ul>
        <li>Wash dishes</li>
        <li>Wipe counters</li>
        <li>Clean stovetop</li>
        <li>Sweep floor</li>
        <li>Empty trash</li>
      </ul>

      <h2 id="viewing-duties">Viewing & Filtering Duties</h2>

      <h3>Status Tabs</h3>
      <p>The duty list has four filter tabs:</p>
      <ul>
        <li><strong>All:</strong> Every duty in the household</li>
        <li><strong>Pending:</strong> Not yet started</li>
        <li><strong>In Progress:</strong> Currently being worked on</li>
        <li><strong>Completed:</strong> Finished duties</li>
      </ul>

      <h3>Stats Panel</h3>
      <p>At the top of the duty list you can see at a glance:</p>
      <ul>
        <li>Total duties</li>
        <li>Completed this week</li>
        <li>Pending count</li>
        <li>Overdue count</li>
      </ul>

      <h2 id="notifications">Notifications & Reminders</h2>

      <h3>Notification Types</h3>
      <ul>
        <li><strong>Assignment:</strong> When a duty is assigned to you</li>
        <li><strong>Due Soon:</strong> 24 hours before due date</li>
        <li><strong>Overdue:</strong> When a duty passes its due date</li>
        <li><strong>Completion:</strong> When an assigned duty is completed</li>
      </ul>

      <h3>Per-Duty Reminders</h3>
      <p>When creating a duty, toggle <strong>Enable Reminders</strong> and set a preferred reminder time. The caregiver will receive a notification at that time on the due date.</p>

      <h2 id="tips">Household Duties Tips</h2>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📅</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Set Realistic Frequencies</p>
            <p className="text-sm text-gray-600 m-0">
              Start with lower frequency and increase as needed. Better to exceed expectations than constantly miss deadlines.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">⏰</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Use Reminders Strategically</p>
            <p className="text-sm text-gray-600 m-0">
              Enable reminders for critical duties like medication pickup, but skip reminders for routine low-stakes tasks to avoid alert fatigue.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Break Down Complex Tasks</p>
            <p className="text-sm text-gray-600 m-0">
              Use subtasks for multi-step duties. Makes work less overwhelming and progress more visible.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🔄</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Review Overdue Duties</p>
            <p className="text-sm text-gray-600 m-0">
              Check the overdue count in the stats panel regularly. If duties are consistently late, consider reassigning or adjusting frequency.
            </p>
          </div>
        </div>
      </div>

      <h2 id="troubleshooting">Troubleshooting</h2>

      <h3>Not receiving duty notifications</h3>
      <ul>
        <li>Check notification settings in your profile</li>
        <li>Verify notifications are enabled for household duties</li>
        <li>Check email spam folder</li>
        <li>Enable push notifications in browser settings</li>
      </ul>

      <h3>Can't complete a duty</h3>
      <ul>
        <li>Verify the duty is assigned to you</li>
        <li>Check your caregiver permissions for that household</li>
        <li>Ensure the duty hasn't already been completed by someone else</li>
        <li>Try refreshing the page</li>
      </ul>

      <h3>Duty not appearing in the list</h3>
      <ul>
        <li>Check the active filter tab — it may be filtered out by status</li>
        <li>Verify you have the correct household selected</li>
        <li>Confirm the duty is active (not deleted)</li>
      </ul>

      <h3>Wrong due date showing</h3>
      <ul>
        <li>Check the duty's frequency settings</li>
        <li>Verify custom schedule configuration if using one</li>
        <li>Edit the duty to correct the next due date manually</li>
      </ul>

      <h2 id="next-steps">Next Steps</h2>
      <div className="grid md:grid-cols-2 gap-4 not-prose">
        <Link
          href="/docs/user-guides/caregiver-mode"
          className="block p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Caregiver Mode →</h3>
          <p className="text-sm text-gray-600">
            Learn more about managing duties as a caregiver
          </p>
        </Link>
        <Link
          href="/docs/user-guides/notifications"
          className="block p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Notifications →</h3>
          <p className="text-sm text-gray-600">
            Configure alerts for duty assignments and reminders
          </p>
        </Link>
      </div>
    </GuideTemplate>
  )
}
