import type { Metadata } from 'next'
import { GuideTemplate } from '@/components/docs/GuideTemplate'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Progress Tracking Guide | Wellness Projection Lab',
  description: 'Monitor your health journey with comprehensive charts, statistics, and insights.',
}

export default function ProgressTrackingPage() {
  return (
    <GuideTemplate
      title="Progress Tracking"
      description="Monitor your health journey with comprehensive charts, statistics, and insights"
    >
      <div className="bg-purple-50 border-l-4 border-purple-500 p-6 mb-8 rounded-r-lg">
        <p className="font-semibold text-purple-900 mb-2">📊 Data-Driven Insights</p>
        <p className="text-purple-800 m-0">
          Visualize your health data with interactive charts and analytics. See trends, patterns, and celebrate your progress.
        </p>
      </div>

      <h2 id="overview">Overview</h2>
      <p>
        The Progress page is your health analytics dashboard. Access it from the main menu to view comprehensive charts, statistics, and insights about your health journey.
      </p>

      <h2 id="accessing">Accessing Progress Tracking</h2>
      <ol>
        <li>Click <strong>Progress</strong> from the main navigation menu</li>
        <li>Select the patient profile you want to view (if managing multiple people)</li>
        <li>Choose your time range (7 days, 30 days, 90 days, all time)</li>
        <li>Scroll to explore different metrics and charts</li>
      </ol>

      <h2 id="weight-tracking">Weight Progress</h2>

      <h3>Weight Chart</h3>
      <p>The main weight chart shows your weight trend over time:</p>
      <ul>
        <li><strong>Line graph:</strong> Your weight plotted chronologically</li>
        <li><strong>Goal line:</strong> Target weight shown as a dashed line</li>
        <li><strong>Trend line:</strong> Statistical trend showing overall direction</li>
        <li><strong>Milestones:</strong> Markers for significant weight losses (5 lbs, 10 lbs, etc.)</li>
      </ul>

      <h3>Weight Statistics</h3>
      <div className="grid md:grid-cols-2 gap-4 my-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Current Metrics</h4>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Current weight</li>
            <li>• Starting weight</li>
            <li>• Total change</li>
            <li>• % of goal achieved</li>
          </ul>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Trend Analysis</h4>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Weekly average change</li>
            <li>• Monthly average change</li>
            <li>• Trend direction (↑↓→)</li>
            <li>• Projected goal date</li>
          </ul>
        </div>
      </div>

      <h2 id="meal-tracking">Meal Analytics</h2>

      <h3>Meal Frequency Chart</h3>
      <p>Bar chart showing meals logged per day:</p>
      <ul>
        <li>Compare breakfast, lunch, dinner, snack frequencies</li>
        <li>Identify consistent tracking patterns</li>
        <li>See which days you log most consistently</li>
        <li>Track toward logging consistency goals</li>
      </ul>

      <h3>Calorie Tracking</h3>
      <p>If you have calorie goals set:</p>
      <ul>
        <li><strong>Daily calories:</strong> Bar chart of daily intake</li>
        <li><strong>Goal line:</strong> Your daily calorie target</li>
        <li><strong>Average:</strong> Rolling 7-day average</li>
        <li><strong>Over/under:</strong> Color-coded to show days above/below target</li>
      </ul>

      <h3>Macronutrient Distribution</h3>
      <p>Pie chart showing your macro balance:</p>
      <ul>
        <li>Percentage breakdown of protein, carbs, fats</li>
        <li>Compare against your goal ratios</li>
        <li>See trends over selected time period</li>
        <li>Identify areas for improvement</li>
      </ul>

      <h2 id="time-filters">Time Range Filters</h2>
      <p>All charts support multiple time ranges:</p>

      <div className="space-y-3">
        <div className="border-l-4 border-blue-500 pl-4">
          <p className="font-semibold text-blue-900 mb-1">7 Days</p>
          <p className="text-sm text-gray-700 m-0">Best for daily tracking and short-term adjustments</p>
        </div>
        <div className="border-l-4 border-green-500 pl-4">
          <p className="font-semibold text-green-900 mb-1">30 Days</p>
          <p className="text-sm text-gray-700 m-0">Shows monthly patterns and smooths out weekly fluctuations</p>
        </div>
        <div className="border-l-4 border-purple-500 pl-4">
          <p className="font-semibold text-purple-900 mb-1">90 Days</p>
          <p className="text-sm text-gray-700 m-0">Reveals long-term trends and seasonal patterns</p>
        </div>
        <div className="border-l-4 border-orange-500 pl-4">
          <p className="font-semibold text-orange-900 mb-1">All Time</p>
          <p className="text-sm text-gray-700 m-0">Complete health journey from day one</p>
        </div>
      </div>

      <h2 id="insights">Automated Insights</h2>
      <p>WPL automatically analyzes your data and provides insights:</p>

      <h3>Streak Tracking</h3>
      <ul>
        <li><strong>Current streak:</strong> Consecutive days logging meals</li>
        <li><strong>Longest streak:</strong> Your personal best</li>
        <li><strong>Weekly consistency:</strong> % of days with logs</li>
      </ul>

      <h3>Pattern Recognition</h3>
      <ul>
        <li>Identifies which days you're most likely to skip logging</li>
        <li>Finds meal types you log most/least consistently</li>
        <li>Detects weight loss plateaus automatically</li>
        <li>Suggests optimal times for weigh-ins based on your data</li>
      </ul>

      <h3>Milestone Celebrations</h3>
      <p>WPL celebrates your achievements:</p>
      <ul>
        <li>Every 5 pounds lost</li>
        <li>50-day, 100-day, 365-day logging streaks</li>
        <li>Reaching 50%, 75%, 100% of goal</li>
        <li>Maintaining goal weight for 30 days</li>
      </ul>

      <h2 id="comparing">Comparing Time Periods</h2>
      <p>Compare current progress against previous periods:</p>
      <ol>
        <li>Select "Compare" mode on any chart</li>
        <li>Choose two time periods (e.g., "This month" vs "Last month")</li>
        <li>View overlaid data to see improvements</li>
        <li>Export comparison data if needed</li>
      </ol>

      <h2 id="goals-tracking">Goals Progress</h2>
      <p>See all your active goals in one place:</p>

      <h3>Goal Cards</h3>
      <p>Each goal displays:</p>
      <ul>
        <li><strong>Progress bar:</strong> Visual completion percentage</li>
        <li><strong>Current vs target:</strong> Where you are vs where you want to be</li>
        <li><strong>Days remaining:</strong> Time until target date</li>
        <li><strong>On track indicator:</strong> Green if on pace, yellow if behind</li>
      </ul>

      <h3>Goal Trajectory</h3>
      <p>For weight goals specifically:</p>
      <ul>
        <li>Projected completion date based on current trend</li>
        <li>Required weekly loss rate to hit target</li>
        <li>Suggestions if falling behind</li>
        <li>Celebration when ahead of schedule</li>
      </ul>

      <h2 id="export-share">Export & Share</h2>

      <h3>Exporting Charts</h3>
      <p>Save charts for your records or to share with healthcare providers:</p>
      <ol>
        <li>Click the export icon on any chart</li>
        <li>Choose format: PNG image or PDF report</li>
        <li>Select date range and metrics to include</li>
        <li>Download to your device</li>
      </ol>

      <h3>Sharing with Caregivers</h3>
      <p>Family members with caregiver access automatically see progress:</p>
      <ul>
        <li>Caregivers view the same charts for their patients</li>
        <li>Receive notifications when patients hit milestones</li>
        <li>Can export reports on patient's behalf</li>
      </ul>

      <h2 id="mobile">Mobile Progress Tracking</h2>
      <p>All charts are optimized for mobile viewing:</p>
      <ul>
        <li><strong>Touch interactions:</strong> Tap data points for details</li>
        <li><strong>Pinch to zoom:</strong> Focus on specific time ranges</li>
        <li><strong>Swipe:</strong> Navigate between charts</li>
        <li><strong>Portrait mode:</strong> Charts stack vertically for easy scrolling</li>
      </ul>

      <h2 id="tips">Tips for Effective Progress Tracking</h2>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📅</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Weekly Reviews</p>
            <p className="text-sm text-gray-600 m-0">
              Set aside time each week to review your progress. Sunday evenings work well for many people.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Focus on Trends</p>
            <p className="text-sm text-gray-600 m-0">
              Don't obsess over single data points. Look at the overall trend line over weeks/months.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Celebrate Small Wins</p>
            <p className="text-sm text-gray-600 m-0">
              Every 5 pounds matters. Every week of consistent logging matters. Acknowledge progress.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🔄</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Adjust Based on Data</p>
            <p className="text-sm text-gray-600 m-0">
              Use insights to refine your approach. Not losing weight? Check your calorie trends.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">📸</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Take Progress Photos</p>
            <p className="text-sm text-gray-600 m-0">
              The scale doesn't tell the whole story. Monthly photos show body composition changes.
            </p>
          </div>
        </div>
      </div>

      <h2 id="troubleshooting">Troubleshooting</h2>

      <h3>Charts not loading</h3>
      <ul>
        <li>Ensure you have at least 3-5 data points for meaningful charts</li>
        <li>Check your internet connection</li>
        <li>Try refreshing the page</li>
        <li>Clear browser cache if issues persist</li>
      </ul>

      <h3>Data looks incorrect</h3>
      <ul>
        <li>Verify the selected time range</li>
        <li>Check patient profile selector (if managing multiple people)</li>
        <li>Review individual meal/weight logs for accuracy</li>
        <li>Contact support if data is missing</li>
      </ul>

      <h3>Can't export charts</h3>
      <ul>
        <li>Check browser popup blocker settings</li>
        <li>Ensure sufficient storage space on device</li>
        <li>Try a different browser if issues continue</li>
      </ul>

      <h2 id="next-steps">Next Steps</h2>
      <div className="grid md:grid-cols-2 gap-4 not-prose">
        <Link
          href="/docs/user-guides/goals"
          className="block p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Set Goals →</h3>
          <p className="text-sm text-gray-600">
            Create goals to track on your progress dashboard
          </p>
        </Link>
        <Link
          href="/docs/user-guides/weight-logging"
          className="block p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Log Weight →</h3>
          <p className="text-sm text-gray-600">
            More data points create better charts and insights
          </p>
        </Link>
      </div>
    </GuideTemplate>
  )
}
