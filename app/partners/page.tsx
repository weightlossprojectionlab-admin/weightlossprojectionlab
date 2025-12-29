/**
 * Partners Page
 * Partnership opportunities and partner program information
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Partners | Weight Loss Projection Lab',
  description:
    'Explore partnership opportunities with Weight Loss Projection Lab. Join our partner ecosystem for technology integrations, healthcare providers, and business collaborations.',
}

export default function PartnersPage() {
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
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Partner With Us</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join our ecosystem to deliver innovative health solutions and grow your business
          </p>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 mb-16 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-6xl mb-6">🤝</div>
            <h2 className="text-3xl font-bold mb-6">
              Build the Future of Health Technology Together
            </h2>
            <p className="text-lg text-blue-100 leading-relaxed mb-8">
              Our partner program connects technology providers, healthcare organizations, and
              business innovators to create comprehensive health solutions that improve lives.
            </p>
            <a
              href="mailto:partners@weightlossproglab.com"
              className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Become a Partner
            </a>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-16">
          {/* Partnership Types */}
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Partnership Opportunities
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Technology Partners */}
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
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
                      d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Technology Partners</h3>
                <p className="text-gray-600 mb-4">
                  Integrate your technology with WLPL to create seamless experiences for our
                  mutual users.
                </p>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">✓</span>
                    <span>API access and documentation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">✓</span>
                    <span>Co-marketing opportunities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">✓</span>
                    <span>Joint solution development</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">✓</span>
                    <span>Technical support and training</span>
                  </li>
                </ul>
                <button className="text-blue-600 hover:text-blue-700 font-semibold">
                  Learn More →
                </button>
              </div>

              {/* Healthcare Partners */}
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6">
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
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Healthcare Providers</h3>
                <p className="text-gray-600 mb-4">
                  Enhance patient care with WLPL's health tracking and family management tools.
                </p>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>White-label solutions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>EHR integration support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>HIPAA-compliant infrastructure</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Dedicated account management</span>
                  </li>
                </ul>
                <button className="text-green-600 hover:text-green-700 font-semibold">
                  Learn More →
                </button>
              </div>

              {/* Reseller Partners */}
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
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
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Reseller Partners</h3>
                <p className="text-gray-600 mb-4">
                  Expand your portfolio by offering WLPL to your customer base.
                </p>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5">✓</span>
                    <span>Competitive commission structure</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5">✓</span>
                    <span>Sales and marketing resources</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5">✓</span>
                    <span>Partner portal and tools</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5">✓</span>
                    <span>Revenue sharing opportunities</span>
                  </li>
                </ul>
                <button className="text-purple-600 hover:text-purple-700 font-semibold">
                  Learn More →
                </button>
              </div>

              {/* Affiliate Partners */}
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
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
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Affiliate Partners</h3>
                <p className="text-gray-600 mb-4">
                  Earn commissions by referring customers to WLPL through our affiliate program.
                </p>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">✓</span>
                    <span>Competitive affiliate rates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">✓</span>
                    <span>90-day cookie tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">✓</span>
                    <span>Marketing materials provided</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">✓</span>
                    <span>Monthly payouts</span>
                  </li>
                </ul>
                <button className="text-orange-600 hover:text-orange-700 font-semibold">
                  Join Now →
                </button>
              </div>

              {/* Integration Partners */}
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center mb-6">
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
                      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Integration Partners</h3>
                <p className="text-gray-600 mb-4">
                  Build custom integrations to connect WLPL with your existing systems.
                </p>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">✓</span>
                    <span>RESTful API access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">✓</span>
                    <span>Webhooks and real-time events</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">✓</span>
                    <span>Comprehensive documentation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">✓</span>
                    <span>Developer support</span>
                  </li>
                </ul>
                <button className="text-red-600 hover:text-red-700 font-semibold">
                  View API Docs →
                </button>
              </div>

              {/* Strategic Partners */}
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                  <svg
                    className="w-8 h-8 text-indigo-600"
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
                <h3 className="text-xl font-bold text-gray-900 mb-3">Strategic Partners</h3>
                <p className="text-gray-600 mb-4">
                  Collaborate on large-scale initiatives that transform healthcare delivery.
                </p>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-0.5">✓</span>
                    <span>Custom partnership models</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-0.5">✓</span>
                    <span>Joint innovation programs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-0.5">✓</span>
                    <span>Executive sponsorship</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-0.5">✓</span>
                    <span>Go-to-market collaboration</span>
                  </li>
                </ul>
                <button className="text-indigo-600 hover:text-indigo-700 font-semibold">
                  Contact Us →
                </button>
              </div>
            </div>
          </section>

          {/* Partner Benefits */}
          <section>
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                Why Partner with WLPL
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
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Revenue Growth</h3>
                  <p className="text-sm text-gray-600">
                    Expand your revenue streams with our growing customer base
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
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Market Leadership</h3>
                  <p className="text-sm text-gray-600">
                    Associate with a trusted HIPAA-compliant platform
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
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Innovation Access</h3>
                  <p className="text-sm text-gray-600">
                    Leverage cutting-edge AI and health technology
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
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Dedicated Support</h3>
                  <p className="text-sm text-gray-600">
                    Partner success team and technical assistance
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Partner Success Stories */}
          <section>
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                Partner Success Stories
              </h2>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🏥</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">HealthCare Plus</h3>
                      <p className="text-sm text-gray-600">Healthcare Provider</p>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm mb-4">
                    "Integrating WLPL into our patient care platform increased patient
                    engagement by 65% and improved health outcomes significantly."
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-blue-600">+65%</span>
                    <span className="text-gray-600">Patient Engagement</span>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">💻</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">TechFit Solutions</h3>
                      <p className="text-sm text-gray-600">Technology Partner</p>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm mb-4">
                    "The API integration was seamless, and our users love the combined
                    functionality. A true win-win partnership."
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-purple-600">10K+</span>
                    <span className="text-gray-600">Active Integrations</span>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📱</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Wellness Network</h3>
                      <p className="text-sm text-gray-600">Reseller Partner</p>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm mb-4">
                    "WLPL has become our top-selling health tech product. The commission
                    structure and support are exceptional."
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-green-600">$200K+</span>
                    <span className="text-gray-600">Monthly Revenue</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Partner Resources */}
          <section>
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                Partner Resources
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start gap-4 p-6 bg-blue-50 rounded-lg">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
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
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Partner Documentation
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Comprehensive guides, best practices, and integration tutorials
                    </p>
                    <Link href="/docs" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      View Documentation →
                    </Link>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-purple-50 rounded-lg">
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
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
                        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">API Reference</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Complete API documentation with code examples and SDKs
                    </p>
                    <Link href="/api-docs" className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                      Explore API →
                    </Link>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-green-50 rounded-lg">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
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
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Marketing Assets</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Logos, banners, and co-branded marketing materials
                    </p>
                    <Link href="/press" className="text-green-600 hover:text-green-700 text-sm font-medium">
                      Download Assets →
                    </Link>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-orange-50 rounded-lg">
                  <div className="flex-shrink-0 w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
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
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Training Materials</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Videos, webinars, and certification programs
                    </p>
                    <button className="text-orange-600 hover:text-orange-700 text-sm font-medium">
                      Access Training →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Application Process */}
          <section>
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                How to Become a Partner
              </h2>

              <div className="max-w-4xl mx-auto">
                <div className="space-y-6">
                  {/* Step 1 */}
                  <div className="flex gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        1
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Submit Application
                      </h3>
                      <p className="text-gray-600">
                        Fill out our partner application form with your company details and
                        partnership interests. Our team reviews all applications within 3
                        business days.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        2
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Initial Consultation
                      </h3>
                      <p className="text-gray-600">
                        Meet with our partnership team to discuss your goals, technical
                        requirements, and explore how we can collaborate effectively.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        3
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Agreement & Setup</h3>
                      <p className="text-gray-600">
                        Review and sign the partnership agreement. Get access to our partner
                        portal, documentation, and support resources.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        4
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Launch & Support
                      </h3>
                      <p className="text-gray-600">
                        Start building, selling, or integrating with dedicated support from our
                        partner success team every step of the way.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-12 text-center">
                  <a
                    href="mailto:partners@weightlossproglab.com"
                    className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                  >
                    Apply to Become a Partner
                  </a>
                  <p className="text-sm text-gray-600 mt-4">
                    Have questions?{' '}
                    <Link href="/contact" className="text-blue-600 hover:text-blue-700 underline">
                      Contact our partnership team
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Partner with WLPL?</h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Join our growing ecosystem of partners delivering innovative health solutions to
                millions of users worldwide.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <a
                  href="mailto:partners@weightlossproglab.com"
                  className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                >
                  Contact Partnership Team
                </a>
                <Link
                  href="/api-docs"
                  className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition-colors"
                >
                  View API Documentation
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
