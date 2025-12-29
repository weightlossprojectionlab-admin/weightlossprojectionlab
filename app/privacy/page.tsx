/**
 * Privacy Policy Page
 * HIPAA-compliant privacy policy for Weight Loss Projection Lab
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | Weight Loss Projection Lab',
  description:
    'Weight Loss Projection Lab Privacy Policy - Learn how we collect, use, and protect your health information in compliance with HIPAA and GDPR.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 mb-6"
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-xl text-gray-600">
            How we collect, use, and protect your personal health information
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Last updated: December 27, 2025 | Effective: January 1, 2025
          </p>
        </div>

        {/* Trust Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">
                Your Privacy is Our Priority
              </h2>
              <p className="text-gray-700 text-sm leading-relaxed">
                Weight Loss Projection Lab (WLPL) is HIPAA compliant and committed to protecting
                your personal health information. We never sell your data and only use it to
                provide you with the best health tracking experience.
              </p>
              <div className="flex gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1 text-green-700">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  HIPAA Compliant
                </span>
                <span className="flex items-center gap-1 text-green-700">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  GDPR Compliant
                </span>
                <span className="flex items-center gap-1 text-green-700">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  SOC 2 Certified
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          {/* Table of Contents */}
          <section className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Table of Contents</h2>
            <ol className="space-y-2 text-sm">
              <li>
                <a href="#information-we-collect" className="text-blue-600 hover:text-blue-700">
                  1. Information We Collect
                </a>
              </li>
              <li>
                <a href="#how-we-use" className="text-blue-600 hover:text-blue-700">
                  2. How We Use Your Information
                </a>
              </li>
              <li>
                <a href="#data-sharing" className="text-blue-600 hover:text-blue-700">
                  3. Data Sharing and Disclosure
                </a>
              </li>
              <li>
                <a href="#data-security" className="text-blue-600 hover:text-blue-700">
                  4. Data Security
                </a>
              </li>
              <li>
                <a href="#your-rights" className="text-blue-600 hover:text-blue-700">
                  5. Your Privacy Rights
                </a>
              </li>
              <li>
                <a href="#data-retention" className="text-blue-600 hover:text-blue-700">
                  6. Data Retention
                </a>
              </li>
              <li>
                <a href="#cookies" className="text-blue-600 hover:text-blue-700">
                  7. Cookies and Tracking
                </a>
              </li>
              <li>
                <a href="#children" className="text-blue-600 hover:text-blue-700">
                  8. Children's Privacy
                </a>
              </li>
              <li>
                <a href="#international" className="text-blue-600 hover:text-blue-700">
                  9. International Data Transfers
                </a>
              </li>
              <li>
                <a href="#changes" className="text-blue-600 hover:text-blue-700">
                  10. Changes to This Policy
                </a>
              </li>
              <li>
                <a href="#contact" className="text-blue-600 hover:text-blue-700">
                  11. Contact Us
                </a>
              </li>
            </ol>
          </section>

          {/* 1. Information We Collect */}
          <section id="information-we-collect">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              1. Information We Collect
            </h2>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">
              1.1 Personal Information
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Name, email address, phone number</li>
              <li>Date of birth, gender</li>
              <li>Profile photo (optional)</li>
              <li>Account credentials (encrypted)</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">
              1.2 Health Information (Protected Health Information - PHI)
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Weight measurements and tracking data</li>
              <li>Meal logs and nutritional information</li>
              <li>Photos of meals (if provided)</li>
              <li>Exercise and activity data</li>
              <li>Health goals and preferences</li>
              <li>Medical conditions (if voluntarily provided)</li>
              <li>Medication information (if using medication tracking features)</li>
              <li>Vital signs (blood pressure, heart rate, etc.)</li>
              <li>Provider and appointment information</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">
              1.3 Biometric Information
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Facial recognition data for authentication (encrypted, never shared)</li>
              <li>Biometric templates stored locally on your device when possible</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">
              1.4 Usage Information
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Device information (type, OS, browser)</li>
              <li>IP address and location data (city/region level)</li>
              <li>App usage patterns and feature interactions</li>
              <li>Log data and error reports</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">
              1.5 AI-Generated Content
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>AI analysis results and health insights</li>
              <li>Nutritional assessments from meal photos</li>
              <li>Personalized recommendations</li>
            </ul>
          </section>

          {/* 2. How We Use Your Information */}
          <section id="how-we-use">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              2. How We Use Your Information
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use your information for the following purposes:
            </p>

            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  2.1 Service Delivery
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Provide weight tracking and health monitoring</li>
                  <li>Generate AI-powered insights and recommendations</li>
                  <li>Process meal photos and provide nutritional analysis</li>
                  <li>Enable family and household care management</li>
                  <li>Facilitate appointments and medication tracking</li>
                </ul>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  2.2 Account Management
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Create and maintain your account</li>
                  <li>Authenticate your identity (including biometric authentication)</li>
                  <li>Process payments and manage subscriptions</li>
                  <li>Send service-related notifications</li>
                </ul>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  2.3 Improvement and Analytics
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Improve our services and develop new features</li>
                  <li>Analyze usage patterns (aggregated, de-identified data)</li>
                  <li>Train and improve AI models (with your consent)</li>
                  <li>Conduct research (only with explicit consent)</li>
                </ul>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  2.4 Communication
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Send important service updates and security alerts</li>
                  <li>Respond to your support requests</li>
                  <li>Send marketing communications (opt-in only)</li>
                </ul>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  2.5 Legal and Safety
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Comply with legal obligations</li>
                  <li>Prevent fraud and ensure platform security</li>
                  <li>Protect rights and safety of users</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. Data Sharing */}
          <section id="data-sharing">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              3. Data Sharing and Disclosure
            </h2>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                🔒 We NEVER sell your personal health information
              </p>
              <p className="text-sm text-gray-700">
                Your health data is yours. We only share it in the limited circumstances
                described below.
              </p>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              3.1 When We Share Your Information
            </h3>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  With Your Consent
                </h4>
                <p className="text-gray-700 text-sm">
                  We share your information when you explicitly authorize us to do so (e.g.,
                  sharing with family members, healthcare providers).
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Service Providers</h4>
                <p className="text-gray-700 text-sm mb-2">
                  We work with trusted third-party service providers who help us operate our
                  platform:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-4">
                  <li>Cloud hosting (Google Cloud Platform, Firebase)</li>
                  <li>AI services (OpenAI, Google Gemini) - with strict data agreements</li>
                  <li>Payment processing (Stripe) - PCI DSS compliant</li>
                  <li>Analytics (privacy-focused, aggregated data only)</li>
                  <li>Customer support tools</li>
                </ul>
                <p className="text-gray-700 text-sm mt-2 italic">
                  All service providers sign Business Associate Agreements (BAAs) as required
                  by HIPAA.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Legal Requirements</h4>
                <p className="text-gray-700 text-sm">
                  We may disclose information when required by law, court order, or to protect
                  rights and safety.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Business Transfers</h4>
                <p className="text-gray-700 text-sm">
                  In the event of a merger, acquisition, or sale, your information may be
                  transferred. We will notify you and ensure continued protection.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Aggregated/De-identified Data
                </h4>
                <p className="text-gray-700 text-sm">
                  We may share aggregated, de-identified data that cannot be linked back to you
                  for research and analytics.
                </p>
              </div>
            </div>
          </section>

          {/* 4. Data Security */}
          <section id="data-security">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Security</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We implement industry-leading security measures to protect your information:
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-blue-600">🔐</span>
                  Encryption
                </h3>
                <p className="text-sm text-gray-600">
                  AES-256 encryption at rest, TLS 1.3 in transit. All PHI is encrypted.
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-blue-600">🔑</span>
                  Access Controls
                </h3>
                <p className="text-sm text-gray-600">
                  Role-based access, multi-factor authentication, principle of least privilege.
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-blue-600">🛡️</span>
                  Security Monitoring
                </h3>
                <p className="text-sm text-gray-600">
                  24/7 monitoring, intrusion detection, regular security audits and penetration
                  testing.
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-blue-600">🔄</span>
                  Backups
                </h3>
                <p className="text-sm text-gray-600">
                  Automated encrypted backups, disaster recovery plans, 99.9% uptime SLA.
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-blue-600">👥</span>
                  Staff Training
                </h3>
                <p className="text-sm text-gray-600">
                  All employees receive HIPAA and security training. Background checks
                  required.
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-blue-600">🔍</span>
                  Audit Logs
                </h3>
                <p className="text-sm text-gray-600">
                  Comprehensive audit trails for all PHI access and modifications.
                </p>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mt-6">
              <p className="text-sm text-gray-700">
                <strong>Certifications:</strong> SOC 2 Type II, ISO 27001, HIPAA compliant
                infrastructure
              </p>
            </div>
          </section>

          {/* 5. Your Privacy Rights */}
          <section id="your-rights">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              5. Your Privacy Rights
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You have the following rights regarding your personal information:
            </p>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Right to Access</h3>
                <p className="text-sm text-gray-700">
                  Request a copy of all personal data we hold about you. Available through your
                  account settings or by contacting us.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Right to Rectification
                </h3>
                <p className="text-sm text-gray-700">
                  Correct inaccurate or incomplete information through your account settings.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Right to Erasure</h3>
                <p className="text-sm text-gray-700">
                  Request deletion of your account and associated data. Some data may be
                  retained for legal compliance (7 years for HIPAA).
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Right to Data Portability
                </h3>
                <p className="text-sm text-gray-700">
                  Download your data in a machine-readable format (JSON, CSV) from account
                  settings.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Right to Restrict Processing
                </h3>
                <p className="text-sm text-gray-700">
                  Request limitations on how we process your data while maintaining your
                  account.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Right to Object</h3>
                <p className="text-sm text-gray-700">
                  Opt out of marketing communications, analytics, or AI training data usage.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Right to Withdraw Consent
                </h3>
                <p className="text-sm text-gray-700">
                  Withdraw consent for optional features (e.g., biometric authentication, AI
                  analysis) at any time.
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <p className="text-sm font-semibold text-gray-900 mb-1">
                Exercise Your Rights
              </p>
              <p className="text-sm text-gray-700">
                To exercise any of these rights, contact us at{' '}
                <a
                  href="mailto:privacy@weightlossproglab.com"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  privacy@weightlossproglab.com
                </a>{' '}
                or use the privacy controls in your account settings.
              </p>
            </div>
          </section>

          {/* 6. Data Retention */}
          <section id="data-retention">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Retention</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We retain your information for different periods based on type and legal
              requirements:
            </p>

            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">
                      Data Type
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">
                      Retention Period
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Account Information</td>
                    <td className="border border-gray-300 px-4 py-2">
                      While account is active + 7 years after closure (HIPAA)
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">
                      Health Data (PHI)
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      While account is active + 7 years after closure (HIPAA)
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">
                      Biometric Data
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      While feature is enabled + 30 days after opt-out
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">
                      Usage Logs
                    </td>
                    <td className="border border-gray-300 px-4 py-2">90 days</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">
                      Marketing Preferences
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      Until you opt out or close account
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">
                      De-identified Data
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      Indefinitely (cannot be linked to you)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 7. Cookies */}
          <section id="cookies">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              7. Cookies and Tracking Technologies
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use cookies and similar technologies to enhance your experience:
            </p>

            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Essential Cookies (Required)
                </h3>
                <p className="text-sm text-gray-700">
                  Authentication, security, session management. Cannot be disabled.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Functional Cookies (Optional)
                </h3>
                <p className="text-sm text-gray-700">
                  Remember your preferences, language settings, theme choices.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Analytics Cookies (Optional)
                </h3>
                <p className="text-sm text-gray-700">
                  Understand usage patterns, improve features. Privacy-focused, aggregated data
                  only.
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-4">
              Manage cookie preferences in your account settings or browser settings.
            </p>
          </section>

          {/* 8. Children's Privacy */}
          <section id="children">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              8. Children's Privacy
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              WLPL is not intended for children under 13. We do not knowingly collect
              information from children under 13.
            </p>
            <p className="text-gray-700 leading-relaxed">
              For users aged 13-17, we require parental consent before creating an account. If
              you believe we have collected information from a child under 13, please contact
              us immediately at{' '}
              <a
                href="mailto:privacy@weightlossproglab.com"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                privacy@weightlossproglab.com
              </a>
              .
            </p>
          </section>

          {/* 9. International Transfers */}
          <section id="international">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              9. International Data Transfers
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Your information may be transferred to and processed in the United States and
              other countries where our service providers operate.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We ensure appropriate safeguards are in place for international transfers,
              including Standard Contractual Clauses (SCCs) approved by the European Commission
              for EU/EEA users.
            </p>
          </section>

          {/* 10. Changes to Policy */}
          <section id="changes">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              10. Changes to This Privacy Policy
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We may update this Privacy Policy from time to time. We will notify you of
              material changes by:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Email notification to your registered email address</li>
              <li>Prominent notice on our platform</li>
              <li>In-app notification</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Your continued use after changes become effective constitutes acceptance. If you
              do not agree, you may close your account.
            </p>
          </section>

          {/* 11. Contact Us */}
          <section id="contact" className="bg-blue-50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions about this Privacy Policy or our privacy practices:
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-900 min-w-[120px]">Email:</span>
                <a
                  href="mailto:privacy@weightlossproglab.com"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  privacy@weightlossproglab.com
                </a>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-900 min-w-[120px]">
                  Privacy Officer:
                </span>
                <span className="text-gray-700">privacy@weightlossproglab.com</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-900 min-w-[120px]">Mail:</span>
                <div className="text-gray-700">
                  Weight Loss Projection Lab
                  <br />
                  Privacy Department
                  <br />
                  [Address to be added]
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-900 min-w-[120px]">
                  Response Time:
                </span>
                <span className="text-gray-700">Within 30 days (GDPR requirement)</span>
              </div>
            </div>
          </section>

          {/* HIPAA Notice */}
          <section className="border-t border-gray-200 pt-6 mt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              HIPAA Notice of Privacy Practices
            </h2>
            <p className="text-sm text-gray-700 mb-3">
              This Privacy Policy serves as our Notice of Privacy Practices as required by
              HIPAA. For more detailed information about how we protect your Protected Health
              Information (PHI), please visit our{' '}
              <Link href="/hipaa" className="text-blue-600 hover:text-blue-700 underline">
                HIPAA Compliance
              </Link>{' '}
              page.
            </p>
            <p className="text-sm text-gray-600 italic">
              If you believe your privacy rights have been violated, you may file a complaint
              with us or with the U.S. Department of Health and Human Services Office for Civil
              Rights. You will not be retaliated against for filing a complaint.
            </p>
          </section>
        </div>

        {/* Related Links */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link
            href="/terms"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Terms of Service
          </Link>
          <Link
            href="/hipaa"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            HIPAA Compliance
          </Link>
          <Link
            href="/security"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Security
          </Link>
          <Link
            href="/accessibility"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Accessibility
          </Link>
        </div>
      </div>
    </div>
  )
}
