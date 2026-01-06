/**
 * Documentation Center Page
 * Comprehensive documentation hub for WLPL users, developers, and partners
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Documentation | Wellness Projection Lab',
  description:
    'Comprehensive documentation for Wellness Projection Lab - user guides, API reference, tutorials, and developer resources.',
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 mb-6 justify-center"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Documentation Center</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to get the most out of Wellness Projection Lab
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="relative">
            <input
              type="text"
              placeholder="Search documentation..."
              className="w-full px-6 py-4 pr-12 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
            />
            <svg
              className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-500 mt-3 text-center">
            Try searching for "meal tracking", "API authentication", or "family management"
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-16">
          {/* Quick Start */}
          <section>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-10 text-white mb-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Quick Start Guide</h2>
                  <p className="text-blue-100">Get up and running in 5 minutes</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <Link
                  href="/docs/getting-started/signup"
                  className="bg-white/20 hover:bg-white/30 rounded-lg p-6 transition-colors backdrop-blur-sm"
                >
                  <div className="text-2xl mb-3">1️⃣</div>
                  <h3 className="font-semibold mb-2 text-white">Create Account</h3>
                  <p className="text-sm text-white/90">Sign up and set up your profile</p>
                </Link>

                <Link
                  href="/docs/getting-started/first-log"
                  className="bg-white/20 hover:bg-white/30 rounded-lg p-6 transition-colors backdrop-blur-sm"
                >
                  <div className="text-2xl mb-3">2️⃣</div>
                  <h3 className="font-semibold mb-2 text-white">Log Your First Meal</h3>
                  <p className="text-sm text-white/90">Track meals with AI analysis</p>
                </Link>

                <Link
                  href="/docs/getting-started/insights"
                  className="bg-white/20 hover:bg-white/30 rounded-lg p-6 transition-colors backdrop-blur-sm"
                >
                  <div className="text-2xl mb-3">3️⃣</div>
                  <h3 className="font-semibold mb-2 text-white">View Insights</h3>
                  <p className="text-sm text-white/90">Understand your health data</p>
                </Link>
              </div>
            </div>
          </section>

          {/* Documentation Categories */}
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Browse Documentation</h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Getting Started */}
              <Link
                href="/docs/getting-started"
                className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow group"
              >
                <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-5 group-hover:bg-blue-200 transition-colors">
                  <svg
                    className="w-7 h-7 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Getting Started</h3>
                <p className="text-gray-600 mb-4">
                  New to WPL? Start here to learn the basics and set up your account.
                </p>
                <div className="text-sm text-gray-500">
                  <div className="flex items-center gap-2 mb-1">
                    <span>• Account Setup</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span>• First Steps</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>• Quick Tips</span>
                  </div>
                </div>
              </Link>

              {/* User Guides */}
              <Link
                href="/docs/user-guides"
                className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow group"
              >
                <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center mb-5 group-hover:bg-purple-200 transition-colors">
                  <svg
                    className="w-7 h-7 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">User Guides</h3>
                <p className="text-gray-600 mb-4">
                  Comprehensive guides for all features and functionality.
                </p>
                <div className="text-sm text-gray-500">
                  <div className="flex items-center gap-2 mb-1">
                    <span>• Meal Tracking</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span>• Weight Logs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>• Family Management</span>
                  </div>
                </div>
              </Link>

              {/* API Reference */}
              <Link
                href="/docs/api"
                className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow group"
              >
                <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-5 group-hover:bg-green-200 transition-colors">
                  <svg
                    className="w-7 h-7 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">API Reference</h3>
                <p className="text-gray-600 mb-4">
                  Complete API documentation for developers and integrations.
                </p>
                <div className="text-sm text-gray-500">
                  <div className="flex items-center gap-2 mb-1">
                    <span>• Authentication</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span>• Endpoints</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>• Webhooks</span>
                  </div>
                </div>
              </Link>

              {/* Tutorials */}
              <Link
                href="/docs/tutorials"
                className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow group"
              >
                <div className="w-14 h-14 bg-orange-100 rounded-lg flex items-center justify-center mb-5 group-hover:bg-orange-200 transition-colors">
                  <svg
                    className="w-7 h-7 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Tutorials</h3>
                <p className="text-gray-600 mb-4">
                  Step-by-step tutorials and video guides for common tasks.
                </p>
                <div className="text-sm text-gray-500">
                  <div className="flex items-center gap-2 mb-1">
                    <span>• Video Guides</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span>• Walkthroughs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>• Best Practices</span>
                  </div>
                </div>
              </Link>

              {/* Security & Privacy */}
              <Link
                href="/docs/security"
                className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow group"
              >
                <div className="w-14 h-14 bg-red-100 rounded-lg flex items-center justify-center mb-5 group-hover:bg-red-200 transition-colors">
                  <svg
                    className="w-7 h-7 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Security & Privacy</h3>
                <p className="text-gray-600 mb-4">
                  Learn about our security practices and privacy controls.
                </p>
                <div className="text-sm text-gray-500">
                  <div className="flex items-center gap-2 mb-1">
                    <span>• HIPAA Compliance</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span>• Data Protection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>• Privacy Settings</span>
                  </div>
                </div>
              </Link>

              {/* FAQs */}
              <Link
                href="/docs/faq"
                className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow group"
              >
                <div className="w-14 h-14 bg-indigo-100 rounded-lg flex items-center justify-center mb-5 group-hover:bg-indigo-200 transition-colors">
                  <svg
                    className="w-7 h-7 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">FAQs</h3>
                <p className="text-gray-600 mb-4">
                  Frequently asked questions and troubleshooting guides.
                </p>
                <div className="text-sm text-gray-500">
                  <div className="flex items-center gap-2 mb-1">
                    <span>• Common Questions</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span>• Troubleshooting</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>• Known Issues</span>
                  </div>
                </div>
              </Link>
            </div>
          </section>

          {/* Popular Articles */}
          <section>
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Popular Articles</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <Link
                  href="/docs/meal-tracking-guide"
                  className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
                        How to Track Meals with AI
                      </h3>
                      <p className="text-sm text-gray-600">
                        Learn how to use our AI-powered meal tracking feature for accurate
                        nutritional analysis.
                      </p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/docs/family-setup"
                  className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-purple-600">
                        Setting Up Family Accounts
                      </h3>
                      <p className="text-sm text-gray-600">
                        Complete guide to managing multiple family members under one account.
                      </p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/docs/biometric-auth"
                  className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-green-600">
                        Enabling Biometric Authentication
                      </h3>
                      <p className="text-sm text-gray-600">
                        Set up Face ID or fingerprint authentication for quick, secure access.
                      </p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/docs/export-data"
                  className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-orange-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-orange-600">
                        Exporting Your Health Data
                      </h3>
                      <p className="text-sm text-gray-600">
                        Download your complete health data in various formats for portability.
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </section>


          {/* Video Tutorials */}
          <section>
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Video Tutorials</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-500 h-40 flex items-center justify-center">
                    <div className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Getting Started with WPL
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      A complete walkthrough for new users
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>12:34</span>
                      <span>Beginner</span>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="bg-gradient-to-br from-green-500 to-teal-500 h-40 flex items-center justify-center">
                    <div className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Advanced Meal Tracking
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Tips and tricks for accurate tracking
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>8:45</span>
                      <span>Intermediate</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* Support Section */}
          <section>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-10 text-white text-center">
              <h2 className="text-3xl font-bold mb-4">Need More Help?</h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  href="/support"
                  className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                >
                  Contact Support
                </Link>
                <Link
                  href="/contact"
                  className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition-colors"
                >
                  General Inquiries
                </Link>
              </div>

              <div className="mt-8 grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="text-center">
                  <div className="text-2xl mb-2">📧</div>
                  <div className="text-sm text-blue-100">Email Support</div>
                  <div className="font-semibold">support@wlpl.com</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-2">💬</div>
                  <div className="text-sm text-blue-100">Live Chat</div>
                  <div className="font-semibold">Available 9-6 EST</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-2">📚</div>
                  <div className="text-sm text-blue-100">Community Forum</div>
                  <div className="font-semibold">Join Discussion</div>
                </div>
              </div>
            </div>
          </section>

          {/* Related Links */}
          <section>
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                Additional Resources
              </h2>

              <div className="grid md:grid-cols-4 gap-6">
                <Link
                  href="/blog"
                  className="text-center p-6 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <div className="text-3xl mb-3">📝</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Blog</h3>
                  <p className="text-sm text-gray-600">Tips, news, and updates</p>
                </Link>

                <Link
                  href="/api-docs"
                  className="text-center p-6 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <div className="text-3xl mb-3">🔌</div>
                  <h3 className="font-semibold text-gray-900 mb-2">API Docs</h3>
                  <p className="text-sm text-gray-600">Complete API reference</p>
                </Link>

                <Link
                  href="/changelog"
                  className="text-center p-6 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <div className="text-3xl mb-3">📋</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Changelog</h3>
                  <p className="text-sm text-gray-600">Latest updates</p>
                </Link>

                <Link
                  href="/status"
                  className="text-center p-6 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <div className="text-3xl mb-3">🟢</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Status</h3>
                  <p className="text-sm text-gray-600">System status</p>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
