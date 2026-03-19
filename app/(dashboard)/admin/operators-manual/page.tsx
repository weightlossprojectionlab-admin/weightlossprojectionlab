'use client'

/**
 * Admin Operators Manual
 * Internal reference guide for admin, moderator, and support staff.
 * Protected by the admin layout — non-admins are redirected to /dashboard.
 */

import Link from 'next/link'
import { useAdminAuth } from '@/hooks/useAdminAuth'

const Check = () => <span className="text-green-600 font-bold">✓</span>
const X = () => <span className="text-gray-300">—</span>

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'roles', label: 'Roles & Permissions' },
  { id: 'users', label: 'User Management' },
  { id: 'recipes', label: 'Recipe Moderation' },
  { id: 'barcodes', label: 'Barcodes & Products' },
  { id: 'trust-safety', label: 'Trust & Safety' },
  { id: 'hipaa', label: 'HIPAA Complaints' },
  { id: 'ai-decisions', label: 'AI Decisions' },
  { id: 'coaching', label: 'Coaching' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'marketing', label: 'Marketing & Comms' },
  { id: 'settings', label: 'Settings' },
  { id: 'playbook', label: 'Support Playbook' },
]

export default function OperatorsManualPage() {
  const { role } = useAdminAuth()

  return (
    <div className="flex gap-8 p-8 max-w-7xl mx-auto">
      {/* Sticky Table of Contents */}
      <aside className="hidden xl:block w-56 shrink-0">
        <div className="sticky top-8 bg-card rounded-lg shadow p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contents</p>
          <nav className="space-y-1">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block text-sm text-muted-foreground hover:text-foreground py-1 px-2 rounded hover:bg-muted transition-colors"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 space-y-12">
        {/* Page Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">Operators Manual</h1>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full uppercase tracking-wide">Internal Only</span>
          </div>
          <p className="text-muted-foreground">
            Reference guide for all admin panel tools, workflows, and support procedures.
            {role && (
              <span className="ml-2 text-sm">
                You are signed in as <strong className="capitalize">{role}</strong>.
              </span>
            )}
          </p>
        </div>

        {/* ── OVERVIEW ── */}
        <section id="overview" className="scroll-mt-8">
          <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">Overview</h2>
          <div className="bg-card rounded-lg shadow p-6 space-y-4">
            <p>The <strong>WPL Admin Panel</strong> is the back-office interface for managing the Wellness Projection Lab platform. It is accessible only to users with an <code className="bg-muted px-1.5 py-0.5 rounded text-sm">admin</code>, <code className="bg-muted px-1.5 py-0.5 rounded text-sm">moderator</code>, or <code className="bg-muted px-1.5 py-0.5 rounded text-sm">support</code> role assigned in Firestore.</p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="font-semibold text-purple-900 mb-1">Administrator</div>
                <p className="text-sm text-purple-700">Full access to all tools including user deletion, AI decision reversal, role management, and platform settings.</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="font-semibold text-blue-900 mb-1">Moderator</div>
                <p className="text-sm text-blue-700">Can approve/reject recipes, manage Trust & Safety cases, and view users. Cannot delete users or change settings.</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="font-semibold text-green-900 mb-1">Support Agent</div>
                <p className="text-sm text-green-700">Can view users, export GDPR data, and view T&S cases and analytics. Read-mostly access.</p>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <strong className="text-yellow-900">Super Admins:</strong>
              <span className="text-sm text-yellow-800 ml-2">Configured via the <code className="bg-yellow-100 px-1 rounded">SUPER_ADMIN_EMAILS</code> environment variable. Super admins always have full admin access regardless of their Firestore role. Their access cannot be revoked through the UI.</span>
            </div>
            <p className="text-sm text-muted-foreground">To grant or revoke admin roles, go to <Link href="/admin/settings" className="text-primary hover:underline">Settings</Link>.</p>
          </div>
        </section>

        {/* ── ROLES & PERMISSIONS ── */}
        <section id="roles" className="scroll-mt-8">
          <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">Roles & Permissions</h2>
          <div className="bg-card rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-background border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Permission</th>
                    <th className="px-4 py-3 text-center font-semibold text-purple-700">Admin</th>
                    <th className="px-4 py-3 text-center font-semibold text-blue-700">Moderator</th>
                    <th className="px-4 py-3 text-center font-semibold text-green-700">Support</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { label: 'View Users', admin: true, mod: true, sup: true },
                    { label: 'Edit Users', admin: true, mod: false, sup: false },
                    { label: 'Suspend Users', admin: true, mod: false, sup: false },
                    { label: 'Delete Users', admin: true, mod: false, sup: false },
                    { label: 'Export GDPR Data', admin: true, mod: false, sup: true },
                    { label: 'Moderate Recipes', admin: true, mod: true, sup: false },
                    { label: 'Feature Recipes', admin: true, mod: true, sup: false },
                    { label: 'Delete Recipes', admin: true, mod: false, sup: false },
                    { label: 'View T&S Cases', admin: true, mod: true, sup: true },
                    { label: 'Resolve T&S Cases', admin: true, mod: true, sup: false },
                    { label: 'Escalate T&S Cases', admin: true, mod: true, sup: false },
                    { label: 'Review AI Decisions', admin: true, mod: false, sup: false },
                    { label: 'Reverse AI Decisions', admin: true, mod: false, sup: false },
                    { label: 'Approve Coaches', admin: true, mod: false, sup: false },
                    { label: 'Manage Coach Payouts', admin: true, mod: false, sup: false },
                    { label: 'Manage Strikes', admin: true, mod: false, sup: false },
                    { label: 'Manage Perks', admin: true, mod: false, sup: false },
                    { label: 'Manage Partners', admin: true, mod: false, sup: false },
                    { label: 'View Analytics', admin: true, mod: true, sup: true },
                    { label: 'Export Reports', admin: true, mod: false, sup: false },
                    { label: 'Manage Admin Roles', admin: true, mod: false, sup: false },
                    { label: 'Manage Platform Settings', admin: true, mod: false, sup: false },
                  ].map((row) => (
                    <tr key={row.label} className="hover:bg-background">
                      <td className="px-4 py-2.5 text-foreground">{row.label}</td>
                      <td className="px-4 py-2.5 text-center">{row.admin ? <Check /> : <X />}</td>
                      <td className="px-4 py-2.5 text-center">{row.mod ? <Check /> : <X />}</td>
                      <td className="px-4 py-2.5 text-center">{row.sup ? <Check /> : <X />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── USER MANAGEMENT ── */}
        <section id="users" className="scroll-mt-8">
          <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">User Management</h2>
          <div className="bg-card rounded-lg shadow p-6 space-y-6">
            <p>Access via <Link href="/admin/users" className="text-primary hover:underline">Admin → Users</Link>. Requires at minimum <strong>Support</strong> role to view.</p>

            <div>
              <h3 className="font-semibold text-lg mb-2">Searching for a User</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Enter the user's email address or Firebase UID in the search box</li>
                <li>Press <kbd className="bg-muted px-1.5 py-0.5 rounded text-xs border border-border">Enter</kbd> or click <strong>Search</strong></li>
                <li>Click any row to open the user detail modal</li>
                <li>Clear the search field and click Search again to return to the full user list</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">User Detail Modal — Tabs</h3>
              <div className="space-y-3">
                <div className="bg-muted rounded-lg p-3">
                  <div className="font-medium mb-1">User Info tab</div>
                  <p className="text-sm text-muted-foreground">Shows UID, subscription plan, seat usage, user mode, onboarding status, and account owner flag. Read-only reference data.</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="font-medium mb-1">Caregiver Relationships tab</div>
                  <p className="text-sm text-muted-foreground">Lists all caregivers with access to this user's account. From here you can add a new caregiver (by email), edit their individual permissions, or remove them entirely. Also shows which other accounts this user is a caregiver for.</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="font-medium mb-1">Patients tab</div>
                  <p className="text-sm text-muted-foreground">Lists all patients (human and pet) under this account. Shows name, type, relationship, age, and active/deleted status. Admins can archive a patient (soft delete — data preserved, hidden from user's active list).</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Suspending a User</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Find and click the user row to open the detail modal — or use the shield icon in the action column</li>
                <li>Click the <strong>Suspend</strong> button (shield icon) in the user row's action buttons</li>
                <li>Confirm in the dialog. The user's status changes to <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">Suspended</span></li>
                <li>To unsuspend, click the same button again (it becomes a checkmark when suspended)</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">Requires <strong>Admin</strong> role. Suspended users cannot log in.</p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Exporting GDPR Data</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Find the user and click the <strong>Export</strong> button (download icon) in the action column</li>
                <li>A JSON file downloads automatically named <code className="bg-muted px-1 rounded">user-data-[email]-[date].json</code></li>
                <li>Send this file to the user as their GDPR data export</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">Available to <strong>Admin</strong> and <strong>Support</strong> roles.</p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Deleting a User</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                <strong className="text-red-800">⚠ Destructive action.</strong>
                <span className="text-sm text-red-700 ml-1">Permanently deletes the user's Firebase Auth account and associated data. This cannot be undone.</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Click the <strong>Delete</strong> button (trash icon) in the user row</li>
                <li>A confirmation modal appears showing the user's email</li>
                <li>Click <strong>Delete</strong> to confirm — user is removed from Firebase Auth and the user list</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">Requires <strong>Admin</strong> role only.</p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Adding a Caregiver</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Open the user detail modal → Caregiver Relationships tab</li>
                <li>Click <strong>+ Add New Caregiver</strong></li>
                <li>Enter the caregiver's email address. Optionally add patient IDs (comma-separated). Leave patient IDs empty to grant access to all patients</li>
                <li>Click <strong>Add with Full Permissions</strong>. Full permissions are granted by default and can be adjusted afterwards via <strong>Edit</strong></li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Archiving a Patient</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Open the user detail modal → Patients tab</li>
                <li>Find the patient and click <strong>Archive</strong></li>
                <li>Confirm in the dialog. The patient's status changes to <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">Deleted</span> and is hidden from the user's active list</li>
                <li>All underlying data (vitals, medications, appointments) is preserved in Firestore</li>
              </ol>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📱 Mobile Edge Cases — Login & Account Access</h3>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-blue-800">
                <li><strong>App vs browser:</strong> ask the user if they are using the downloaded app or the mobile browser — issues differ between the two.</li>
                <li><strong>Face ID / Touch ID:</strong> if biometric login stops working, the user should go to their phone Settings → the app → and re-enable camera or fingerprint access.</li>
                <li><strong>Session timeouts:</strong> mobile apps log users out faster to save battery. If a user keeps getting logged out, they can enable "Stay logged in" in the app settings.</li>
                <li><strong>Phone storage full:</strong> a phone with no free storage may fail to open or crash the app. Ask the user to free up space and try again.</li>
                <li><strong>App not updated:</strong> old versions may have bugs that are already fixed. Ask the user to check the App Store or Google Play for an update before troubleshooting further.</li>
                <li><strong>Shared family device:</strong> if multiple people use the same phone or tablet, make sure the right account is logged in before troubleshooting.</li>
              </ul>
              <h3 className="font-semibold text-blue-900 mb-2 mt-4">📱 Mobile Edge Cases — Notifications</h3>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-blue-800">
                <li>Push notifications only work in the downloaded app, not the mobile browser.</li>
                <li><strong>iPhone fix:</strong> Settings → Notifications → find the app → turn on "Allow Notifications".</li>
                <li><strong>Android fix:</strong> Settings → Apps → find the app → Notifications → turn on.</li>
                <li>Some Android phones have extra battery-saving settings that block background notifications. Ask the user to check Battery or Power settings and allow the app to run in the background.</li>
                <li>If notifications work but show the wrong name or data, that is a data issue — check the user's account in admin.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── RECIPE MODERATION ── */}
        <section id="recipes" className="scroll-mt-8">
          <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">Recipe Moderation</h2>
          <div className="bg-card rounded-lg shadow p-6 space-y-4">
            <p>Access via <Link href="/admin/recipes" className="text-primary hover:underline">Admin → Recipes</Link>. Available to <strong>Admin</strong> and <strong>Moderator</strong> roles.</p>
            <div>
              <h3 className="font-semibold mb-2">Moderation Queue</h3>
              <p className="text-sm text-muted-foreground">User-submitted recipes arrive in a pending queue. The sidebar badge shows the count of pending items. Review each recipe for:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>Accurate nutritional information</li>
                <li>Appropriate content (no harmful ingredients listed as health foods)</li>
                <li>Proper categorization and images</li>
              </ul>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="border border-green-200 bg-green-50 rounded-lg p-3">
                <div className="font-medium text-green-800 mb-1">Approve</div>
                <p className="text-xs text-green-700">Recipe becomes visible to all users. Cannot be undone without re-moderating.</p>
              </div>
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-3">
                <div className="font-medium text-blue-800 mb-1">Feature</div>
                <p className="text-xs text-blue-700">Highlights the recipe on the home page and search results. Admin-only.</p>
              </div>
              <div className="border border-red-200 bg-red-50 rounded-lg p-3">
                <div className="font-medium text-red-800 mb-1">Delete</div>
                <p className="text-xs text-red-700">Permanently removes the recipe. Admin-only. Use for policy violations.</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📱 Mobile Edge Cases — Recipe Submissions</h3>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-blue-800">
                <li><strong>Autocorrect errors:</strong> phone keyboards change words automatically. "1 cup flour" might become "1 cup floor." Fix obvious typos before rejecting for them.</li>
                <li><strong>Phone photos:</strong> recipe photos taken on a phone are often informal — on a kitchen counter, in bad lighting, slightly blurry. Judge whether the photo shows the right food, not whether it looks professional.</li>
                <li><strong>Duplicate submissions:</strong> a user may tap Submit twice on a slow mobile connection. If you see the same recipe submitted twice within a few minutes, approve one and delete the other.</li>
                <li><strong>Missing fields:</strong> mobile users sometimes skip optional fields (prep time, servings) because the form is harder to fill on a small screen. You can edit and fill these in before approving.</li>
                <li><strong>Voice-to-text instructions:</strong> some users dictate recipe instructions using their phone microphone. This can produce odd punctuation or run-on sentences. Fix the formatting if needed.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── BARCODES & PRODUCTS ── */}
        <section id="barcodes" className="scroll-mt-8">
          <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">Barcodes & Products</h2>
          <div className="bg-card rounded-lg shadow p-6 space-y-4">
            <p>Access via <Link href="/admin/barcodes" className="text-primary hover:underline">Barcodes</Link> and <Link href="/admin/products" className="text-primary hover:underline">Products</Link>. Admin only.</p>
            <div>
              <h3 className="font-semibold mb-2">Barcodes</h3>
              <p className="text-sm text-muted-foreground">Manage the barcode-to-product lookup database. When a user scans a product barcode that isn't in the system, it appears here for review. You can:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>Look up a barcode to see its current mapped product</li>
                <li>Edit the mapping to correct nutritional data or product name</li>
                <li>Add a new barcode entry manually</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Products</h3>
              <p className="text-sm text-muted-foreground">Browse and edit the full product database. Each product record contains nutritional info (calories, macros, serving size) and metadata. Edits take effect immediately for all users scanning that barcode.</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📱 Mobile Edge Cases — Barcode Scanning</h3>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-blue-800">
                <li><strong>How users scan on phone/tablet:</strong> they tap the barcode icon in Log a Meal, point their camera at the package, and the app reads the number automatically — no typing needed.</li>
                <li><strong>Camera permission blocked:</strong> iPhone — Settings → app name → Camera → on. Android — Settings → Apps → app → Permissions → Camera → Allow.</li>
                <li><strong>Curved or crinkled barcodes:</strong> bottles and bags distort the barcode. Ask the user to type the number manually instead of scanning.</li>
                <li><strong>iPad sideways camera:</strong> ask the user to hold the iPad in landscape (horizontal) mode if the scanner appears sideways.</li>
                <li><strong>USB / Bluetooth hardware scanners:</strong> some users connect a physical scanner to a laptop or desktop. These act like a keyboard — they type the barcode number into whatever field is active. If a hardware scanner stops working, ask the user to click into the barcode search field first, then scan.</li>
                <li><strong>Hardware scanners and damaged barcodes:</strong> physical scanners read damaged or curved barcodes better than a phone camera. Recommend this option for high-volume users.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── TRUST & SAFETY ── */}
        <section id="trust-safety" className="scroll-mt-8">
          <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">Trust & Safety</h2>
          <div className="bg-card rounded-lg shadow p-6 space-y-4">
            <p>Access via <Link href="/admin/trust-safety" className="text-primary hover:underline">Admin → Trust & Safety</Link>. Available to all roles.</p>
            <div>
              <h3 className="font-semibold mb-2">Case Queue</h3>
              <p className="text-sm text-muted-foreground">User-reported content and safety concerns appear here. Cases are sorted by severity. The sidebar badge shows open cases.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Resolving a Case</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Review the case details and any linked content</li>
                  <li>Select an outcome (no action / warning / content removed / account suspended)</li>
                  <li>Add resolution notes</li>
                  <li>Click <strong>Resolve</strong>. The case is closed and logged</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-2">Requires <strong>Admin</strong> or <strong>Moderator</strong> role.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Escalating a Case</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Use <strong>Escalate</strong> when a case requires legal review or senior admin attention</li>
                  <li>Add escalation notes explaining why</li>
                  <li>The case moves to a separate escalated queue and an admin is notified</li>
                </ol>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Strike System</h3>
              <p className="text-sm text-muted-foreground">Repeated violations result in strikes against a user's account. 3 strikes trigger automatic account review. Strikes can be issued or reversed from a resolved case. Admin-only.</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📱 Mobile Edge Cases — Reports & Evidence</h3>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-blue-800">
                <li><strong>Accidental reports:</strong> users on small screens sometimes tap "Report" by mistake. If a case has no clear violation and the reporter hasn't followed up, it's okay to close it as "No action."</li>
                <li><strong>Mobile screenshots as evidence:</strong> these may be cropped, rotated, or low resolution. Zoom in before deciding if the screenshot supports the case.</li>
                <li><strong>Shared device reports:</strong> someone may report content posted from the same phone by a different family member. Check account history before acting.</li>
                <li><strong>Screen recordings:</strong> some users submit short phone screen recordings as evidence. These are valid — review them the same way you would a screenshot.</li>
                <li><strong>Report submitted mid-app-update:</strong> if the linked content no longer exists, mark the case as "Content already removed" and close it.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── HIPAA ── */}
        <section id="hipaa" className="scroll-mt-8">
          <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">HIPAA Complaints</h2>
          <div className="bg-card rounded-lg shadow p-6 space-y-4">
            <p>Access via <Link href="/admin/hipaa-complaints" className="text-primary hover:underline">Admin → HIPAA Complaints</Link>. Admin only.</p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <strong className="text-red-800">Legal Requirement:</strong>
              <span className="text-sm text-red-700 ml-1">HIPAA complaints must be acknowledged within <strong>30 days</strong> and investigated promptly. Failure to respond can result in regulatory penalties.</span>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Intake Workflow</h3>
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
                <li>A complaint is submitted via the contact form or directly to privacy@wellnessprojectionlab.com</li>
                <li>Log the complaint in the admin panel immediately with the date received</li>
                <li>Acknowledge receipt to the complainant within <strong>7 days</strong></li>
                <li>Investigate: identify what PHI was involved, how it was disclosed, and whether it was unauthorized</li>
                <li>If a breach occurred, notify affected individuals within <strong>60 days</strong> per HIPAA Breach Notification Rule</li>
                <li>Document all actions taken. Resolution notes are required before closing</li>
              </ol>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Escalation</h3>
              <p className="text-sm text-muted-foreground">Any complaint involving actual unauthorized PHI disclosure must be escalated to legal counsel immediately. Do not attempt to resolve potential breach notifications without legal review.</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📱 Mobile Edge Cases — HIPAA Complaints</h3>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-blue-800">
                <li>Most complaints arrive by email — written on a phone, so they may be brief or missing details. Ask follow-up questions to fill in the gaps.</li>
                <li>If the complaint came through the in-app contact form on a mobile device, it may have autocorrect errors. Read for meaning, not perfection.</li>
                <li>If the user attaches a phone screenshot as evidence of a data exposure, save it to the complaint record immediately — it may be the only proof.</li>
                <li>Your response email must be easy to read on a small screen: short paragraphs, no long blocks of text, no file attachments — use direct links instead.</li>
                <li><strong>Shared device exposure:</strong> if health data appeared on a shared family device or a shared iCloud / Google account, treat it as a potential breach and investigate immediately.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── AI DECISIONS ── */}
        <section id="ai-decisions" className="scroll-mt-8">
          <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">AI Decisions</h2>
          <div className="bg-card rounded-lg shadow p-6 space-y-4">
            <p>Access via <Link href="/admin/ai-decisions" className="text-primary hover:underline">Admin → AI Decisions</Link>. Admin only.</p>
            <p className="text-sm text-muted-foreground">The platform's ML models make automated decisions about meal classification, calorie estimates, health report recommendations, and content filtering. These decisions are logged here for human review.</p>
            <div>
              <h3 className="font-semibold mb-2">Reviewing a Decision</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>The sidebar badge shows decisions flagged for review (low confidence or user-disputed)</li>
                <li>Click a decision to see the model input, output, confidence score, and user context</li>
                <li>Mark as <strong>Approved</strong> (model was correct) or <strong>Override</strong> (model was wrong)</li>
              </ol>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Reversing a Decision</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Select <strong>Override</strong> and enter the correct value</li>
                <li>The user's record is updated with the corrected data</li>
                <li>The override is fed back as a training signal to improve future predictions</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">Document the reason for every override — this data is reviewed periodically to assess model performance.</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📱 Mobile Edge Cases — Food Photo Logging</h3>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-blue-800">
                <li>Most food photos are taken on a smartphone or tablet. The AI reads the actual pixels — a blurry or dark photo gives it less to work with.</li>
                <li><strong>Blurry photo:</strong> user moved the phone while tapping — AI may misidentify the food. Mark as "Unable to determine" rather than guessing.</li>
                <li><strong>Dark lighting:</strong> restaurant candles or nighttime photos wash out colors. A valid reason to override.</li>
                <li><strong>Overhead angle:</strong> some foods look completely different from directly above vs the side. Check the photo angle before deciding the AI was wrong.</li>
                <li><strong>Mixed plate:</strong> a plate with 5 different foods is harder for the AI than a single item. Look at each food in the photo before approving the decision.</li>
                <li>When you override, always write a short note ("Photo was dark, food misidentified") — it builds a record and helps the team spot patterns.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── COACHING ── */}
        <section id="coaching" className="scroll-mt-8">
          <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">Coaching</h2>
          <div className="bg-card rounded-lg shadow p-6 space-y-4">
            <p>Access via <Link href="/admin/coaching" className="text-primary hover:underline">Admin → Coaching</Link>. Admin only.</p>
            <div>
              <h3 className="font-semibold mb-2">Approving a Coach Application</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>New applications appear in the queue — badge shows count</li>
                <li>Review credentials, bio, and specializations</li>
                <li>Click <strong>Approve</strong> to activate the coach profile, or <strong>Reject</strong> with a reason</li>
                <li>Approved coaches are visible to users in the coaching marketplace</li>
              </ol>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Managing Payouts</h3>
              <p className="text-sm text-muted-foreground">Coach earnings are tracked per session. Payouts are processed on the 1st and 15th of each month. The payout dashboard shows pending amounts and payment history. Requires Stripe integration credentials in settings.</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📱 Mobile Edge Cases — Coaching</h3>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-blue-800">
                <li>Most coaches manage their schedule and clients from their phone — they get booking alerts as push notifications. If a coach missed a session, check their notification settings first (see User Management → Mobile Edge Cases).</li>
                <li><strong>Coach applications from mobile:</strong> bios may be short and credentials typed manually. Follow up if something is unclear before rejecting.</li>
                <li><strong>Timezone mix-ups:</strong> a coach in one timezone and a user in another both view session times on their phones. If a "no show" complaint comes in, check the timezone on both sides before issuing a warning.</li>
                <li><strong>Credential photos:</strong> coaches often attach photos of their certifications taken with their phone camera. Low resolution or cropped images are common. Ask for a clearer image if you can't read the credential.</li>
                <li><strong>Payout not received:</strong> payout notifications go by email. Ask the coach to check their spam folder on their phone before escalating to a Stripe issue.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── ANALYTICS ── */}
        <section id="analytics" className="scroll-mt-8">
          <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">Analytics</h2>
          <div className="bg-card rounded-lg shadow p-6 space-y-4">
            <p>Available to all roles. Three analytics views:</p>
            <div className="space-y-3">
              <div className="flex gap-3">
                <Link href="/admin/analytics" className="font-medium text-primary hover:underline shrink-0">Platform Analytics</Link>
                <span className="text-sm text-muted-foreground">— DAU/MAU, new registrations, feature adoption, subscription metrics, churn rate.</span>
              </div>
              <div className="flex gap-3">
                <Link href="/admin/ml-analytics" className="font-medium text-primary hover:underline shrink-0">ML Analytics</Link>
                <span className="text-sm text-muted-foreground">— Model performance, prediction accuracy, feature importance, data drift indicators.</span>
              </div>
              <div className="flex gap-3">
                <Link href="/admin/api-usage" className="font-medium text-primary hover:underline shrink-0">API Usage</Link>
                <span className="text-sm text-muted-foreground">— External API call volumes (Claude AI, Google Places, etc.), cost tracking, rate limit headroom.</span>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Exporting Reports</h3>
              <p className="text-sm text-muted-foreground">Use the <strong>Export</strong> button on any analytics page to download a CSV or PDF. Admin-only. Exported reports include a timestamp and the current admin's email for audit trail purposes.</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📱 Mobile Edge Cases — Analytics</h3>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-blue-800">
                <li>Most of the numbers in analytics reflect what users are doing on their phones. A DAU spike usually means the mobile app is getting more use, not the website.</li>
                <li><strong>DAU spike on a specific day:</strong> check if a mobile app update went out that day — new versions often trigger a wave of returning users.</li>
                <li><strong>API usage spike:</strong> can be caused by mobile users triggering repeated scans. For example, a barcode scanner bug that sends multiple requests per scan shows up as a spike here.</li>
                <li><strong>Viewing analytics on your own phone:</strong> the analytics pages are designed for desktop. Tables may scroll horizontally on a small screen — swipe left and right to see all columns.</li>
                <li><strong>Exporting from mobile:</strong> on iPhone, the file saves to the Files app. On Android, check the Files or My Files app in the Downloads folder.</li>
                <li><strong>Charts not loading on phone:</strong> try rotating to landscape (horizontal) mode — some charts need more width to render correctly. Low Power Mode can also block data from loading; turn it off and refresh.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── MARKETING & COMMS ── */}
        <section id="marketing" className="scroll-mt-8">
          <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">Marketing & Comms</h2>
          <div className="bg-card rounded-lg shadow p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2"><Link href="/admin/demo-requests" className="text-primary hover:underline">Demo Requests</Link></h3>
                <p className="text-sm text-muted-foreground">Intake form submissions from businesses or healthcare providers interested in the enterprise plan. Respond within 24 hours. Mark as contacted once you've reached out.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2"><Link href="/admin/contact-submissions" className="text-primary hover:underline">Contact Submissions</Link></h3>
                <p className="text-sm text-muted-foreground">General contact form submissions. Triage: support issues go to the T&S queue; billing questions escalate to admin; feature requests are logged and closed.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2"><Link href="/admin/marketing" className="text-primary hover:underline">Marketing Tools</Link></h3>
                <p className="text-sm text-muted-foreground">Manage landing page content, promotional banners, and email campaign triggers. Changes are immediate — always preview before publishing.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2"><Link href="/admin/careers" className="text-primary hover:underline">Careers</Link></h3>
                <p className="text-sm text-muted-foreground">Post job listings and review applications. Applications are held for 90 days. Rejected applicants receive an automated email.</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📱 Mobile Edge Cases — Marketing & Comms</h3>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-blue-800">
                <li><strong>Demo requests from mobile:</strong> often brief or vague — the person filled out the form on their phone during a spare moment. Reply with a short, clear email that reads well on a small screen.</li>
                <li><strong>Contact form autocorrect:</strong> submissions from phone users may contain autocorrect errors. Read for meaning, not literal words.</li>
                <li><strong>Marketing emails:</strong> most users read email on their phone. Keep templates short, use large readable text, and place the call-to-action button near the top.</li>
                <li><strong>Push notification campaigns:</strong> go directly to users' phone lock screens. Keep text under 100 characters — long messages get cut off on iPhone and Android. There is no way to unsend a notification; contact engineering immediately if the wrong message goes out.</li>
                <li><strong>Job applications from mobile:</strong> resumes formatted in Google Docs mobile or similar tools may look unusual. Judge the content, not the layout.</li>
                <li><strong>Landing page changes:</strong> most visitors see your pages on a phone. Always preview any page change on a mobile screen size before publishing.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── SETTINGS ── */}
        <section id="settings" className="scroll-mt-8">
          <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">Settings</h2>
          <div className="bg-card rounded-lg shadow p-6 space-y-4">
            <p>Access via <Link href="/admin/settings" className="text-primary hover:underline">Admin → Settings</Link>. Admin only.</p>
            <div>
              <h3 className="font-semibold mb-2">Granting Admin Access</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Go to Settings and find the <strong>Admin Role Management</strong> section</li>
                <li>Enter the user's email address and select a role (admin / moderator / support)</li>
                <li>Click <strong>Grant Role</strong>. The change takes effect on the user's next login</li>
                <li>To revoke, find the user in the list and click <strong>Remove Role</strong></li>
              </ol>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
                <strong className="text-yellow-800 text-sm">Note:</strong>
                <span className="text-sm text-yellow-700 ml-1">Super admins (set via <code className="bg-yellow-100 px-1 rounded">SUPER_ADMIN_EMAILS</code> env var) cannot have their access revoked through the UI. Changes to super admin emails require a server environment variable update and redeploy.</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📱 Mobile Edge Cases — Settings</h3>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-blue-800">
                <li><strong>Granting access on a phone:</strong> double-check the email address before clicking Grant Role — it's easy to mistype on a phone keyboard. A typo means the wrong person (or no one) gets access.</li>
                <li><strong>Settings page on mobile:</strong> the form layout is narrower on a phone. Scroll down to see all options — some settings appear below the fold on small screens.</li>
                <li><strong>Feature flag changes:</strong> these take effect for mobile app users within 30 seconds — no app update needed. When you toggle a flag, expect users to see the change almost immediately.</li>
                <li><strong>Disabling a major feature:</strong> turning off something users rely on (like barcode scanning) will generate support messages very quickly. Always coordinate with the team before disabling a major feature.</li>
                <li><strong>Email template changes:</strong> send yourself a test email and open it on your phone before saving. Long lines that look fine on desktop can wrap awkwardly on mobile.</li>
                <li><strong>Role removals:</strong> take effect the next time the person logs in. If you need access removed immediately due to a security risk, contact a developer to revoke the session token directly.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── SUPPORT PLAYBOOK ── */}
        <section id="playbook" className="scroll-mt-8">
          <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">Support Playbook</h2>
          <div className="bg-card rounded-lg shadow divide-y divide-border">
            {[
              {
                title: '"I can\'t log in"',
                steps: [
                  'Search for the user by email in Users',
                  'Check if their account is Suspended — unsuspend if incorrectly suspended',
                  'Verify their email is correct (no typos)',
                  'Ask them to use "Forgot Password" — Firebase sends a reset email',
                  'If they signed up with Google/Apple, they must use that same provider to sign in',
                ],
              },
              {
                title: '"Please send me my data" (GDPR / Right of Access)',
                steps: [
                  'Verify the requester\'s identity matches the account (email + any secondary verification)',
                  'Find the user in Users and click the Export button (download icon)',
                  'A JSON file downloads — send this to the user securely (not via unencrypted email)',
                  'Log the request in a support ticket. Response must be completed within 30 days',
                ],
              },
              {
                title: '"Please delete my account"',
                steps: [
                  'Verify identity',
                  'Export their data first if they request it',
                  'Find the user, click the Delete (trash) button, confirm the modal',
                  'Confirm to the user that deletion is complete. Their Firebase Auth account and data are removed',
                  'Note: Firestore subcollection data may persist briefly — this is handled by Cloud Functions',
                ],
              },
              {
                title: '"My caregiver can\'t see my patients"',
                steps: [
                  'Open the account owner\'s user modal → Caregiver Relationships tab',
                  'Find the caregiver in the list and check their status (should be "accepted")',
                  'If status is "pending", the caregiver hasn\'t accepted the invitation yet — ask them to check email',
                  'Check patientsAccess — if empty, they have access to all patients; if populated, verify the correct patient IDs are listed',
                  'Check permissions — viewRecords and viewVitals must be enabled',
                  'If correct on the admin side, ask the caregiver to sign out and back in to refresh their session',
                ],
              },
              {
                title: '"I see a duplicate patient record"',
                steps: [
                  'Open the user\'s modal → Patients tab',
                  'Identify which record is the duplicate (usually the one with no data or an older createdAt)',
                  'Archive the duplicate using the Archive button',
                  'The data remains in Firestore under status: "deleted" for audit purposes',
                  'If both records have data that needs merging, escalate to an Admin — manual Firestore merge required',
                ],
              },
              {
                title: '"I want to cancel / downgrade my subscription"',
                steps: [
                  'Subscription management is handled through Stripe — direct the user to their billing portal via the app (Account → Billing)',
                  'If they cannot access the portal, find them in Users, note their subscription.plan, and escalate to an admin with Stripe access',
                  'Do not manually alter subscription data in Firestore — Stripe is the source of truth',
                ],
              },
              {
                title: '"The barcode scanner won\'t work on my phone"',
                steps: [
                  'First ask: did the app ask for camera permission when you first opened the scanner? If they tapped "Don\'t Allow," the camera is blocked.',
                  'iPhone fix: Settings → scroll to the app name → Camera → turn on.',
                  'Android fix: Settings → Apps → find the app → Permissions → Camera → Allow.',
                  'If permission is already on, ask them to close the app completely and reopen it.',
                  'If the barcode is on a curved bottle or crinkled bag, the camera may struggle. Ask them to type the barcode number manually instead.',
                  'If the scanner opens but freezes, the phone may be running out of memory. Ask them to close other apps and try again.',
                  'Check if the barcode is in the database — go to Admin → Barcodes and search the number. If missing, add it.',
                ],
              },
              {
                title: '"The app crashed on my phone"',
                steps: [
                  'Ask which phone model and OS version they have (e.g. iPhone 12, iOS 17 or Samsung Galaxy, Android 14).',
                  'Ask when it crashes — on opening, during a scan, after logging a meal. The timing tells you where the bug is.',
                  'Ask if the phone is low on storage — a full phone is the most common cause of app crashes. iPhone: Settings → General → iPhone Storage. Android: Settings → Storage.',
                  'If storage is fine, ask them to uninstall and reinstall the app — this clears corrupt cached data.',
                  'If it still crashes, ask them to send a screenshot of any error message.',
                  'Log the details in the bug tracker and escalate to engineering.',
                  'If many users report the same crash at the same time, check platform status and alert the team.',
                ],
              },
              {
                title: '"My food photo didn\'t log correctly"',
                steps: [
                  'This usually means the AI returned a wrong food identification or calorie estimate.',
                  'Go to Admin → AI Decisions and search for the user\'s recent decisions.',
                  'Open the decision and look at the original photo the user submitted.',
                  'Was the photo blurry, dark, or hard to read? If so, that\'s likely why the AI struggled.',
                  'If the AI was clearly wrong, click Override and enter the correct food name and calorie value.',
                  'Tell the user the log has been corrected and remind them that clear, well-lit photos give better results.',
                  'If the photo was clear but the AI still got it wrong, note it in the decision — this is a model accuracy issue for engineering.',
                ],
              },
            ].map((item) => (
              <div key={item.title} className="p-5">
                <h3 className="font-semibold text-foreground mb-3">{item.title}</h3>
                <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
                  {item.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        <div className="text-xs text-muted-foreground text-center pb-8">
          Operators Manual · Internal use only · Wellness Projection Lab
        </div>
      </main>
    </div>
  )
}
