import type { Metadata } from 'next'
import { GuideTemplate } from '@/components/docs/GuideTemplate'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Weight Logging Guide | Wellness Projection Lab',
  description: 'Track weight changes over time with visual charts and trend analysis.',
}

export default function WeightLoggingPage() {
  return (
    <GuideTemplate
      appRoute="/log-weight"
      title="Weight Logging"
      description="Track weight changes over time with visual charts and trend analysis"
    >
      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8 rounded-r-lg">
        <p className="font-semibold text-blue-900 mb-2">⚖️ Best Practice</p>
        <p className="text-blue-800 m-0">
          Weigh yourself at the same time each day (preferably in the morning after using the
          bathroom and before eating) for the most consistent tracking.
        </p>
      </div>

      <h2 id="overview">Overview</h2>
      <p>
        Regular weight logging helps you monitor progress toward your health goals. WPL makes it
        quick and easy to track weight changes with visual charts that show trends over time.
      </p>

      <h2 id="quick-logging">Quick Weight Logging</h2>
      <p>The fastest way to log your weight from anywhere in the app:</p>
      <ol>
        <li>
          Look for the <strong>Quick Weight Log</strong> button (scale icon) on your dashboard or
          patient profile
        </li>
        <li>Click to open the weight entry modal</li>
        <li>Enter your current weight</li>
        <li>Optionally add notes about how you're feeling or context</li>
        <li>
          Click <strong>Save</strong>
        </li>
      </ol>

      <div className="bg-gray-100 p-4 rounded-lg my-6">
        <p className="text-sm text-gray-700 font-medium mb-2">Quick Log Locations:</p>
        <ul className="text-sm text-gray-600 space-y-1 m-0">
          <li>✓ Dashboard home screen</li>
          <li>✓ Patient detail pages</li>
          <li>✓ Progress tracking page</li>
          <li>✓ Mobile quick-action menu</li>
        </ul>
      </div>

      <h2 id="weight-entry">Weight Entry Options</h2>

      <h3>Standard Entry</h3>
      <ul>
        <li>
          <strong>Weight:</strong> Enter in pounds (lbs) or kilograms (kg)
        </li>
        <li>
          <strong>Date/Time:</strong> Defaults to now, but can be backdated
        </li>
        <li>
          <strong>Notes:</strong> Optional field for context (e.g., "after exercise", "morning weigh-in")
        </li>
      </ul>

      <h3>Backdating Entries</h3>
      <p>Forgot to log your weight? You can backdate entries:</p>
      <ol>
        <li>Open the Quick Weight Log modal</li>
        <li>Click the date/time field</li>
        <li>Select the date and time you weighed yourself</li>
        <li>Enter your weight from that time</li>
        <li>Save - the entry will appear in the correct chronological order</li>
      </ol>

      <h2 id="viewing-history">Viewing Weight History</h2>

      <h3>Weight Chart</h3>
      <p>
        Navigate to the <Link href="/progress" className="text-blue-600 underline">Progress page</Link> to
        see your weight chart:
      </p>
      <ul>
        <li>
          <strong>Line graph:</strong> Shows weight trend over time
        </li>
        <li>
          <strong>Goal line:</strong> If you've set a weight goal, it appears as a target line
        </li>
        <li>
          <strong>Trend analysis:</strong> See if weight is increasing, decreasing, or stable
        </li>
        <li>
          <strong>Time filters:</strong> View 7 days, 30 days, 90 days, or all time
        </li>
      </ul>

      <h3>Weight Log Table</h3>
      <p>View all weight entries in chronological order:</p>
      <ul>
        <li>Date and time of each weigh-in</li>
        <li>Weight value</li>
        <li>Change from previous entry (±)</li>
        <li>Notes attached to each entry</li>
        <li>Edit or delete past entries</li>
      </ul>

      <h2 id="tracking-progress">Tracking Progress</h2>

      <h3>Key Metrics</h3>
      <div className="space-y-3">
        <div className="border-l-4 border-green-500 pl-4">
          <p className="font-semibold text-green-900 mb-1">Total Change</p>
          <p className="text-sm text-gray-700 m-0">
            Total weight lost or gained since your first entry
          </p>
        </div>

        <div className="border-l-4 border-blue-500 pl-4">
          <p className="font-semibold text-blue-900 mb-1">Weekly Average</p>
          <p className="text-sm text-gray-700 m-0">
            Average weight change per week (smooths out daily fluctuations)
          </p>
        </div>

        <div className="border-l-4 border-purple-500 pl-4">
          <p className="font-semibold text-purple-900 mb-1">Trend Direction</p>
          <p className="text-sm text-gray-700 m-0">
            Overall trend: Losing, Gaining, or Maintaining
          </p>
        </div>

        <div className="border-l-4 border-orange-500 pl-4">
          <p className="font-semibold text-orange-900 mb-1">Goal Progress</p>
          <p className="text-sm text-gray-700 m-0">
            Percentage toward your target weight goal
          </p>
        </div>
      </div>

      <h2 id="understanding-fluctuations">Understanding Weight Fluctuations</h2>
      <p>Daily weight can vary by 2-5 pounds due to several factors:</p>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-6">
        <p className="font-semibold text-yellow-900 mb-3">Common Causes of Weight Fluctuation:</p>
        <ul className="text-sm text-yellow-800 space-y-2 m-0">
          <li>
            <strong>Water Retention:</strong> High sodium intake, hormones, or exercise can cause
            temporary water weight
          </li>
          <li>
            <strong>Digestive System:</strong> Food and waste in your system adds weight
          </li>
          <li>
            <strong>Hydration Level:</strong> Dehydration or overhydration affects the scale
          </li>
          <li>
            <strong>Time of Day:</strong> Weight is typically lowest in the morning
          </li>
          <li>
            <strong>Hormonal Changes:</strong> Monthly cycles can cause 3-5 lb fluctuations
          </li>
        </ul>
      </div>

      <h3>Focus on Trends, Not Single Readings</h3>
      <p>
        WPL's chart helps you see the overall trend rather than obsessing over daily changes. Look
        at the 7-day or 30-day average for a more accurate picture.
      </p>

      <h2 id="frequency">How Often Should You Weigh?</h2>

      <h3>Daily Weighing</h3>
      <p className="text-sm text-gray-700">
        <strong>Pros:</strong> More data points, better trend analysis, stay accountable
      </p>
      <p className="text-sm text-gray-700">
        <strong>Cons:</strong> May cause stress from normal fluctuations
      </p>

      <h3>Weekly Weighing</h3>
      <p className="text-sm text-gray-700">
        <strong>Pros:</strong> Less stress, still captures trends, good for maintenance
      </p>
      <p className="text-sm text-gray-700">
        <strong>Cons:</strong> Might miss short-term patterns
      </p>

      <div className="bg-green-50 p-4 rounded-lg my-6">
        <p className="text-sm text-green-900 font-medium mb-2">WPL Recommendation:</p>
        <p className="text-sm text-green-800 m-0">
          Weigh daily for accurate trend tracking, but focus on weekly averages rather than daily
          changes. This gives you the data you need without the stress of normal fluctuations.
        </p>
      </div>

      <h2 id="caregiver-logging">Logging for Family Members</h2>
      <p>Caregivers can log weight for patients they manage:</p>
      <ol>
        <li>Switch to the patient's profile using the account switcher</li>
        <li>Click the Quick Weight Log button</li>
        <li>Enter the patient's weight</li>
        <li>Add notes if needed (e.g., "Doctor's office visit")</li>
        <li>Save - the system tracks that you logged it as a caregiver</li>
      </ol>

      <h2 id="integration">Integration with Goals</h2>
      <p>
        Weight logs automatically sync with your{' '}
        <Link href="/docs/user-guides/goals" className="text-blue-600 underline">
          weight goals
        </Link>
        :
      </p>
      <ul>
        <li>
          <strong>Progress tracking:</strong> See how close you are to your target
        </li>
        <li>
          <strong>Pace calculation:</strong> System calculates if you're on track
        </li>
        <li>
          <strong>Milestone notifications:</strong> Get alerts when you hit 5 lb, 10 lb, etc.
        </li>
        <li>
          <strong>Goal adjustments:</strong> System may suggest goal adjustments based on progress
        </li>
      </ul>

      <h2 id="tips">Weight Logging Tips</h2>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⏰</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Consistency is Key</p>
            <p className="text-sm text-gray-600 m-0">
              Weigh at the same time each day, wearing similar clothing (or none)
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Use the Trend</p>
            <p className="text-sm text-gray-600 m-0">
              Look at weekly averages, not daily fluctuations
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">📝</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Add Context</p>
            <p className="text-sm text-gray-600 m-0">
              Note unusual circumstances (travel, illness, special events)
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Combine with Other Data</p>
            <p className="text-sm text-gray-600 m-0">
              Weight is just one metric - also track how you feel, energy levels, and measurements
            </p>
          </div>
        </div>
      </div>

      <h2 id="troubleshooting">Troubleshooting</h2>

      <h3>Weight not saving</h3>
      <ul>
        <li>Check your internet connection (or wait for offline sync)</li>
        <li>Ensure weight value is reasonable (system validates entries)</li>
        <li>Try refreshing the page</li>
      </ul>

      <h3>Can't backdate entries</h3>
      <ul>
        <li>Click directly on the date/time field to open the picker</li>
        <li>Make sure date is not in the future</li>
        <li>Save after selecting the date</li>
      </ul>

      <h3>Chart not showing data</h3>
      <ul>
        <li>Ensure you have at least 2 weight entries</li>
        <li>Check the time filter (try "All Time")</li>
        <li>Refresh the page</li>
      </ul>

      <h2 id="next-steps">Next Steps</h2>
      <div className="grid md:grid-cols-2 gap-4 not-prose">
        <Link
          href="/docs/user-guides/goals"
          className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Set Weight Goals →</h3>
          <p className="text-sm text-gray-600">
            Create target weight goals to track your progress
          </p>
        </Link>
        <Link
          href="/docs/user-guides/progress-tracking"
          className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">View Progress Charts →</h3>
          <p className="text-sm text-gray-600">
            See detailed weight trends and analytics
          </p>
        </Link>
      </div>
    </GuideTemplate>
  )
}
