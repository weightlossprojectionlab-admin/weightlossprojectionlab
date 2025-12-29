/**
 * HIPAA Compliance Page
 * Details WLPL's HIPAA compliance measures and Notice of Privacy Practices
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'HIPAA Compliance | Weight Loss Projection Lab',
  description:
    'Weight Loss Projection Lab HIPAA compliance information and Notice of Privacy Practices for Protected Health Information (PHI).',
}

export default function HipaaPage() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            HIPAA Compliance & Notice of Privacy Practices
          </h1>
          <p className="text-xl text-gray-600">
            How Weight Loss Projection Lab protects your Protected Health Information
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Effective Date: January 1, 2025 | Last Updated: December 27, 2025
          </p>
        </div>

        {/* HIPAA Badge */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 mb-8 text-white">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-blue-600"
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
              <h2 className="text-2xl font-bold mb-3">HIPAA Compliant Platform</h2>
              <p className="text-blue-100 leading-relaxed mb-4">
                Weight Loss Projection Lab is fully compliant with the Health Insurance
                Portability and Accountability Act (HIPAA). We implement comprehensive
                administrative, physical, and technical safeguards to protect your Protected
                Health Information (PHI).
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="bg-white/20 px-4 py-2 rounded-lg font-medium">
                  Privacy Rule Compliant
                </div>
                <div className="bg-white/20 px-4 py-2 rounded-lg font-medium">
                  Security Rule Compliant
                </div>
                <div className="bg-white/20 px-4 py-2 rounded-lg font-medium">
                  Breach Notification Rule
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          {/* What is HIPAA */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">What is HIPAA?</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              The Health Insurance Portability and Accountability Act (HIPAA) is a federal law
              that establishes national standards to protect sensitive patient health
              information from being disclosed without the patient's consent or knowledge.
            </p>
            <p className="text-gray-700 leading-relaxed">
              HIPAA applies to "covered entities" (healthcare providers, health plans, and
              healthcare clearinghouses) and their "business associates" (companies that
              handle PHI on their behalf). As a health tracking platform, WLPL acts as a
              business associate and is fully committed to HIPAA compliance.
            </p>
          </section>

          {/* Notice of Privacy Practices */}
          <section className="bg-blue-50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Notice of Privacy Practices
            </h2>
            <p className="text-sm text-gray-700 mb-4">
              <strong>THIS NOTICE DESCRIBES HOW MEDICAL INFORMATION ABOUT YOU MAY BE USED AND
              DISCLOSED AND HOW YOU CAN GET ACCESS TO THIS INFORMATION. PLEASE REVIEW IT
              CAREFULLY.</strong>
            </p>
            <p className="text-gray-700 leading-relaxed">
              Weight Loss Projection Lab is required by law to maintain the privacy and security
              of your Protected Health Information (PHI). This Notice of Privacy Practices
              describes our legal duties and privacy practices with respect to your PHI, and
              your rights regarding your PHI.
            </p>
          </section>

          {/* Protected Health Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              What is Protected Health Information (PHI)?
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              PHI is any information about your health status, provision of healthcare, or
              payment for healthcare that can be linked to you. On WLPL, this includes:
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Health Data</h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Weight measurements and tracking history</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Meal logs and nutritional information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Vital signs (blood pressure, heart rate, etc.)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Medication lists and schedules</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Medical conditions and diagnoses</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Identifying Information
                </h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Name, date of birth, contact information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Account numbers and unique identifiers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Biometric identifiers (if using facial recognition)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>IP addresses and device identifiers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Photos and images containing health data</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use and Disclose PHI */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              How We Use and Disclose Your PHI
            </h2>

            <div className="space-y-6">
              <div className="border-l-4 border-green-500 pl-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Uses and Disclosures WITH Your Authorization
                </h3>
                <p className="text-gray-700 text-sm mb-3">
                  We will always ask for your written authorization before using or disclosing
                  your PHI for purposes other than those listed below. You may revoke your
                  authorization at any time.
                </p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>
                      <strong>Treatment:</strong> Sharing your data with healthcare providers
                      you've authorized
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>
                      <strong>Family/Caregivers:</strong> Sharing with family members in your
                      household care group
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>
                      <strong>Research:</strong> Using de-identified data for research purposes
                      (with consent)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>
                      <strong>Marketing:</strong> Any marketing or fundraising communications
                      (opt-in only)
                    </span>
                  </li>
                </ul>
              </div>

              <div className="border-l-4 border-blue-500 pl-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Uses and Disclosures WITHOUT Your Authorization
                </h3>
                <p className="text-gray-700 text-sm mb-3">
                  HIPAA permits us to use and disclose your PHI without your authorization for
                  the following purposes:
                </p>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">
                      1. Treatment, Payment, and Healthcare Operations (TPO)
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-700 ml-4">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>
                          <strong>Treatment:</strong> Providing AI-powered health insights and
                          recommendations
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>
                          <strong>Payment:</strong> Processing subscription payments and
                          billing
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>
                          <strong>Operations:</strong> Improving our services, quality
                          assurance, and training
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">
                      2. Required by Law
                    </h4>
                    <p className="text-sm text-gray-700 ml-4">
                      When disclosure is required by federal, state, or local law, such as
                      reporting abuse or suspected abuse.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">
                      3. Public Health Activities
                    </h4>
                    <p className="text-sm text-gray-700 ml-4">
                      To public health authorities for purposes of preventing or controlling
                      disease, injury, or disability.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">
                      4. Victims of Abuse, Neglect, or Domestic Violence
                    </h4>
                    <p className="text-sm text-gray-700 ml-4">
                      To appropriate authorities when we believe you are a victim of abuse,
                      neglect, or domestic violence.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">
                      5. Law Enforcement
                    </h4>
                    <p className="text-sm text-gray-700 ml-4">
                      To law enforcement officials as required by law or in response to valid
                      legal process.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">
                      6. To Avert a Serious Threat
                    </h4>
                    <p className="text-sm text-gray-700 ml-4">
                      When necessary to prevent or lessen a serious and imminent threat to the
                      health or safety of a person or the public.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-l-4 border-purple-500 pl-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Business Associates
                </h3>
                <p className="text-gray-700 text-sm mb-3">
                  We may share your PHI with third-party service providers ("Business
                  Associates") who perform services on our behalf. All Business Associates sign
                  agreements (Business Associate Agreements or BAAs) requiring them to protect
                  your PHI.
                </p>
                <p className="text-sm text-gray-600 italic">
                  Examples: Cloud hosting (Google Cloud), AI services (OpenAI, Google Gemini),
                  payment processing (Stripe)
                </p>
              </div>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Your Rights Regarding Your PHI
            </h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Under HIPAA, you have the following rights with respect to your Protected Health
              Information:
            </p>

            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-xl">📋</span>
                  Right to Access
                </h3>
                <p className="text-sm text-gray-700 mb-2">
                  You have the right to inspect and obtain a copy of your PHI. You can access
                  and download your data through your account settings.
                </p>
                <p className="text-xs text-gray-600">
                  We will respond to your request within 30 days. We may charge a reasonable
                  fee for copying and mailing costs.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-xl">✏️</span>
                  Right to Amend
                </h3>
                <p className="text-sm text-gray-700 mb-2">
                  You have the right to request that we amend your PHI if you believe it is
                  incorrect or incomplete.
                </p>
                <p className="text-xs text-gray-600">
                  You can edit most information directly in your account. For other amendments,
                  contact us at privacy@weightlossproglab.com.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  Right to an Accounting of Disclosures
                </h3>
                <p className="text-sm text-gray-700 mb-2">
                  You have the right to receive a list of certain disclosures we have made of
                  your PHI.
                </p>
                <p className="text-xs text-gray-600">
                  This does not include disclosures for treatment, payment, or healthcare
                  operations, or disclosures you authorized. You may request an accounting for
                  the past 6 years.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-xl">🚫</span>
                  Right to Request Restrictions
                </h3>
                <p className="text-sm text-gray-700 mb-2">
                  You have the right to request restrictions on certain uses and disclosures of
                  your PHI.
                </p>
                <p className="text-xs text-gray-600">
                  We are not required to agree to your request, but if we do, we will comply
                  with your request unless the information is needed for emergency treatment.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-xl">📧</span>
                  Right to Request Confidential Communications
                </h3>
                <p className="text-sm text-gray-700 mb-2">
                  You have the right to request that we communicate with you about your PHI by
                  alternative means or at alternative locations.
                </p>
                <p className="text-xs text-gray-600">
                  We will accommodate reasonable requests. You can update communication
                  preferences in your account settings.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-xl">📄</span>
                  Right to a Paper Copy of This Notice
                </h3>
                <p className="text-sm text-gray-700 mb-2">
                  You have the right to receive a paper copy of this Notice of Privacy
                  Practices, even if you have agreed to receive it electronically.
                </p>
                <p className="text-xs text-gray-600">
                  Contact us at privacy@weightlossproglab.com to request a paper copy.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-xl">🗑️</span>
                  Right to Request Deletion
                </h3>
                <p className="text-sm text-gray-700 mb-2">
                  You have the right to request deletion of your PHI, subject to certain
                  exceptions.
                </p>
                <p className="text-xs text-gray-600">
                  You can delete your account and data through account settings. Some data may
                  be retained for 7 years as required by law.
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 mt-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                How to Exercise Your Rights
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                To exercise any of these rights, you may:
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  <span>
                    Use the privacy controls in your account settings (for most requests)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  <span>
                    Email us at{' '}
                    <a
                      href="mailto:privacy@weightlossproglab.com"
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      privacy@weightlossproglab.com
                    </a>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  <span>Submit a written request by mail to our Privacy Officer</span>
                </li>
              </ul>
            </div>
          </section>

          {/* HIPAA Safeguards */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              HIPAA Security Safeguards
            </h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              HIPAA requires us to implement administrative, physical, and technical safeguards
              to protect your PHI:
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="border border-gray-200 rounded-lg p-5">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Administrative Safeguards
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Designated Privacy & Security Officers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>HIPAA training for all workforce members</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Security incident procedures</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Risk analysis and management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Business Associate Agreements</span>
                  </li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-5">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
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
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-3">Physical Safeguards</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5">•</span>
                    <span>SOC 2 certified data centers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5">•</span>
                    <span>24/7 physical security monitoring</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5">•</span>
                    <span>Biometric access controls</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5">•</span>
                    <span>Secure workstation practices</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5">•</span>
                    <span>Device and media disposal procedures</span>
                  </li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-5">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
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
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-3">Technical Safeguards</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>AES-256 encryption at rest</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>TLS 1.3 encryption in transit</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>Multi-factor authentication</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>Audit controls and logging</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>Automatic session timeout</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Breach Notification */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Breach Notification Obligations
            </h2>

            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg
                    className="w-8 h-8 text-red-600"
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
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    What Happens if There's a Breach?
                  </h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Under HIPAA's Breach Notification Rule, we are required to notify affected
                    individuals, the Department of Health and Human Services (HHS), and in some
                    cases the media, if there is a breach of unsecured PHI.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm mb-1">
                        Individual Notification
                      </h4>
                      <p className="text-sm text-gray-700">
                        We will notify you within 60 days of discovering a breach. The
                        notification will include:
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-gray-700 ml-4">
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 mt-0.5">•</span>
                          <span>Description of what happened</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 mt-0.5">•</span>
                          <span>Types of information involved</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 mt-0.5">•</span>
                          <span>Steps you should take to protect yourself</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 mt-0.5">•</span>
                          <span>What we're doing to investigate and prevent future breaches</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 mt-0.5">•</span>
                          <span>Contact information for questions</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm mb-1">
                        HHS Notification
                      </h4>
                      <p className="text-sm text-gray-700">
                        Breaches affecting 500+ individuals: Notify HHS within 60 days
                        <br />
                        Breaches affecting &lt;500 individuals: Notify HHS annually
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm mb-1">
                        Media Notification
                      </h4>
                      <p className="text-sm text-gray-700">
                        For breaches affecting 500+ individuals in the same state or
                        jurisdiction, we will notify prominent media outlets.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Complaints */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Complaints and Violations
            </h2>

            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  How to File a Privacy Complaint
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  If you believe your privacy rights have been violated, you may file a
                  complaint with us or with the U.S. Department of Health and Human Services
                  (HHS).
                </p>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-2">
                      File with WLPL:
                    </h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      <div className="flex items-start gap-3">
                        <span className="font-medium min-w-[80px]">Email:</span>
                        <a
                          href="mailto:privacy@weightlossproglab.com"
                          className="text-blue-600 hover:text-blue-700 underline"
                        >
                          privacy@weightlossproglab.com
                        </a>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="font-medium min-w-[80px]">Mail:</span>
                        <div>
                          Weight Loss Projection Lab
                          <br />
                          Attn: Privacy Officer
                          <br />
                          [Address to be added]
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-2">
                      File with HHS:
                    </h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      <div className="flex items-start gap-3">
                        <span className="font-medium min-w-[80px]">Online:</span>
                        <a
                          href="https://www.hhs.gov/hipaa/filing-a-complaint/index.html"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 underline"
                        >
                          HHS Office for Civil Rights Complaint Portal
                        </a>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="font-medium min-w-[80px]">Mail:</span>
                        <div>
                          U.S. Department of Health and Human Services
                          <br />
                          Office for Civil Rights
                          <br />
                          200 Independence Avenue, S.W.
                          <br />
                          Washington, D.C. 20201
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    No Retaliation Policy
                  </p>
                  <p className="text-sm text-gray-700">
                    You will NOT be retaliated against for filing a complaint. We prohibit
                    intimidating or retaliatory acts against anyone who files a complaint or
                    exercises their privacy rights.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Changes to Notice */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Changes to This Notice
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We reserve the right to change this Notice of Privacy Practices at any time. Any
              changes will apply to all PHI we maintain, including information created or
              received before the change.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We will post the current notice on our website and in our mobile app. We will
              also notify you via email of any material changes to this Notice.
            </p>
          </section>

          {/* Contact Information */}
          <section className="bg-blue-50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Information</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about this Notice or our privacy practices:
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-900 min-w-[140px]">
                  Privacy Officer:
                </span>
                <a
                  href="mailto:privacy@weightlossproglab.com"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  privacy@weightlossproglab.com
                </a>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-900 min-w-[140px]">
                  Security Officer:
                </span>
                <a
                  href="mailto:security@weightlossproglab.com"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  security@weightlossproglab.com
                </a>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-900 min-w-[140px]">
                  General Support:
                </span>
                <Link href="/support" className="text-blue-600 hover:text-blue-700 underline">
                  Visit our Help Center
                </Link>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-900 min-w-[140px]">Website:</span>
                <a
                  href="https://weightlossproglab.com"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  weightlossproglab.com
                </a>
              </div>
            </div>
          </section>

          {/* Effective Date */}
          <div className="text-center text-sm text-gray-500 pt-6 border-t border-gray-200">
            This Notice of Privacy Practices is effective as of January 1, 2025
            <br />
            Last updated: December 27, 2025
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
            href="/terms"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Terms of Service
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
