import type { MetadataRoute } from 'next'

const PROTECTED_PATHS = [
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
]

const PUBLIC_PATHS = ['/', '/blog/', '/docs/', '/pricing']

const AI_SEARCH_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bytespider',
  'Amazonbot',
  'CCBot',
  'cohere-ai',
  'Meta-ExternalAgent',
  'Meta-ExternalFetcher',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: PUBLIC_PATHS,
        disallow: PROTECTED_PATHS,
      },
      ...AI_SEARCH_BOTS.map((bot) => ({
        userAgent: bot,
        allow: PUBLIC_PATHS,
        disallow: PROTECTED_PATHS,
      })),
    ],
    sitemap: 'https://www.wellnessprojectionlab.com/sitemap.xml',
    host: 'https://www.wellnessprojectionlab.com',
  }
}
