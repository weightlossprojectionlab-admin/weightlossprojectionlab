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
            <li>• Grocery shopping</li>
            <li>• Pharmacy pickup</li>
            <li>• Household supplies</li>
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
        <li>Navigate to patient profile → <strong>Household Duties</strong> tab</li>
        <li>Click <strong>Add Duty</strong></li>
        <li>Choose category (e.g., Laundry, Shopping, Cleaning)</li>
        <li>Select specific duty from predefined options</li>
        <li>Duty details auto-populate (name, description, estimated time)</li>
        <li>Customize as needed</li>
        <li>Save</li>
      </ol>

      <h3>Creating Custom Duties</h3>
      <ol>
        <li>Click <strong>Add Duty</strong> → <strong>Create Custom</strong></li>
        <li>Enter duty name and description</li>
        <li>Choose category or select "Custom"</li>
        <li>Set estimated duration</li>
        <li>Add subtasks (optional)</li>
        <li>Configure details (assignment, frequency, priority)</li>
        <li>Save</li>
      </ol>

      <h2 id="assigning-duties">Assigning Duties to Caregivers</h2>

      <h3>Single Assignment</h3>
      <ol>
        <li>Create or edit duty</li>
        <li>In <strong>Assigned To</strong> field, select caregiver(s)</li>
        <li>Choose from family members with caregiver access</li>
        <li>Caregiver receives notification immediately</li>
        <li>Duty appears in their task list</li>
      </ol>

      <h3>Multiple Assignments</h3>
      <p>Assign one duty to multiple caregivers:</p>
      <ul>
        <li>Select multiple names in assignment field</li>
        <li>All assigned caregivers can complete the duty</li>
        <li>First to complete it marks it done for everyone</li>
        <li>Useful for flexible scheduling (whoever is available)</li>
      </ul>

      <h3>Rotating Assignments</h3>
      <p>For duties that rotate between caregivers:</p>
      <ul>
        <li>Create separate duty instances for each caregiver</li>
        <li>Use custom schedules (Monday = Caregiver A, Tuesday = Caregiver B)</li>
        <li>Or manually reassign after each completion</li>
      </ul>

      <h2 id="scheduling">Duty Scheduling & Frequency</h2>

      <h3>Frequency Options</h3>
      <ul>
        <li><strong>Daily:</strong> Repeats every day (e.g., meal preparation, pet care)</li>
        <li><strong>Weekly:</strong> Once per week (e.g., laundry, grocery shopping)</li>
        <li><strong>Biweekly:</strong> Every two weeks (e.g., deep cleaning)</li>
        <li><strong>Monthly:</strong> Once per month (e.g., appliance deep clean)</li>
        <li><strong>As Needed:</strong> No automatic recurrence, completed on demand</li>
        <li><strong>Custom:</strong> Define your own schedule</li>
      </ul>

      <h3>Custom Schedules</h3>
      <p>For duties with complex timing:</p>
      <ul>
        <li><strong>Specific Days:</strong> Select days of week (Mon, Wed, Fri)</li>
        <li><strong>Specific Times:</strong> Set preferred time(s) (9:00 AM, 2:00 PM)</li>
        <li><strong>Interval:</strong> Every N days (e.g., every 3 days)</li>
      </ul>

      <h3>Due Dates</h3>
      <ul>
        <li>Automatically set based on frequency</li>
        <li>Can manually override next due date</li>
        <li>Overdue duties highlighted in red</li>
        <li>Notifications sent when overdue</li>
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

      <h3>Basic Completion</h3>
      <ol>
        <li>Navigate to your assigned duties list</li>
        <li>Find the duty to complete</li>
        <li>Click <strong>Mark Complete</strong></li>
        <li>Duty status updates to "Completed"</li>
        <li>Account owner receives notification</li>
        <li>Next instance auto-generated based on frequency</li>
      </ol>

      <h3>Detailed Completion</h3>
      <p>For more thorough tracking:</p>
      <ol>
        <li>Click <strong>Complete with Details</strong></li>
        <li>Enter actual time taken (vs. estimated)</li>
        <li>Rate quality (1-5 stars, optional)</li>
        <li>Add notes about completion</li>
        <li>Upload photos (proof of completion)</li>
        <li>Mark subtasks completed</li>
        <li>Report any issues encountered</li>
        <li>Save completion</li>
      </ol>

      <h3>Photo Documentation</h3>
      <p>Some duties benefit from visual proof:</p>
      <ul>
        <li>Before/after photos for cleaning tasks</li>
        <li>Receipt photos for shopping</li>
        <li>Completed task photos for accountability</li>
        <li>Helpful for quality assurance</li>
        <li>Protects both caregiver and patient</li>
      </ul>

      <h2 id="subtasks">Working with Subtasks</h2>
      <p>Many duties have subtasks that break work into steps:</p>

      <h3>Example: "Clean Kitchen" Subtasks</h3>
      <ul>
        <li>✓ Wash dishes</li>
        <li>✓ Wipe counters</li>
        <li>✓ Clean stovetop</li>
        <li>✓ Clean sink</li>
        <li>✓ Sweep floor</li>
        <li>✓ Empty trash</li>
      </ul>

      <h3>Subtask Features</h3>
      <ul>
        <li>Check off subtasks as you go</li>
        <li>See progress percentage</li>
        <li>Can complete duty even if not all subtasks done</li>
        <li>Note which subtasks were skipped in completion notes</li>
      </ul>

      <h2 id="viewing-duties">Viewing & Filtering Duties</h2>

      <h3>Duty Views</h3>
      <ul>
        <li><strong>My Duties:</strong> Tasks assigned to you</li>
        <li><strong>All Duties:</strong> Every duty in the household (account owner view)</li>
        <li><strong>By Patient:</strong> Filter duties for specific patient</li>
        <li><strong>By Category:</strong> View only laundry, shopping, etc.</li>
        <li><strong>By Status:</strong> Pending, completed, overdue</li>
      </ul>

      <h3>Filters</h3>
      <p>Narrow down duty list:</p>
      <ul>
        <li><strong>Assigned To:</strong> Filter by caregiver name</li>
        <li><strong>Priority:</strong> Show only urgent or high priority</li>
        <li><strong>Due Date:</strong> Overdue, due today, due this week</li>
        <li><strong>Category:</strong> Filter by duty type</li>
        <li><strong>Status:</strong> Active, completed, skipped</li>
      </ul>

      <h3>Calendar View</h3>
      <ul>
        <li>See duties plotted on calendar</li>
        <li>Visualize duty distribution across week/month</li>
        <li>Identify busy days vs. lighter days</li>
        <li>Click date to see all duties due that day</li>
      </ul>

      <h2 id="notifications">Notifications & Reminders</h2>

      <h3>Notification Types</h3>
      <ul>
        <li><strong>Assignment:</strong> When duty is assigned to you</li>
        <li><strong>Due Soon:</strong> 24 hours before due date</li>
        <li><strong>Overdue:</strong> When duty passes due date</li>
        <li><strong>Completion:</strong> When assigned duty is completed by someone</li>
        <li><strong>Reassignment:</strong> When duty is reassigned to/from you</li>
      </ul>

      <h3>Reminder Settings</h3>
      <p>Per-duty reminder configuration:</p>
      <ul>
        <li>Enable/disable reminders</li>
        <li>Set reminder time (e.g., 9:00 AM on due date)</li>
        <li>Choose notification method (push, email, SMS)</li>
        <li>Set how far in advance (1 hour, 1 day, custom)</li>
      </ul>

      <h2 id="history">Duty History & Analytics</h2>

      <h3>Completion History</h3>
      <p>View past completions:</p>
      <ul>
        <li>Date and time completed</li>
        <li>Who completed it</li>
        <li>Time taken vs. estimated</li>
        <li>Rating and feedback</li>
        <li>Photos and notes</li>
      </ul>

      <h3>Statistics</h3>
      <p>Track duty performance:</p>
      <ul>
        <li><strong>Completion Rate:</strong> % of duties completed on time</li>
        <li><strong>Average Time:</strong> Actual vs. estimated duration</li>
        <li><strong>By Caregiver:</strong> Compare completion rates</li>
        <li><strong>By Category:</strong> Which duties get done most/least</li>
        <li><strong>Trends:</strong> Weekly/monthly completion patterns</li>
      </ul>

      <h3>Exporting Data</h3>
      <ul>
        <li>Export duty history to CSV/PDF</li>
        <li>Generate caregiver timesheets</li>
        <li>Share completion reports with family</li>
        <li>Use for professional caregiver billing</li>
      </ul>

      <h2 id="templates">Duty Templates</h2>
      <p>Save common duty sets for reuse:</p>

      <h3>Creating Templates</h3>
      <ol>
        <li>Set up a group of related duties</li>
        <li>Click <strong>Save as Template</strong></li>
        <li>Name the template (e.g., "Weekend Routine", "Elder Care Standard")</li>
        <li>Template saves with all settings</li>
      </ol>

      <h3>Using Templates</h3>
      <ol>
        <li>Click <strong>Add from Template</strong></li>
        <li>Select template from library</li>
        <li>All duties in template are created</li>
        <li>Customize assignments and schedule</li>
        <li>Save</li>
      </ol>

      <h3>Example Templates</h3>
      <ul>
        <li><strong>Daily Elder Care:</strong> Bathing, dressing, meals, medications</li>
        <li><strong>Weekly House Maintenance:</strong> Laundry, cleaning, shopping</li>
        <li><strong>Post-Surgery Care:</strong> Wound care, mobility assistance, meal prep</li>
        <li><strong>Pet Care Routine:</strong> Feeding, walking, grooming</li>
      </ul>

      <h2 id="coordination">Coordinating Multiple Caregivers</h2>

      <h3>Avoiding Conflicts</h3>
      <ul>
        <li>Real-time duty status prevents duplicate work</li>
        <li>When one caregiver completes duty, others are notified</li>
        <li>Clear assignment shows who is responsible</li>
        <li>Activity feed shows who did what and when</li>
      </ul>

      <h3>Communication</h3>
      <ul>
        <li>Add notes to duties for next caregiver</li>
        <li>Report issues that need attention</li>
        <li>Tag other caregivers with @mentions</li>
        <li>Use completion feedback to improve processes</li>
      </ul>

      <h3>Accountability</h3>
      <ul>
        <li>Every action logged with timestamp and user</li>
        <li>Completion history tracks performance</li>
        <li>Photos provide proof of work</li>
        <li>Account owner can review all activity</li>
      </ul>

      <h2 id="tips">Household Duties Tips</h2>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📅</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Set Realistic Frequencies</p>
            <p className="text-sm text-gray-600 m-0">
              Don't over-schedule. Start with lower frequency and increase as needed. Better to exceed expectations than constantly miss deadlines.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">⏰</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Use Reminders Strategically</p>
            <p className="text-sm text-gray-600 m-0">
              Set reminders for critical duties (medications) but not every small task. Too many notifications lead to alert fatigue.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">📸</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Document Important Work</p>
            <p className="text-sm text-gray-600 m-0">
              Take photos for cleaning, shopping receipts, and home repairs. Protects everyone and helps resolve disputes.
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
            <p className="font-semibold text-gray-900 mb-1">Review and Adjust Monthly</p>
            <p className="text-sm text-gray-600 m-0">
              Look at completion rates and adjust. If duties are always late, reassign or change frequency. If always early, maybe increase frequency.
            </p>
          </div>
        </div>
      </div>

      <h2 id="troubleshooting">Troubleshooting</h2>

      <h3>Not receiving duty notifications</h3>
      <ul>
        <li>Check notification settings in your profile</li>
        <li>Verify notifications enabled for household duties</li>
        <li>Check email spam folder</li>
        <li>Enable push notifications in browser settings</li>
      </ul>

      <h3>Can't complete duty</h3>
      <ul>
        <li>Verify duty is assigned to you</li>
        <li>Check your caregiver permissions</li>
        <li>Ensure duty hasn't already been completed by someone else</li>
        <li>Try refreshing the page</li>
      </ul>

      <h3>Duty not appearing in my list</h3>
      <ul>
        <li>Check filters (may be filtering it out)</li>
        <li>Verify you're viewing correct patient's duties</li>
        <li>Confirm duty is active (not archived)</li>
        <li>Check if assigned to you or someone else</li>
      </ul>

      <h3>Wrong due date showing</h3>
      <ul>
        <li>Check duty frequency settings</li>
        <li>Verify custom schedule if using one</li>
        <li>May need to manually adjust next due date</li>
        <li>Contact support if dates consistently wrong</li>
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
