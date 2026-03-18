import type { Metadata } from 'next'
import { GuideTemplate } from '@/components/docs/GuideTemplate'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Goal Setting Guide | Wellness Projection Lab',
  description: 'Set realistic health goals and track your progress towards achieving them.',
}

export default function GoalsPage() {
  return (
    <GuideTemplate
      title="Goal Setting"
      description="Set realistic health goals and track your progress towards achieving them"
    >
      <div className="bg-green-50 border-l-4 border-green-500 p-6 mb-8 rounded-r-lg">
        <p className="font-semibold text-green-900 mb-2">💡 Success Tip</p>
        <p className="text-green-800 m-0">
          Start with small, achievable goals and gradually increase difficulty. Research shows that
          people who set specific, measurable goals are 42% more likely to achieve them.
        </p>
      </div>

      <h2 id="overview">Overview</h2>
      <p>
        Goals in WPL help you stay motivated and track progress toward your health objectives.
        Whether you're aiming to lose weight, build healthier eating habits, or improve overall
        wellness, setting clear goals is the first step to success.
      </p>

      <h2 id="creating-goals">Creating Your First Goal</h2>
      <ol>
        <li>
          Navigate to <strong>Profile</strong> from the main menu
        </li>
        <li>
          Scroll to the <strong>Goals</strong> section
        </li>
        <li>
          Click <strong>Add Goal</strong> or <strong>Edit Goals</strong>
        </li>
        <li>Choose your goal type</li>
        <li>Set your target and timeline</li>
        <li>
          Save and start tracking
        </li>
      </ol>

      <h2 id="goal-types">Types of Goals</h2>

      <h3>Weight Goals</h3>
      <p>Set a target weight with a specific timeline:</p>
      <ul>
        <li>
          <strong>Target Weight:</strong> Enter your desired weight
        </li>
        <li>
          <strong>Target Date:</strong> When you want to achieve it
        </li>
        <li>
          <strong>Weekly Rate:</strong> System calculates safe weight loss rate (typically 1-2 lbs
          per week)
        </li>
      </ul>

      <div className="bg-blue-50 p-4 rounded-lg my-6">
        <p className="text-sm text-blue-900 font-medium mb-2">Example Weight Goal</p>
        <p className="text-sm text-blue-800 m-0">
          "Lose 20 pounds by July 1st" - The system will calculate you need to lose approximately
          1.5 lbs per week and track your progress accordingly.
        </p>
      </div>

      <h3>Daily Calorie Goals</h3>
      <p>Set a target daily calorie intake:</p>
      <ul>
        <li>Based on your weight goal, WPL suggests optimal calorie targets</li>
        <li>Track daily progress with meal logging</li>
        <li>Receive notifications when approaching or exceeding your limit</li>
        <li>Adjust targets as your needs change</li>
      </ul>

      <h3>Macronutrient Goals</h3>
      <p>Fine-tune your nutrition with macro targets:</p>
      <ul>
        <li>
          <strong>Protein:</strong> Essential for muscle maintenance (e.g., 30% of calories)
        </li>
        <li>
          <strong>Carbohydrates:</strong> Your energy source (e.g., 40% of calories)
        </li>
        <li>
          <strong>Fats:</strong> Important for hormone health (e.g., 30% of calories)
        </li>
      </ul>

      <div className="bg-gray-100 p-4 rounded-lg my-6">
        <p className="text-sm text-gray-700 font-medium mb-2">Common Macro Ratios:</p>
        <ul className="text-sm text-gray-600 space-y-1 m-0">
          <li>• Balanced: 30% protein, 40% carbs, 30% fats</li>
          <li>• Low-carb: 35% protein, 25% carbs, 40% fats</li>
          <li>• High-protein: 40% protein, 35% carbs, 25% fats</li>
          <li>• Mediterranean: 20% protein, 45% carbs, 35% fats</li>
        </ul>
      </div>

      <h3>Activity Goals</h3>
      <p>Set movement and exercise targets:</p>
      <ul>
        <li>
          <strong>Daily Steps:</strong> Track step count (e.g., 10,000 steps/day)
        </li>
        <li>
          <strong>Weekly Exercise:</strong> Minutes of intentional exercise
        </li>
        <li>
          <strong>Active Days:</strong> Number of days with physical activity
        </li>
      </ul>

      <h3>Behavioral Goals</h3>
      <p>Build healthy habits:</p>
      <ul>
        <li>
          <strong>Meal Frequency:</strong> Number of meals and snacks per day
        </li>
        <li>
          <strong>Water Intake:</strong> Daily hydration target
        </li>
        <li>
          <strong>Meal Timing:</strong> Consistent eating schedule
        </li>
        <li>
          <strong>Logging Consistency:</strong> Track meals X days per week
        </li>
      </ul>

      <h2 id="smart-goals">Setting SMART Goals</h2>
      <p>WPL encourages SMART goal setting:</p>

      <div className="space-y-4">
        <div className="border-l-4 border-blue-500 pl-4">
          <p className="font-semibold text-blue-900 mb-1">
            <strong>S</strong>pecific
          </p>
          <p className="text-gray-700 text-sm m-0">
            "Lose 15 pounds" not "lose weight"
          </p>
        </div>

        <div className="border-l-4 border-green-500 pl-4">
          <p className="font-semibold text-green-900 mb-1">
            <strong>M</strong>easurable
          </p>
          <p className="text-gray-700 text-sm m-0">
            Track progress with weight logs and charts
          </p>
        </div>

        <div className="border-l-4 border-yellow-500 pl-4">
          <p className="font-semibold text-yellow-900 mb-1">
            <strong>A</strong>chievable
          </p>
          <p className="text-gray-700 text-sm m-0">
            System warns if goal requires unsafe weight loss rate
          </p>
        </div>

        <div className="border-l-4 border-purple-500 pl-4">
          <p className="font-semibold text-purple-900 mb-1">
            <strong>R</strong>elevant
          </p>
          <p className="text-gray-700 text-sm m-0">
            Aligned with your overall health objectives
          </p>
        </div>

        <div className="border-l-4 border-pink-500 pl-4">
          <p className="font-semibold text-pink-900 mb-1">
            <strong>T</strong>ime-bound
          </p>
          <p className="text-gray-700 text-sm m-0">
            Set target dates for accountability
          </p>
        </div>
      </div>

      <h2 id="tracking-progress">Tracking Progress</h2>
      <p>WPL automatically tracks your progress toward goals:</p>

      <h3>Dashboard View</h3>
      <ul>
        <li>See all active goals at a glance</li>
        <li>Visual progress bars showing completion percentage</li>
        <li>Days remaining until target date</li>
        <li>Current vs. target metrics</li>
      </ul>

      <h3>Progress Charts</h3>
      <p>
        Visit the <Link href="/progress" className="text-blue-600 underline">Progress page</Link> to see:
      </p>
      <ul>
        <li>Weight trend line vs. goal trajectory</li>
        <li>Daily calorie intake vs. target</li>
        <li>Macro distribution pie charts</li>
        <li>Activity tracking graphs</li>
      </ul>

      <h3>Notifications & Milestones</h3>
      <ul>
        <li>
          <strong>Daily reminders:</strong> Log meals to stay on track
        </li>
        <li>
          <strong>Progress alerts:</strong> "You're 25% toward your goal!"
        </li>
        <li>
          <strong>Milestone celebrations:</strong> Celebrate every 5 pounds lost
        </li>
        <li>
          <strong>Course corrections:</strong> Suggestions when falling behind
        </li>
      </ul>

      <h2 id="adjusting-goals">Adjusting Your Goals</h2>
      <p>Goals should evolve with your progress:</p>

      <h3>When to Adjust</h3>
      <ul>
        <li>You consistently exceed or miss targets</li>
        <li>Life circumstances change</li>
        <li>You reach a plateau</li>
        <li>Medical advice changes</li>
        <li>You achieve a goal early</li>
      </ul>

      <h3>How to Adjust</h3>
      <ol>
        <li>Go to Profile → Goals</li>
        <li>Click on the goal you want to modify</li>
        <li>Update target, timeline, or parameters</li>
        <li>System recalculates required daily/weekly rates</li>
        <li>Save changes</li>
      </ol>

      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 my-6 rounded-r-lg">
        <p className="font-semibold text-yellow-900 mb-2">⚠️ Important Note</p>
        <p className="text-yellow-800 m-0">
          WPL will warn you if a goal requires unhealthy weight loss rates (more than 2 lbs/week).
          Always consult with healthcare providers before making significant dietary changes.
        </p>
      </div>

      <h2 id="goal-templates">Goal Templates</h2>
      <p>Quick-start with pre-configured goal templates:</p>

      <div className="grid md:grid-cols-2 gap-4 my-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Gradual Weight Loss</h4>
          <p className="text-sm text-gray-600 mb-3">
            Lose 1-1.5 lbs/week with balanced nutrition
          </p>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• 500 calorie daily deficit</li>
            <li>• Balanced macros (30/40/30)</li>
            <li>• 7,000+ steps daily</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Maintenance & Wellness</h4>
          <p className="text-sm text-gray-600 mb-3">
            Maintain current weight, focus on health
          </p>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Maintenance calories</li>
            <li>• Flexible macros</li>
            <li>• Consistent meal logging</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Performance Focus</h4>
          <p className="text-sm text-gray-600 mb-3">
            Build strength and improve fitness
          </p>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Higher protein (35-40%)</li>
            <li>• Slight calorie surplus</li>
            <li>• Activity tracking priority</li>
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Medical Management</h4>
          <p className="text-sm text-gray-600 mb-3">
            Support chronic condition management
          </p>
          <ul className="text-sm text-gray-600 space-y-1 m-0">
            <li>• Custom dietary restrictions</li>
            <li>• Medication coordination</li>
            <li>• Provider collaboration</li>
          </ul>
        </div>
      </div>

      <h2 id="goal-sharing">Sharing Goals with Caregivers</h2>
      <p>Family members and caregivers can help support your goals:</p>
      <ul>
        <li>Caregivers see patient goals in their dashboard</li>
        <li>Receive notifications when patients hit milestones</li>
        <li>Help log meals and track progress</li>
        <li>Coordinate meal planning around goals</li>
      </ul>

      <h2 id="tips">Tips for Success</h2>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Start Small</p>
            <p className="text-sm text-gray-600 m-0">
              Begin with one or two goals rather than overwhelming yourself with many at once.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Track Consistently</p>
            <p className="text-sm text-gray-600 m-0">
              Log meals and weight regularly for accurate progress tracking.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🔄</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Review Weekly</p>
            <p className="text-sm text-gray-600 m-0">
              Check your progress every week and adjust if needed.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Celebrate Milestones</p>
            <p className="text-sm text-gray-600 m-0">
              Acknowledge progress along the way, not just the final goal.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl">👥</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Get Support</p>
            <p className="text-sm text-gray-600 m-0">
              Share goals with family, join support groups, or work with a healthcare provider.
            </p>
          </div>
        </div>
      </div>

      <h2 id="next-steps">Next Steps</h2>
      <div className="grid md:grid-cols-2 gap-4 not-prose">
        <Link
          href="/docs/user-guides/progress-tracking"
          className="block p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Progress Tracking →</h3>
          <p className="text-sm text-gray-600">
            Learn how to view detailed charts and analytics of your progress
          </p>
        </Link>
        <Link
          href="/docs/user-guides/meal-tracking"
          className="block p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Meal Tracking →</h3>
          <p className="text-sm text-gray-600">
            Master meal logging to support your calorie and macro goals
          </p>
        </Link>
      </div>
    </GuideTemplate>
  )
}
