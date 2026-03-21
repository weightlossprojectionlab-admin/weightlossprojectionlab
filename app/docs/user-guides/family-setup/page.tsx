import type { Metadata } from 'next'
import { GuideTemplate } from '@/components/docs/GuideTemplate'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Family Account Setup Guide | Wellness Projection Lab',
  description: 'Create and manage family members, set up patient profiles, and control access.',
}

export default function FamilySetupPage() {
  return (
    <GuideTemplate
      appRoute="/family/dashboard"
      title="Family Account Setup"
      description="Create and manage family members, set up patient profiles, and control access"
    >
      <div className="bg-pink-50 border-l-4 border-pink-500 p-6 mb-8 rounded-r-lg">
        <p className="font-semibold text-pink-900 mb-2">👨‍👩‍👧‍👦 Family-First Design</p>
        <p className="text-pink-800 m-0">
          WPL is built for families. Manage health data for multiple family members from one account with role-based permissions and privacy controls.
        </p>
      </div>

      <h2 id="overview">Overview</h2>
      <p>
        Family accounts allow you to track health data for multiple people - children, elderly parents, or anyone you're caring for - all from a single WPL account.
      </p>

      <h2 id="creating-family">Creating Your Family Account</h2>
      <ol>
        <li>Log in to your WPL account</li>
        <li>Navigate to <strong>Settings → Family Management</strong></li>
        <li>Click <strong>Add Family Member</strong></li>
        <li>Fill in basic information (name, birthdate, relationship)</li>
        <li>Set privacy and access controls</li>
        <li>Save to create the family member profile</li>
      </ol>

      <h2 id="family-members">Adding Family Members</h2>

      <h3>Required Information</h3>
      <ul>
        <li><strong>Name:</strong> First and last name</li>
        <li><strong>Relationship:</strong> Spouse, child, parent, sibling, etc.</li>
        <li><strong>Date of Birth:</strong> For age-appropriate features</li>
        <li><strong>Gender:</strong> Optional, for health calculations</li>
      </ul>

      <h3>Optional Information</h3>
      <ul>
        <li>Profile photo</li>
        <li>Height and current weight</li>
        <li>Medical conditions</li>
        <li>Dietary restrictions</li>
        <li>Healthcare provider information</li>
      </ul>

      <h3>Adding Newborns &amp; Infants</h3>
      <p>
        WPL fully supports adding newborns, infants, and young children as family members. The system automatically detects the life stage based on date of birth:
      </p>
      <ul>
        <li><strong>Newborn</strong> (0-1 month): Age displayed in days/weeks. Weight defaults to ounces (oz).</li>
        <li><strong>Infant</strong> (1-12 months): Age displayed in months. Pediatric health conditions shown (Jaundice, Colic, Reflux, etc.).</li>
        <li><strong>Toddler</strong> (1-3 years): Age displayed in years and months. Age-appropriate conditions (Asthma, Allergies, Ear Infections, etc.).</li>
        <li><strong>Child</strong> (3-12 years): Standard age display with pediatric conditions.</li>
      </ul>
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4 rounded-r-lg">
        <p className="font-semibold text-blue-900 mb-1">Note</p>
        <p className="text-blue-800 text-sm m-0">
          Calorie and dietary recommendations are not provided for newborns and infants. Always follow your pediatrician&apos;s guidance for feeding and nutrition.
        </p>
      </div>

      <h3>Adding Pets</h3>
      <p>
        Pets are added through the same onboarding wizard. Select &quot;Pet&quot; as the member type, then choose species and breed. The system recognizes species-specific life stages:
      </p>
      <ul>
        <li><strong>Puppy/Kitten/Foal/Chick/Kit</strong>: Species-specific young labels with vaccination and growth monitoring notices.</li>
        <li><strong>Adult</strong>: Standard care tracking.</li>
        <li><strong>Senior</strong>: Reminders about more frequent vet checkups and adjusted nutrition needs.</li>
      </ul>
      <p>
        Small pets (hamsters, fish, birds) default to grams (g) for weight entry.
      </p>

      <h2 id="roles">User Roles & Permissions</h2>
      <p>WPL uses role-based access control to protect privacy:</p>

      <div className="space-y-4 my-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Primary Account Holder</h4>
          <p className="text-sm text-gray-600 mb-2">Full access to all features and data</p>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>✓ Add/remove family members</li>
            <li>✓ Manage all caregivers</li>
            <li>✓ View all health data</li>
            <li>✓ Export data</li>
            <li>✓ Manage billing</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Caregiver (Full Access)</h4>
          <p className="text-sm text-gray-600 mb-2">Can manage assigned patients</p>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>✓ Log meals and weight</li>
            <li>✓ View health history</li>
            <li>✓ Manage medications</li>
            <li>✓ Complete household duties</li>
            <li>✗ Cannot remove patients</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Caregiver (View Only)</h4>
          <p className="text-sm text-gray-600 mb-2">Can view but not edit</p>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>✓ View meal logs</li>
            <li>✓ View weight trends</li>
            <li>✓ View medications</li>
            <li>✗ Cannot log or edit data</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Self-Managed Patient</h4>
          <p className="text-sm text-gray-600 mb-2">Adult family member with their own access</p>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>✓ Manage own health data</li>
            <li>✓ Control who sees their info</li>
            <li>✓ Can leave family circle anytime</li>
            <li>✗ Cannot view others' data</li>
          </ul>
        </div>
      </div>

      <h2 id="inviting-caregivers">Inviting Caregivers</h2>
      <p>Invite other family members or professional caregivers to help manage care:</p>

      <h3>How to Invite</h3>
      <ol>
        <li>Go to <strong>Settings → Family Management</strong></li>
        <li>Click <strong>Invite Caregiver</strong></li>
        <li>Enter their email address</li>
        <li>Select which family members they can access</li>
        <li>Choose permission level (Full or View Only)</li>
        <li>Send invitation</li>
      </ol>

      <h3>Invitation Process</h3>
      <ul>
        <li>Caregiver receives email invitation</li>
        <li>They create their own WPL account (or log in)</li>
        <li>Accept the invitation</li>
        <li>Gain access to assigned patients immediately</li>
      </ul>

      <h2 id="switching-profiles">Switching Between Profiles</h2>
      <p>Easy navigation between family member profiles:</p>

      <h3>Profile Switcher</h3>
      <ul>
        <li>Click your profile photo/name in top-right corner</li>
        <li>Dropdown shows all family members you manage</li>
        <li>Select a person to switch to their profile</li>
        <li>All actions now apply to that person</li>
      </ul>

      <h3>Quick Actions</h3>
      <p>Some actions don't require switching:</p>
      <ul>
        <li><strong>Dashboard view:</strong> See all family members at once</li>
        <li><strong>Quick logging:</strong> Select person when logging meals/weight</li>
        <li><strong>Notifications:</strong> Grouped by family member</li>
      </ul>

      <h2 id="privacy-controls">Privacy & Data Sharing</h2>

      <h3>Who Sees What</h3>
      <p>Fine-grained privacy controls:</p>
      <ul>
        <li><strong>Health data:</strong> Only accessible to assigned caregivers</li>
        <li><strong>Medical info:</strong> Separate permission for sensitive data</li>
        <li><strong>Photos:</strong> Can disable meal photo sharing</li>
        <li><strong>Location:</strong> Never tracked or shared</li>
      </ul>

      <h3>Teen/Adult Privacy</h3>
      <p>For family members 13+:</p>
      <ul>
        <li>Can request "private mode" for sensitive entries</li>
        <li>Control which caregivers see their data</li>
        <li>Option to require approval before sharing</li>
        <li>Can leave family circle when 18+</li>
      </ul>

      <h2 id="children">Managing Children's Accounts</h2>

      <h3>Ages 0-12</h3>
      <ul>
        <li>Parent/guardian has full access</li>
        <li>Child cannot log in independently</li>
        <li>Age-appropriate meal suggestions</li>
        <li>Growth tracking vs. pediatric charts</li>
      </ul>

      <h3>Ages 13-17</h3>
      <ul>
        <li>Optional: Child can have their own login</li>
        <li>Parent maintains oversight access</li>
        <li>Privacy controls available</li>
        <li>Transition planning for age 18</li>
      </ul>

      <h3>Age 18+</h3>
      <ul>
        <li>Automatically become independent accounts</li>
        <li>Choose to stay in family circle or separate</li>
        <li>Full control over their own data</li>
        <li>Can invite parents as caregivers (reversed roles)</li>
      </ul>

      <h2 id="elderly-care">Caring for Elderly Parents</h2>
      <p>Special features for elder care:</p>

      <h3>Health Monitoring</h3>
      <ul>
        <li>Medication reminders and tracking</li>
        <li>Appointment scheduling</li>
        <li>Doctor visit preparation (print reports)</li>
        <li>Emergency contact quick access</li>
      </ul>

      <h3>Multiple Caregivers</h3>
      <ul>
        <li>Coordinate care with siblings</li>
        <li>Assign specific duties to each caregiver</li>
        <li>Activity log shows who did what</li>
        <li>Prevent duplicate medication administration</li>
      </ul>

      <h2 id="data-management">Family Data Management</h2>

      <h3>Bulk Operations</h3>
      <ul>
        <li><strong>Meal logging:</strong> Log same meal for multiple people at once</li>
        <li><strong>Shopping lists:</strong> Shared lists for family groceries</li>
        <li><strong>Reports:</strong> Export data for entire family</li>
      </ul>

      <h3>Backup & Recovery</h3>
      <ul>
        <li>All family data backed up automatically</li>
        <li>Export individual or family-wide data anytime</li>
        <li>Account recovery options for each family member</li>
      </ul>

      <h2 id="billing">Family Account Billing</h2>
      <p>One subscription covers your entire family:</p>

      <h3>Family Plan Includes</h3>
      <ul>
        <li>Up to 6 family member profiles</li>
        <li>Unlimited caregivers</li>
        <li>All premium features for everyone</li>
        <li>Priority support</li>
      </ul>

      <h3>Additional Members</h3>
      <ul>
        <li>$2/month per additional family member over 6</li>
        <li>No limit on total family size</li>
        <li>Prorate when adding mid-cycle</li>
      </ul>

      <h2 id="tips">Family Account Tips</h2>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">👤</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Complete Profiles Early</p>
            <p className="text-sm text-gray-600 m-0">
              Add medical history and medications upfront. Saves time in emergencies.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🔔</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Set Up Notifications</p>
            <p className="text-sm text-gray-600 m-0">
              Configure alerts so caregivers know when tasks are complete or need attention.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">📅</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Weekly Family Review</p>
            <p className="text-sm text-gray-600 m-0">
              Review everyone's progress together each week. Builds accountability.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🎨</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Use Profile Photos</p>
            <p className="text-sm text-gray-600 m-0">
              Photos make it easier to quickly identify who you're managing, reducing errors.
            </p>
          </div>
        </div>
      </div>

      <h2 id="troubleshooting">Troubleshooting</h2>

      <h3>Can't add family member</h3>
      <ul>
        <li>Check if you've reached your plan limit (6 on family plan)</li>
        <li>Verify all required fields are complete</li>
        <li>Ensure email isn't already associated with another account</li>
      </ul>

      <h3>Caregiver invitation not received</h3>
      <ul>
        <li>Check spam/junk folders</li>
        <li>Verify email address is correct</li>
        <li>Resend invitation from Family Management</li>
        <li>Use alternative email if issues persist</li>
      </ul>

      <h3>Wrong person's data showing</h3>
      <ul>
        <li>Check profile switcher in top-right</li>
        <li>Confirm you've selected correct family member</li>
        <li>Look for name/photo indicator on each page</li>
      </ul>

      <h2 id="next-steps">Next Steps</h2>
      <div className="grid md:grid-cols-2 gap-4 not-prose">
        <Link
          href="/docs/user-guides/caregiver-mode"
          className="block p-4 border border-gray-200 rounded-lg hover:border-pink-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Caregiver Mode →</h3>
          <p className="text-sm text-gray-600">
            Learn how to effectively manage health data as a caregiver
          </p>
        </Link>
        <Link
          href="/docs/user-guides/patient-profiles"
          className="block p-4 border border-gray-200 rounded-lg hover:border-pink-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Patient Profiles →</h3>
          <p className="text-sm text-gray-600">
            Set up detailed health profiles for family members
          </p>
        </Link>
      </div>
    </GuideTemplate>
  )
}
