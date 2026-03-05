/**
 * Getting Started - Create Account Page
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Create Account - Getting Started | Wellness Projection Lab',
  description: 'Learn how to create your WPL account and get started with your wellness journey.',
}

export default function SignupDocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-sm">
          <Link href="/docs" className="text-blue-600 hover:text-blue-700">
            Documentation
          </Link>
          <span className="text-gray-400">/</span>
          <Link href="/docs/getting-started" className="text-blue-600 hover:text-blue-700">
            Getting Started
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">Create Account</span>
        </div>

        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">1️⃣</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Create Your Account</h1>
          </div>
          <p className="text-xl text-gray-600">
            Sign up and set up your profile to start your wellness journey with WPL
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-8">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Navigate to Sign Up</h2>
            <p className="text-gray-700 mb-4">
              Visit the{' '}
              <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign Up page
              </Link>{' '}
              or click "Get Started" from the homepage.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Choose Your Sign-Up Method</h2>
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Email & Password</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                  <li>Enter your email address</li>
                  <li>Create a strong password (minimum 8 characters)</li>
                  <li>Verify your email address</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Social Sign-In</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                  <li>Google - Sign up with your Google account</li>
                  <li>Apple - Use your Apple ID for quick registration</li>
                  <li>Facebook - Connect with your Facebook account</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Complete Your Profile</h2>
            <p className="text-gray-700 mb-4">
              After creating your account, you'll be prompted to set up your profile:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>
                <strong>Personal Information:</strong> Name, date of birth, gender
              </li>
              <li>
                <strong>Health Metrics:</strong> Current weight, height, target weight
              </li>
              <li>
                <strong>Goals:</strong> Weight loss, muscle gain, maintenance, or general wellness
              </li>
              <li>
                <strong>Activity Level:</strong> Sedentary, lightly active, moderately active, very active
              </li>
              <li>
                <strong>Dietary Preferences:</strong> Vegetarian, vegan, keto, etc. (optional)
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Set Up Notifications (Optional)</h2>
            <p className="text-gray-700 mb-4">
              Enable push notifications to receive:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Meal logging reminders</li>
              <li>Weight tracking reminders</li>
              <li>Progress updates and insights</li>
              <li>Community challenges and events</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Choose Your Plan</h2>
            <p className="text-gray-700 mb-4">
              Select a subscription plan that fits your needs:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border-2 border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Free Plan</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>✓ Basic meal tracking</li>
                  <li>✓ Weight logging</li>
                  <li>✓ Basic insights</li>
                </ul>
              </div>
              <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
                <h3 className="font-semibold text-blue-900 mb-2">Premium Plan</h3>
                <ul className="text-sm text-blue-900 space-y-1">
                  <li>✓ WPL-powered meal analysis</li>
                  <li>✓ Advanced analytics</li>
                  <li>✓ Family account management</li>
                  <li>✓ Priority support</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Tips */}
          <section className="bg-blue-50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-blue-900 mb-4">💡 Pro Tips</h2>
            <ul className="space-y-2 text-blue-900">
              <li>
                <strong>Use a strong password:</strong> Combine uppercase, lowercase, numbers, and symbols
              </li>
              <li>
                <strong>Verify your email:</strong> This ensures account security and password recovery
              </li>
              <li>
                <strong>Be accurate with health metrics:</strong> This helps provide better personalized recommendations
              </li>
              <li>
                <strong>Start with realistic goals:</strong> You can always adjust them later
              </li>
            </ul>
          </section>

          {/* Troubleshooting */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Troubleshooting</h2>
            <div className="space-y-3">
              <details className="border border-gray-200 rounded-lg p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  Not receiving verification email?
                </summary>
                <p className="text-gray-700 mt-2">
                  Check your spam folder. If still not found, click "Resend verification email" on the login page.
                </p>
              </details>
              <details className="border border-gray-200 rounded-lg p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  Social sign-in not working?
                </summary>
                <p className="text-gray-700 mt-2">
                  Ensure you've granted the necessary permissions to WPL. Try using email/password sign-up instead.
                </p>
              </details>
              <details className="border border-gray-200 rounded-lg p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  Email already in use?
                </summary>
                <p className="text-gray-700 mt-2">
                  You may have already created an account. Try{' '}
                  <Link href="/login" className="text-blue-600 hover:text-blue-700">
                    logging in
                  </Link>{' '}
                  or use the "Forgot Password" option.
                </p>
              </details>
            </div>
          </section>
        </div>

        {/* Navigation */}
        <div className="mt-12 flex items-center justify-between">
          <Link
            href="/docs/getting-started"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Getting Started
          </Link>
          <Link
            href="/docs/getting-started/first-log"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            Next: Log Your First Meal
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
