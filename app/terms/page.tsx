/**
 * Terms of Service Page
 * Legal terms and conditions for using Wellness Projection Lab
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service | Wellness Projection Lab',
  description:
    'Terms of Service for Wellness Projection Lab - Legal terms and conditions governing your use of our health tracking platform.',
}

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-xl text-gray-600">
            Legal terms and conditions governing your use of Wellness Projection Lab
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Effective Date: January 1, 2025 | Last Updated: December 27, 2025
          </p>
        </div>

        {/* Important Notice */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8">
          <div className="flex items-start gap-4">
            <svg
              className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Please Read Carefully
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                These Terms of Service constitute a legally binding agreement between you and
                Wellness Projection Lab. By accessing or using our services, you agree to be
                bound by these terms. If you do not agree, please do not use our services.
              </p>
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
                <a href="#acceptance" className="text-blue-600 hover:text-blue-700">
                  1. Acceptance of Terms
                </a>
              </li>
              <li>
                <a href="#services" className="text-blue-600 hover:text-blue-700">
                  2. Description of Services
                </a>
              </li>
              <li>
                <a href="#eligibility" className="text-blue-600 hover:text-blue-700">
                  3. Eligibility
                </a>
              </li>
              <li>
                <a href="#account" className="text-blue-600 hover:text-blue-700">
                  4. Account Registration and Security
                </a>
              </li>
              <li>
                <a href="#subscriptions" className="text-blue-600 hover:text-blue-700">
                  5. Subscriptions and Payment
                </a>
              </li>
              <li>
                <a href="#acceptable-use" className="text-blue-600 hover:text-blue-700">
                  6. Acceptable Use Policy
                </a>
              </li>
              <li>
                <a href="#medical-disclaimer" className="text-blue-600 hover:text-blue-700">
                  7. Medical Disclaimer
                </a>
              </li>
              <li>
                <a href="#user-content" className="text-blue-600 hover:text-blue-700">
                  8. User Content and Data
                </a>
              </li>
              <li>
                <a href="#intellectual-property" className="text-blue-600 hover:text-blue-700">
                  9. Intellectual Property Rights
                </a>
              </li>
              <li>
                <a href="#termination" className="text-blue-600 hover:text-blue-700">
                  10. Termination
                </a>
              </li>
              <li>
                <a href="#warranties" className="text-blue-600 hover:text-blue-700">
                  11. Disclaimers and Warranties
                </a>
              </li>
              <li>
                <a href="#liability" className="text-blue-600 hover:text-blue-700">
                  12. Limitation of Liability
                </a>
              </li>
              <li>
                <a href="#indemnification" className="text-blue-600 hover:text-blue-700">
                  13. Indemnification
                </a>
              </li>
              <li>
                <a href="#dispute-resolution" className="text-blue-600 hover:text-blue-700">
                  14. Dispute Resolution and Arbitration
                </a>
              </li>
              <li>
                <a href="#general" className="text-blue-600 hover:text-blue-700">
                  15. General Provisions
                </a>
              </li>
              <li>
                <a href="#contact" className="text-blue-600 hover:text-blue-700">
                  16. Contact Information
                </a>
              </li>
            </ol>
          </section>

          {/* 1. Acceptance of Terms */}
          <section id="acceptance">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              By creating an account, accessing, or using Weight Loss Projection Lab ("WLPL,"
              "we," "us," or "our") services, including our website, mobile applications, and
              any related services (collectively, the "Services"), you agree to be bound by
              these Terms of Service ("Terms").
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              These Terms incorporate by reference our{' '}
              <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
                Privacy Policy
              </Link>
              ,{' '}
              <Link href="/hipaa" className="text-blue-600 hover:text-blue-700 underline">
                HIPAA Notice of Privacy Practices
              </Link>
              , and any other policies or guidelines posted on our Services.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We may modify these Terms at any time. We will notify you of material changes
              via email or through the Services. Your continued use of the Services after such
              notification constitutes acceptance of the modified Terms.
            </p>
          </section>

          {/* 2. Description of Services */}
          <section id="services">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              2. Description of Services
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              WLPL provides an AI-powered health and wellness tracking platform that includes:
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Core Features</h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Weight and meal tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>AI-powered nutritional analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Health insights and recommendations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Progress visualization and analytics</span>
                  </li>
                </ul>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Premium Features</h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5">•</span>
                    <span>Family and household management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5">•</span>
                    <span>Medication and appointment tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5">•</span>
                    <span>Provider and medical records management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5">•</span>
                    <span>Advanced analytics and reports</span>
                  </li>
                </ul>
              </div>
            </div>

            <p className="text-gray-700 leading-relaxed mt-4">
              We reserve the right to modify, suspend, or discontinue any feature or aspect of
              the Services at any time with or without notice.
            </p>
          </section>

          {/* 3. Eligibility */}
          <section id="eligibility">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Eligibility</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Age Requirements</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>
                      You must be at least 13 years old to use our Services. Users under 13 are
                      prohibited.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>
                      Users aged 13-17 must have parental or guardian consent to create an
                      account.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>
                      You must be 18+ to purchase subscriptions or enter into binding contracts.
                    </span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Other Requirements</h3>
                <p className="text-gray-700">
                  You represent and warrant that: (a) you have the legal capacity to enter into
                  these Terms; (b) you will not use the Services for any illegal purpose; (c)
                  all information you provide is accurate and complete; and (d) you will comply
                  with all applicable laws and regulations.
                </p>
              </div>
            </div>
          </section>

          {/* 4. Account Registration */}
          <section id="account">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              4. Account Registration and Security
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Account Creation</h3>
                <p className="text-gray-700 mb-3">
                  To use certain features of the Services, you must register for an account.
                  You agree to:
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Provide accurate, current, and complete information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Maintain and update your information to keep it accurate</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Maintain only one personal account (no duplicate accounts)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Not impersonate any person or entity</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Account Security</h3>
                <p className="text-gray-700 mb-3">You are responsible for:</p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Maintaining the confidentiality of your password and account</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>All activities that occur under your account</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>
                      Notifying us immediately of any unauthorized access or security breach
                    </span>
                  </li>
                </ul>
                <p className="text-sm text-gray-600 mt-3 italic">
                  We strongly recommend enabling multi-factor authentication (MFA) to protect
                  your account.
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Account Sharing Prohibited
                </p>
                <p className="text-sm text-gray-700">
                  You may not share your account credentials with others. Family plans allow
                  multiple users with separate accounts under one subscription.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Subscriptions and Payment */}
          <section id="subscriptions">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              5. Subscriptions and Payment
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Subscription Plans</h3>
                <p className="text-gray-700 mb-3">
                  WLPL offers free and paid subscription plans. Paid plans may include:
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>
                      <strong>Single Plan:</strong> Individual features for one user
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>
                      <strong>Family Plan:</strong> Multi-user features for households
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>
                      <strong>Enterprise:</strong> Custom solutions for organizations
                    </span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Billing and Payment</h3>
                <div className="space-y-3 text-gray-700">
                  <p>
                    <strong>Recurring Charges:</strong> Subscriptions automatically renew at the
                    end of each billing cycle (monthly or annually) unless canceled.
                  </p>
                  <p>
                    <strong>Payment Methods:</strong> We accept major credit cards and other
                    payment methods via Stripe. You authorize us to charge your payment method
                    for all fees.
                  </p>
                  <p>
                    <strong>Price Changes:</strong> We may change subscription prices with 30
                    days' notice. Changes apply to renewals after the notice period.
                  </p>
                  <p>
                    <strong>Failed Payments:</strong> If payment fails, we may suspend or
                    terminate your access until payment is received.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Cancellation and Refunds
                </h3>
                <div className="bg-blue-50 rounded-lg p-5">
                  <div className="space-y-3 text-sm text-gray-700">
                    <p>
                      <strong>Cancellation:</strong> You may cancel your subscription at any time
                      through your account settings. Cancellation takes effect at the end of the
                      current billing period.
                    </p>
                    <p>
                      <strong>No Partial Refunds:</strong> We do not provide refunds or credits
                      for partial subscription periods, except as required by law.
                    </p>
                    <p>
                      <strong>30-Day Money-Back Guarantee:</strong> New subscribers may request a
                      full refund within 30 days of their first payment.
                    </p>
                    <p>
                      <strong>Downgrade:</strong> If you downgrade to a lower-tier plan, the
                      change takes effect at the next billing cycle. No refunds for the
                      difference.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Free Trials</h3>
                <p className="text-gray-700">
                  We may offer free trials for paid features. You will be charged when the trial
                  ends unless you cancel before the trial period expires. We require a payment
                  method on file to start a trial.
                </p>
              </div>
            </div>
          </section>

          {/* 6. Acceptable Use Policy */}
          <section id="acceptable-use">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Acceptable Use Policy</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You agree NOT to use the Services to:
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Prohibited Activities</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">✗</span>
                    <span>Violate any laws or regulations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">✗</span>
                    <span>Infringe on intellectual property rights</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">✗</span>
                    <span>Upload viruses, malware, or malicious code</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">✗</span>
                    <span>Attempt to gain unauthorized access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">✗</span>
                    <span>Scrape, crawl, or harvest data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">✗</span>
                    <span>Reverse engineer or decompile the Services</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Content Restrictions</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">✗</span>
                    <span>Post illegal, harmful, or offensive content</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">✗</span>
                    <span>Harass, threaten, or abuse others</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">✗</span>
                    <span>Impersonate others or misrepresent affiliation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">✗</span>
                    <span>Share others' personal information without consent</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">✗</span>
                    <span>Spam or send unsolicited communications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">✗</span>
                    <span>Use the Services for commercial purposes (unless authorized)</span>
                  </li>
                </ul>
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-4 italic">
              Violation of this policy may result in suspension or termination of your account
              and, where applicable, reporting to law enforcement.
            </p>
          </section>

          {/* 7. Medical Disclaimer */}
          <section id="medical-disclaimer">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Medical Disclaimer</h2>

            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <svg
                  className="w-8 h-8 text-red-600 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    IMPORTANT MEDICAL DISCLAIMER
                  </h3>
                  <div className="space-y-3 text-sm text-gray-700">
                    <p className="font-semibold">
                      WLPL IS NOT A MEDICAL SERVICE AND DOES NOT PROVIDE MEDICAL ADVICE.
                    </p>
                    <p>
                      The Services, including AI-powered insights and recommendations, are for
                      informational and tracking purposes only. They are NOT a substitute for
                      professional medical advice, diagnosis, or treatment.
                    </p>
                    <p className="font-semibold">You should:</p>
                    <ul className="space-y-1 ml-4">
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-0.5">•</span>
                        <span>
                          Always seek the advice of your physician or qualified healthcare
                          provider with any questions about your health
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-0.5">•</span>
                        <span>Never disregard professional medical advice or delay seeking it</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-0.5">•</span>
                        <span>
                          Call 911 or seek emergency care immediately if you have a medical
                          emergency
                        </span>
                      </li>
                    </ul>
                    <p>
                      <strong>AI Limitations:</strong> Our AI features provide estimates and
                      suggestions based on algorithms. They may not be accurate and should not be
                      relied upon for medical decisions.
                    </p>
                    <p>
                      <strong>Not FDA Approved:</strong> WLPL is not a medical device and has not
                      been evaluated or approved by the FDA.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 8. User Content and Data */}
          <section id="user-content">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. User Content and Data</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Content</h3>
                <p className="text-gray-700 mb-3">
                  You retain ownership of all content you submit to the Services ("User
                  Content"), including meal photos, health data, and other information.
                </p>
                <p className="text-gray-700">
                  By submitting User Content, you grant us a worldwide, non-exclusive,
                  royalty-free license to use, store, process, and display your User Content
                  solely to provide and improve the Services.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Responsibilities</h3>
                <p className="text-gray-700 mb-3">You represent and warrant that:</p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>You own or have rights to all User Content you submit</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Your User Content does not violate any laws or third-party rights</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>
                      You have necessary consents (e.g., for photos of others, minors' data)
                    </span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Our Rights</h3>
                <p className="text-gray-700">
                  We may (but are not obligated to) monitor, review, or remove User Content that
                  violates these Terms or is otherwise objectionable. We reserve the right to
                  remove any User Content at any time without notice.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-2">Data Portability</h3>
                <p className="text-sm text-gray-700">
                  You can export your data at any time through your account settings. Upon
                  account deletion, we will delete or de-identify your data as described in our{' '}
                  <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          </section>

          {/* 9. Intellectual Property */}
          <section id="intellectual-property">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              9. Intellectual Property Rights
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Our Intellectual Property</h3>
                <p className="text-gray-700 mb-3">
                  The Services and all content, features, and functionality (including but not
                  limited to software, text, graphics, logos, and trademarks) are owned by WLPL
                  or our licensors and are protected by copyright, trademark, and other
                  intellectual property laws.
                </p>
                <p className="text-gray-700">
                  You may not copy, modify, distribute, sell, or exploit any part of the
                  Services without our express written permission.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Limited License</h3>
                <p className="text-gray-700">
                  We grant you a limited, non-exclusive, non-transferable, revocable license to
                  access and use the Services for personal, non-commercial purposes in
                  accordance with these Terms.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Trademarks</h3>
                <p className="text-gray-700">
                  "Wellness Projection Lab," "WPL," and our logos are trademarks of WPL. You
                  may not use our trademarks without prior written consent.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 mb-1">Copyright Infringement</p>
                <p className="text-sm text-gray-700">
                  If you believe content on our Services infringes your copyright, please contact
                  us at{' '}
                  <a
                    href="mailto:copyright@weightlossproglab.com"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    copyright@weightlossproglab.com
                  </a>{' '}
                  with a detailed notice under the DMCA.
                </p>
              </div>
            </div>
          </section>

          {/* 10. Termination */}
          <section id="termination">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Termination</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Termination by You</h3>
                <p className="text-gray-700">
                  You may terminate your account at any time through your account settings or by
                  contacting us. Upon termination, your access to the Services will cease at the
                  end of your current billing period.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Termination by Us</h3>
                <p className="text-gray-700 mb-3">
                  We may suspend or terminate your account at any time, with or without notice,
                  for:
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">•</span>
                    <span>Violation of these Terms</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">•</span>
                    <span>Fraudulent, abusive, or illegal activity</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">•</span>
                    <span>Non-payment of fees</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">•</span>
                    <span>Extended period of inactivity</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">•</span>
                    <span>Any other reason at our sole discretion</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Effect of Termination</h3>
                <p className="text-gray-700">
                  Upon termination: (a) your right to use the Services immediately ceases; (b)
                  we may delete your account and data subject to our retention policies; (c) you
                  remain liable for any outstanding fees; and (d) provisions that by their
                  nature should survive (such as limitations of liability) will continue to
                  apply.
                </p>
              </div>
            </div>
          </section>

          {/* 11. Disclaimers and Warranties */}
          <section id="warranties">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              11. Disclaimers and Warranties
            </h2>

            <div className="bg-gray-50 border-l-4 border-gray-400 p-6">
              <p className="font-semibold text-gray-900 mb-3 uppercase">
                THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY
                KIND.
              </p>

              <div className="space-y-3 text-sm text-gray-700">
                <p>
                  TO THE FULLEST EXTENT PERMITTED BY LAW, WLPL DISCLAIMS ALL WARRANTIES, EXPRESS
                  OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
                </p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-600 mt-0.5">•</span>
                    <span>Warranties of merchantability and fitness for a particular purpose</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-600 mt-0.5">•</span>
                    <span>Warranties of non-infringement</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-600 mt-0.5">•</span>
                    <span>Warranties regarding accuracy, reliability, or completeness</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-600 mt-0.5">•</span>
                    <span>Warranties that the Services will be uninterrupted or error-free</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-600 mt-0.5">•</span>
                    <span>Warranties regarding security or freedom from viruses</span>
                  </li>
                </ul>

                <p className="mt-4">
                  WE DO NOT WARRANT THAT: (a) the Services will meet your requirements; (b)
                  results from the Services will be accurate or reliable; (c) AI-generated
                  insights will be correct; or (d) any errors will be corrected.
                </p>

                <p className="mt-4 italic">
                  Some jurisdictions do not allow disclaimers of implied warranties, so some of
                  the above may not apply to you.
                </p>
              </div>
            </div>
          </section>

          {/* 12. Limitation of Liability */}
          <section id="liability">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              12. Limitation of Liability
            </h2>

            <div className="bg-gray-50 border-l-4 border-gray-400 p-6">
              <p className="font-semibold text-gray-900 mb-3 uppercase">
                TO THE FULLEST EXTENT PERMITTED BY LAW:
              </p>

              <div className="space-y-3 text-sm text-gray-700">
                <p>
                  WLPL, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE
                  LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
                  DAMAGES, INCLUDING BUT NOT LIMITED TO:
                </p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-600 mt-0.5">•</span>
                    <span>Loss of profits, revenue, or data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-600 mt-0.5">•</span>
                    <span>Loss of use or goodwill</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-600 mt-0.5">•</span>
                    <span>Business interruption</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-600 mt-0.5">•</span>
                    <span>Personal injury or property damage</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-600 mt-0.5">•</span>
                    <span>Health-related damages from reliance on the Services</span>
                  </li>
                </ul>

                <p className="mt-4 font-semibold">
                  OUR TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM OR RELATED TO THE
                  SERVICES SHALL NOT EXCEED THE GREATER OF: (A) $100 OR (B) THE AMOUNT YOU PAID
                  US IN THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM.
                </p>

                <p className="mt-4">
                  This limitation applies regardless of the legal theory (contract, tort,
                  negligence, strict liability, or otherwise), even if we have been advised of
                  the possibility of such damages.
                </p>

                <p className="mt-4 italic">
                  Some jurisdictions do not allow limitations on liability, so some of the above
                  may not apply to you.
                </p>
              </div>
            </div>
          </section>

          {/* 13. Indemnification */}
          <section id="indemnification">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Indemnification</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You agree to indemnify, defend, and hold harmless WLPL, its affiliates, officers,
              directors, employees, agents, and licensors from and against any claims,
              liabilities, damages, losses, costs, or expenses (including reasonable attorneys'
              fees) arising from or related to:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Your use of the Services</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Your User Content</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Your violation of these Terms</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Your violation of any third-party rights</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Your violation of any applicable laws</span>
              </li>
            </ul>
          </section>

          {/* 14. Dispute Resolution */}
          <section id="dispute-resolution">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              14. Dispute Resolution and Arbitration
            </h2>

            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <p className="font-semibold text-gray-900 mb-3 uppercase">
                  PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS.
                </p>
                <p className="text-sm text-gray-700">
                  This section includes an arbitration agreement and class action waiver. You
                  have the right to opt out as described below.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Informal Resolution</h3>
                <p className="text-gray-700">
                  Before filing a claim, you agree to contact us at{' '}
                  <a
                    href="mailto:legal@weightlossproglab.com"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    legal@weightlossproglab.com
                  </a>{' '}
                  to attempt to resolve the dispute informally. We will attempt to resolve the
                  dispute within 60 days.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Binding Arbitration</h3>
                <p className="text-gray-700 mb-3">
                  If informal resolution fails, you agree that any dispute will be resolved by
                  binding arbitration rather than in court, except for:
                </p>
                <ul className="space-y-1 text-sm text-gray-700 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Disputes that qualify for small claims court</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Intellectual property disputes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Injunctive or equitable relief</span>
                  </li>
                </ul>
                <p className="text-gray-700 mt-3">
                  Arbitration will be conducted by the American Arbitration Association (AAA)
                  under its Consumer Arbitration Rules.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Class Action Waiver</h3>
                <p className="text-gray-700 font-semibold">
                  YOU AGREE THAT DISPUTES WILL BE RESOLVED ON AN INDIVIDUAL BASIS. YOU WAIVE ANY
                  RIGHT TO PARTICIPATE IN A CLASS ACTION, CLASS ARBITRATION, OR REPRESENTATIVE
                  ACTION.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Opt-Out Right</h3>
                <p className="text-gray-700">
                  You may opt out of this arbitration agreement by sending written notice to{' '}
                  <a
                    href="mailto:legal@weightlossproglab.com"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    legal@weightlossproglab.com
                  </a>{' '}
                  within 30 days of first accepting these Terms.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Governing Law and Venue</h3>
                <p className="text-gray-700">
                  These Terms are governed by the laws of [State], without regard to conflict of
                  law principles. Any disputes not subject to arbitration will be brought
                  exclusively in the state or federal courts located in [County, State].
                </p>
              </div>
            </div>
          </section>

          {/* 15. General Provisions */}
          <section id="general">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">15. General Provisions</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Entire Agreement</h3>
                <p className="text-gray-700 text-sm">
                  These Terms, together with our Privacy Policy and any other policies
                  referenced herein, constitute the entire agreement between you and WLPL
                  regarding the Services.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Severability</h3>
                <p className="text-gray-700 text-sm">
                  If any provision of these Terms is found to be invalid or unenforceable, the
                  remaining provisions will remain in full force and effect.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Waiver</h3>
                <p className="text-gray-700 text-sm">
                  Our failure to enforce any right or provision of these Terms will not be
                  deemed a waiver of such right or provision.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Assignment</h3>
                <p className="text-gray-700 text-sm">
                  You may not assign or transfer these Terms or your account without our prior
                  written consent. We may assign these Terms without restriction.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Force Majeure</h3>
                <p className="text-gray-700 text-sm">
                  We will not be liable for any failure or delay due to circumstances beyond our
                  reasonable control, including acts of God, natural disasters, war, terrorism,
                  labor disputes, or government actions.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Export Controls</h3>
                <p className="text-gray-700 text-sm">
                  You agree to comply with all applicable export and import laws and regulations.
                  You may not use the Services if you are located in an embargoed country or are
                  on a government restricted parties list.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  U.S. Government End Users
                </h3>
                <p className="text-gray-700 text-sm">
                  The Services are "commercial computer software" and "commercial computer
                  software documentation" as defined in FAR 12.212. U.S. Government end users
                  acquire the Services with only those rights set forth in these Terms.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Notice to California Users</h3>
                <p className="text-gray-700 text-sm">
                  Under California Civil Code Section 1789.3, California users are entitled to
                  the following consumer rights notice: If you have a question or complaint
                  regarding the Services, please contact us. California residents may reach the
                  Complaint Assistance Unit of the Division of Consumer Services of the
                  California Department of Consumer Affairs by mail at 1625 North Market Blvd.,
                  Sacramento, CA 95834, or by telephone at (916) 445-1254 or (800) 952-5210.
                </p>
              </div>
            </div>
          </section>

          {/* 16. Contact Information */}
          <section id="contact" className="bg-blue-50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">16. Contact Information</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about these Terms or the Services:
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-900 min-w-[140px]">Company Name:</span>
                <span className="text-gray-700">Wellness Projection Lab</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-900 min-w-[140px]">Email:</span>
                <a
                  href="mailto:legal@weightlossproglab.com"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  legal@weightlossproglab.com
                </a>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-900 min-w-[140px]">Support:</span>
                <a
                  href="mailto:support@weightlossproglab.com"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  support@weightlossproglab.com
                </a>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-900 min-w-[140px]">Address:</span>
                <div className="text-gray-700">[Address to be added]</div>
              </div>
            </div>
          </section>

          {/* Acknowledgment */}
          <div className="bg-gray-100 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-700">
              BY USING THE SERVICES, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE
              TO BE BOUND BY THESE TERMS OF SERVICE.
            </p>
            <p className="text-xs text-gray-500 mt-3">
              Last Updated: December 27, 2025 | Effective: January 1, 2025
            </p>
          </div>
        </div>

        {/* Related Links */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link
            href="/privacy"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Privacy Policy
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
