/**
 * Support & Help Center Page
 * Comprehensive support resources for WLPL users
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Support & Help Center | Weight Loss Projection Lab',
  description:
    'Get help with Weight Loss Projection Lab - FAQs, guides, troubleshooting, and contact support for meal tracking, family management, and health features.',
}

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
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
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Help Center</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Find answers, get help, and learn how to make the most of WLPL
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for help..."
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
        </div>

        {/* Quick Help Categories */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Popular Topics
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link
              href="#meal-tracking"
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-center group"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                  />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Meal Tracking</h3>
              <p className="text-sm text-gray-600">
                Learn how to log meals and use AI analysis
              </p>
            </Link>

            <Link
              href="#family-management"
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-center group"
            >
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                <svg
                  className="w-8 h-8 text-purple-600"
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
              <h3 className="font-bold text-gray-900 mb-2">Family & Patients</h3>
              <p className="text-sm text-gray-600">
                Manage family members and patient care
              </p>
            </Link>

            <Link
              href="#account"
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-center group"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Account & Billing</h3>
              <p className="text-sm text-gray-600">
                Subscriptions, settings, and preferences
              </p>
            </Link>

            <Link
              href="#troubleshooting"
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-center group"
            >
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-200 transition-colors">
                <svg
                  className="w-8 h-8 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Troubleshooting</h3>
              <p className="text-sm text-gray-600">
                Fix common issues and errors
              </p>
            </Link>
          </div>
        </section>

        {/* Main Content */}
        <div className="space-y-16">
          {/* Meal Tracking FAQs */}
          <section id="meal-tracking">
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                Meal Tracking & AI Analysis
              </h2>

              <div className="space-y-6">
                <details className="border-b border-gray-200 pb-6">
                  <summary className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 flex items-center justify-between">
                    <span>How do I log a meal?</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-4 text-gray-700 space-y-3">
                    <p>There are several ways to log a meal in WLPL:</p>
                    <ol className="list-decimal list-inside space-y-2 ml-4">
                      <li><strong>Take a photo:</strong> Navigate to your dashboard and click "Log Meal". Take or upload a photo of your meal for AI analysis.</li>
                      <li><strong>Manual entry:</strong> Click "Add Manually" to enter meal details without a photo.</li>
                      <li><strong>From patient dashboard:</strong> When managing patients, select the patient first, then log their meal.</li>
                    </ol>
                    <p className="text-sm text-gray-600">The AI will automatically analyze your meal photo and provide nutritional estimates.</p>
                  </div>
                </details>

                <details className="border-b border-gray-200 pb-6">
                  <summary className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 flex items-center justify-between">
                    <span>How accurate is the AI meal analysis?</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-4 text-gray-700">
                    <p className="mb-3">Our AI uses advanced vision models (GPT-4 Vision and Google Gemini) to analyze meals. Accuracy typically ranges from 80-95% depending on:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Photo quality and lighting</li>
                      <li>Visibility of all food items</li>
                      <li>Complexity of the meal</li>
                      <li>Portion sizes being clearly visible</li>
                    </ul>
                    <p className="mt-3 text-sm bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                      <strong>Tip:</strong> For best results, take photos from directly above the meal with good lighting and include a reference object (like a fork) for scale.
                    </p>
                  </div>
                </details>

                <details className="border-b border-gray-200 pb-6">
                  <summary className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 flex items-center justify-between">
                    <span>Can I edit or delete meal logs?</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-4 text-gray-700">
                    <p className="mb-3">Yes! You can edit or delete any meal log:</p>
                    <ol className="list-decimal list-inside space-y-2 ml-4">
                      <li>Go to your Dashboard and find the meal in your history</li>
                      <li>Click on the meal card to open details</li>
                      <li>Click the "Edit" or "Delete" button</li>
                      <li>Make your changes and save</li>
                    </ol>
                  </div>
                </details>

                <details className="border-b border-gray-200 pb-6">
                  <summary className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 flex items-center justify-between">
                    <span>What meal types are supported?</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-4 text-gray-700">
                    <p>WLPL supports the following meal types:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                      <li>Breakfast</li>
                      <li>Lunch</li>
                      <li>Dinner</li>
                      <li>Snack</li>
                    </ul>
                    <p className="mt-3">You can categorize each meal log to track eating patterns throughout the day.</p>
                  </div>
                </details>
              </div>
            </div>
          </section>

          {/* Family Management FAQs */}
          <section id="family-management">
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                Family & Patient Management
              </h2>

              <div className="space-y-6">
                <details className="border-b border-gray-200 pb-6">
                  <summary className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 flex items-center justify-between">
                    <span>How do I add family members?</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-4 text-gray-700 space-y-3">
                    <p>To add family members to your account:</p>
                    <ol className="list-decimal list-inside space-y-2 ml-4">
                      <li>Navigate to <strong>Family Dashboard</strong></li>
                      <li>Click <strong>"Add Family Member"</strong> or <strong>"Invite Member"</strong></li>
                      <li>Enter their name, email, and relationship</li>
                      <li>Set their role (Owner, Admin, Member, or Viewer)</li>
                      <li>Send the invitation</li>
                    </ol>
                    <p className="text-sm bg-purple-50 border-l-4 border-purple-500 p-3 rounded">
                      <strong>Note:</strong> You need a Family Plan subscription to add multiple family members.
                    </p>
                  </div>
                </details>

                <details className="border-b border-gray-200 pb-6">
                  <summary className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 flex items-center justify-between">
                    <span>What's the difference between patients and family members?</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-4 text-gray-700">
                    <ul className="space-y-3">
                      <li><strong>Patients:</strong> Individuals whose health you're tracking. They can be family members, care recipients, or yourself. Each patient has their own health records, meal logs, weight logs, medications, and vitals.</li>
                      <li><strong>Family Members:</strong> Users who have access to your household. They can view and manage patient records based on their assigned role and permissions.</li>
                    </ul>
                    <p className="mt-3 text-sm text-gray-600">Example: You might create a patient profile for your elderly parent and invite your sibling as a family member to help manage their care.</p>
                  </div>
                </details>

                <details className="border-b border-gray-200 pb-6">
                  <summary className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 flex items-center justify-between">
                    <span>What are family roles and permissions?</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-4 text-gray-700">
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="font-semibold text-gray-900 mb-1">Owner</div>
                        <div className="text-sm">Full control: billing, family management, all patient records</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="font-semibold text-gray-900 mb-1">Admin</div>
                        <div className="text-sm">Manage patients and family members, view all records</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="font-semibold text-gray-900 mb-1">Member</div>
                        <div className="text-sm">Add/edit patient records, no family management</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="font-semibold text-gray-900 mb-1">Viewer</div>
                        <div className="text-sm">Read-only access to patient information</div>
                      </div>
                    </div>
                  </div>
                </details>

                <details className="border-b border-gray-200 pb-6">
                  <summary className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 flex items-center justify-between">
                    <span>How do household duties work?</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-4 text-gray-700">
                    <p className="mb-3">Household duties help families coordinate caregiving tasks:</p>
                    <ol className="list-decimal list-inside space-y-2 ml-4">
                      <li>Navigate to <strong>Household Duties</strong> from your dashboard</li>
                      <li>Create duties like laundry, shopping, medication pickup, etc.</li>
                      <li>Assign duties to family members or caregivers</li>
                      <li>Set schedules and recurring tasks</li>
                      <li>Track completion and get notifications</li>
                    </ol>
                    <p className="mt-3 text-sm text-gray-600">This feature is available on Family Plan subscriptions.</p>
                  </div>
                </details>
              </div>
            </div>
          </section>

          {/* Account & Billing FAQs */}
          <section id="account">
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                Account & Billing
              </h2>

              <div className="space-y-6">
                <details className="border-b border-gray-200 pb-6">
                  <summary className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 flex items-center justify-between">
                    <span>How do I upgrade my subscription?</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-4 text-gray-700">
                    <ol className="list-decimal list-inside space-y-2 ml-4">
                      <li>Go to <strong>Settings → Subscription</strong></li>
                      <li>Click <strong>"Upgrade Plan"</strong></li>
                      <li>Choose between Single Plan or Family Plan</li>
                      <li>Enter payment information</li>
                      <li>Confirm the upgrade</li>
                    </ol>
                    <p className="mt-3 text-sm text-gray-600">Upgrades take effect immediately, and you'll be charged a prorated amount for the current billing period.</p>
                  </div>
                </details>

                <details className="border-b border-gray-200 pb-6">
                  <summary className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 flex items-center justify-between">
                    <span>How do I cancel my subscription?</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-4 text-gray-700">
                    <ol className="list-decimal list-inside space-y-2 ml-4">
                      <li>Navigate to <strong>Settings → Subscription</strong></li>
                      <li>Click <strong>"Cancel Subscription"</strong></li>
                      <li>Confirm the cancellation</li>
                    </ol>
                    <p className="mt-3">Your subscription will remain active until the end of your current billing period. You can reactivate anytime before it expires.</p>
                  </div>
                </details>

                <details className="border-b border-gray-200 pb-6">
                  <summary className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 flex items-center justify-between">
                    <span>How do I enable biometric authentication?</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-4 text-gray-700">
                    <p className="mb-3">Enable Face ID or Touch ID for quick, secure access:</p>
                    <ol className="list-decimal list-inside space-y-2 ml-4">
                      <li>Go to <strong>Settings → Security</strong></li>
                      <li>Toggle <strong>"Enable Biometric Authentication"</strong></li>
                      <li>Follow the prompts to register your biometric data</li>
                    </ol>
                    <p className="mt-3 text-sm bg-green-50 border-l-4 border-green-500 p-3 rounded">
                      <strong>Security:</strong> Your biometric data is stored locally on your device and never uploaded to our servers.
                    </p>
                  </div>
                </details>

                <details className="border-b border-gray-200 pb-6">
                  <summary className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 flex items-center justify-between">
                    <span>How do I export my data?</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-4 text-gray-700">
                    <ol className="list-decimal list-inside space-y-2 ml-4">
                      <li>Navigate to <strong>Settings → Privacy & Data</strong></li>
                      <li>Click <strong>"Export My Data"</strong></li>
                      <li>Choose export format (JSON or CSV)</li>
                      <li>Click <strong>"Download"</strong></li>
                    </ol>
                    <p className="mt-3 text-sm text-gray-600">You'll receive a complete export of all your health data, meal logs, weight logs, and account information.</p>
                  </div>
                </details>
              </div>
            </div>
          </section>

          {/* Troubleshooting */}
          <section id="troubleshooting">
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                Troubleshooting & Common Issues
              </h2>

              <div className="space-y-6">
                <details className="border-b border-gray-200 pb-6">
                  <summary className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 flex items-center justify-between">
                    <span>AI analysis is taking too long or failing</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-4 text-gray-700">
                    <p className="mb-3">If AI meal analysis is slow or failing, try these solutions:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Check your internet connection</li>
                      <li>Ensure the photo is under 10MB in size</li>
                      <li>Try uploading a different image format (JPG, PNG, WEBP)</li>
                      <li>Reduce image resolution if it's very large</li>
                      <li>Refresh the page and try again</li>
                    </ul>
                    <p className="mt-3 text-sm text-gray-600">If the issue persists, contact support with your meal log ID.</p>
                  </div>
                </details>

                <details className="border-b border-gray-200 pb-6">
                  <summary className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 flex items-center justify-between">
                    <span>I can't see my family members' data</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-4 text-gray-700">
                    <p className="mb-3">Check these common causes:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Verify you have a Family Plan subscription</li>
                      <li>Confirm your role has permission to view patient data (Member or Admin)</li>
                      <li>Ensure the family member has accepted their invitation</li>
                      <li>Check that you're viewing the correct patient from the patient selector</li>
                    </ul>
                    <p className="mt-3">If you're a Viewer role, you can only see data but cannot add or edit it.</p>
                  </div>
                </details>

                <details className="border-b border-gray-200 pb-6">
                  <summary className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 flex items-center justify-between">
                    <span>My weight chart isn't showing data</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-4 text-gray-700">
                    <p className="mb-3">Possible solutions:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Ensure you've logged at least 2 weight entries (charts need multiple data points)</li>
                      <li>Check that you're viewing the correct date range</li>
                      <li>Verify you're looking at the correct patient profile</li>
                      <li>Try refreshing the page</li>
                      <li>Clear your browser cache</li>
                    </ul>
                  </div>
                </details>

                <details className="border-b border-gray-200 pb-6">
                  <summary className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 flex items-center justify-between">
                    <span>I forgot my password</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-4 text-gray-700">
                    <ol className="list-decimal list-inside space-y-2 ml-4">
                      <li>Go to the login page</li>
                      <li>Click <strong>"Forgot Password?"</strong></li>
                      <li>Enter your email address</li>
                      <li>Check your email for a password reset link</li>
                      <li>Click the link and create a new password</li>
                    </ol>
                    <p className="mt-3 text-sm text-gray-600">The reset link expires in 1 hour. If you don't receive the email, check your spam folder.</p>
                  </div>
                </details>
              </div>
            </div>
          </section>

          {/* Contact Support */}
          <section>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white text-center">
              <h2 className="text-3xl font-bold mb-4">Still Need Help?</h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Can't find the answer you're looking for? Our support team is here to help.
              </p>

              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
                <div className="bg-white/10 backdrop-blur rounded-lg p-6">
                  <div className="text-3xl mb-3">📧</div>
                  <div className="font-semibold mb-2">Email Support</div>
                  <a href="mailto:support@weightlossproglab.com" className="text-blue-100 hover:text-white text-sm">
                    support@wlpl.com
                  </a>
                  <div className="text-xs text-blue-200 mt-2">Response in 24 hours</div>
                </div>

                <div className="bg-white/10 backdrop-blur rounded-lg p-6">
                  <div className="text-3xl mb-3">📚</div>
                  <div className="font-semibold mb-2">Documentation</div>
                  <Link href="/docs" className="text-blue-100 hover:text-white text-sm">
                    Browse Docs
                  </Link>
                  <div className="text-xs text-blue-200 mt-2">Complete guides</div>
                </div>

                <div className="bg-white/10 backdrop-blur rounded-lg p-6">
                  <div className="text-3xl mb-3">💬</div>
                  <div className="font-semibold mb-2">General Contact</div>
                  <Link href="/contact" className="text-blue-100 hover:text-white text-sm">
                    Contact Form
                  </Link>
                  <div className="text-xs text-blue-200 mt-2">All inquiries</div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/20">
                <div className="text-sm text-blue-100">Support Hours</div>
                <div className="font-semibold">Monday - Friday: 9 AM - 6 PM EST</div>
                <div className="font-semibold">Saturday: 10 AM - 4 PM EST</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
