/**
 * Accessibility Statement Page
 * Details WLPL's commitment to accessibility and compliance with WCAG 2.1 AA standards
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Accessibility Statement | Weight Loss Projection Lab',
  description:
    'Weight Loss Projection Lab is committed to ensuring digital accessibility for people with disabilities. Learn about our accessibility features and standards compliance.',
}

export default function AccessibilityPage() {
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
            Accessibility Statement
          </h1>
          <p className="text-xl text-gray-600">
            Weight Loss Projection Lab is committed to ensuring digital accessibility for people
            with disabilities.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Last updated: December 27, 2025
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          {/* Our Commitment */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Commitment</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Weight Loss Projection Lab (WLPL) is committed to making our health tracking platform
              accessible to all users, including those with disabilities. We believe that everyone
              deserves equal access to health management tools, regardless of their abilities.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We are continuously working to improve the accessibility of our platform and strive
              to meet or exceed the standards set forth in the Web Content Accessibility
              Guidelines (WCAG) 2.1 Level AA.
            </p>
          </section>

          {/* Standards Compliance */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Standards & Compliance
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-1">
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">WCAG 2.1 Level AA</h3>
                  <p className="text-gray-600">
                    Our platform is designed to conform to the Web Content Accessibility
                    Guidelines (WCAG) 2.1 at Level AA.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-1">
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Section 508</h3>
                  <p className="text-gray-600">
                    We aim to comply with Section 508 of the Rehabilitation Act of 1973, as
                    amended.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-1">
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">ADA Compliance</h3>
                  <p className="text-gray-600">
                    Our platform is designed to be compliant with the Americans with Disabilities
                    Act (ADA).
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Accessibility Features */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Accessibility Features
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-blue-600">⌨️</span>
                  Keyboard Navigation
                </h3>
                <p className="text-sm text-gray-600">
                  Full keyboard navigation support with visible focus indicators for all
                  interactive elements.
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-blue-600">🔍</span>
                  Screen Reader Support
                </h3>
                <p className="text-sm text-gray-600">
                  Semantic HTML and ARIA labels for compatibility with screen readers like JAWS,
                  NVDA, and VoiceOver.
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-blue-600">🎨</span>
                  Color Contrast
                </h3>
                <p className="text-sm text-gray-600">
                  All text and interactive elements meet WCAG AA contrast ratio requirements
                  (4.5:1 for normal text).
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-blue-600">📏</span>
                  Responsive Text
                </h3>
                <p className="text-sm text-gray-600">
                  Text can be resized up to 200% without loss of content or functionality.
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-blue-600">🖱️</span>
                  Touch Targets
                </h3>
                <p className="text-sm text-gray-600">
                  All interactive elements have adequate touch target sizes (minimum 44x44
                  pixels).
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-blue-600">📱</span>
                  Mobile Accessibility
                </h3>
                <p className="text-sm text-gray-600">
                  Fully responsive design with accessibility features optimized for mobile
                  devices.
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-blue-600">🎤</span>
                  Alternative Input
                </h3>
                <p className="text-sm text-gray-600">
                  Support for voice control, switch devices, and other assistive technologies.
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-blue-600">⏸️</span>
                  Motion Control
                </h3>
                <p className="text-sm text-gray-600">
                  Respect for user preferences to reduce motion and provide alternatives to
                  time-based interactions.
                </p>
              </div>
            </div>
          </section>

          {/* Known Limitations */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Known Limitations</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              While we strive for full accessibility, we acknowledge the following areas where
              we are actively working to improve:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Some third-party integrations may have limited accessibility support</li>
              <li>Certain AI-generated content may require manual review for accessibility</li>
              <li>Legacy features are being progressively enhanced for better accessibility</li>
            </ul>
            <p className="text-gray-600 text-sm mt-4 italic">
              We are committed to addressing these limitations and continuously improving our
              platform.
            </p>
          </section>

          {/* Assistive Technologies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Tested Assistive Technologies
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              WLPL has been tested with the following assistive technologies:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-gray-700">
                <span className="text-green-500">✓</span>
                <span>JAWS (Windows)</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="text-green-500">✓</span>
                <span>NVDA (Windows)</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="text-green-500">✓</span>
                <span>VoiceOver (macOS, iOS)</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="text-green-500">✓</span>
                <span>TalkBack (Android)</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="text-green-500">✓</span>
                <span>Dragon NaturallySpeaking</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="text-green-500">✓</span>
                <span>ZoomText</span>
              </div>
            </div>
          </section>

          {/* Feedback & Contact */}
          <section className="bg-blue-50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Feedback & Support</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We welcome your feedback on the accessibility of Weight Loss Projection Lab. If you
              encounter accessibility barriers or have suggestions for improvement, please
              contact us:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-900 min-w-[80px]">Email:</span>
                <a
                  href="mailto:accessibility@weightlossproglab.com"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  accessibility@weightlossproglab.com
                </a>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-900 min-w-[80px]">Response:</span>
                <span className="text-gray-700">
                  We aim to respond to accessibility feedback within 2 business days.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-900 min-w-[80px]">Support:</span>
                <Link href="/support" className="text-blue-600 hover:text-blue-700 underline">
                  Visit our Help Center
                </Link>
              </div>
            </div>
          </section>

          {/* Third-Party Content */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Third-Party Content</h2>
            <p className="text-gray-700 leading-relaxed">
              Some content on our platform may be provided by third-party services. While we
              work with our partners to ensure accessibility, we cannot guarantee the
              accessibility of all third-party content. If you encounter issues with
              third-party content, please contact us so we can work with our partners to
              address them.
            </p>
          </section>

          {/* Ongoing Efforts */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ongoing Efforts</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Accessibility is an ongoing commitment. Our efforts include:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Regular accessibility audits by third-party experts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Staff training on accessibility best practices</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Automated testing integrated into our development workflow</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>User testing with people who use assistive technologies</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Continuous monitoring and improvement of accessibility features</span>
              </li>
            </ul>
          </section>

          {/* Legal Compliance */}
          <section className="border-t border-gray-200 pt-6 mt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Legal Compliance</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              This accessibility statement applies to the Weight Loss Projection Lab platform
              available at{' '}
              <a
                href="https://weightlossproglab.com"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                weightlossproglab.com
              </a>{' '}
              and our mobile applications.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We are committed to complying with all applicable laws and regulations regarding
              accessibility, including but not limited to the Americans with Disabilities Act
              (ADA), Section 508 of the Rehabilitation Act, and the European Accessibility Act
              (EAA).
            </p>
          </section>

          {/* Date */}
          <div className="text-center text-sm text-gray-500 pt-6 border-t border-gray-200">
            This accessibility statement was last reviewed and updated on December 27, 2025.
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
        </div>
      </div>
    </div>
  )
}
