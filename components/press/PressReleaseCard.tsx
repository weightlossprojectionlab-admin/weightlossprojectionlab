/**
 * Press Release Card Component
 * Reusable card for displaying press releases with consistent styling
 */

'use client'

import Link from 'next/link'
import type { PressRelease } from '@/types/press'
import { DownloadButton } from './DownloadButton'

interface PressReleaseCardProps {
  release: PressRelease
  showFullContent?: boolean
}

export function PressReleaseCard({ release, showFullContent = false }: PressReleaseCardProps) {
  const formattedDate = new Date(release.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  })

  return (
    <div className="border-b border-gray-200 pb-8 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="text-xl font-bold text-gray-900">{release.title}</h3>
        <span className="text-sm text-gray-500 whitespace-nowrap">{formattedDate}</span>
      </div>

      {release.subtitle && (
        <p className="text-lg text-gray-700 font-medium mb-3">{release.subtitle}</p>
      )}

      <p className="text-gray-700 leading-relaxed mb-4">
        {showFullContent ? release.content : release.summary}
      </p>

      <div className="flex gap-3 flex-wrap">
        <Link
          href={`/press/releases/${release.slug}`}
          className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
        >
          Read Full Release →
        </Link>

        {release.pdfUrl && (
          <DownloadButton
            assetId={`release-${release.id}`}
            assetUrl={release.pdfUrl}
            label="Download PDF"
            variant="ghost"
          />
        )}

        {release.externalUrl && (
          <a
            href={release.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-700 font-medium text-sm transition-colors"
          >
            External Link ↗
          </a>
        )}
      </div>

      {release.tags && release.tags.length > 0 && (
        <div className="flex gap-2 mt-4 flex-wrap">
          {release.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
