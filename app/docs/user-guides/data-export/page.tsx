import type { Metadata } from 'next'
import { GuideTemplate } from '@/components/docs/GuideTemplate'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Data Export Guide | Wellness Projection Lab',
  description: 'Download your complete health data as JSON for portability and backups.',
}

export default function DataExportPage() {
  return (
    <GuideTemplate
      appRoute="/profile"
      title="Data Export"
      description="Download your data for portability and backups"
    >
      <div className="bg-indigo-50 border-l-4 border-indigo-500 p-6 mb-8 rounded-r-lg">
        <p className="font-semibold text-indigo-900 mb-2">📥 Your Data, Your Control</p>
        <p className="text-indigo-800 m-0">
          You can download all of your data at any time. Own your data, keep a personal
          backup, or move it somewhere else.
        </p>
      </div>

      <h2 id="overview">Overview</h2>
      <p>
        WPL believes you should own your health data. From your Profile you can export a complete
        copy of your account as a JSON file — no request ticket, no waiting.
      </p>

      <h2 id="how-to-export">How to Export Your Data</h2>
      <ol>
        <li>Go to <strong>Profile</strong>.</li>
        <li>Scroll to the <strong>Privacy &amp; Data</strong> section.</li>
        <li>Click <strong>📥 Export</strong>.</li>
        <li>Your browser downloads a <code>wpl-my-data-export.json</code> file.</li>
      </ol>

      <h2 id="whats-included">What&apos;s Included</h2>
      <p>The JSON export contains your own records:</p>
      <ul>
        <li>Your profile and account details</li>
        <li>Meal logs, weight logs, and step logs</li>
        <li>Appointments</li>
        <li>Each patient/family member you manage, and for each: vitals, medications, documents,
          immunizations, equipment, and family history</li>
        <li>Health reports generated for your patients</li>
        <li>Cooking sessions and saved recipe queue</li>
      </ul>
      <p>
        The file is standard JSON, so it opens in any text editor and can be read by other tools
        or imported elsewhere.
      </p>

      <h2 id="sharing-with-doctors">Sharing With a Doctor</h2>
      <p>
        To share a clean clinical summary with a provider, use the health report on a patient&apos;s
        page — you can view, print, or email it directly. That&apos;s a better fit for a doctor
        visit than the raw JSON export, which is meant for backup and portability.
      </p>

      <h2 id="not-yet-available">Not Yet Available</h2>
      <p>
        We currently offer JSON export only. CSV, a dedicated PDF data export, FHIR export,
        scheduled/automatic exports, and one-click imports from other apps are not available yet —
        we&apos;ll update this guide when they ship rather than list features that don&apos;t exist.
      </p>

      <h2 id="next-steps">Next Steps</h2>
      <div className="grid md:grid-cols-2 gap-4 not-prose">
        <Link
          href="/docs/user-guides/progress-tracking"
          className="block p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Progress Tracking →</h3>
          <p className="text-sm text-gray-600">
            View charts and analytics before exporting
          </p>
        </Link>
        <Link
          href="/docs/user-guides/patient-profiles"
          className="block p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Patient Profiles →</h3>
          <p className="text-sm text-gray-600">
            Manage the data you&apos;ll be exporting
          </p>
        </Link>
      </div>
    </GuideTemplate>
  )
}
