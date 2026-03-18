import type { Metadata } from 'next'
import { GuideTemplate } from '@/components/docs/GuideTemplate'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Data Export Guide | Wellness Projection Lab',
  description: 'Download your complete health data for portability and backups.',
}

export default function DataExportPage() {
  return (
    <GuideTemplate
      title="Data Export"
      description="Download your complete health data for portability and backups"
    >
      <div className="bg-indigo-50 border-l-4 border-indigo-500 p-6 mb-8 rounded-r-lg">
        <p className="font-semibold text-indigo-900 mb-2">📥 Your Data, Your Control</p>
        <p className="text-indigo-800 m-0">
          Export your complete health data at any time. Own your data, share with healthcare providers, or keep personal backups.
        </p>
      </div>

      <h2 id="overview">Overview</h2>
      <p>
        WPL believes you should own your health data. Export everything in multiple formats for portability, backups, or sharing with doctors. HIPAA-compliant exports available.
      </p>

      <h2 id="export-formats">Available Export Formats</h2>

      <div className="space-y-4 my-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">📊 CSV (Spreadsheet)</h4>
          <p className="text-sm text-gray-600 mb-2">Best for: Data analysis, Excel, Google Sheets</p>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Raw data in tabular format</li>
            <li>• Easy to analyze and manipulate</li>
            <li>• Compatible with all spreadsheet software</li>
            <li>• Lightweight file size</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">📄 PDF (Report)</h4>
          <p className="text-sm text-gray-600 mb-2">Best for: Printing, sharing with doctors, visual reports</p>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Formatted, professional reports</li>
            <li>• Includes charts and graphs</li>
            <li>• Ready to print or email</li>
            <li>• Human-readable</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">🔧 JSON (Raw Data)</h4>
          <p className="text-sm text-gray-600 mb-2">Best for: Developers, importing to other apps, complete backup</p>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Complete raw data structure</li>
            <li>• Includes all metadata</li>
            <li>• Machine-readable</li>
            <li>• Ideal for migration to other platforms</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">🏥 FHIR (Healthcare Standard)</h4>
          <p className="text-sm text-gray-600 mb-2">Best for: Electronic health records, hospital systems, healthcare providers</p>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• HL7 FHIR R4 compliant</li>
            <li>• Compatible with EHR systems</li>
            <li>• Standardized healthcare data format</li>
            <li>• Interoperable with medical software</li>
          </ul>
        </div>
      </div>

      <h2 id="what-to-export">What You Can Export</h2>

      <h3>Health Data</h3>
      <ul>
        <li><strong>Weight Logs:</strong> Complete history with dates and trends</li>
        <li><strong>Meal Logs:</strong> Photos, AI analysis, nutrition data</li>
        <li><strong>Vital Signs:</strong> Blood pressure, blood sugar, temperature, etc.</li>
        <li><strong>Medications:</strong> Current and past medications with schedules</li>
        <li><strong>Medical Conditions:</strong> Diagnoses, symptoms, treatments</li>
        <li><strong>Allergies:</strong> Food, medication, environmental</li>
      </ul>

      <h3>Documents & Records</h3>
      <ul>
        <li><strong>Lab Results:</strong> Uploaded test results and values</li>
        <li><strong>Prescriptions:</strong> Medication prescriptions</li>
        <li><strong>Medical Images:</strong> X-rays, MRIs, photos</li>
        <li><strong>Insurance Cards:</strong> Copies of insurance information</li>
        <li><strong>Vaccination Records:</strong> Immunization history</li>
      </ul>

      <h3>Care Coordination</h3>
      <ul>
        <li><strong>Provider Directory:</strong> All healthcare providers with contact info</li>
        <li><strong>Appointments:</strong> Past and upcoming appointment history</li>
        <li><strong>Emergency Contacts:</strong> Full contact details</li>
        <li><strong>Household Duties:</strong> Caregiver task completion history</li>
        <li><strong>Caregiver Activity:</strong> Who did what and when</li>
      </ul>

      <h3>Goals & Progress</h3>
      <ul>
        <li><strong>Health Goals:</strong> All goals with progress tracking</li>
        <li><strong>Progress Charts:</strong> Weight trends, milestone achievements</li>
        <li><strong>Statistics:</strong> Completion rates, adherence metrics</li>
      </ul>

      <h2 id="exporting-data">How to Export Data</h2>

      <h3>Full Account Export</h3>
      <ol>
        <li>Navigate to <strong>Settings → Data & Privacy</strong></li>
        <li>Click <strong>"Export My Data"</strong></li>
        <li>Choose format (CSV, PDF, JSON, or FHIR)</li>
        <li>Select what to include:
          <ul>
            <li>Everything (complete export)</li>
            <li>Specific data types only</li>
          </ul>
        </li>
        <li>Choose date range (all time or custom)</li>
        <li>Click <strong>"Generate Export"</strong></li>
        <li>Wait for processing (email notification when ready)</li>
        <li>Download from email link or Settings page</li>
      </ol>

      <h3>Patient-Specific Export</h3>
      <p>Export data for a single family member:</p>
      <ol>
        <li>Open patient profile</li>
        <li>Click <strong>Export</strong> button (top-right)</li>
        <li>Select format and data types</li>
        <li>Generate and download</li>
        <li>Only that patient's data included</li>
      </ol>

      <h3>Specific Report Exports</h3>
      <p>From various pages throughout WPL:</p>
      <ul>
        <li><strong>Progress Page:</strong> Export charts as PNG or PDF</li>
        <li><strong>Meal Logs:</strong> Export meal history to CSV</li>
        <li><strong>Weight Logs:</strong> Export weight data with statistics</li>
        <li><strong>Duty History:</strong> Export caregiver completion records</li>
      </ul>

      <h2 id="scheduled-exports">Scheduled Exports</h2>
      <p>Automate regular backups:</p>

      <h3>Setting Up Automatic Exports</h3>
      <ol>
        <li>Go to <strong>Settings → Data & Privacy</strong></li>
        <li>Click <strong>"Scheduled Exports"</strong></li>
        <li>Click <strong>"Create Schedule"</strong></li>
        <li>Choose frequency:
          <ul>
            <li>Weekly (every Sunday)</li>
            <li>Monthly (1st of month)</li>
            <li>Quarterly</li>
          </ul>
        </li>
        <li>Select format and data types</li>
        <li>Enter email for delivery</li>
        <li>Save schedule</li>
      </ol>

      <h3>Benefits</h3>
      <ul>
        <li>Regular automatic backups</li>
        <li>Never forget to export data</li>
        <li>Historical snapshots over time</li>
        <li>Peace of mind for data preservation</li>
      </ul>

      <h2 id="sharing-providers">Sharing with Healthcare Providers</h2>

      <h3>Doctor Visit Reports</h3>
      <p>Generate reports specifically for medical appointments:</p>
      <ol>
        <li>Navigate to patient profile</li>
        <li>Click <strong>"Generate Doctor Report"</strong></li>
        <li>Select date range (e.g., "Since last visit")</li>
        <li>Choose what to include:
          <ul>
            <li>Weight trends</li>
            <li>Medication adherence</li>
            <li>Blood pressure logs</li>
            <li>Meal patterns</li>
          </ul>
        </li>
        <li>Export as PDF</li>
        <li>Print or email to provider</li>
      </ol>

      <h3>HIPAA-Compliant Sharing</h3>
      <ul>
        <li>All exports encrypted during transfer</li>
        <li>Audit trail of who exported what and when</li>
        <li>Patient consent tracked</li>
        <li>Meets HIPAA security requirements</li>
      </ul>

      <h3>Direct Provider Portal Access</h3>
      <p>Some healthcare providers can connect directly:</p>
      <ul>
        <li>Provider requests access</li>
        <li>You approve specific data sharing</li>
        <li>Data syncs automatically to their EHR</li>
        <li>Revoke access anytime</li>
      </ul>

      <h2 id="data-portability">Data Portability</h2>

      <h3>Switching to Another App</h3>
      <p>WPL supports data portability:</p>
      <ol>
        <li>Export complete data in JSON format</li>
        <li>JSON includes all records with proper structure</li>
        <li>Import into other health tracking apps</li>
        <li>No vendor lock-in - your data goes with you</li>
      </ol>

      <h3>Backup & Archive</h3>
      <p>Creating personal health archives:</p>
      <ul>
        <li>Export quarterly for long-term archives</li>
        <li>Store on personal cloud (Google Drive, Dropbox)</li>
        <li>Keep physical copies of critical medical documents</li>
        <li>Maintain 7-year health history (IRS recommendation)</li>
      </ul>

      <h2 id="caregiver-exports">Caregiver Data Exports</h2>

      <h3>Activity Reports</h3>
      <p>Track caregiver work for professional billing or family coordination:</p>
      <ul>
        <li>Export duty completion history</li>
        <li>Time tracking data</li>
        <li>Task notes and photos</li>
        <li>CSV format for payroll processing</li>
      </ul>

      <h3>Care Summaries</h3>
      <p>Weekly or monthly care reports:</p>
      <ul>
        <li>What care was provided</li>
        <li>Medications administered</li>
        <li>Vital signs logged</li>
        <li>Meals prepared</li>
        <li>Household duties completed</li>
      </ul>

      <h2 id="privacy-security">Privacy & Security</h2>

      <h3>Export Security</h3>
      <ul>
        <li><strong>Encrypted Files:</strong> Exports can be password-protected</li>
        <li><strong>Secure Links:</strong> Download links expire after 7 days</li>
        <li><strong>Audit Logging:</strong> Every export logged with timestamp</li>
        <li><strong>Permission Required:</strong> Only account owners can export full data</li>
      </ul>

      <h3>Who Can Export</h3>
      <ul>
        <li><strong>Account Owner:</strong> Can export all family data</li>
        <li><strong>Adult Family Members:</strong> Can export own data only</li>
        <li><strong>Caregivers (Full Access):</strong> Can export assigned patient data</li>
        <li><strong>Caregivers (View Only):</strong> No export permissions</li>
      </ul>

      <h3>Data Retention After Export</h3>
      <ul>
        <li>Export files stored for 30 days on WPL servers</li>
        <li>Accessible from Settings → Export History</li>
        <li>Automatic deletion after 30 days</li>
        <li>Download immediately for permanent storage</li>
      </ul>

      <h2 id="import">Importing Data</h2>

      <h3>From Other Apps</h3>
      <p>Bring your health data into WPL:</p>
      <ol>
        <li>Export data from previous app (CSV or JSON)</li>
        <li>In WPL, go to <strong>Settings → Import Data</strong></li>
        <li>Upload file</li>
        <li>Map fields (WPL auto-detects common formats)</li>
        <li>Preview import</li>
        <li>Confirm and import</li>
      </ol>

      <h3>Supported Import Sources</h3>
      <ul>
        <li>MyFitnessPal exports</li>
        <li>Apple Health data</li>
        <li>Google Fit exports</li>
        <li>Fitbit data</li>
        <li>Generic CSV files</li>
      </ul>

      <h2 id="tips">Data Export Tips</h2>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📆</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Export Before Doctor Visits</p>
            <p className="text-sm text-gray-600 m-0">
              Generate a PDF report the day before appointments. Bring printed copy showing recent trends and changes.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">💾</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Quarterly Backups</p>
            <p className="text-sm text-gray-600 m-0">
              Set up automatic quarterly exports. Store in cloud backup service. Better safe than sorry.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🔐</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Password Protect Sensitive Exports</p>
            <p className="text-sm text-gray-600 m-0">
              Use password protection for exports containing sensitive medical information. Share password separately.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Keep Multiple Formats</p>
            <p className="text-sm text-gray-600 m-0">
              Export both PDF (human-readable) and JSON (complete data). PDF for viewing, JSON for migration/backup.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🗂️</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Organize Archives</p>
            <p className="text-sm text-gray-600 m-0">
              Name exports with dates (2024-Q1-HealthData.json). Makes finding specific time periods easy later.
            </p>
          </div>
        </div>
      </div>

      <h2 id="troubleshooting">Troubleshooting</h2>

      <h3>Export taking too long</h3>
      <ul>
        <li>Large datasets (years of data) can take 5-10 minutes</li>
        <li>Check email for completion notification</li>
        <li>Don't close browser during export</li>
        <li>Consider exporting smaller date ranges</li>
      </ul>

      <h3>Export file won't open</h3>
      <ul>
        <li>Verify you have software for that format (Excel for CSV, PDF reader)</li>
        <li>Re-download file (may be corrupted)</li>
        <li>Try different format</li>
        <li>Contact support if consistently failing</li>
      </ul>

      <h3>Missing data in export</h3>
      <ul>
        <li>Check date range selected</li>
        <li>Verify data types included in export</li>
        <li>Some data may be in different family member's export</li>
        <li>Archived data may need separate export</li>
      </ul>

      <h3>Can't access export download</h3>
      <ul>
        <li>Check download link hasn't expired (7 days)</li>
        <li>Look in spam folder for notification email</li>
        <li>Regenerate export from Settings → Export History</li>
        <li>Verify you're logged into correct account</li>
      </ul>

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
            Manage the data you'll be exporting
          </p>
        </Link>
      </div>
    </GuideTemplate>
  )
}
