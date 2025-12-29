/**
 * Individual Press Release Page
 * Displays full content of a specific press release
 */

'use client'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { DownloadButton } from '@/components/press/DownloadButton'
import pressReleasesData from '@/data/press/releases.json'
import type { PressRelease } from '@/types/press'
import { use } from 'react'

interface PressReleasePageProps {
  params: Promise<{
    slug: string
  }>
}

export default function PressReleasePage({ params }: PressReleasePageProps) {
  const { slug } = use(params)
  const release = pressReleasesData.releases.find(
    (r) => r.slug === slug
  ) as PressRelease | undefined

  if (!release) {
    notFound()
  }

  const formattedDate = new Date(release.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Track contact attempt (fire and forget)
  const trackContact = async () => {
    try {
      await fetch('/api/press/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          releaseId: release.id,
          releaseSlug: release.slug,
          releaseTitle: release.title,
          source: 'release-page'
        })
      })
    } catch (error) {
      // Silently fail - don't block the user
      console.error('Failed to track contact:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/press/releases"
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
            Back to All Releases
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
              {release.category}
            </span>
            <time className="text-gray-500 text-sm">{formattedDate}</time>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {release.title}
          </h1>

          {release.subtitle && (
            <p className="text-xl text-gray-600 mb-6">{release.subtitle}</p>
          )}

          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span>{release.author}</span>
            </div>
            <a
              href={`mailto:${release.contactEmail}`}
              onClick={(e) => {
                // Track contact attempt (fire-and-forget, don't block mailto)
                fetch('/api/press/contact', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    releaseId: release.id,
                    releaseSlug: release.slug,
                    releaseTitle: release.title,
                    source: 'release-page',
                  }),
                }).catch((err) => console.error('Contact tracking failed:', err))
              }}
              className="flex items-center gap-2 hover:text-blue-600 transition-colors"
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <span>Contact</span>
            </a>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg p-10 mb-8">
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{release.content}</ReactMarkdown>
          </div>

          {/* Tags */}
          {release.tags && release.tags.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Tags</h3>
              <div className="flex gap-2 flex-wrap">
                {release.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Download & Share</h3>

          <div className="flex gap-3 flex-wrap">
            {release.pdfUrl && (
              <DownloadButton
                assetId={`release-${release.id}`}
                assetUrl={release.pdfUrl}
                label="Download PDF"
                variant="primary"
              />
            )}

            <button
              onClick={() => {
                if (navigator.share) {
                  navigator
                    .share({
                      title: release.title,
                      text: release.summary,
                      url: window.location.href,
                    })
                    .catch((err) => console.error('Share failed:', err))
                } else {
                  navigator.clipboard.writeText(window.location.href)
                  alert('Link copied to clipboard!')
                }
              }}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium text-sm transition-colors"
            >
              Share Release
            </button>

            {release.externalUrl && (
              <a
                href={release.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium text-sm transition-colors"
              >
                External Link ↗
              </a>
            )}
          </div>
        </div>

        {/* Media Contact */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-3">Media Inquiries</h3>
          <p className="text-blue-100 mb-6">
            For additional information, interviews, or quotes about this release
          </p>
          <a
            href={`mailto:${release.contactEmail}`}
            onClick={(e) => {
              // Track contact attempt (fire-and-forget, don't block mailto)
              fetch('/api/press/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  releaseId: release.id,
                  releaseSlug: release.slug,
                  releaseTitle: release.title,
                  source: 'release-page',
                }),
              }).catch((err) => console.error('Contact tracking failed:', err))
            }}
            className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Contact {release.author}
          </a>
        </div>
      </article>
    </div>
  )
}
