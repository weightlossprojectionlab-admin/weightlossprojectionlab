import type { Metadata } from 'next'
import { GuideTemplate } from '@/components/docs/GuideTemplate'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Medical Hub Guide | Wellness Projection Lab',
  description: 'Schedule appointments, manage providers, view the calendar, and import records — all in one place.',
}

export default function MedicalGuidePage() {
  return (
    <GuideTemplate
      appRoute="/medical"
      title="Medical Hub"
      description="Schedule appointments, manage providers, view the calendar, and import records"
    >
      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8 rounded-r-lg">
        <p className="font-semibold text-blue-900 mb-2">🩺 One place for care</p>
        <p className="text-blue-800 m-0">
          The Medical hub keeps appointments, providers, and clinical records for
          every family member in one spot. Everyone you care for shows up here — so
          you never have to hunt across separate apps or notebooks.
        </p>
      </div>

      <h2 id="overview">Overview</h2>
      <p>
        The Medical hub is organized into five tabs. Each one handles a different
        part of managing care:
      </p>
      <ul>
        <li><strong>Appointments:</strong> Schedule and track visits</li>
        <li><strong>Providers:</strong> Keep a list of doctors, dentists, clinics, and pharmacies</li>
        <li><strong>Calendar:</strong> See all appointments on a month view</li>
        <li><strong>Notifications:</strong> Reminders and updates about upcoming visits</li>
        <li><strong>Import:</strong> Bring in records from a file</li>
      </ul>

      <h2 id="appointments">Appointments</h2>
      <p>
        The Appointments tab is where you book and manage visits. Use the
        <strong> Schedule Appointment</strong> button to start.
      </p>

      <h3>Scheduling a Visit</h3>
      <ol>
        <li>Pick the family member the appointment is for</li>
        <li>Choose a provider, or add a new one right in the flow</li>
        <li>Pick a date and a time</li>
        <li>Set the reason and any notes</li>
        <li>Add a driver if someone needs a ride (optional)</li>
        <li>Review and confirm</li>
      </ol>

      <h3>Time Slots</h3>
      <p>
        Times are shown as tap-friendly slots on the quarter hour — 9:00, 9:15,
        9:30, and so on — because real appointments don't land at 9:03. Slots run
        during normal business hours (8:00 AM to 8:00 PM) by default.
      </p>
      <ul>
        <li><strong>Open slots</strong> are tappable</li>
        <li><strong>Taken slots</strong> for the same person are blocked, so you can't double-book them</li>
        <li><strong>Same-provider</strong> slots show a heads-up in case the office can't take two visits at once</li>
        <li><strong>Other family members'</strong> busy slots are flagged so you can plan around them</li>
      </ul>

      <h3>Rides &amp; Drivers</h3>
      <p>
        If a visit needs a driver, mark <strong>Requires a driver</strong> and pick
        a pickup time. You can assign a family member so everyone knows who's
        handling transportation.
      </p>

      <h3>Editing or Canceling</h3>
      <p>
        Open any appointment to change the time, update details, or delete it.
        What you can change depends on your permissions — a view-only caregiver can
        see visits but not schedule or delete them.
      </p>

      <h2 id="providers">Providers</h2>
      <p>
        The Providers tab is your address book of doctors, specialists, dentists,
        pharmacies, labs, and clinics. Use <strong>+ Add Provider</strong> to add one.
      </p>

      <h3>Adding a Provider</h3>
      <ol>
        <li>Enter the provider's name and type (physician, dentist, pharmacy, and so on)</li>
        <li>Add a specialty, phone, address, and website if you have them</li>
        <li>Save</li>
      </ol>

      <h3>"Serving N patients"</h3>
      <p>
        Each provider card shows how many family members that provider cares for.
        This grows automatically as you schedule appointments — booking a visit with
        a provider links them to that patient. You can also add a provider once and
        make them available to your whole household.
      </p>

      <h3>Filtering</h3>
      <p>
        When you have several providers, use the type filters (All, Physician,
        Dentist, and so on) to narrow the list.
      </p>

      <h2 id="calendar">Calendar</h2>
      <p>
        The Calendar tab shows every appointment on a month grid, so you can see the
        whole family's schedule at a glance.
      </p>
      <ul>
        <li>Move between months with the arrows, or jump back with <strong>Today</strong></li>
        <li>Each day shows the visits scheduled for it</li>
        <li>Filter the calendar to focus on one person or provider</li>
      </ul>

      <h2 id="notifications">Notifications</h2>
      <p>
        The Notifications tab collects reminders and updates tied to care — upcoming
        appointments, changes to a visit, and driver assignments. Filter by
        <strong> All</strong>, <strong>Upcoming</strong>, <strong>Recent</strong>, or
        <strong> Past</strong> to find what you need.
      </p>
      <p>
        To change <em>which</em> reminders you get and how, see the{' '}
        <Link href="/docs/user-guides/notifications">Notifications guide</Link>.
      </p>

      <h2 id="import">Import</h2>
      <p>
        The Import tab lets you bring existing records into WPL from a file, so you
        don't have to re-enter everything by hand. Follow the on-screen steps to
        match your file's columns to the right fields, then confirm.
      </p>

      <h2 id="best-practices">Best Practices</h2>
      <div className="space-y-4 my-6">
        <div className="border-l-4 border-green-500 bg-green-50 p-4">
          <p className="font-semibold text-green-900 mb-2">✅ Do This</p>
          <ul className="text-sm text-green-800 space-y-2 m-0">
            <li>• Add providers once — they're reused across visits and family members</li>
            <li>• Assign a driver when a visit needs a ride, so nobody's left guessing</li>
            <li>• Use the same-provider and family heads-up flags to avoid clashes</li>
            <li>• Check the Calendar tab weekly to plan the family's schedule</li>
          </ul>
        </div>
        <div className="border-l-4 border-red-500 bg-red-50 p-4">
          <p className="font-semibold text-red-900 mb-2">❌ Avoid This</p>
          <ul className="text-sm text-red-800 space-y-2 m-0">
            <li>• Don't create a duplicate provider — search the list first</li>
            <li>• Don't ignore the "already booked" flag when picking a time</li>
            <li>• Don't forget to set a pickup time when a visit needs a driver</li>
          </ul>
        </div>
      </div>

      <h2 id="permissions">Permissions</h2>
      <p>
        What you can do in the Medical hub depends on the access you've been given.
        Owners have full control. Caregivers see the surfaces they're granted — for
        example, someone with <strong>schedule appointments</strong> can book visits,
        while a view-only caregiver can see them but not change them. Learn more in
        the <Link href="/docs/user-guides/caregiver-mode">Caregiver Mode guide</Link>.
      </p>

      <h2 id="next-steps">Next Steps</h2>
      <div className="grid md:grid-cols-2 gap-4 not-prose">
        <Link
          href="/docs/user-guides/patient-profiles"
          className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Patient Profiles →</h3>
          <p className="text-sm text-gray-600">
            Set up medical history, medications, and providers for each family member
          </p>
        </Link>
        <Link
          href="/docs/user-guides/notifications"
          className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Notifications →</h3>
          <p className="text-sm text-gray-600">
            Fine-tune appointment reminders and how they reach you
          </p>
        </Link>
      </div>
    </GuideTemplate>
  )
}
