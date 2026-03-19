'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { XMarkIcon, BookOpenIcon } from '@heroicons/react/24/outline'

interface OperatorsManualDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const ROUTE_TO_SECTION: Record<string, string> = {
  '/admin/users':               'dm-users',
  '/admin/recipes':             'dm-recipes',
  '/admin/barcodes':            'dm-barcodes',
  '/admin/products':            'dm-barcodes',
  '/admin/trust-safety':        'dm-trust',
  '/admin/hipaa-complaints':    'dm-hipaa',
  '/admin/ai-decisions':        'dm-ai',
  '/admin/coaching':            'dm-coaching',
  '/admin/analytics':           'dm-analytics',
  '/admin/ml-analytics':        'dm-analytics',
  '/admin/api-usage':           'dm-analytics',
  '/admin/marketing':           'dm-marketing',
  '/admin/demo-requests':       'dm-marketing',
  '/admin/contact-submissions': 'dm-marketing',
  '/admin/careers':             'dm-marketing',
  '/admin/settings':            'dm-settings',
}

const Check = () => <span className="text-green-600 font-bold">✓</span>
const X = () => <span className="text-gray-300">—</span>

const sections = [
  { id: 'dm-overview', label: 'Overview' },
  { id: 'dm-roles', label: 'Roles & Permissions' },
  { id: 'dm-users', label: 'User Management' },
  { id: 'dm-recipes', label: 'Recipe Moderation' },
  { id: 'dm-barcodes', label: 'Barcodes & Products' },
  { id: 'dm-trust', label: 'Trust & Safety' },
  { id: 'dm-hipaa', label: 'HIPAA Complaints' },
  { id: 'dm-ai', label: 'AI Decisions' },
  { id: 'dm-coaching', label: 'Coaching' },
  { id: 'dm-analytics', label: 'Analytics' },
  { id: 'dm-marketing', label: 'Marketing & Comms' },
  { id: 'dm-settings', label: 'Settings' },
  { id: 'dm-playbook', label: 'Support Playbook' },
]

export function OperatorsManualDrawer({ isOpen, onClose }: OperatorsManualDrawerProps) {
  const pathname = usePathname()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // When the drawer opens, scroll to the section matching the current page
  useEffect(() => {
    if (!isOpen) return
    const sectionId = ROUTE_TO_SECTION[pathname] ?? 'dm-overview'
    // Wait for the slide-in transition to finish before scrolling
    const timer = setTimeout(() => {
      const el = scrollContainerRef.current?.querySelector(`#${sectionId}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 320)
    return () => clearTimeout(timer)
  }, [isOpen, pathname])
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[70]"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[520px] max-w-[90vw] bg-background border-l border-border shadow-2xl z-[80] flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-label="Operators Manual"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2">
            <BookOpenIcon className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">Operators Manual</span>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 text-xs font-semibold rounded-full">Internal</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/operators-manual"
              className="text-xs text-primary hover:underline"
              onClick={onClose}
            >
              Full page →
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="Close manual"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick-jump TOC */}
        <div className="px-5 py-3 border-b border-border bg-muted/50 shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-xs px-2.5 py-1 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-10">

          {/* OVERVIEW */}
          <section id="dm-overview" className="scroll-mt-4">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">1</span>
              Overview
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>The <strong className="text-foreground">WPL Admin Panel</strong> is accessible only to users with an <code className="bg-muted px-1 rounded">admin</code>, <code className="bg-muted px-1 rounded">moderator</code>, or <code className="bg-muted px-1 rounded">support</code> role in Firestore.</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { role: 'Admin', desc: 'Full access', card: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-500/50', title: 'text-purple-900 dark:text-purple-300', sub: 'text-purple-700 dark:text-purple-400' },
                  { role: 'Moderator', desc: 'Content & cases', card: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-500/50', title: 'text-blue-900 dark:text-blue-300', sub: 'text-blue-700 dark:text-blue-400' },
                  { role: 'Support', desc: 'View & export', card: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-500/50', title: 'text-green-900 dark:text-green-300', sub: 'text-green-700 dark:text-green-400' },
                ].map((r) => (
                  <div key={r.role} className={`${r.card} border rounded-lg p-2.5`}>
                    <div className={`font-semibold ${r.title} text-xs mb-0.5`}>{r.role}</div>
                    <div className={`${r.sub} text-xs`}>{r.desc}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs">Grant roles via <Link href="/admin/settings" className="text-primary hover:underline" onClick={onClose}>Settings → Admin Role Management</Link>.</p>
            </div>
          </section>

          {/* ROLES & PERMISSIONS */}
          <section id="dm-roles" className="scroll-mt-4">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">2</span>
              Roles & Permissions
            </h2>
            <div className="rounded-lg border border-border overflow-hidden text-xs">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Permission</th>
                    <th className="px-2 py-2 text-center font-semibold text-purple-700">Adm</th>
                    <th className="px-2 py-2 text-center font-semibold text-blue-700">Mod</th>
                    <th className="px-2 py-2 text-center font-semibold text-green-700">Sup</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ['View Users', true, true, true],
                    ['Edit / Suspend / Delete Users', true, false, false],
                    ['Export GDPR Data', true, false, true],
                    ['Moderate Recipes', true, true, false],
                    ['Delete Recipes', true, false, false],
                    ['View T&S Cases', true, true, true],
                    ['Resolve / Escalate Cases', true, true, false],
                    ['Review / Reverse AI Decisions', true, false, false],
                    ['Approve Coaches & Payouts', true, false, false],
                    ['Manage Perks & Partners', true, false, false],
                    ['View Analytics', true, true, true],
                    ['Export Reports', true, false, false],
                    ['Manage Roles & Settings', true, false, false],
                  ].map(([label, admin, mod, sup]) => (
                    <tr key={label as string} className="hover:bg-muted/50">
                      <td className="px-3 py-1.5 text-muted-foreground">{label as string}</td>
                      <td className="px-2 py-1.5 text-center">{admin ? <Check /> : <X />}</td>
                      <td className="px-2 py-1.5 text-center">{mod ? <Check /> : <X />}</td>
                      <td className="px-2 py-1.5 text-center">{sup ? <Check /> : <X />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* USER MANAGEMENT */}
          <section id="dm-users" className="scroll-mt-4">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">3</span>
              User Management
              <Link href="/admin/users" className="text-xs text-primary hover:underline font-normal ml-auto" onClick={onClose}>Open →</Link>
            </h2>
            <div className="space-y-2 text-sm">
              {[
                {
                  title: 'Search a user',
                  steps: ['Enter email or UID in the search box', 'Press Enter or click Search', 'Click any row to open the detail modal'],
                },
                {
                  title: 'Modal tabs',
                  steps: [
                    'User Info — UID, subscription, seat usage',
                    'Caregiver Relationships — add/edit/remove caregivers',
                    'Patients — view and archive patient records',
                  ],
                },
                {
                  title: 'Suspend / unsuspend',
                  steps: ['Click the shield icon in the user row', 'Confirm — user cannot log in while suspended', 'Click again to unsuspend', 'Requires Admin role'],
                },
                {
                  title: 'Export GDPR data',
                  steps: ['Click the download icon in the user row', 'JSON file saves to your computer', 'Send securely to the user', 'Must complete within 30 days'],
                },
                {
                  title: 'Delete a user',
                  steps: ['Click the trash icon', 'Confirm in the modal — shows the user\'s email', 'Permanently removes Firebase Auth + data', 'Admin only — irreversible'],
                },
                {
                  title: 'Add a caregiver',
                  steps: ['Open modal → Caregiver Relationships tab', 'Click + Add New Caregiver', 'Enter email, optionally add patient IDs (blank = all)', 'Click Add with Full Permissions'],
                },
                {
                  title: 'Archive a patient',
                  steps: ['Open modal → Patients tab', 'Click Archive next to the patient', 'Data preserved, hidden from user\'s active list'],
                },
                {
                  title: '📱 Mobile edge cases — login & account access',
                  steps: [
                    'Most users access the app on a phone or tablet — not a desktop browser',
                    'App vs browser: ask the user if they are using the downloaded app or a web browser on their phone. Issues are often different for each.',
                    'Face ID / Touch ID: if biometric login stops working, ask the user to go to their phone Settings → the app → and re-enable Face ID or fingerprint access',
                    'Session timeout: mobile apps log users out faster to save battery. If a user says they keep getting logged out, this is normal. They can turn on "Stay logged in" in their app settings.',
                    'Phone storage full: if the phone has no free storage, the app may fail to open or crash. Ask the user to free up space and try again.',
                    'App not updated: old versions of the app may have bugs that are already fixed. Ask the user to check the App Store or Google Play for an update.',
                    'Shared family device: if multiple people use the same phone or tablet, make sure the right account is logged in before troubleshooting',
                  ],
                },
                {
                  title: '📱 Mobile edge cases — notifications',
                  steps: [
                    'Push notifications only work on the downloaded app, not the mobile browser',
                    'If a user says they stopped getting reminders, their notification permission was probably turned off',
                    'iPhone: Settings → Notifications → find the app → turn on "Allow Notifications"',
                    'Android: Settings → Apps → find the app → Notifications → turn on',
                    'Some Android phones have extra battery-saving settings that block background notifications. Ask the user to check their phone\'s Battery or Power settings and allow the app to run in the background.',
                    'If notifications work but show the wrong info (e.g. wrong patient name), that is a data issue — check the user\'s account in admin',
                  ],
                },
              ].map((item) => (
                <details key={item.title} className="group border border-border rounded-lg">
                  <summary className="px-3 py-2.5 cursor-pointer font-medium text-foreground list-none flex items-center justify-between hover:bg-muted rounded-lg">
                    {item.title}
                    <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <ol className="px-4 pb-3 pt-1 list-decimal list-inside space-y-1 text-xs text-muted-foreground border-t border-border">
                    {item.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </details>
              ))}
            </div>
          </section>

          {/* RECIPE MODERATION */}
          <section id="dm-recipes" className="scroll-mt-4">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">4</span>
              Recipe Moderation
              <Link href="/admin/recipes" className="text-xs text-primary hover:underline font-normal ml-auto" onClick={onClose}>Open →</Link>
            </h2>
            <div className="space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">Available to <strong>Admin</strong> and <strong>Moderator</strong>. The sidebar badge shows how many recipes are pending review.</p>
              {[
                {
                  title: 'Review a pending recipe',
                  steps: [
                    'Go to Admin → Recipes — pending items appear at the top of the queue',
                    'Open the recipe to review its title, ingredients, instructions, and nutritional data',
                    'Check for: accurate calorie/macro values, appropriate ingredients (no harmful content), correct category, and a clear photo',
                    'If everything looks good, click Approve — the recipe becomes visible to all users',
                    'If the data is wrong but the recipe is salvageable, use Edit to correct it before approving',
                    'If the recipe violates content policy, click Delete (Admin only)',
                  ],
                },
                {
                  title: 'Feature a recipe',
                  steps: [
                    'Only approved recipes can be featured',
                    'Open the recipe and click Feature — it appears in highlighted spots on the home page and search results',
                    'To un-feature, click Feature again to toggle it off',
                    'Limit featured recipes to a small curated set — over-featuring dilutes the quality signal',
                    'Admin only',
                  ],
                },
                {
                  title: 'Delete a recipe',
                  steps: [
                    'Use Delete only for clear policy violations (dangerous advice, plagiarized content, spam)',
                    'Click Delete and confirm — this is permanent and cannot be undone',
                    'If unsure, Reject (unpublish) rather than Delete so it can be reviewed again later',
                    'Admin only',
                  ],
                },
                {
                  title: 'What to check during review',
                  steps: [
                    'Calories and macros are plausible for the listed serving size',
                    'No ingredients that could be harmful presented as health food',
                    'Instructions are clear and complete — not just a placeholder',
                    'Category matches the recipe type (e.g. a smoothie is not in "Dinner")',
                    'Photo, if present, actually matches the dish',
                    'No copied/watermarked images or obvious plagiarism',
                  ],
                },
                {
                  title: '📱 Mobile edge cases — recipe submissions',
                  steps: [
                    'Most users write and submit recipes on their phone — keep this in mind when reviewing',
                    'Autocorrect errors: phone keyboards change words automatically. "1 cup flour" might become "1 cup floor." Fix obvious typos before approving rather than rejecting for them.',
                    'Phone photos: recipe photos taken on a phone are often informal — on a kitchen counter, in bad lighting, slightly blurry. Judge whether the photo shows the right food, not whether it looks professional.',
                    'Duplicate submissions: a user might tap Submit twice on a slow mobile connection. If you see the same recipe submitted twice within a few minutes, approve one and delete the other.',
                    'Missing fields: mobile users sometimes skip optional fields (like prep time or servings) because the form is harder to fill out on a small screen. You can edit and fill these in before approving.',
                    'Voice-to-text instructions: some users dictate recipe instructions using their phone\'s microphone. This can result in odd punctuation or run-on sentences. Fix the formatting if needed.',
                  ],
                },
              ].map((item) => (
                <details key={item.title} className="group border border-border rounded-lg">
                  <summary className="px-3 py-2.5 cursor-pointer font-medium text-foreground list-none flex items-center justify-between hover:bg-muted rounded-lg">
                    {item.title}
                    <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <ol className="px-4 pb-3 pt-1 list-decimal list-inside space-y-1 text-xs text-muted-foreground border-t border-border">
                    {item.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </details>
              ))}
            </div>
          </section>

          {/* BARCODES & PRODUCTS */}
          <section id="dm-barcodes" className="scroll-mt-4">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">5</span>
              Barcodes & Products
              <Link href="/admin/barcodes" className="text-xs text-primary hover:underline font-normal ml-auto" onClick={onClose}>Open →</Link>
            </h2>
            <div className="space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">Admin only. Users scan product barcodes with their phone or tablet camera. The app looks up that barcode to get the nutrition info. This is where you manage that database.</p>
              {[
                {
                  title: 'How users scan barcodes on their phone or tablet',
                  steps: [
                    'The user opens the app on their smartphone or iPad and taps "Log a Meal"',
                    'They tap the barcode icon to open the camera scanner',
                    'They point the camera at the barcode on the product — it works like a store scanner',
                    'On iPhone, the barcode scanner uses the back camera for best results',
                    'On Android phones and tablets, the same camera tap works',
                    'If the camera won\'t focus, the user can try tapping the barcode on screen or moving closer to it',
                    'The app reads the barcode number automatically — the user doesn\'t type anything',
                    'If the barcode is torn, faded, or curved on a bottle, the scan may fail. The user can type the number manually instead.',
                  ],
                },
                {
                  title: 'What happens when a scan finds nothing',
                  steps: [
                    'The user scans the barcode and the app checks our database',
                    'If we don\'t have it, the user sees a message like "Product not found"',
                    'They can still log the meal by typing it in manually',
                    'The unknown barcode is saved here in the admin panel for you to add later',
                    'Once you add it, anyone who scans that barcode in the future will get the right result',
                    'Common causes: brand new product, regional item, or store-brand label',
                  ],
                },
                {
                  title: 'Scanning with a USB or Bluetooth barcode scanner',
                  steps: [
                    'Some users connect a physical barcode scanner to their laptop or desktop — the kind you see at grocery checkouts',
                    'USB scanners plug directly into the computer and act like a keyboard — they type the barcode number into whatever field is active',
                    'Bluetooth scanners work the same way but connect wirelessly — common with standing desks or kitchen setups',
                    'These scanners are faster and more accurate than a phone camera, especially for users who log many items at once',
                    'From our side, a hardware scan looks identical to a typed barcode number — there\'s nothing different to handle in the admin panel',
                    'If a user says their scanner isn\'t working, it\'s almost always a device setup issue, not an app problem. Ask them to make sure the cursor is in the barcode search field before they scan.',
                    'Hardware scanners can read damaged or curved barcodes better than a phone camera can',
                  ],
                },
                {
                  title: 'Common mobile scanning problems and fixes',
                  steps: [
                    'Camera won\'t open — the user needs to allow camera permission in their phone\'s Settings app',
                    'Scan keeps failing — barcode may be wrinkled or on a curved surface (like a bottle). Ask them to flatten it or type the number instead.',
                    'Wrong product came up — the barcode is in our database but with wrong info. Find it in admin and fix the nutrition data.',
                    'App crashes during scan — ask the user to close and reopen the app, or restart their phone',
                    'iPad shows sideways camera — this is a known device orientation issue. Ask the user to hold the iPad in landscape (sideways) mode.',
                    'Barcode not visible — some users scan the lid or a sticker. The barcode is usually on the back or bottom of the package.',
                  ],
                },
                {
                  title: 'How to look up a barcode in admin',
                  steps: [
                    'Go to Admin → Barcodes',
                    'Type the barcode number in the search box — it\'s the string of digits under the black lines on the package',
                    'Click Search',
                    'You\'ll see the product it\'s linked to, or "Not found" if it\'s new',
                  ],
                },
                {
                  title: 'How to fix wrong product info',
                  steps: [
                    'Find the barcode using the search',
                    'Click Edit on the product',
                    'Fix the name, brand, calories, or other nutrition info',
                    'Click Save — the fix goes live right away for all users on all devices',
                    'Double-check your numbers before saving. Wrong calorie data directly affects a user\'s health tracking.',
                  ],
                },
                {
                  title: 'How to add a brand new product',
                  steps: [
                    'Go to Admin → Barcodes and click Add New',
                    'Type in the barcode number — find it printed below the barcode on the package',
                    'Fill in the product name, brand, and serving size',
                    'Enter the nutrition facts: calories, protein, carbs, fat, fiber, sodium',
                    'Pick the right food category',
                    'Click Save — it\'s now live for all users on all devices',
                    'Tip: use the nutrition info on the product\'s official website or the USDA FoodData database if you don\'t have the package in front of you',
                  ],
                },
                {
                  title: 'What to watch out for',
                  steps: [
                    'Calories and macros should match what\'s on the real product label',
                    'Serving size matters a lot — 1 cup vs 1 tablespoon makes a huge difference in the numbers',
                    'Some products have different barcodes for different sizes (small vs large bottle). Add each size as a separate entry.',
                    'Store brands often reuse the same barcode for different products in different regions. If a user reports the wrong product came up, check the region.',
                    'If a product was recalled or discontinued, you can delete it from the database',
                    'Never guess nutrition values. Always look them up from a trusted source.',
                  ],
                },
              ].map((item) => (
                <details key={item.title} className="group border border-border rounded-lg">
                  <summary className="px-3 py-2.5 cursor-pointer font-medium text-foreground list-none flex items-center justify-between hover:bg-muted rounded-lg">
                    {item.title}
                    <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <ol className="px-4 pb-3 pt-1 list-decimal list-inside space-y-1 text-xs text-muted-foreground border-t border-border">
                    {item.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </details>
              ))}
            </div>
          </section>

          {/* TRUST & SAFETY */}
          <section id="dm-trust" className="scroll-mt-4">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">6</span>
              Trust & Safety
              <Link href="/admin/trust-safety" className="text-xs text-primary hover:underline font-normal ml-auto" onClick={onClose}>Open →</Link>
            </h2>
            <div className="space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">All roles can view cases. Admin and Moderator can resolve or escalate. A "case" is created when a user reports something — bad content, harmful advice, abusive behavior, etc.</p>
              {[
                {
                  title: 'How to read a case',
                  steps: [
                    'The case shows who reported it and what they reported',
                    'It also shows the content or account that was reported',
                    'Read both sides — the report and the reported content',
                    'Check if there\'s a history. Has this user been reported before?',
                    'Look at the severity level: Low, Medium, High, or Critical',
                    'Critical cases (threats, illegal content) should be handled the same day',
                  ],
                },
                {
                  title: 'How to resolve a case',
                  steps: [
                    'After reviewing, pick the right outcome:',
                    'No action — the report was a misunderstanding or the content is fine',
                    'Warning — send the user a warning message. Use this for first-time minor issues.',
                    'Content removed — delete the post, recipe, or comment that broke the rules',
                    'Account suspended — stop the user from logging in (Admin only)',
                    'Write a short note explaining what you decided and why',
                    'Click Resolve — the case is closed and saved for the record',
                  ],
                },
                {
                  title: 'When to escalate a case',
                  steps: [
                    'Escalate when you\'re not sure what to do',
                    'Escalate for anything involving threats, self-harm, or illegal activity',
                    'Escalate if the case involves a minor',
                    'Escalate if legal action might be needed',
                    'Click Escalate, write a note explaining why, and a senior admin will take over',
                    'Never close a high-risk case on your own. When in doubt, escalate.',
                  ],
                },
                {
                  title: 'How the strike system works',
                  steps: [
                    'A strike is a formal warning on a user\'s account',
                    'You can give a strike when you resolve a case (Admin only)',
                    'Strike 1 — the user gets a warning email',
                    'Strike 2 — the user gets a stronger warning and limited features',
                    'Strike 3 — the account is automatically flagged for review',
                    'You can remove a strike if it was given by mistake — click the strike in the user\'s record and select Remove',
                    'Strikes expire after 12 months of good behavior',
                  ],
                },
                {
                  title: 'What counts as a policy violation',
                  steps: [
                    'Harmful or dangerous health advice (e.g. "eat nothing for a week")',
                    'Spam or ads posted in community areas',
                    'Fake or stolen content',
                    'Rude, threatening, or hateful messages to other users',
                    'Sharing other people\'s private health data without permission',
                    'Anything illegal',
                  ],
                },
                {
                  title: '📱 Mobile edge cases — reports and evidence',
                  steps: [
                    'Most reports are filed from a phone — users tap a report button in the moment',
                    'Accidental reports: a user may have tapped "Report" by mistake on a small screen. If the case has no clear violation and the reporter hasn\'t followed up, it\'s okay to close it as "No action."',
                    'Mobile screenshots as evidence: users often attach a screenshot from their phone. These may be cropped, rotated, or low resolution. Zoom in before deciding if the screenshot supports the case.',
                    'Shared device reports: someone may report content that was posted from the same phone by a different family member. Check the account history before acting.',
                    'Screen recordings: some users submit short screen recordings from their phone as evidence. These are valid — watch them the same way you would review a screenshot.',
                    'Report submitted mid-session: a user on mobile may have reported something while the app was updating. If the linked content no longer exists, mark the case as "Content already removed" and close it.',
                  ],
                },
              ].map((item) => (
                <details key={item.title} className="group border border-border rounded-lg">
                  <summary className="px-3 py-2.5 cursor-pointer font-medium text-foreground list-none flex items-center justify-between hover:bg-muted rounded-lg">
                    {item.title}
                    <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <ol className="px-4 pb-3 pt-1 list-decimal list-inside space-y-1 text-xs text-muted-foreground border-t border-border">
                    {item.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </details>
              ))}
            </div>
          </section>

          {/* HIPAA */}
          <section id="dm-hipaa" className="scroll-mt-4">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">7</span>
              HIPAA Complaints
              <Link href="/admin/hipaa-complaints" className="text-xs text-primary hover:underline font-normal ml-auto" onClick={onClose}>Open →</Link>
            </h2>
            <div className="space-y-2 text-sm">
              <div className="bg-red-50 border border-red-200 rounded p-2.5 text-xs text-red-800">
                <strong>Legal deadlines — missing these can result in government fines:</strong><br />
                Acknowledge within <strong>7 days</strong> · Full response within <strong>30 days</strong> · Breach notice within <strong>60 days</strong>
              </div>
              {[
                {
                  title: 'What is HIPAA and why does it matter?',
                  steps: [
                    'HIPAA is a U.S. law that protects people\'s private health information',
                    'PHI stands for Protected Health Information — things like names, diagnoses, medications, and weight data tied to a person',
                    'Because our app stores health data, we must follow HIPAA rules',
                    'A HIPAA complaint means someone believes their health info was shared or handled incorrectly',
                    'Breaking HIPAA rules can result in large government fines and damage to the company',
                    'Always treat these complaints as urgent, even if you\'re not sure they\'re valid',
                  ],
                },
                {
                  title: 'Step 1 — Log the complaint right away',
                  steps: [
                    'As soon as you receive a complaint, open Admin → HIPAA Complaints',
                    'Click Add New Complaint',
                    'Enter the date and time you received it — this starts the legal clock',
                    'Copy in the exact words the person used',
                    'Add their name and contact email',
                    'Save it before doing anything else',
                  ],
                },
                {
                  title: 'Step 2 — Acknowledge the complaint within 7 days',
                  steps: [
                    'Send an email to the person letting them know you got their complaint',
                    'Keep the message simple: "We received your complaint on [date]. We are looking into it and will respond within 30 days."',
                    'Do not say what happened yet — you\'re still investigating',
                    'Log the date you sent this email in the complaint record',
                  ],
                },
                {
                  title: 'Step 3 — Investigate',
                  steps: [
                    'Find out exactly what health data (PHI) was involved',
                    'Figure out if it was shared with anyone who shouldn\'t have seen it',
                    'Check the audit logs to see who accessed the data and when',
                    'Talk to the team members involved if needed',
                    'Write down everything you find — even if you don\'t think it was a problem',
                  ],
                },
                {
                  title: 'Step 4 — Was there a breach?',
                  steps: [
                    'A breach means private health data was seen or shared without permission',
                    'If there was a breach, you must notify affected users within 60 days',
                    'Stop what you\'re doing and contact legal counsel immediately',
                    'Do not try to handle a confirmed breach on your own',
                    'If there was no breach, you can close the case with a clear written explanation',
                  ],
                },
                {
                  title: 'Step 5 — Close the case',
                  steps: [
                    'Write a full summary of what you found',
                    'Explain the decision: no breach found, or breach handled',
                    'Send a final response to the person who complained',
                    'Mark the case as Closed in the system',
                    'Keep all records for at least 6 years — HIPAA requires this',
                  ],
                },
                {
                  title: '📱 Mobile edge cases — HIPAA complaints',
                  steps: [
                    'Most HIPAA complaints arrive by email — but people write those emails on their phones, so the message may be brief or missing details',
                    'If the complaint came through the in-app contact form on a mobile device, it may have autocorrect errors or incomplete sentences — read for meaning, not perfection',
                    'Ask follow-up questions over email to get the details you need: what data, when, and who was involved',
                    'If the user attaches a phone screenshot as evidence of a data exposure, save that screenshot to the complaint record immediately — it may be the only proof',
                    'Your response email must be easy to read on a small screen: short paragraphs, no long blocks of text',
                    'If you need the user to sign a form or provide consent, offer them a direct link — phone users can\'t easily open file attachments',
                    'If the complaint involves health data showing up on a shared family device or a shared iCloud/Google account, treat it as a breach and investigate immediately',
                  ],
                },
              ].map((item) => (
                <details key={item.title} className="group border border-border rounded-lg">
                  <summary className="px-3 py-2.5 cursor-pointer font-medium text-foreground list-none flex items-center justify-between hover:bg-muted rounded-lg">
                    {item.title}
                    <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <ol className="px-4 pb-3 pt-1 list-decimal list-inside space-y-1 text-xs text-muted-foreground border-t border-border">
                    {item.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </details>
              ))}
            </div>
          </section>

          {/* AI DECISIONS */}
          <section id="dm-ai" className="scroll-mt-4">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">8</span>
              AI Decisions
              <Link href="/admin/ai-decisions" className="text-xs text-primary hover:underline font-normal ml-auto" onClick={onClose}>Open →</Link>
            </h2>
            <div className="space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">Admin only. Users take food photos and scan barcodes on their phone or tablet. The AI reads those images and makes decisions — like identifying the food and estimating calories. This is where you review those decisions and fix mistakes.</p>
              {[
                {
                  title: 'How users log food from their phone',
                  steps: [
                    'A user opens the app on their smartphone or tablet and taps "Log a Meal"',
                    'They have two options: take a photo of their food, or scan the barcode on the package',
                    'For a food photo — they point the camera at their plate or meal and tap the shutter button',
                    'For a barcode — they point the camera at the barcode on the package (works like a store scanner)',
                    'The app sends the image to our AI, which tries to identify the food and estimate the calories',
                    'This all happens in a few seconds on their phone — the user never leaves the app',
                    'The AI result shows up on their screen. They can accept it or edit it before saving.',
                  ],
                },
                {
                  title: 'What is an AI decision?',
                  steps: [
                    'Every time the AI looks at a food photo or barcode scan and returns a result, that\'s an AI decision',
                    'Example: user photos a burger, AI says "Cheeseburger, 550 calories" — that\'s one decision',
                    'The AI also makes decisions on vitals (flagging unusual readings) and content (catching rule violations)',
                    'The AI is very good but not perfect — phone photos in bad lighting or from odd angles can confuse it',
                    'Decisions with a low confidence score, or ones a user disputed, are flagged here for you to check',
                    'The sidebar badge shows how many need a human review right now',
                  ],
                },
                {
                  title: 'Why photo quality from mobile matters',
                  steps: [
                    'The AI reads the actual pixels in the photo — a blurry or dark photo gives it less to work with',
                    'Common phone photo issues that cause bad AI decisions:',
                    'Blurry photo — user moved the phone while tapping (AI may misidentify the food)',
                    'Dark or dim lighting — restaurant lighting, candlelight, or nighttime photos wash out colors',
                    'Overhead angle — some foods look completely different from directly above vs the side',
                    'Mixed plate — a plate with 5 different foods is harder for the AI than a single item',
                    'Plate in the background — if the user didn\'t center the food, the AI might identify the wrong thing',
                    'When you review a flagged decision, you can see the original photo the user took — use it to judge whether the AI was wrong or the photo just wasn\'t clear',
                  ],
                },
                {
                  title: 'How to read a decision',
                  steps: [
                    'Click on any decision to open it',
                    'You\'ll see the original photo or barcode scan the user submitted from their device',
                    'Below that: what the AI decided (food name, calories, macros) and its confidence score',
                    'Confidence score is a percentage — 95% means the AI is very sure, 40% means it\'s guessing',
                    'Look at the photo yourself — does the AI\'s answer match what you actually see?',
                    'If the user disputed it, their comment is shown too — read what they said the food actually was',
                  ],
                },
                {
                  title: 'When to approve a decision',
                  steps: [
                    'The AI\'s food identification matches what\'s clearly visible in the photo',
                    'The calorie estimate is in a reasonable range for that food (you can search online to double-check)',
                    'The user didn\'t dispute it, or they disputed it but the AI looks correct',
                    'Click Approved — the decision stands and is saved to the user\'s log',
                  ],
                },
                {
                  title: 'When and how to override a decision',
                  steps: [
                    'The AI got the food wrong — for example it said "salad" but the photo clearly shows pasta',
                    'The calorie count is way off — the AI said 200 calories for what is clearly a large meal',
                    'The user disputed it and their correction makes more sense when you look at the photo',
                    'The photo is too blurry or dark to make a call — this is also an override (set it to "Unable to determine")',
                    'Click Override, type in the correct food name or calorie value',
                    'Write a short note: "Photo was dark, food misidentified" or "User correction confirmed by image"',
                    'Click Save — the user\'s meal log is updated right away on their device',
                    'Your correction is used to help the AI learn and do better on similar photos next time',
                  ],
                },
                {
                  title: 'Tips for reviewing well',
                  steps: [
                    'Always look at the photo before deciding — don\'t just go by the food name the AI gave',
                    'If you\'re not sure what the food is, do a quick image search for the AI\'s guess and compare',
                    'Don\'t override just because the calories seem high — some foods really are that calorie-dense',
                    'A bad photo is not the AI\'s fault. If the image is too unclear to judge, override with "Unable to determine" rather than guessing',
                    'Always write a note when you override — it builds a record that helps the team spot patterns',
                    'Approving a wrong decision is just as harmful as missing a real one — take your time',
                  ],
                },
              ].map((item) => (
                <details key={item.title} className="group border border-border rounded-lg">
                  <summary className="px-3 py-2.5 cursor-pointer font-medium text-foreground list-none flex items-center justify-between hover:bg-muted rounded-lg">
                    {item.title}
                    <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <ol className="px-4 pb-3 pt-1 list-decimal list-inside space-y-1 text-xs text-muted-foreground border-t border-border">
                    {item.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </details>
              ))}
            </div>
          </section>

          {/* COACHING */}
          <section id="dm-coaching" className="scroll-mt-4">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">9</span>
              Coaching
              <Link href="/admin/coaching" className="text-xs text-primary hover:underline font-normal ml-auto" onClick={onClose}>Open →</Link>
            </h2>
            <div className="space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">Admin only. Coaches are health and wellness professionals who offer sessions to users through the platform. You decide who gets approved.</p>
              {[
                {
                  title: 'What coaches do on the platform',
                  steps: [
                    'Coaches offer one-on-one wellness sessions to users',
                    'Users pay for sessions through the app — the platform takes a percentage',
                    'Coaches set their own rates and availability',
                    'They can see limited health data for clients who book them',
                    'Coaches must follow our content and privacy rules just like regular users',
                  ],
                },
                {
                  title: 'How to review a coach application',
                  steps: [
                    'Go to Admin → Coaching — new applications have a New badge',
                    'Click on an application to open it',
                    'Read their bio, specializations, and credentials',
                    'Check: Do their credentials match their claimed specialization?',
                    'Check: Is the bio professional and clear?',
                    'Check: Do they have any red flags (vague claims, no credentials, suspicious links)?',
                    'Look them up online if you want to verify their background',
                  ],
                },
                {
                  title: 'How to approve a coach',
                  steps: [
                    'Click Approve on the application',
                    'The coach\'s profile becomes visible to users in the marketplace',
                    'The coach gets an email telling them they\'re approved',
                    'They can start taking bookings right away',
                  ],
                },
                {
                  title: 'How to reject an application',
                  steps: [
                    'Click Reject',
                    'A text box will appear — write a clear reason why',
                    'Be honest but kind: "We couldn\'t verify the credentials listed" is better than just "Rejected"',
                    'The coach gets an email with your reason',
                    'They can reapply after 90 days if they address the issue',
                  ],
                },
                {
                  title: 'How payouts work',
                  steps: [
                    'Coach earnings are tracked per session in the system',
                    'Payouts are sent on the 1st and 15th of every month',
                    'Go to Admin → Coaching → Payouts to see pending amounts',
                    'Click Process Payouts to send the payments via Stripe',
                    'If a payout fails, check that the coach\'s bank info is correct in their profile',
                    'Keep a record of all payouts for accounting',
                  ],
                },
                {
                  title: 'What to do if a coach breaks the rules',
                  steps: [
                    'If a user reports a coach, a Trust & Safety case is created automatically',
                    'Handle it like any other T&S case',
                    'If the coach is suspended, they lose access to their calendar and clients are notified',
                    'For serious violations (fraud, health misinformation), remove the coach immediately and escalate',
                    'Refund any affected user sessions — contact admin with Stripe access',
                  ],
                },
                {
                  title: '📱 Mobile edge cases — coaching',
                  steps: [
                    'Most coaches manage their schedule and clients from their phone — they get booking alerts as push notifications',
                    'If a coach says they missed a session and didn\'t see the notification, check their notification settings using the steps in the User Management section',
                    'Coach applications are often submitted from a phone — bios may be short or credentials typed out manually. Follow up if something is unclear rather than rejecting outright.',
                    'Timezone mix-ups are common: a coach in one timezone books with a user in another. Both are viewing session times on their phones. If a "no show" complaint comes in, check the timezone on both sides.',
                    'Coaches may attach credential photos taken with their phone camera — low resolution or cropped images are common. Ask for a clearer photo if you can\'t read the credential clearly.',
                    'If a coach says the app calendar isn\'t showing correctly, ask what device they\'re on. Some calendar views have layout issues on older Android phones.',
                    'Payout notifications go to the coach by email — if they say they didn\'t get paid, first check whether the email went to their spam folder on their phone',
                  ],
                },
              ].map((item) => (
                <details key={item.title} className="group border border-border rounded-lg">
                  <summary className="px-3 py-2.5 cursor-pointer font-medium text-foreground list-none flex items-center justify-between hover:bg-muted rounded-lg">
                    {item.title}
                    <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <ol className="px-4 pb-3 pt-1 list-decimal list-inside space-y-1 text-xs text-muted-foreground border-t border-border">
                    {item.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </details>
              ))}
            </div>
          </section>

          {/* ANALYTICS */}
          <section id="dm-analytics" className="scroll-mt-4">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">10</span>
              Analytics
              <Link href="/admin/analytics" className="text-xs text-primary hover:underline font-normal ml-auto" onClick={onClose}>Open →</Link>
            </h2>
            <div className="space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">All roles can view. Admin can export. There are three dashboards — each one focuses on a different part of the platform.</p>
              {[
                {
                  title: 'Platform Analytics — what to look at',
                  steps: [
                    'Go to Admin → Analytics',
                    'DAU (Daily Active Users) — how many people used the app today',
                    'MAU (Monthly Active Users) — how many people used it this month',
                    'New registrations — how many people signed up recently',
                    'Churn rate — what percentage of users stopped using the app',
                    'Feature adoption — which features users actually use most',
                    'Subscription breakdown — how many users are on each plan',
                    'If any number drops sharply, flag it to the team right away',
                  ],
                },
                {
                  title: 'ML Analytics — how the AI is performing',
                  steps: [
                    'Go to Admin → ML Analytics',
                    'Model accuracy shows what percentage of AI decisions were correct',
                    'If accuracy drops below 85%, the model may need retraining — flag it',
                    'Data drift means the types of foods or inputs users are logging have changed',
                    'Feature importance shows which data points the AI relies on most',
                    'Check this dashboard once a week to catch problems early',
                  ],
                },
                {
                  title: 'API Usage — watching costs and limits',
                  steps: [
                    'Go to Admin → API Usage',
                    'This shows how much we\'re spending on outside services (Claude AI, Google Places, etc.)',
                    'Each service has a monthly budget limit',
                    'If usage is at 80% of the limit and it\'s only mid-month, alert the team',
                    'A sudden spike in usage could mean a bug is making too many calls — investigate',
                    'This page also shows our rate limit — how many calls we\'re allowed per minute',
                  ],
                },
                {
                  title: 'How to export a report',
                  steps: [
                    'Go to the analytics page you want to export',
                    'Set the date range using the date picker',
                    'Click the Export button in the top right corner',
                    'Choose CSV (spreadsheet) or PDF (document)',
                    'The file downloads to your computer',
                    'The export includes a timestamp and your email for the audit trail',
                    'Admin only',
                  ],
                },
                {
                  title: '📱 Mobile edge cases — analytics',
                  steps: [
                    'Most of the numbers in analytics reflect what users are doing on their phones — a DAU spike usually means the mobile app is getting more use, not the website',
                    'If DAU suddenly jumps on a specific day, check if a mobile app update went out that day — new versions often trigger a wave of users returning to the app',
                    'API usage spikes can be caused by mobile users triggering repeated scans — for example, if the barcode scanner has a bug that sends multiple requests per scan, it shows up as a spike here',
                    'Checking analytics on your own phone: the admin analytics pages are designed for desktop. On a phone screen, tables may scroll horizontally. Swipe left and right to see all columns.',
                    'Exporting reports on mobile: if you click Export on a phone, the file saves to your phone\'s Files or Downloads folder. On iPhone, open the Files app. On Android, open the Files app or My Files.',
                    'If a chart is not loading on your phone, try rotating to landscape (horizontal) mode — some charts need more horizontal space to render',
                    'Low mobile battery mode can stop background data from loading. If a chart shows "No data," try turning off Low Power Mode and refreshing.',
                  ],
                },
              ].map((item) => (
                <details key={item.title} className="group border border-border rounded-lg">
                  <summary className="px-3 py-2.5 cursor-pointer font-medium text-foreground list-none flex items-center justify-between hover:bg-muted rounded-lg">
                    {item.title}
                    <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <ol className="px-4 pb-3 pt-1 list-decimal list-inside space-y-1 text-xs text-muted-foreground border-t border-border">
                    {item.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </details>
              ))}
            </div>
          </section>

          {/* MARKETING & COMMS */}
          <section id="dm-marketing" className="scroll-mt-4">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">11</span>
              Marketing & Comms
              <Link href="/admin/marketing" className="text-xs text-primary hover:underline font-normal ml-auto" onClick={onClose}>Open →</Link>
            </h2>
            <div className="space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">This section covers four areas: demo requests, contact form submissions, marketing tools, and job listings.</p>
              {[
                {
                  title: 'Demo Requests — how to handle them',
                  steps: [
                    'Go to Admin → Demo Requests',
                    'These come from businesses or healthcare offices interested in our platform',
                    'Respond within 24 hours — fast replies lead to more sales',
                    'Read their message to understand what they need',
                    'Reply by email with a brief intro and a link to schedule a call',
                    'After you\'ve reached out, mark the request as "Contacted" in the system',
                    'If they go quiet after 3 follow-ups, mark it as "Closed"',
                  ],
                },
                {
                  title: 'Contact Submissions — how to triage',
                  steps: [
                    'Go to Admin → Contact Submissions',
                    'These are messages from the public contact form',
                    'Read each one and decide where it belongs:',
                    'Account or login problem → pass to Support (Users section)',
                    'Reported bad content or user → create a T&S case',
                    'Billing or subscription question → pass to an admin with Stripe access',
                    'General question or feedback → reply and close',
                    'Spam or junk → mark as Spam and close',
                    'Try to respond or route within 1 business day',
                  ],
                },
                {
                  title: 'Marketing tools — what you can change',
                  steps: [
                    'Go to Admin → Marketing',
                    'You can update the text and images on the home page and landing pages',
                    'You can set up promotional banners (e.g. "20% off this week")',
                    'You can trigger emails to user groups (e.g. inactive users)',
                    'Always click Preview before publishing any change',
                    'Changes go live right away for all visitors',
                    'If you make a mistake, use the Revert button to go back to the last saved version',
                    'Big campaigns should be approved by the team before going live',
                  ],
                },
                {
                  title: 'Careers — posting jobs and reviewing applications',
                  steps: [
                    'Go to Admin → Careers',
                    'To post a new job, click Add Listing and fill in the title, description, and requirements',
                    'Set the listing to Active when you\'re ready for people to apply',
                    'Applications come in automatically — click any one to read the resume and cover letter',
                    'Mark applications as Reviewed, Interview, or Rejected',
                    'Rejected applicants get an automated email',
                    'Applications are kept in the system for 90 days',
                    'Close the listing when the role is filled',
                  ],
                },
                {
                  title: '📱 Mobile edge cases — marketing & comms',
                  steps: [
                    'Demo requests often come from people browsing on their phone during lunch or after work — they may be brief or vague. Reply with a clear, simple email that reads well on a small screen.',
                    'Contact form submissions from mobile users may have autocorrect errors (e.g. "loosing weight" instead of "losing weight"). Read the meaning, not just the words.',
                    'Marketing emails go to users\' phones — most people read email on mobile. Keep any email templates short, use large text, and put the call-to-action button early in the message.',
                    'Push notification campaigns go directly to users\' phone lock screens. Keep the text under 100 characters — long messages get cut off on iPhone and Android.',
                    'If a marketing push notification is sent to the wrong group or with wrong content, there is no way to unsend it from a phone. Contact a developer immediately to disable the campaign at the server level.',
                    'Job applicants may have submitted their resume from a phone and formatted it differently (Google Docs mobile view, etc.). If a resume looks unusual, it may just be a mobile format issue — still review the content.',
                    'A/B tests for landing pages: remember that most visitors see your pages on a phone. Always preview any landing page change on a mobile screen size before publishing.',
                  ],
                },
              ].map((item) => (
                <details key={item.title} className="group border border-border rounded-lg">
                  <summary className="px-3 py-2.5 cursor-pointer font-medium text-foreground list-none flex items-center justify-between hover:bg-muted rounded-lg">
                    {item.title}
                    <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <ol className="px-4 pb-3 pt-1 list-decimal list-inside space-y-1 text-xs text-muted-foreground border-t border-border">
                    {item.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </details>
              ))}
            </div>
          </section>

          {/* SETTINGS */}
          <section id="dm-settings" className="scroll-mt-4">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">12</span>
              Settings
              <Link href="/admin/settings" className="text-xs text-primary hover:underline font-normal ml-auto" onClick={onClose}>Open →</Link>
            </h2>
            <div className="space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">Admin only. This is where you control who has admin access and how the platform behaves.</p>
              {[
                {
                  title: 'How to give someone admin access',
                  steps: [
                    'Go to Admin → Settings → Admin Role Management',
                    'Type in the person\'s email address',
                    'Pick their role: Admin (full access), Moderator (content and cases), or Support (view and export only)',
                    'Click Grant Role',
                    'The person will have access the next time they log in',
                    'Only give people the role they actually need — don\'t give Admin when Moderator is enough',
                  ],
                },
                {
                  title: 'How to remove someone\'s admin access',
                  steps: [
                    'Go to Admin → Settings → Admin Role Management',
                    'Find the person in the list',
                    'Click Remove Role',
                    'Their access is removed the next time they try to log in',
                    'If you need it to take effect immediately, ask them to log out now',
                  ],
                },
                {
                  title: 'What is a Super Admin?',
                  steps: [
                    'Super Admins are the top-level admins — they can never be locked out',
                    'Their emails are saved in a special server setting, not in the database',
                    'Even if someone tries to remove their role in the UI, it won\'t work',
                    'To add or remove a Super Admin, a developer needs to update the server settings and redeploy the app',
                    'Super Admin access should only be given to the most trusted people on the team',
                  ],
                },
                {
                  title: 'Other platform settings',
                  steps: [
                    'Feature flags — turn features on or off for all users without a code change',
                    'Subscription plans — adjust pricing, seat limits, or feature access per plan',
                    'Email templates — edit the automated emails the platform sends (welcome, reset password, etc.)',
                    'Always test changes in a staging environment first if possible',
                    'Any change here affects every user on the platform — proceed carefully',
                  ],
                },
                {
                  title: '📱 Mobile edge cases — settings',
                  steps: [
                    'When granting admin access, double-check the email address — it\'s easy to mistype on a phone keyboard. An extra letter or a .con typo means the wrong person (or no one) gets access.',
                    'If you are accessing the Settings page from your own phone, the form layout is narrower. Scroll down to see all options — some settings appear below the fold on small screens.',
                    'Feature flags affect mobile app users immediately — a user doesn\'t need to update the app. When you toggle a flag, expect the change to reach phone users within 30 seconds.',
                    'Turning off a feature that many users rely on (like barcode scanning) will generate support messages very quickly. Always coordinate with the team before disabling a major feature.',
                    'Email template changes: always send yourself a test email and open it on your phone before saving. Long lines look fine on desktop but wrap awkwardly on mobile.',
                    'If an admin says they can\'t log into the admin panel after you granted them a role, ask them to log out and log back in — the role is assigned on login, not instantly.',
                    'Role removals take effect the next time the person logs in. If you need access removed immediately (security risk), contact a developer to revoke the session token directly.',
                  ],
                },
              ].map((item) => (
                <details key={item.title} className="group border border-border rounded-lg">
                  <summary className="px-3 py-2.5 cursor-pointer font-medium text-foreground list-none flex items-center justify-between hover:bg-muted rounded-lg">
                    {item.title}
                    <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <ol className="px-4 pb-3 pt-1 list-decimal list-inside space-y-1 text-xs text-muted-foreground border-t border-border">
                    {item.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </details>
              ))}
            </div>
          </section>

          {/* SUPPORT PLAYBOOK */}
          <section id="dm-playbook" className="scroll-mt-4">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">13</span>
              Support Playbook
            </h2>
            <p className="text-xs text-muted-foreground mb-3">These are the most common support requests and exactly what to do for each one.</p>
            <div className="space-y-2">
              {[
                {
                  title: '"I can\'t log in"',
                  steps: [
                    'Ask: how do you normally sign in — email/password, Google, or Apple?',
                    'Go to Admin → Users and search for their email',
                    'Check if their account shows as Suspended — if so, unsuspend it (if the suspension was a mistake)',
                    'If the email looks right and the account is active, ask them to click "Forgot Password" on the login screen — Firebase will send a reset email',
                    'If they signed up with Google or Apple, they must use that same button to sign in — email/password won\'t work for them',
                    'If none of that helps, check if their email has a typo (e.g. .con instead of .com)',
                  ],
                },
                {
                  title: '"I want a copy of my data" (GDPR request)',
                  steps: [
                    'First, confirm who they are — ask them to reply from the email on the account',
                    'Go to Admin → Users and search for their email',
                    'Click the download icon (Export) in their row',
                    'A JSON file will save to your computer',
                    'Email the file to them — use a secure method, not regular unencrypted email if the file contains sensitive data',
                    'Log the request and the date you sent the file',
                    'You must complete this within 30 days by law',
                  ],
                },
                {
                  title: '"Please delete my account"',
                  steps: [
                    'Confirm their identity first — ask them to reply from the email on the account',
                    'If they also asked for their data, export it first before deleting',
                    'Go to Admin → Users and find their account',
                    'Click the trash icon and confirm the delete modal',
                    'Their Firebase account and all data are removed',
                    'Reply to let them know it\'s done',
                    'Note: some data may linger in backups for a short time — this is normal and automatic',
                  ],
                },
                {
                  title: '"My caregiver can\'t see my patients"',
                  steps: [
                    'Go to Admin → Users and open the account owner\'s detail modal',
                    'Click the Caregiver Relationships tab',
                    'Find the caregiver in the list',
                    'Check their status — it must say "accepted." If it says "pending," the caregiver hasn\'t clicked the invite link in their email yet',
                    'Check the patientsAccess field — if it\'s empty, they should see all patients. If it has IDs listed, check those IDs match the right patients',
                    'Scroll down in their permissions — make sure "View Records" and "View Vitals" are turned on',
                    'If everything looks correct, ask the caregiver to sign out and sign back in to refresh their access',
                  ],
                },
                {
                  title: '"I see a duplicate patient"',
                  steps: [
                    'Go to Admin → Users and open the account owner\'s detail modal',
                    'Click the Patients tab',
                    'Look for two patients with the same or very similar names',
                    'The duplicate is usually the one with no health data or an older creation date',
                    'Click Archive on the duplicate — the data is kept but hidden',
                    'If both records have real data and need to be merged, don\'t do it yourself — escalate to a developer for a manual merge',
                  ],
                },
                {
                  title: '"I want to cancel or change my subscription"',
                  steps: [
                    'Tell the user to go to Account → Billing inside the app — there\'s a Stripe portal there where they can manage their own plan',
                    'If they can\'t access the billing portal, ask them to describe the error they\'re seeing',
                    'If there\'s a technical issue with Stripe access, pass the request to an admin who has Stripe credentials',
                    'Do not manually change subscription fields in the database — Stripe is always the source of truth',
                    'Refunds must also go through Stripe — you cannot process them from the admin panel',
                  ],
                },
                {
                  title: '"I was charged incorrectly"',
                  steps: [
                    'Ask for the date and amount of the charge',
                    'Look up their account in Admin → Users and check their subscription plan',
                    'Compare the charge to the plan price — small differences can be from tax',
                    'If the charge looks wrong, escalate to an admin with Stripe access',
                    'Do not promise a refund until it has been confirmed in Stripe',
                    'Once resolved in Stripe, reply to the user with the outcome',
                  ],
                },
                {
                  title: '"I found a bug"',
                  steps: [
                    'Ask them to describe exactly what happened and what they expected to happen',
                    'Ask which device and browser they were using',
                    'Ask if they can repeat the problem — if yes, ask for a screenshot or screen recording',
                    'Check if you can reproduce it yourself using a test account',
                    'Log the bug in the team\'s issue tracker with all the details',
                    'Let the user know you\'ve logged it and give a rough timeline if you have one',
                    'If the bug causes data loss or a security issue, escalate immediately',
                  ],
                },
                {
                  title: '"The barcode scanner won\'t work on my phone"',
                  steps: [
                    'This is the most common mobile-specific support request',
                    'First ask: did the app ask for camera permission when you first opened the scanner? If they tapped "Don\'t Allow," the camera is blocked.',
                    'iPhone fix: Settings → scroll to the app name → Camera → turn on',
                    'Android fix: Settings → Apps → find the app → Permissions → Camera → Allow',
                    'If permission is already on, ask them to close the app completely and reopen it',
                    'If the barcode is on a curved bottle or a crinkled bag, the camera may struggle. Ask them to type the barcode number manually instead.',
                    'If the scanner opens but freezes, the phone may be running out of memory. Ask them to close other apps and try again.',
                    'Check if the barcode is in our database — go to Admin → Barcodes and search the number. If it\'s not there, add it.',
                  ],
                },
                {
                  title: '"The app crashes on my phone"',
                  steps: [
                    'Ask which phone model and operating system version they have (e.g. iPhone 12, iOS 17)',
                    'Ask when it crashes: on opening, during a scan, after logging a meal, etc. — the timing tells you where the bug is',
                    'Ask if the phone is low on storage — a full phone is the most common cause of app crashes',
                    'iPhone: Settings → General → iPhone Storage. Android: Settings → Storage',
                    'If storage is fine, ask them to uninstall and reinstall the app — this clears corrupt cached data',
                    'If it still crashes, ask them to send a screenshot of the error message if one appears',
                    'Log the details (device, OS, crash location) in the bug tracker and escalate to engineering',
                    'If many users report the same crash at the same time, it may be a backend issue — check the platform status and alert the team',
                  ],
                },
                {
                  title: '"The food photo didn\'t log correctly on my phone"',
                  steps: [
                    'This usually means the AI returned a wrong food identification or calorie estimate',
                    'Go to Admin → AI Decisions and search for the user\'s recent decisions',
                    'Open the decision and look at the original photo the user submitted',
                    'Was the photo blurry, dark, or hard to read? If so, that\'s why the AI struggled',
                    'If the AI was clearly wrong, click Override and enter the correct food and calorie values',
                    'Tell the user the log has been corrected and remind them that clear, well-lit photos give better results',
                    'If the photo was actually clear but the AI still got it wrong, note it in the decision — this is a model accuracy issue for the engineering team',
                  ],
                },
              ].map((item) => (
                <details key={item.title} className="group border border-border rounded-lg">
                  <summary className="px-3 py-2.5 cursor-pointer font-medium text-foreground text-sm list-none flex items-center justify-between hover:bg-muted rounded-lg">
                    {item.title}
                    <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <ol className="px-4 pb-3 pt-1 list-decimal list-inside space-y-1 text-xs text-muted-foreground border-t border-border">
                    {item.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </details>
              ))}
            </div>
          </section>

          <div className="text-xs text-muted-foreground text-center pb-4">
            Operators Manual · Internal use only
          </div>
        </div>
      </div>
    </>
  )
}
