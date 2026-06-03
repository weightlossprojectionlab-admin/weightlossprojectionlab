import type { MetadataRoute } from 'next'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'https://www.wellnessprojectionlab.com'

/**
 * Derive child route slugs from the filesystem so the sitemap can't drift from
 * the actual pages (DRY — no hand-maintained slug list to forget to update).
 * Runs at build time (this sitemap is statically generated), where the app/
 * source tree is present. Skips dynamic ([slug]), route-group ((group)), and
 * private (_x) folders, and only counts directories that actually have a page.
 */
function routeSlugs(relDir: string): string[] {
  try {
    const dir = path.join(process.cwd(), relDir)
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => !/^[[(_]/.test(name))
      .filter((name) => fs.readdirSync(path.join(dir, name)).some((f) => f.startsWith('page.')))
      .sort()
  } catch {
    return []
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  // Primary marketing + conversion pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/caregivers/aging-parents`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/caregivers/new-parents`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/franchise`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/find-a-provider`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/careers`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/partners`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/press`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/discover`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ]

  // Legal + compliance pages
  const legalPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE_URL}/hipaa`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${BASE_URL}/baa`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/security`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${BASE_URL}/accessibility`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/franchise-agreement`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/data-policy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  // Blog pages (product discovery hub) — derived from app/blog/* so new posts
  // appear automatically.
  const blogSlugs = routeSlugs('app/blog')

  const blogPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...blogSlugs.map((slug) => ({
      url: `${BASE_URL}/blog/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]

  // Documentation pages
  const docPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/docs`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/docs/getting-started`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/docs/getting-started/signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/docs/getting-started/first-log`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/docs/getting-started/insights`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/docs/user-guides`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ]

  // Derived from app/docs/user-guides/* so new guides (e.g. inventory) appear
  // automatically — no hand-maintained list to drift.
  const userGuideSlugs = routeSlugs('app/docs/user-guides')

  const userGuidePages: MetadataRoute.Sitemap = userGuideSlugs.map((slug) => ({
    url: `${BASE_URL}/docs/user-guides/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  return [...staticPages, ...legalPages, ...blogPages, ...docPages, ...userGuidePages]
}
