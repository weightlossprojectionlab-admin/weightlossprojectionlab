/**
 * Press & Media Page
 * Press releases, media kit, and company information for journalists
 */

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ScreenshotGallery } from '@/components/ui/Screenshot'
import pressReleasesData from '@/data/press/releases.json'
import executivesData from '@/data/press/executives.json'

import { getCSRFToken } from '@/lib/csrf'
export default function PressPage() {
  const [showScreenshots, setShowScreenshots] = useState(false)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [newsletterMessage, setNewsletterMessage] = useState('')

  const featuredReleases = pressReleasesData.releases.filter(r => r.featured).slice(0, 3)
  const executives = executivesData.executives.sort((a, b) => a.order - b.order)

  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setNewsletterStatus('loading')
    setNewsletterMessage('')

    try {
      const response = await fetch('/api/press/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken, },
        body: JSON.stringify({ email: newsletterEmail, source: 'press-page' })
      })

      const data = await response.json()

      if (data.success) {
        setNewsletterStatus('success')
        setNewsletterMessage(data.message)
        setNewsletterEmail('')
      } else {
        setNewsletterStatus('error')
        setNewsletterMessage(data.message || 'Subscription failed')
      }
    } catch (error) {
      setNewsletterStatus('error')
      setNewsletterMessage('Network error. Please try again.')
    }
  }
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
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Press & Media</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            News, resources, and media assets for journalists and media professionals
          </p>
        </div>

        {/* Press Contact Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-16 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
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
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">Press Inquiries</h2>
                <p className="text-blue-100">
                  For media requests, interviews, and press information
                </p>
              </div>
            </div>
            <a
              href="mailto:press@weightlossproglab.com"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors whitespace-nowrap"
            >
              Contact Press Team
            </a>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-16">
          {/* Company Overview */}
          <section>
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Company Overview</h2>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">About WPL</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Weight Loss Projection Lab (WPL) is a HIPAA-compliant health tracking platform
                    that combines artificial intelligence with enterprise-grade security to help
                    individuals and families manage their wellness journey.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Founded in 2025, WPL revolutionizes health tracking by providing AI-powered
                    nutritional analysis, personalized insights, and comprehensive family health
                    management—all while maintaining the highest standards of privacy and security.
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Quick Facts</h3>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="font-medium text-gray-700">Founded</dt>
                      <dd className="text-gray-900">2025</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-700">Headquarters</dt>
                      <dd className="text-gray-900">United States (Remote-first)</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-700">Industry</dt>
                      <dd className="text-gray-900">Healthcare Technology, AI, Digital Health</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-700">Certifications</dt>
                      <dd className="text-gray-900">HIPAA, SOC 2 Type II, ISO 27001, GDPR</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-700">Website</dt>
                      <dd>
                        <a
                          href="https://weightlossproglab.com"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          weightlossproglab.com
                        </a>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-8">
                <h3 className="font-semibold text-gray-900 mb-4">Boilerplate</h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-sm text-gray-700 leading-relaxed italic">
                    Weight Loss Projection Lab is an AI-powered health tracking platform that helps
                    individuals and families achieve their wellness goals through intelligent meal
                    analysis, personalized insights, and comprehensive health management. With
                    HIPAA compliance and enterprise-grade security, WPL provides the privacy and
                    protection users need when managing sensitive health information. The platform
                    features advanced AI technology from OpenAI and Google, biometric
                    authentication, and family care management tools that make health tracking
                    effortless and effective. For more information, visit weightlossproglab.com.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Press Releases */}
          <section>
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Recent Press Releases</h2>

              <div className="space-y-8">
                {featuredReleases.map((release) => (
                  <div key={release.id} className="border-b border-gray-200 pb-8 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="text-xl font-bold text-gray-900">
                        {release.title}
                      </h3>
                      <span className="text-sm text-gray-500 whitespace-nowrap">
                        {new Date(release.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      {release.summary}
                    </p>
                    <div className="flex gap-3 flex-wrap">
                      <Link
                        href={`/press/releases/${release.slug}`}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        Read Full Release →
                      </Link>
                      <a
                        href={`/api/press/downloads?asset=release-${release.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-gray-700 font-medium text-sm"
                      >
                        Download PDF
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-gray-200 text-center">
                <Link
                  href="/press/releases"
                  className="inline-block text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All Press Releases →
                </Link>
              </div>
            </div>
          </section>

          {/* Media Kit */}
          <section>
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Media Kit & Resources</h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Logos */}
                <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 transition-colors">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <svg
                      className="w-6 h-6 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Brand Logos</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    High-resolution logos in various formats (SVG, PNG) and color variations
                  </p>
                  <a
                    href="/api/press/downloads?asset=logos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Download Logos →
                  </a>
                </div>

                {/* Screenshots */}
                <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 transition-colors">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <svg
                      className="w-6 h-6 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Product Screenshots</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Professional screenshots of key features and user interfaces (26 screenshots available)
                  </p>
                  <button
                    onClick={() => setShowScreenshots(!showScreenshots)}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    {showScreenshots ? 'Hide' : 'View'} Screenshots →
                  </button>
                </div>

                {/* Brand Guidelines */}
                <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 transition-colors">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Brand Guidelines</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Complete brand usage guidelines, color palette, and typography
                  </p>
                  <a
                    href="/api/press/downloads?asset=brand-guidelines"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Download Guidelines →
                  </a>
                </div>

                {/* Executive Photos */}
                <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 transition-colors">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                    <svg
                      className="w-6 h-6 text-orange-600"
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
                  <h3 className="font-semibold text-gray-900 mb-2">Executive Photos</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    High-resolution headshots and bios of leadership team ({executives.length} executives)
                  </p>
                  <a
                    href="/api/press/downloads?asset=executive-photos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Download Photos →
                  </a>
                </div>

                {/* Fact Sheet */}
                <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 transition-colors">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                    <svg
                      className="w-6 h-6 text-red-600"
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
                  <h3 className="font-semibold text-gray-900 mb-2">Company Fact Sheet</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Quick reference sheet with key company information and statistics
                  </p>
                  <a
                    href="/api/press/downloads?asset=fact-sheet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Download PDF →
                  </a>
                </div>

                {/* Complete Press Kit */}
                <div className="border-2 border-blue-500 bg-blue-50 rounded-lg p-6">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                    <svg
                      className="w-6 h-6 text-white"
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
                  <h3 className="font-semibold text-gray-900 mb-2">Complete Press Kit</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Download everything in one convenient package (ZIP)
                  </p>
                  <a
                    href="/api/press/downloads?asset=press-kit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm inline-block"
                  >
                    Download All Assets
                  </a>
                </div>
              </div>

              {/* Screenshot Gallery */}
              {showScreenshots && (
                <div className="mt-12 pt-12 border-t border-gray-200">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Product Screenshots</h3>
                  <p className="text-gray-600 mb-8">
                    High-resolution screenshots of key platform features. Click any image to view full size. Right-click to download.
                  </p>

                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Family & Patient Management</h4>
                  <ScreenshotGallery
                    screenshots={[
                      {
                        src: '/screenshots/family-care/admin-dashboard-full-desktop-light.png',
                        alt: 'Complete Family Admin Dashboard with stats, family member health snapshots, and management tools',
                        caption: 'Family Admin Dashboard - Complete overview'
                      },
                      {
                        src: '/screenshots/family-care/family-dashboard-overview-desktop-light.png',
                        alt: 'Family Admin Dashboard showing health snapshots for 5 family members',
                        caption: 'Family Member Health Snapshots'
                      },
                      {
                        src: '/screenshots/family-care/all-management-tools-desktop-light.png',
                        alt: 'All Management Tools grid with 14 colorful feature cards',
                        caption: 'Complete Management Tools Suite'
                      },
                      {
                        src: '/screenshots/family-care/management-tools-desktop-light.png',
                        alt: 'All Management Tools interface with 14 family health coordination features',
                        caption: 'Management Tools - Detailed view'
                      },
                      {
                        src: '/screenshots/patient-care/patient-profile-vitals-desktop-light.png',
                        alt: 'Patient profile with vitals tracking, blood pressure trends, and health history',
                        caption: 'Patient Profile - Comprehensive health tracking'
                      },
                      {
                        src: '/screenshots/family-care/family-dashboard-mobile-light.png',
                        alt: 'Mobile Family Dashboard with quick stats',
                        caption: 'Mobile Family Dashboard - Health on the go'
                      },
                      {
                        src: '/screenshots/patient-care/family-members-list-mobile-light.png',
                        alt: 'Mobile family members list with premium badge',
                        caption: 'Family Members - Mobile view'
                      },
                      {
                        src: '/screenshots/patient-care/patient-cards-mobile-light.png',
                        alt: 'Patient cards with vitals and dashboard access buttons',
                        caption: 'Patient Cards - Quick access to health data'
                      }
                    ]}
                  />

                  <h4 className="text-lg font-semibold text-gray-900 mb-4 mt-12">Profile & Settings</h4>
                  <ScreenshotGallery
                    screenshots={[
                      {
                        src: '/screenshots/settings/profile-overview-desktop-light.png',
                        alt: 'Profile page with family member selector and health profile sections',
                        caption: 'Profile Overview - Switch between family members'
                      },
                      {
                        src: '/screenshots/settings/subscription-account-desktop-light.png',
                        alt: 'Account and subscription management with Family Premium plan',
                        caption: 'Account & Subscription Management'
                      },
                      {
                        src: '/screenshots/settings/biometric-auth-desktop-light.png',
                        alt: 'Biometric authentication setup with Face ID and Touch ID',
                        caption: 'Biometric Authentication - Secure login'
                      },
                      {
                        src: '/screenshots/settings/notification-preferences-desktop-light.png',
                        alt: 'Notification preferences with email and push toggles',
                        caption: 'Notification Preferences'
                      },
                      {
                        src: '/screenshots/settings/privacy-data-export-desktop-light.png',
                        alt: 'Privacy and data export controls',
                        caption: 'Privacy & Data Management'
                      }
                    ]}
                  />

                  <h4 className="text-lg font-semibold text-gray-900 mb-4 mt-12">Health Tracking & Appointments</h4>
                  <ScreenshotGallery
                    screenshots={[
                      {
                        src: '/screenshots/inventory/kitchen-inventory-grandma-desktop-light.png',
                        alt: 'Kitchen Inventory with expiration tracking, category filters, and food waste reduction',
                        caption: 'Kitchen Inventory - Reduce food waste with smart tracking'
                      },
                      {
                        src: '/screenshots/medications/medication-management-grid-desktop-light.png',
                        alt: 'Medication Management grid with photo labels, dosage schedules, and pharmacy details',
                        caption: 'Medication Management - Track prescriptions and supplements'
                      },
                      {
                        src: '/screenshots/vitals-tracking/vitals-reminder-popup-desktop-light.png',
                        alt: 'Smart vitals reminder popup showing due health checks with log buttons and wizard option',
                        caption: 'Vitals Reminder Popup - Never miss a health check'
                      },
                      {
                        src: '/screenshots/vitals-tracking/vital-reminders-desktop-light.png',
                        alt: 'Vital sign reminder configuration for blood pressure, blood sugar, and temperature',
                        caption: 'Vital Sign Reminders Configuration'
                      },
                      {
                        src: '/screenshots/vitals-tracking/vitals-reminders-config-desktop-light.png',
                        alt: 'Complete vitals reminder options including pulse oximeter, weight, and mood',
                        caption: 'Advanced Vitals Configuration'
                      },
                      {
                        src: '/screenshots/appointments/family-calendar-desktop-light.png',
                        alt: 'Family Calendar for December 2025 with multiple appointments across different days',
                        caption: 'Family Appointment Calendar'
                      },
                      {
                        src: '/screenshots/appointments/upcoming-appointments-desktop-light.png',
                        alt: 'Upcoming appointments with doctor names, patient info, dates, and driver assignment',
                        caption: 'Upcoming Appointments List'
                      }
                    ]}
                  />
                  <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500 mb-4">
                      All screenshots are available for media use with attribution to Weight Loss Projection Lab
                    </p>
                    <button
                      onClick={() => setShowScreenshots(false)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Hide Screenshots
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* In the News */}
          <section>
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">WPL in the News</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 transition-colors">
                  <div className="text-sm text-gray-500 mb-2">TechCrunch • Dec 2025</div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    "AI-Powered Health Tracking Meets Enterprise Security"
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Weight Loss Projection Lab is redefining how families manage health data with
                    HIPAA-compliant AI technology...
                  </p>
                  <a href="#" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                    Read Article →
                  </a>
                </div>

                <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 transition-colors">
                  <div className="text-sm text-gray-500 mb-2">VentureBeat • Dec 2025</div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    "The Future of Family Health Management"
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    How one startup is using AI to make health tracking effortless for entire
                    households...
                  </p>
                  <a href="#" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                    Read Article →
                  </a>
                </div>

                <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 transition-colors">
                  <div className="text-sm text-gray-500 mb-2">Healthcare IT News • Dec 2025</div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    "HIPAA Compliance Done Right in Digital Health"
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    WPL sets new standards for privacy and security in consumer health
                    applications...
                  </p>
                  <a href="#" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                    Read Article →
                  </a>
                </div>

                <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 transition-colors">
                  <div className="text-sm text-gray-500 mb-2">The Verge • Dec 2025</div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    "AI That Actually Helps You Eat Better"
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Weight Loss Projection Lab's meal analysis AI provides surprisingly accurate
                    nutritional insights...
                  </p>
                  <a href="#" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                    Read Article →
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Awards & Recognition */}
          <section>
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                Awards & Recognition
              </h2>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">🏆</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Best Health Tech Startup</h3>
                  <p className="text-sm text-gray-600">Health Innovation Awards 2025</p>
                </div>

                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">🔒</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Security Excellence</h3>
                  <p className="text-sm text-gray-600">Cybersecurity Awards 2025</p>
                </div>

                <div className="text-center">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">🤖</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">AI Innovation Award</h3>
                  <p className="text-sm text-gray-600">Tech Innovation Summit 2025</p>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-10 text-white">
              <h2 className="text-3xl font-bold mb-6 text-center">Media Contact Information</h2>

              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
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
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold mb-2">Press Inquiries</h3>
                  <a
                    href="mailto:press@weightlossproglab.com"
                    className="text-blue-100 hover:text-white underline"
                  >
                    press@weightlossproglab.com
                  </a>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
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
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold mb-2">Partnership Inquiries</h3>
                  <a
                    href="mailto:partners@weightlossproglab.com"
                    className="text-blue-100 hover:text-white underline"
                  >
                    partners@weightlossproglab.com
                  </a>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/20 text-center">
                <p className="text-blue-100">
                  We typically respond to media inquiries within 24 hours during business days.
                  For urgent requests, please indicate "URGENT" in your subject line.
                </p>
              </div>
            </div>
          </section>

          {/* Newsletter Signup */}
          <section>
            <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Subscribe to Press Updates
              </h2>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                Get the latest news, press releases, and company updates delivered directly to
                your inbox.
              </p>

              <form className="max-w-md mx-auto" onSubmit={handleNewsletterSubmit}>
                <div className="flex gap-3">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    required
                    disabled={newsletterStatus === 'loading'}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={newsletterStatus === 'loading'}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {newsletterStatus === 'loading' ? 'Subscribing...' : 'Subscribe'}
                  </button>
                </div>
                {newsletterMessage && (
                  <p className={`text-sm mt-3 ${newsletterStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {newsletterMessage}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-3">
                  We respect your privacy. Unsubscribe at any time.
                </p>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
