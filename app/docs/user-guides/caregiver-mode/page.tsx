import type { Metadata } from 'next'
import { GuideTemplate } from '@/components/docs/GuideTemplate'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Caregiver Mode Guide | Wellness Projection Lab',
  description: 'Learn how to manage health data for loved ones as a caregiver.',
}

export default function CaregiverModePage() {
  return (
    <GuideTemplate
      title="Caregiver Mode"
      description="Learn how to manage health data for loved ones as a caregiver"
    >
      <div className="bg-purple-50 border-l-4 border-purple-500 p-6 mb-8 rounded-r-lg">
        <p className="font-semibold text-purple-900 mb-2">👥 Caring Made Easy</p>
        <p className="text-purple-800 m-0">
          Caregiver mode allows you to manage health data for family members or patients with full permission control and clear access indicators.
        </p>
      </div>

      <h2 id="overview">Overview</h2>
      <p>
        Caregiver mode enables you to view and manage health records for family members or patients you care for. You receive specific permissions from the account owner and can switch between different patient profiles seamlessly.
      </p>

      <h2 id="becoming-caregiver">Becoming a Caregiver</h2>
      <p>There are two ways to become a caregiver in WPL:</p>

      <h3>Being Invited</h3>
      <ol>
        <li>Receive an email invitation from a family account holder</li>
        <li>Click the invitation link</li>
        <li>Create a WPL account (or log in if you already have one)</li>
        <li>Accept the invitation</li>
        <li>Immediately gain access to assigned patients</li>
      </ol>

      <h3>Family Member Adding You</h3>
      <ol>
        <li>Account holder adds you in <strong>Settings → Family Management</strong></li>
        <li>They assign which patients you can access</li>
        <li>They set your permission level</li>
        <li>You receive notification and can start caregiving</li>
      </ol>

      <h2 id="caregiver-types">Types of Caregiver Access</h2>

      <div className="space-y-4 my-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Caregiver (Full Access)</h4>
          <p className="text-sm text-gray-600 mb-2">Complete care management capabilities</p>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>✓ Log meals with photos</li>
            <li>✓ Record weight and vitals</li>
            <li>✓ Manage medications</li>
            <li>✓ Complete household duties</li>
            <li>✓ Schedule appointments</li>
            <li>✓ View full health history</li>
            <li>✓ Export reports</li>
            <li>✗ Cannot remove patients or change billing</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Caregiver (View Only)</h4>
          <p className="text-sm text-gray-600 mb-2">Read access without editing capabilities</p>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>✓ View meal logs and photos</li>
            <li>✓ View weight trends and charts</li>
            <li>✓ View vitals history</li>
            <li>✓ View medications list</li>
            <li>✓ View appointment schedule</li>
            <li>✗ Cannot log or edit any data</li>
            <li>✗ Cannot mark duties complete</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Professional Caregiver</h4>
          <p className="text-sm text-gray-600 mb-2">External healthcare workers with credentials</p>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>✓ All Full Access permissions</li>
            <li>✓ Professional profile with credentials</li>
            <li>✓ Availability scheduling</li>
            <li>✓ Time tracking for visits</li>
            <li>✓ Activity logs for accountability</li>
          </ul>
        </div>
      </div>

      <h2 id="accessing-mode">Accessing Caregiver Mode</h2>

      <h3>If You Only Have Caregiver Access</h3>
      <p>When you log in, you'll see:</p>
      <ul>
        <li>A purple "Caregiver Mode" banner at the top</li>
        <li>List of assigned patients</li>
        <li>Summary of your permissions</li>
        <li>Option to create your own account if desired</li>
      </ul>

      <h3>If You Have Your Own Account + Caregiver Access</h3>
      <p>Switch between your account and caregiver mode:</p>
      <ol>
        <li>Click your profile photo in the top-right corner</li>
        <li>Select <strong>"Switch to Caregiver Mode"</strong></li>
        <li>Choose which family's patients to manage</li>
        <li>Purple banner appears indicating caregiver mode</li>
        <li>All actions now apply to that family's patients</li>
      </ol>

      <h2 id="patient-selector">Working with Multiple Patients</h2>
      <p>When assigned to multiple patients, navigate efficiently:</p>

      <h3>Dashboard View</h3>
      <ul>
        <li>See all assigned patients at once</li>
        <li>View quick stats for each (weight trends, recent meals, upcoming tasks)</li>
        <li>Click any patient card to view their full profile</li>
      </ul>

      <h3>Patient Switcher</h3>
      <ul>
        <li>Top navigation shows current patient name/photo</li>
        <li>Click to open dropdown with all assigned patients</li>
        <li>Select different patient to switch context</li>
        <li>All subsequent actions apply to selected patient</li>
      </ul>

      <h3>Quick Actions</h3>
      <p>Log data for any patient without switching:</p>
      <ul>
        <li>Click <strong>"Quick Log"</strong> button</li>
        <li>Select patient from dropdown</li>
        <li>Choose action (meal, weight, vitals, medication)</li>
        <li>Log data and stay in current view</li>
      </ul>

      <h2 id="logging-as-caregiver">Logging Data as a Caregiver</h2>

      <h3>Meal Logging</h3>
      <ol>
        <li>Navigate to the patient's profile</li>
        <li>Click <strong>Log Meal</strong></li>
        <li>Take photo or select from gallery</li>
        <li>AI analyzes the meal automatically</li>
        <li>Review and adjust if needed</li>
        <li>Save - your name appears as "Logged by [Your Name]"</li>
      </ol>

      <h3>Weight & Vitals Logging</h3>
      <ol>
        <li>Select the patient</li>
        <li>Click <strong>Log Weight</strong> or <strong>Log Vitals</strong></li>
        <li>Enter measurements</li>
        <li>Add optional notes</li>
        <li>Save with caregiver attribution</li>
      </ol>

      <h3>Medication Management</h3>
      <p>If you have medication permissions:</p>
      <ul>
        <li>View patient's medication list</li>
        <li>Mark doses as administered</li>
        <li>Set reminders for upcoming doses</li>
        <li>Log side effects or notes</li>
        <li>Track adherence over time</li>
      </ul>

      <h2 id="household-duties">Household Duties</h2>
      <p>Complete assigned household tasks for patients:</p>

      <h3>Viewing Duties</h3>
      <ol>
        <li>Go to patient profile</li>
        <li>Click <strong>Household Duties</strong> tab</li>
        <li>See all assigned duties with status</li>
        <li>Filter by assigned to you, overdue, or completed</li>
      </ol>

      <h3>Completing Duties</h3>
      <ol>
        <li>Find the duty in your list</li>
        <li>Click <strong>Mark Complete</strong></li>
        <li>Add optional notes or photos (proof of completion)</li>
        <li>Duty moves to completed list</li>
        <li>Account owner receives notification</li>
      </ol>

      <h3>Common Duty Types</h3>
      <ul>
        <li><strong>Laundry:</strong> Wash, dry, fold clothes</li>
        <li><strong>Shopping:</strong> Grocery shopping from shared list</li>
        <li><strong>Cleaning:</strong> Bedroom, bathroom, kitchen tasks</li>
        <li><strong>Meal Prep:</strong> Prepare meals for patient</li>
        <li><strong>Transportation:</strong> Drive to appointments</li>
        <li><strong>Medication Pickup:</strong> Pharmacy runs</li>
        <li><strong>Custom:</strong> Any task added by account owner</li>
      </ul>

      <p className="text-sm text-gray-600">
        More details: <Link href="/docs/user-guides/household-duties" className="text-blue-600 underline">Household Duties Guide</Link>
      </p>

      <h2 id="coordination">Coordinating with Other Caregivers</h2>
      <p>When multiple caregivers care for the same patient:</p>

      <h3>Activity Feed</h3>
      <ul>
        <li>See chronological log of all caregiver actions</li>
        <li>Know who logged what and when</li>
        <li>Avoid duplicate medication administration</li>
        <li>Coordinate meal timing</li>
      </ul>

      <h3>Duty Assignment</h3>
      <ul>
        <li>Account owner assigns specific duties to specific caregivers</li>
        <li>You only see your assigned duties by default</li>
        <li>Toggle "Show all duties" to see team's work</li>
        <li>Prevents confusion about responsibilities</li>
      </ul>

      <h3>Communication</h3>
      <ul>
        <li>Add notes to any log entry</li>
        <li>Tag other caregivers with @mentions</li>
        <li>Receive notifications when mentioned</li>
        <li>In-app messaging between care team members</li>
      </ul>

      <h2 id="permissions">Understanding Your Permissions</h2>
      <p>View your exact permissions for each patient:</p>

      <h3>Check Permissions</h3>
      <ol>
        <li>Click your profile photo</li>
        <li>Select <strong>"My Permissions"</strong></li>
        <li>See detailed breakdown per patient</li>
        <li>Understand what you can and cannot do</li>
      </ol>

      <h3>Permission Types</h3>
      <div className="bg-gray-100 p-4 rounded-lg my-6">
        <ul className="text-sm text-gray-700 space-y-2 m-0">
          <li>✓ <strong>View Health Data:</strong> See medical records and history</li>
          <li>✓ <strong>Log Meals:</strong> Add meal entries with photos</li>
          <li>✓ <strong>Log Vitals:</strong> Record weight, blood pressure, etc.</li>
          <li>✓ <strong>Manage Medications:</strong> Track and administer medications</li>
          <li>✓ <strong>Complete Duties:</strong> Mark household tasks as done</li>
          <li>✓ <strong>Schedule Appointments:</strong> Add/modify appointments</li>
          <li>✓ <strong>Export Data:</strong> Generate and download reports</li>
          <li>✓ <strong>View Documents:</strong> Access uploaded medical documents</li>
        </ul>
      </div>

      <h2 id="professional">Professional Caregiver Features</h2>
      <p>If you're a professional caregiver (nurse, aide, etc.):</p>

      <h3>Professional Profile</h3>
      <ul>
        <li>Add credentials (RN, CNA, LPN, etc.)</li>
        <li>List certifications and specialties</li>
        <li>Include license numbers</li>
        <li>Set professional availability schedule</li>
      </ul>

      <h3>Time Tracking</h3>
      <ul>
        <li>Clock in/out for visits</li>
        <li>Automatic time tracking for accountability</li>
        <li>Generate timesheet reports</li>
        <li>Share with account owner or agency</li>
      </ul>

      <h3>Visit Notes</h3>
      <ul>
        <li>Document each visit with structured notes</li>
        <li>Record patient status and observations</li>
        <li>Note tasks completed during visit</li>
        <li>Flag concerns for family or doctor</li>
      </ul>

      <h2 id="privacy">Privacy & Data Access</h2>

      <h3>What You Can See</h3>
      <p>As a caregiver, you can only access:</p>
      <ul>
        <li>Data for patients explicitly assigned to you</li>
        <li>Information within your permission scope</li>
        <li>Medical records only if granted medical data access</li>
        <li>No access to billing or subscription info</li>
      </ul>

      <h3>What Is Protected</h3>
      <ul>
        <li>Account owner's personal data (unless also a patient)</li>
        <li>Other family members not assigned to you</li>
        <li>Financial information and payment methods</li>
        <li>Account settings and user management</li>
      </ul>

      <h3>Audit Trail</h3>
      <ul>
        <li>All your actions are logged with timestamp</li>
        <li>Account owner can review your activity</li>
        <li>Ensures accountability and trust</li>
        <li>Protects both patient and caregiver</li>
      </ul>

      <h2 id="creating-own-account">Creating Your Own Account</h2>
      <p>If you only have caregiver access and want your own health tracking:</p>

      <ol>
        <li>Click <strong>"Create My Own Account"</strong> button (purple banner)</li>
        <li>Complete onboarding for your personal profile</li>
        <li>Set up your own health goals and tracking</li>
        <li>Switch between your account and caregiver mode anytime</li>
      </ol>

      <p className="bg-blue-50 p-4 rounded-lg text-sm text-blue-900">
        <strong>Note:</strong> Creating your own account doesn't affect your caregiver access. You'll have both capabilities and can switch between them freely.
      </p>

      <h2 id="tips">Caregiver Mode Tips</h2>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📸</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Photo Everything</p>
            <p className="text-sm text-gray-600 m-0">
              Take photos of meals, medications, and completed household tasks. Visual records are invaluable for tracking and communication.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🔔</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Set Up Notifications</p>
            <p className="text-sm text-gray-600 m-0">
              Enable push notifications for medication reminders, duty assignments, and messages from family members.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">📝</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Add Detailed Notes</p>
            <p className="text-sm text-gray-600 m-0">
              Include context in your logs. "Patient seemed tired" or "Ate full meal enthusiastically" helps others understand patient condition.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">👥</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Check Activity Feed Daily</p>
            <p className="text-sm text-gray-600 m-0">
              Review what other caregivers logged each day. Coordination prevents gaps in care and duplicate efforts.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Report Concerns Immediately</p>
            <p className="text-sm text-gray-600 m-0">
              Use the "Flag for Review" feature for any health concerns. Family and doctors receive immediate alerts.
            </p>
          </div>
        </div>
      </div>

      <h2 id="troubleshooting">Troubleshooting</h2>

      <h3>Can't see assigned patient</h3>
      <ul>
        <li>Verify you've accepted the caregiver invitation</li>
        <li>Check if you're in caregiver mode (purple banner visible)</li>
        <li>Log out and back in to refresh permissions</li>
        <li>Contact account owner to verify assignment</li>
      </ul>

      <h3>Action not permitted</h3>
      <ul>
        <li>Check your permission level for that patient</li>
        <li>View-only caregivers cannot log data</li>
        <li>Request additional permissions from account owner</li>
        <li>Specific actions require specific permissions</li>
      </ul>

      <h3>Not receiving notifications</h3>
      <ul>
        <li>Check notification settings in your profile</li>
        <li>Enable push notifications in browser/device settings</li>
        <li>Verify your email is correct in profile</li>
        <li>Check spam folder for email notifications</li>
      </ul>

      <h3>Can't switch to caregiver mode</h3>
      <ul>
        <li>Ensure you have at least one active caregiver assignment</li>
        <li>Check if invitation has expired (reissue needed)</li>
        <li>Log out and back in to refresh session</li>
        <li>Clear browser cache if issues persist</li>
      </ul>

      <h2 id="next-steps">Next Steps</h2>
      <div className="grid md:grid-cols-2 gap-4 not-prose">
        <Link
          href="/docs/user-guides/patient-profiles"
          className="block p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Patient Profiles →</h3>
          <p className="text-sm text-gray-600">
            Learn how to view and manage patient health profiles
          </p>
        </Link>
        <Link
          href="/docs/user-guides/household-duties"
          className="block p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Household Duties →</h3>
          <p className="text-sm text-gray-600">
            Complete and track household care tasks
          </p>
        </Link>
      </div>
    </GuideTemplate>
  )
}
