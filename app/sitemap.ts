import type { MetadataRoute } from 'next'

const BASE_URL = 'https://www.weightlossprojectionlab.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  // Public marketing pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
  ]

  // Blog pages (product discovery hub)
  const blogSlugs = [
    'dashboard',
    'profile',
    'patients',
    'family-care',
    'appointments',
    'meal-tracking',
    'weight-tracking',
    'ai-health-reports',
    'wpl-health-reports',
    'smart-shopping',
    'inventory-management',
    'patient-care',
    'providers',
    'medications',
    'vitals-tracking',
    'medical-documents',
  ]

  const blogPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...blogSlugs.map((slug) => ({
      url: `${BASE_URL}/blog/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]

  // Documentation pages
  const docPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/docs`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/docs/getting-started`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/docs/getting-started/signup`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/docs/getting-started/first-log`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/docs/getting-started/insights`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/docs/user-guides`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  const userGuideSlugs = [
    'offline-mode',
    'data-export',
    'caregiver-mode',
    'goals',
    'weight-logging',
    'patient-profiles',
    'progress-tracking',
    'barcode-scanning',
    'recipes',
    'notifications',
    'shopping',
    'meal-tracking',
    'household-duties',
    'family-setup',
  ]

  const userGuidePages: MetadataRoute.Sitemap = userGuideSlugs.map((slug) => ({
    url: `${BASE_URL}/docs/user-guides/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  return [...staticPages, ...blogPages, ...docPages, ...userGuidePages]
}
