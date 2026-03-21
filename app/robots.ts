import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/blog/', '/docs/', '/pricing'],
        disallow: [
          '/api/',
          '/auth/',
          '/patients/',
          '/progress/',
          '/shopping/',
          '/log-meal/',
          '/settings/',
          '/admin/',
          '/households/',
          '/recipes/',
          '/notifications/',
          '/onboarding/',
          '/invite/',
        ],
      },
    ],
    sitemap: 'https://www.weightlossprojectionlab.com/sitemap.xml',
  }
}
