import type { Metadata } from 'next'
import { GuideTemplate } from '@/components/docs/GuideTemplate'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Patient Profiles Guide | Wellness Projection Lab',
  description: 'Set up detailed patient profiles with medical history, medications, and providers.',
}

export default function PatientProfilesPage() {
  return (
    <GuideTemplate
      appRoute="/patients"
      title="Patient Profiles"
      description="Set up detailed patient profiles with medical history, medications, and providers"
    >
      <div className="bg-teal-50 border-l-4 border-teal-500 p-6 mb-8 rounded-r-lg">
        <p className="font-semibold text-teal-900 mb-2">📋 Complete Health Records</p>
        <p className="text-teal-800 m-0">
          Patient profiles store comprehensive health information for family members and pets. Complete profiles enable better care coordination and health tracking.
        </p>
      </div>

      <h2 id="overview">Overview</h2>
      <p>
        Patient profiles are the foundation of WPL. Each family member gets their own profile with demographics, medical history, medications, vitals, and care preferences. Profiles support humans and pets with species-specific fields.
      </p>

      <h2 id="creating-profile">Creating a Patient Profile</h2>
      <ol>
        <li>Navigate to <strong>Settings → Family Management</strong></li>
        <li>Click <strong>Add Family Member</strong> or <strong>Add Patient</strong></li>
        <li>Choose profile type: <strong>Human</strong> or <strong>Pet</strong></li>
        <li>Complete required fields (name, date of birth, relationship)</li>
        <li>Add optional details (height, weight, photo)</li>
        <li>Save profile - it's immediately available</li>
      </ol>

      <h2 id="basic-information">Basic Information</h2>

      <h3>Required Fields</h3>
      <ul>
        <li><strong>Name:</strong> Full name (first and last for humans)</li>
        <li><strong>Date of Birth:</strong> Used for age calculations and age-appropriate features</li>
        <li><strong>Relationship:</strong> Self, spouse, parent, child, sibling, grandparent, pet</li>
        <li><strong>Profile Type:</strong> Human or Pet</li>
      </ul>

      <h3>Optional Fields</h3>
      <ul>
        <li><strong>Nickname:</strong> Preferred name or shortened version</li>
        <li><strong>Photo:</strong> Profile picture for easy identification</li>
        <li><strong>Gender:</strong> Male, female, other, prefer not to say (for humans)</li>
        <li><strong>Height:</strong> For BMI and health calculations</li>
        <li><strong>Current Weight:</strong> Starting point for tracking</li>
      </ul>

      <h2 id="pet-profiles">Pet Profiles</h2>
      <p>WPL supports comprehensive pet health tracking:</p>

      <h3>Pet-Specific Fields</h3>
      <ul>
        <li><strong>Species:</strong> Dog, cat, bird, fish, rabbit, etc.</li>
        <li><strong>Breed:</strong> Specific breed or mix</li>
        <li><strong>Microchip Number:</strong> For identification and lost pet recovery</li>
        <li><strong>Weight:</strong> Tracked over time like humans</li>
      </ul>

      <h3>Pet Vitals Tracking</h3>
      <p>Species-appropriate vital signs:</p>
      <ul>
        <li><strong>Dogs/Cats:</strong> Heart rate, respiratory rate, body condition score</li>
        <li><strong>Fish:</strong> Water temperature, pH levels, tank conditions</li>
        <li><strong>Birds:</strong> Weight, feather condition, activity level</li>
        <li><strong>All pets:</strong> Meal tracking, medication management, vet appointments</li>
      </ul>

      <h2 id="health-information">Health Information</h2>

      <h3>Medical Conditions</h3>
      <p>Track chronic and acute health conditions:</p>
      <ol>
        <li>Go to patient profile → <strong>Medical Info</strong> tab</li>
        <li>Click <strong>Add Condition</strong></li>
        <li>Search common conditions or enter custom</li>
        <li>Add diagnosis date and notes</li>
        <li>Mark as active or resolved</li>
        <li>Conditions appear in health summary</li>
      </ol>

      <h3>Allergies & Dietary Restrictions</h3>
      <ul>
        <li><strong>Food Allergies:</strong> Peanuts, shellfish, dairy, gluten, etc.</li>
        <li><strong>Medication Allergies:</strong> Penicillin, sulfa drugs, etc.</li>
        <li><strong>Environmental Allergies:</strong> Pollen, dust, pet dander</li>
        <li><strong>Dietary Preferences:</strong> Vegan, vegetarian, kosher, halal</li>
      </ul>

      <div className="bg-red-50 p-4 rounded-lg my-6 border-l-4 border-red-500">
        <p className="text-sm text-red-900 font-medium mb-2">⚠️ Critical Health Info</p>
        <p className="text-sm text-red-800 m-0">
          Always keep allergies up-to-date. WPL flags allergens in meal analysis and medication interactions. This can be life-saving.
        </p>
      </div>

      <h3>Current Medications</h3>
      <p>Maintain an accurate medication list:</p>
      <ol>
        <li>Navigate to <strong>Medications</strong> tab</li>
        <li>Click <strong>Add Medication</strong></li>
        <li>Enter drug name, dosage, and frequency</li>
        <li>Set reminders for doses</li>
        <li>Track adherence and side effects</li>
        <li>Share list with doctors or caregivers</li>
      </ol>

      <h2 id="vitals-goals">Vitals & Health Goals</h2>

      <h3>Initial Vitals Setup</h3>
      <p>Complete during profile creation or later:</p>
      <ul>
        <li><strong>Height:</strong> Required for BMI calculation</li>
        <li><strong>Starting Weight:</strong> Baseline for progress tracking</li>
        <li><strong>Activity Level:</strong> Sedentary to very active</li>
        <li><strong>Units:</strong> Imperial (lbs/inches) or Metric (kg/cm)</li>
      </ul>

      <h3>Weight Goals</h3>
      <ul>
        <li><strong>Target Weight:</strong> Goal weight in lbs or kg</li>
        <li><strong>Goal Type:</strong> Lose weight, maintain, gain muscle, or improve health</li>
        <li><strong>Check-in Frequency:</strong> How often to log weight (daily, weekly, biweekly, monthly)</li>
        <li><strong>Reminders:</strong> Enable or disable weight check-in notifications</li>
      </ul>

      <h3>Additional Goals</h3>
      <ul>
        <li><strong>Daily Calorie Goal:</strong> Target caloric intake</li>
        <li><strong>Daily Step Goal:</strong> Movement target</li>
        <li><strong>Macro Goals:</strong> Protein, carbs, fat distribution</li>
        <li><strong>Behavioral Goals:</strong> Habits to build or break</li>
      </ul>

      <p className="text-sm text-gray-600">
        More details: <Link href="/docs/user-guides/goals" className="text-blue-600 underline">Goals Guide</Link>
      </p>

      <h2 id="healthcare-providers">Healthcare Providers</h2>
      <p>Keep all provider information organized:</p>

      <h3>Adding Providers</h3>
      <ol>
        <li>Go to <strong>Providers</strong> tab in patient profile</li>
        <li>Click <strong>Add Provider</strong></li>
        <li>Enter provider details</li>
        <li>Associate with specific conditions if relevant</li>
        <li>Add appointment history</li>
      </ol>

      <h3>Provider Information</h3>
      <ul>
        <li><strong>Name & Title:</strong> Dr. Jane Smith, MD</li>
        <li><strong>Specialty:</strong> Primary care, cardiology, dermatology, etc.</li>
        <li><strong>Clinic/Hospital:</strong> Practice name and location</li>
        <li><strong>Contact:</strong> Phone, fax, email, patient portal</li>
        <li><strong>Address:</strong> Full mailing and physical address</li>
        <li><strong>Notes:</strong> Office hours, parking info, special instructions</li>
      </ul>

      <h2 id="emergency-contacts">Emergency Contacts</h2>
      <p>Critical for medical emergencies and caregiver coordination:</p>

      <h3>Primary Emergency Contact</h3>
      <p>The first person to call in an emergency:</p>
      <ul>
        <li><strong>Full Name</strong></li>
        <li><strong>Relationship:</strong> Spouse, adult child, friend, etc.</li>
        <li><strong>Phone Number:</strong> Mobile preferred</li>
        <li><strong>Alternate Phone:</strong> Work or home number</li>
        <li><strong>Email:</strong> For non-urgent communication</li>
        <li><strong>Address:</strong> In case physical assistance needed</li>
      </ul>

      <h3>Secondary Contacts</h3>
      <p>Add 2-3 backup contacts:</p>
      <ul>
        <li>Prioritize geographically close contacts</li>
        <li>Include at least one medical power of attorney</li>
        <li>Verify phone numbers are current</li>
        <li>Update when contacts change jobs/numbers</li>
      </ul>

      <h2 id="insurance">Insurance Information</h2>
      <p>Store insurance details for easy access:</p>

      <h3>Primary Insurance</h3>
      <ul>
        <li><strong>Insurance Company:</strong> Provider name</li>
        <li><strong>Policy Number:</strong> Member ID</li>
        <li><strong>Group Number:</strong> If applicable</li>
        <li><strong>Policy Holder:</strong> If different from patient</li>
        <li><strong>Customer Service:</strong> Phone number on card</li>
        <li><strong>Card Photos:</strong> Front and back images</li>
      </ul>

      <h3>Secondary Insurance</h3>
      <p>If patient has dual coverage (e.g., Medicare + supplemental):</p>
      <ul>
        <li>Enter same details as primary</li>
        <li>Note coordination of benefits</li>
        <li>Upload both insurance cards</li>
      </ul>

      <h2 id="preferences">Patient Preferences</h2>

      <h3>Reminder Settings</h3>
      <p>Configure per-patient notification preferences:</p>
      <ul>
        <li><strong>Weight Check-ins:</strong> Enable/disable and frequency</li>
        <li><strong>Vital Sign Reminders:</strong> Blood pressure, blood sugar, etc.</li>
        <li><strong>Medication Reminders:</strong> Times and methods</li>
        <li><strong>Appointment Reminders:</strong> How far in advance</li>
      </ul>

      <h3>Data Sharing</h3>
      <ul>
        <li><strong>Privacy Level:</strong> Who can view this profile</li>
        <li><strong>Medical History:</strong> Share with all caregivers or restrict</li>
        <li><strong>Photo Sharing:</strong> Allow meal photos to be visible</li>
        <li><strong>Export Permissions:</strong> Who can download reports</li>
      </ul>

      <h2 id="caregiver-access">Caregiver Access Control</h2>
      <p>Fine-grained permissions per patient:</p>

      <h3>Assigning Caregivers</h3>
      <ol>
        <li>Open patient profile</li>
        <li>Go to <strong>Caregivers</strong> tab</li>
        <li>Click <strong>Assign Caregiver</strong></li>
        <li>Select from family directory or invite new</li>
        <li>Choose permission level: Full, Limited, or View Only</li>
        <li>Save - caregiver immediately gains access</li>
      </ol>

      <h3>Permission Levels</h3>
      <div className="space-y-3 my-6">
        <div className="border-l-4 border-green-500 bg-green-50 p-4">
          <p className="font-semibold text-green-900 mb-1">Full Access</p>
          <p className="text-sm text-green-800 m-0">
            Can log meals, weight, vitals, medications, and household duties. Can view all medical history.
          </p>
        </div>
        <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4">
          <p className="font-semibold text-yellow-900 mb-1">Limited Access</p>
          <p className="text-sm text-yellow-800 m-0">
            Can log specific data types (e.g., meals only) but not access medical records or medications.
          </p>
        </div>
        <div className="border-l-4 border-blue-500 bg-blue-50 p-4">
          <p className="font-semibold text-blue-900 mb-1">View Only</p>
          <p className="text-sm text-blue-800 m-0">
            Can view logs and charts but cannot add or edit any data. Good for family monitoring without care responsibilities.
          </p>
        </div>
      </div>

      <h2 id="viewing-profile">Viewing the Patient Profile</h2>
      <p>The profile page is the hub for all patient information:</p>

      <h3>Profile Tabs</h3>
      <ul>
        <li><strong>Overview:</strong> Quick summary, recent activity, upcoming tasks</li>
        <li><strong>Health Data:</strong> Weight charts, vitals history, trends</li>
        <li><strong>Medical Info:</strong> Conditions, allergies, medications</li>
        <li><strong>Meals:</strong> Food log with photos and AI analysis</li>
        <li><strong>Providers:</strong> Doctors, clinics, appointment history</li>
        <li><strong>Documents:</strong> Lab results, prescriptions, medical records</li>
        <li><strong>Caregivers:</strong> Who has access and their permissions</li>
        <li><strong>Settings:</strong> Preferences, reminders, privacy controls</li>
      </ul>

      <h3>Health Summary Card</h3>
      <p>Visible at top of profile:</p>
      <ul>
        <li>Current weight vs. target weight</li>
        <li>Weight change trend (last 7/30 days)</li>
        <li>Active health conditions count</li>
        <li>Current medications count</li>
        <li>Next upcoming appointment</li>
        <li>Overdue tasks or reminders</li>
      </ul>

      <h2 id="editing-profile">Editing Profile Information</h2>
      <ol>
        <li>Navigate to the patient's profile</li>
        <li>Click <strong>Edit Profile</strong> button (top right)</li>
        <li>Modify any field in the form</li>
        <li>Add or remove sections as needed</li>
        <li>Click <strong>Save Changes</strong></li>
        <li>Updates appear immediately across all devices</li>
      </ol>

      <h3>What Can Be Changed</h3>
      <ul>
        <li>✓ Name, nickname, photo</li>
        <li>✓ Contact information</li>
        <li>✓ Health conditions and medications</li>
        <li>✓ Goals and preferences</li>
        <li>✗ Date of birth (contact support to change)</li>
        <li>✗ Profile type (human vs. pet)</li>
      </ul>

      <h2 id="archiving">Archiving or Deleting Profiles</h2>

      <h3>Archiving</h3>
      <p>For patients no longer actively tracking (moved out, temporary break):</p>
      <ul>
        <li>Profile hidden from main view</li>
        <li>All data preserved</li>
        <li>Can be restored anytime</li>
        <li>Doesn't count against subscription limits</li>
      </ul>

      <h3>Soft Delete</h3>
      <p>HIPAA-compliant deletion for privacy:</p>
      <ul>
        <li>Profile marked as deleted but data retained</li>
        <li>Hidden from all users</li>
        <li>Recoverable within 30 days</li>
        <li>Permanent deletion after 30-day grace period</li>
      </ul>

      <h3>Permanent Deletion</h3>
      <ul>
        <li>Complete removal of all patient data</li>
        <li>Cannot be undone</li>
        <li>Requires confirmation</li>
        <li>Audit trail preserved for compliance</li>
      </ul>

      <h2 id="tips">Patient Profile Tips</h2>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📸</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Add Profile Photos</p>
            <p className="text-sm text-gray-600 m-0">
              Photos help caregivers quickly identify the right patient. Especially important in families with many members.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">💊</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Keep Medications Current</p>
            <p className="text-sm text-gray-600 m-0">
              Update the medication list immediately when prescriptions change. Outdated lists can lead to dangerous interactions.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Complete Profiles Early</p>
            <p className="text-sm text-gray-600 m-0">
              Fill in all health information upfront. In emergencies, first responders need immediate access to allergies and conditions.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🔄</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Annual Profile Review</p>
            <p className="text-sm text-gray-600 m-0">
              Review each profile yearly. Update heights for growing children, verify emergency contacts, remove resolved conditions.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🔐</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Set Appropriate Privacy</p>
            <p className="text-sm text-gray-600 m-0">
              Teens may want privacy controls. Use permission levels to balance autonomy with parental oversight.
            </p>
          </div>
        </div>
      </div>

      <h2 id="troubleshooting">Troubleshooting</h2>

      <h3>Can't add new patient</h3>
      <ul>
        <li>Check if you've reached your subscription plan limit</li>
        <li>Family plans support up to 6 members ($2/month per additional)</li>
        <li>Verify all required fields are completed</li>
        <li>Try refreshing the page</li>
      </ul>

      <h3>Profile not syncing</h3>
      <ul>
        <li>Check internet connection</li>
        <li>Verify you have edit permissions (caregivers may be view-only)</li>
        <li>Log out and back in to refresh session</li>
        <li>Contact support if issue persists</li>
      </ul>

      <h3>Caregiver can't see patient</h3>
      <ul>
        <li>Verify caregiver is assigned to that specific patient</li>
        <li>Check caregiver's permission level in patient's Caregivers tab</li>
        <li>Ensure caregiver accepted invitation and completed setup</li>
        <li>Re-assign caregiver if needed</li>
      </ul>

      <h3>Missing health data</h3>
      <ul>
        <li>Data may be in archived logs (check filters)</li>
        <li>Ensure you're viewing the correct patient profile</li>
        <li>Check if offline changes haven't synced yet</li>
        <li>Use backup/restore if data was accidentally deleted</li>
      </ul>

      <h2 id="next-steps">Next Steps</h2>
      <div className="grid md:grid-cols-2 gap-4 not-prose">
        <Link
          href="/docs/user-guides/weight-logging"
          className="block p-4 border border-gray-200 rounded-lg hover:border-teal-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Weight Logging →</h3>
          <p className="text-sm text-gray-600">
            Start tracking weight for your patient profiles
          </p>
        </Link>
        <Link
          href="/docs/user-guides/meal-tracking"
          className="block p-4 border border-gray-200 rounded-lg hover:border-teal-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Meal Tracking →</h3>
          <p className="text-sm text-gray-600">
            Log meals with AI-powered nutrition analysis
          </p>
        </Link>
      </div>
    </GuideTemplate>
  )
}
