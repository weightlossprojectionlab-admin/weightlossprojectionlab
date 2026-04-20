import type { Metadata } from 'next'

export const SITE_URL = 'https://www.wellnessprojectionlab.com'
export const SITE_NAME = 'Wellness Projection Lab'
export const DEFAULT_OG_IMAGE = '/screenshots/family-care/family-dashboard-overview-desktop-light.png'

export interface PageMetaInput {
  title: string
  description: string
  path: string
  image?: string
  imageAlt?: string
  type?: 'website' | 'article'
  keywords?: string | string[]
  noIndex?: boolean
}

export function buildPageMetadata(input: PageMetaInput): Metadata {
  const {
    title,
    description,
    path,
    image = DEFAULT_OG_IMAGE,
    imageAlt,
    type = 'website',
    keywords,
    noIndex,
  } = input

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = `${SITE_URL}${normalizedPath === '/' ? '' : normalizedPath}`
  const imageUrl = image.startsWith('http') ? image : `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`
  const resolvedAlt = imageAlt || `${title} — ${SITE_NAME}`

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: url,
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type,
      locale: 'en_US',
      siteName: SITE_NAME,
      title,
      description,
      url,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: resolvedAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}
