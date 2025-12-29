/**
 * Press Releases Archive Page
 * Lists all press releases with filtering and sorting
 */

import Link from 'next/link'
import { PressReleaseCard } from '@/components/press/PressReleaseCard'
import pressReleasesData from '@/data/press/releases.json'
import type { PressRelease } from '@/types/press'

export const metadata = {
  title: 'Press Releases | Weight Loss Projection Lab',
  description: 'Latest news and press releases from WLPL - HIPAA-compliant AI health platform',
}

export default function PressReleasesPage() {
  // Sort releases by date (newest first)
  const releases = [...pressReleasesData.releases].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  ) as PressRelease[]

  const featuredReleases = releases.filter((r) => r.featured)
  const otherReleases = releases.filter((r) => !r.featured)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/press"
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
            Back to Press Center
          </Link>

          <h1 className="text-5xl font-bold text-gray-900 mb-4">Press Releases</h1>
          <p className="text-xl text-gray-600">
            Latest news and announcements from Weight Loss Projection Lab
          </p>
        </div>

        {/* Featured Releases */}
        {featuredReleases.length > 0 && (
          <section className="mb-12">
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-2">
                <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                Featured Releases
              </h2>
              <div className="space-y-8">
                {featuredReleases.map((release) => (
                  <PressReleaseCard key={release.id} release={release} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* All Other Releases */}
        {otherReleases.length > 0 && (
          <section>
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">
                {featuredReleases.length > 0 ? 'Archive' : 'All Releases'}
              </h2>
              <div className="space-y-8">
                {otherReleases.map((release) => (
                  <PressReleaseCard key={release.id} release={release} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Empty State */}
        {releases.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-gray-400"
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
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Press Releases Yet</h3>
            <p className="text-gray-600">Check back soon for updates and announcements.</p>
          </div>
        )}

        {/* Contact CTA */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-3">Media Inquiries</h3>
          <p className="text-blue-100 mb-6">
            For interviews, quotes, or additional information, contact our press team
          </p>
          <a
            href="mailto:press@weightlossproglab.com"
            onClick={(e) => {
              // Track contact attempt from releases list page
              fetch('/api/press/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  releaseId: 'general',
                  releaseSlug: 'general',
                  releaseTitle: 'General Press Inquiry',
                  source: 'release-list',
                }),
              }).catch((err) => console.error('Contact tracking failed:', err))
            }}
            className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Contact Press Team
          </a>
        </div>
      </div>
    </div>
  )
}
