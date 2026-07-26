import type { Metadata } from 'next'
import { GuideTemplate } from '@/components/docs/GuideTemplate'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Meal Tracking Guide | Wellness Projection Lab',
  description: 'Learn how to track meals with AI-powered analysis, photo logging, and nutritional insights.',
}

export default function MealTrackingGuidePage() {
  return (
    <GuideTemplate
      title="Meal Tracking Guide"
      description="Learn how to effectively track your meals using AI-powered analysis and photo logging"
      appRoute="/log-meal"
    >
      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8 rounded-r-lg">
        <p className="font-semibold text-blue-900 mb-2">💡 Pro tip</p>
        <p className="text-blue-800 m-0">
          For best results, take photos in good lighting and capture the entire meal. Our AI
          works best when it can clearly see all components of your dish.
        </p>
      </div>

      <h2 id="getting-started">Getting started</h2>
      <p>
        Meal tracking in WPL is designed to be quick and intuitive. Whether you're logging
        breakfast, lunch, dinner, or a snack, the process takes just seconds.
      </p>

      <h2 id="methods">Three ways to track meals</h2>

      <h3>1. Photo logging (recommended)</h3>
      <ol>
        <li>Navigate to the <strong>Log meal</strong> page from the main menu</li>
        <li>Select your meal type (Breakfast, Lunch, Dinner, or Snack)</li>
        <li>Take a photo of your meal or upload from gallery</li>
        <li>Wait 2-3 seconds while our AI analyzes the meal</li>
        <li>Review the AI's nutritional analysis</li>
        <li>Add optional notes (allergies, portions, feelings)</li>
        <li>Tap <strong>Save meal</strong></li>
      </ol>

      <div className="bg-gray-100 p-4 rounded-lg my-6">
        <p className="text-sm text-gray-700 font-medium mb-2">What the AI detects:</p>
        <ul className="text-sm text-gray-600 space-y-1 m-0">
          <li>✓ Food items and ingredients</li>
          <li>✓ Estimated calories</li>
          <li>✓ Macronutrients (protein, carbs, fats)</li>
          <li>✓ Portion sizes</li>
          <li>✓ Cooking methods</li>
        </ul>
      </div>

      <h3>2. Quick log (no photo)</h3>
      <p>For times when you can't take a photo, you can type the details yourself:</p>
      <ol>
        <li>Go to <strong>Log meal</strong></li>
        <li>Tap <strong>Enter manually</strong></li>
        <li>Type a <strong>meal name</strong> (this is the only thing you must fill in)</li>
        <li>
          Check the <strong>meal type</strong> — it's already set based on the time of day, but
          you can change it
        </li>
        <li>If you know them, add <strong>calories</strong> and <strong>macros</strong> (all optional)</li>
        <li>Add a photo or notes if you'd like (optional)</li>
        <li>Tap <strong>Save meal</strong></li>
      </ol>

      <h3>Add an ingredients breakdown (optional)</h3>
      <p>
        Don't know the calories or macros? That's okay. You can list the ingredients you
        remember instead — even without amounts — and finish the rest later.
      </p>
      <ol>
        <li>In the manual entry form, tap <strong>＋ Add ingredients</strong> (just above Notes)</li>
        <li>
          Type or paste your ingredients on one line, separated by commas — for example:{' '}
          <em>2 eggs, 1 tbsp butter, 1/2 cup oats</em>
        </li>
        <li>Tap <strong>＋ Add</strong> (or press Enter). Each ingredient becomes its own row</li>
        <li>Tap any row to fix it, or tap the <strong>✕</strong> to remove it</li>
        <li>Tap <strong>Save meal</strong> when you're done</li>
      </ol>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 my-6 rounded-r-lg">
        <p className="font-semibold text-blue-900 mb-2">💡 Why add ingredients?</p>
        <ul className="text-blue-800 space-y-1 m-0">
          <li>Amounts are optional — add whatever you can remember</li>
          <li>
            Your ingredients are saved with the meal, so you can come back and add the amounts or
            macros whenever you have a minute
          </li>
          <li>
            It's a great way to keep a record of a new meal you tried and want to remember
          </li>
        </ul>
      </div>

      <h3>Speak your ingredients</h3>
      <p>On a phone and most browsers, you can add ingredients by voice instead of typing.</p>
      <ol>
        <li>Open <strong>＋ Add ingredients</strong> and tap the <strong>🎤 microphone</strong></li>
        <li>
          Tap the mic to start, then say your ingredients — <strong>pause between each one</strong>{' '}
          for the cleanest result
        </li>
        <li>Speak in a quiet spot so background noise isn't picked up</li>
        <li>
          Use <strong>Undo</strong>, <strong>Clear</strong>, or <strong>Redo</strong> to fix
          mistakes, then tap <strong>Done</strong>
        </li>
      </ol>

      <h3>Estimate the calories and macros</h3>
      <p>Once you've added ingredients, WPL can estimate the nutrition for you.</p>
      <ol>
        <li>Tap <strong>✨ Estimate from ingredients</strong> (below Macros)</li>
        <li>The calories and macros fill in, with a note on how confident the estimate is</li>
        <li>
          <strong>Always review and edit.</strong> It's an estimate, not an exact measurement —
          especially when amounts are missing
        </li>
      </ol>

      <h3>Personalized to each family member</h3>
      <p>
        When you log for a family member and we know their age, height, and weight, you'll see a
        short line showing how the meal fits their day — for example,{' '}
        <em>"about 18% of their daily calories."</em> It's a quick gut-check, not medical advice.
      </p>

      <h3>Save a meal to reuse it</h3>
      <p>Meals you eat often can be saved and re-logged in one tap.</p>
      <ol>
        <li>Fill in a meal (name, ingredients, and macros if you have them)</li>
        <li>Tap <strong>📋 Save as meal</strong></li>
        <li>
          Later, tap the <strong>📖 Saved meals</strong> tile, find it, and tap{' '}
          <strong>Log this meal</strong>
        </li>
      </ol>

      <h3>Edit or fix a meal</h3>
      <p>Made a mistake, or want to fill in details later? Every meal can be edited.</p>
      <ol>
        <li>Find the meal under <strong>Recent meals</strong> and tap the <strong>✏️ pencil</strong></li>
        <li>
          It opens in the same form, already filled in — change anything (including the photo and
          ingredients) and tap <strong>Update meal</strong>
        </li>
        <li>Editing keeps the meal's original date — it won't jump to today</li>
      </ol>

      <h3>3. Offline mode</h3>
      <p>
        No internet? No problem! WPL works offline and will automatically sync your meals when
        you reconnect.
      </p>
      <ol>
        <li>Log meals as usual - they'll be queued locally</li>
        <li>An offline indicator will show in the top-right</li>
        <li>When internet returns, meals sync automatically</li>
        <li>You'll see a success notification once synced</li>
      </ol>

      <h2 id="ai-analysis">Understanding AI analysis</h2>
      <p>
        Our AI uses advanced computer vision to analyze your meal photos. Here's what each
        metric means:
      </p>

      <h3>Calories</h3>
      <p>
        Total estimated energy from the meal. The AI considers portion sizes, cooking methods,
        and visible ingredients.
      </p>

      <h3>Macronutrients</h3>
      <ul>
        <li><strong>Protein:</strong> Essential for muscle repair and growth</li>
        <li><strong>Carbohydrates:</strong> Your body's primary energy source</li>
        <li><strong>Fats:</strong> Important for hormone production and nutrient absorption</li>
      </ul>

      <h3>Confidence score</h3>
      <p>
        Each analysis includes a confidence percentage. Higher confidence (80%+) means the AI
        is very certain about its analysis.
      </p>

      <h2 id="best-practices">Best practices</h2>

      <div className="space-y-4">
        <div className="border-l-4 border-green-500 pl-4">
          <p className="font-semibold text-green-900 mb-1">✓ DO</p>
          <ul className="text-gray-700 space-y-1 m-0">
            <li>Take photos before eating</li>
            <li>Capture the whole plate</li>
            <li>Use good lighting</li>
            <li>Log meals immediately</li>
            <li>Add notes about how you feel</li>
          </ul>
        </div>

        <div className="border-l-4 border-red-500 pl-4">
          <p className="font-semibold text-red-900 mb-1">✗ DON'T</p>
          <ul className="text-gray-700 space-y-1 m-0">
            <li>Use blurry or dark photos</li>
            <li>Log meals days later</li>
            <li>Forget to select meal type</li>
            <li>Skip logging snacks</li>
          </ul>
        </div>
      </div>

      <h2 id="caregiver">Logging for family members</h2>
      <p>Caregivers can log meals on behalf of family members or patients:</p>
      <ol>
        <li>Switch to the patient's profile using the account switcher</li>
        <li>Log the meal as normal</li>
        <li>The system tracks that you (the caregiver) logged it for them</li>
        <li>Both you and the patient can view the meal history</li>
      </ol>

      <h2 id="viewing-history">Viewing meal history</h2>
      <p>Access your complete meal history from the dashboard:</p>
      <ul>
        <li><strong>Timeline view:</strong> See all meals chronologically</li>
        <li><strong>Calendar view:</strong> Browse by date</li>
        <li><strong>Analytics:</strong> View trends and patterns</li>
        <li><strong>Export:</strong> Download data for your records</li>
      </ul>

      <h2 id="troubleshooting">Troubleshooting</h2>

      <h3>AI analysis seems inaccurate</h3>
      <ul>
        <li>Retake the photo with better lighting</li>
        <li>Make sure all food items are visible</li>
        <li>Manually adjust the analysis if needed</li>
        <li>Report issues via the feedback button</li>
      </ul>

      <h3>Photo upload fails</h3>
      <ul>
        <li>Check your internet connection</li>
        <li>Try a smaller image size</li>
        <li>Use offline mode if needed</li>
      </ul>

      <h3>Meals not syncing</h3>
      <ul>
        <li>Verify you're connected to the internet</li>
        <li>Check the sync status widget (bottom-right)</li>
        <li>Pull down to refresh on the dashboard</li>
        <li>Contact support if issues persist</li>
      </ul>

      <h2 id="next-steps">Next steps</h2>
      <div className="grid md:grid-cols-2 gap-4 not-prose">
        <Link
          href="/docs/user-guides/weight-logging"
          className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Weight logging →</h3>
          <p className="text-sm text-gray-600">
            Learn how to track weight changes alongside your meals
          </p>
        </Link>
        <Link
          href="/docs/user-guides/progress-tracking"
          className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Progress tracking →</h3>
          <p className="text-sm text-gray-600">
            View charts and analytics of your health journey
          </p>
        </Link>
      </div>
    </GuideTemplate>
  )
}
