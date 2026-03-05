/**
 * Getting Started Overview Page
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Getting Started | Wellness Projection Lab',
  description: 'Get started with Wellness Projection Lab - your complete guide to setting up and using WPL.',
}

export default function GettingStartedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-sm">
          <Link href="/docs" className="text-blue-600 hover:text-blue-700">
            Documentation
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">Getting Started</span>
        </div>

        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Getting Started</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Welcome to Wellness Projection Lab! Follow these simple steps to start your wellness journey.
          </p>
        </div>

        {/* Quick Start Steps */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Quick Start in 3 Steps</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              href="/docs/getting-started/signup"
              className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all group border-2 border-transparent hover:border-blue-500"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-200 transition-colors">
                <span className="text-3xl">1️⃣</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Create Account</h3>
              <p className="text-gray-600 mb-4">Sign up and set up your profile in minutes</p>
              <div className="text-sm text-gray-500">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Email or social sign-in</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Set health goals</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Choose your plan</span>
                </div>
              </div>
              <div className="mt-6 text-blue-600 font-medium flex items-center gap-2 group-hover:gap-3 transition-all">
                Get Started
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            <Link
              href="/docs/getting-started/first-log"
              className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all group border-2 border-transparent hover:border-purple-500"
            >
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-200 transition-colors">
                <span className="text-3xl">2️⃣</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Log Your First Meal</h3>
              <p className="text-gray-600 mb-4">Track meals with AI-powered analysis</p>
              <div className="text-sm text-gray-500">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Photo or manual entry</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>AI nutrition analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Instant feedback</span>
                </div>
              </div>
              <div className="mt-6 text-purple-600 font-medium flex items-center gap-2 group-hover:gap-3 transition-all">
                Learn How
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            <Link
              href="/docs/getting-started/insights"
              className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all group border-2 border-transparent hover:border-green-500"
            >
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-200 transition-colors">
                <span className="text-3xl">3️⃣</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">View Insights</h3>
              <p className="text-gray-600 mb-4">Understand your health data</p>
              <div className="text-sm text-gray-500">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Personalized dashboard</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>AI recommendations</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Progress tracking</span>
                </div>
              </div>
              <div className="mt-6 text-green-600 font-medium flex items-center gap-2 group-hover:gap-3 transition-all">
                Explore Insights
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>
        </div>

        {/* Additional Topics */}
        <div className="bg-white rounded-2xl shadow-lg p-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">More Getting Started Topics</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Family Account Setup</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Learn how to add family members and manage multiple profiles under one account.
                  </p>
                  <Link href="/docs/family-setup" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Learn more →
                  </Link>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Enable Notifications</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Set up push notifications for meal reminders, progress updates, and insights.
                  </p>
                  <Link href="/docs/notifications" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                    Learn more →
                  </Link>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Security Settings</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Enable biometric authentication, two-factor auth, and privacy controls.
                  </p>
                  <Link href="/docs/biometric-auth" className="text-sm text-green-600 hover:text-green-700 font-medium">
                    Learn more →
                  </Link>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Customize Your Settings</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Personalize your experience with custom units, preferences, and goals.
                  </p>
                  <Link href="/docs/settings" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                    Learn more →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-10 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Need Help Getting Started?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Our support team is here to help you every step of the way.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/support"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Contact Support
            </Link>
            <Link
              href="/docs/faq"
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              View FAQs
            </Link>
          </div>
        </div>

        {/* Back to Docs */}
        <div className="mt-12 text-center">
          <Link
            href="/docs"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Documentation
          </Link>
        </div>
      </div>
    </div>
  )
}
