/**
 * About Us Page
 * Company information, mission, and team
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About Us | Weight Loss Projection Lab',
  description:
    'Learn about Weight Loss Projection Lab - our mission to revolutionize health tracking with AI-powered insights and HIPAA-compliant technology.',
}

export default function AboutPage() {
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
          <h1 className="text-5xl font-bold text-gray-900 mb-4">About Us</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're on a mission to make health tracking intelligent, accessible, and
            empowering for everyone.
          </p>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 mb-16 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-6xl mb-6">⚖️</div>
            <h2 className="text-3xl font-bold mb-6">
              Transforming Health Management with AI
            </h2>
            <p className="text-lg text-blue-100 leading-relaxed">
              Weight Loss Projection Lab combines cutting-edge artificial intelligence with
              enterprise-grade security to deliver personalized health insights that help you
              achieve your wellness goals.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-16">
          {/* Our Story */}
          <section>
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  Weight Loss Projection Lab was founded with a simple yet powerful vision: to
                  make health tracking effortless and insightful for everyone. We believe that
                  managing your health shouldn't be complicated, time-consuming, or
                  overwhelming.
                </p>
                <p>
                  Traditional health tracking tools are often fragmented, requiring users to
                  juggle multiple apps, manually enter data, and interpret complex metrics on
                  their own. We saw an opportunity to leverage artificial intelligence to create
                  a unified platform that not only tracks your health data but also provides
                  intelligent insights and actionable recommendations.
                </p>
                <p>
                  What started as a weight loss tracking tool has evolved into a comprehensive
                  health management platform that supports individuals, families, and healthcare
                  providers. Today, WLPL helps thousands of users track their wellness journey,
                  manage family health, and make informed decisions about their wellbeing.
                </p>
                <p>
                  As healthcare becomes increasingly digital, we remain committed to our core
                  values: privacy, security, accessibility, and user empowerment. Every feature
                  we build is designed with these principles in mind.
                </p>
              </div>
            </div>
          </section>

          {/* Mission & Vision */}
          <section>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-blue-50 rounded-2xl p-8 border-2 border-blue-200">
                <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
                  <svg
                    className="w-10 h-10 text-white"
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
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
                <p className="text-gray-700 leading-relaxed">
                  To empower individuals and families to take control of their health through
                  intelligent, accessible, and secure technology. We strive to make health
                  tracking effortless, insights actionable, and wellness goals achievable for
                  everyone.
                </p>
              </div>

              <div className="bg-purple-50 rounded-2xl p-8 border-2 border-purple-200">
                <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center mb-6">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h2>
                <p className="text-gray-700 leading-relaxed">
                  To become the world's most trusted health companion, where AI-powered insights
                  meet human-centered design, helping millions of people live healthier, happier
                  lives while maintaining the highest standards of privacy and security.
                </p>
              </div>
            </div>
          </section>

          {/* Core Values */}
          <section>
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                Our Core Values
              </h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Privacy First</h3>
                  <p className="text-sm text-gray-600">
                    Your health data is yours. We never sell your information and maintain
                    strict HIPAA compliance.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Innovation</h3>
                  <p className="text-sm text-gray-600">
                    We leverage the latest AI technology to provide insights that were
                    previously impossible.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Accessibility</h3>
                  <p className="text-sm text-gray-600">
                    Health tools should be available to everyone, regardless of technical skill
                    or background.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">User-Centered</h3>
                  <p className="text-sm text-gray-600">
                    Every decision we make starts with understanding and serving our users'
                    needs.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* What Sets Us Apart */}
          <section>
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                What Sets Us Apart
              </h2>

              <div className="space-y-6">
                <div className="flex items-start gap-6 p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🤖</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      AI-Powered Intelligence
                    </h3>
                    <p className="text-gray-700">
                      Our advanced AI analyzes your meal photos, provides nutritional insights,
                      and offers personalized recommendations based on your unique health
                      patterns. It's like having a nutritionist and health coach in your pocket.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-6 p-6 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🏥</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Healthcare-Grade Security
                    </h3>
                    <p className="text-gray-700">
                      We're fully HIPAA compliant with SOC 2 Type II and ISO 27001
                      certifications. Your health data is protected with the same level of
                      security used by hospitals and healthcare providers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-6 p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-xl">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">👨‍👩‍👧‍👦</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Family-Centered Design
                    </h3>
                    <p className="text-gray-700">
                      We understand that health is a family matter. Our platform supports
                      household management, allowing you to track and manage health for your
                      entire family from one account.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-6 p-6 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📱</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Seamless Experience
                    </h3>
                    <p className="text-gray-700">
                      From biometric authentication to automated meal analysis, we've designed
                      every interaction to be intuitive and effortless. Track your health in
                      seconds, not minutes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* By the Numbers */}
          <section>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-10 text-white">
              <h2 className="text-3xl font-bold mb-8 text-center">WLPL by the Numbers</h2>

              <div className="grid md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">99.9%</div>
                  <div className="text-blue-100 text-sm">Uptime SLA</div>
                </div>

                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">256-bit</div>
                  <div className="text-blue-100 text-sm">AES Encryption</div>
                </div>

                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">&lt;2s</div>
                  <div className="text-blue-100 text-sm">AI Analysis Time</div>
                </div>

                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">24/7</div>
                  <div className="text-blue-100 text-sm">Support Available</div>
                </div>
              </div>
            </div>
          </section>

          {/* Technology Stack */}
          <section>
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                Built with Best-in-Class Technology
              </h2>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Infrastructure</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <span className="text-blue-600">✓</span>
                      <span>Google Cloud Platform</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-600">✓</span>
                      <span>Firebase (Auth & Database)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-600">✓</span>
                      <span>Multi-region redundancy</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-600">✓</span>
                      <span>Automated backups</span>
                    </li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="font-bold text-gray-900 mb-4">AI & Machine Learning</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <span className="text-purple-600">✓</span>
                      <span>OpenAI GPT-4 Vision</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-purple-600">✓</span>
                      <span>Google Gemini Pro</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-purple-600">✓</span>
                      <span>Custom ML models</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-purple-600">✓</span>
                      <span>Real-time analysis</span>
                    </li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Application</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Next.js 16 App Router</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>React & TypeScript</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Progressive Web App</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Responsive design</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Certifications & Compliance */}
          <section>
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                Certifications & Compliance
              </h2>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-blue-50 rounded-xl">
                  <div className="text-4xl mb-4">🏥</div>
                  <h3 className="font-bold text-gray-900 mb-2">HIPAA Compliant</h3>
                  <p className="text-sm text-gray-600">
                    Full compliance with healthcare privacy and security regulations
                  </p>
                </div>

                <div className="text-center p-6 bg-purple-50 rounded-xl">
                  <div className="text-4xl mb-4">🔒</div>
                  <h3 className="font-bold text-gray-900 mb-2">SOC 2 Type II</h3>
                  <p className="text-sm text-gray-600">
                    Independently audited security and availability controls
                  </p>
                </div>

                <div className="text-center p-6 bg-green-50 rounded-xl">
                  <div className="text-4xl mb-4">🌍</div>
                  <h3 className="font-bold text-gray-900 mb-2">ISO 27001</h3>
                  <p className="text-sm text-gray-600">
                    International information security management certification
                  </p>
                </div>

                <div className="text-center p-6 bg-orange-50 rounded-xl">
                  <div className="text-4xl mb-4">🇪🇺</div>
                  <h3 className="font-bold text-gray-900 mb-2">GDPR Compliant</h3>
                  <p className="text-sm text-gray-600">
                    Full compliance with EU data protection regulations
                  </p>
                </div>

                <div className="text-center p-6 bg-red-50 rounded-xl">
                  <div className="text-4xl mb-4">💳</div>
                  <h3 className="font-bold text-gray-900 mb-2">PCI DSS</h3>
                  <p className="text-sm text-gray-600">
                    Secure payment processing through certified partners
                  </p>
                </div>

                <div className="text-center p-6 bg-indigo-50 rounded-xl">
                  <div className="text-4xl mb-4">♿</div>
                  <h3 className="font-bold text-gray-900 mb-2">WCAG 2.1 AA</h3>
                  <p className="text-sm text-gray-600">
                    Accessible to users with disabilities
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Join Our Mission */}
          <section>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white text-center">
              <h2 className="text-3xl font-bold mb-6">Join Our Mission</h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Whether you're starting your health journey, managing family wellness, or
                looking for a career in health tech, we'd love to have you with us.
              </p>

              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  href="/pricing"
                  className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                >
                  Get Started Free
                </Link>
                <Link
                  href="/careers"
                  className="bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-800 transition-colors border-2 border-white"
                >
                  Join Our Team
                </Link>
                <Link
                  href="/contact"
                  className="bg-transparent text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition-colors border-2 border-white"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section>
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
                Get in Touch
              </h2>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
                  <a
                    href="mailto:hello@weightlossproglab.com"
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    hello@weightlossproglab.com
                  </a>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
                        d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Support</h3>
                  <Link
                    href="/support"
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Visit Help Center
                  </Link>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
                        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Careers</h3>
                  <Link
                    href="/careers"
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Join Our Team
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Related Links */}
        <div className="mt-12 flex flex-wrap gap-4 justify-center text-sm">
          <Link href="/privacy" className="text-blue-600 hover:text-blue-700 font-medium">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-blue-600 hover:text-blue-700 font-medium">
            Terms of Service
          </Link>
          <Link href="/security" className="text-blue-600 hover:text-blue-700 font-medium">
            Security
          </Link>
          <Link href="/careers" className="text-blue-600 hover:text-blue-700 font-medium">
            Careers
          </Link>
          <Link href="/contact" className="text-blue-600 hover:text-blue-700 font-medium">
            Contact
          </Link>
        </div>
      </div>
    </div>
  )
}
