/**
 * Blog post helpers — one place that builds the metadata + JSON-LD every
 * caregiver post needs, so posts stop repeating identical boilerplate.
 *
 * A post declares a single `BlogPostConfig` and calls:
 *   export const metadata = buildBlogPostMetadata(CONFIG)
 *   <JsonLd data={buildBlogPostJsonLd(CONFIG)} />   // JsonLd accepts an array
 */

import type { Metadata } from 'next'
import {
  blogPostingSchema,
  faqPageSchema,
  softwareApplicationSchema,
  breadcrumbListSchema,
  type FAQItem,
} from '@/lib/json-ld'
import { getBlogAuthor } from '@/lib/blog-authors'

export interface BlogPostConfig {
  slug: string
  title: string
  description: string
  keywords: string
  datePublished: string
  dateModified: string
  /** In-app feature route this post's CTA drives; also the SoftwareApplication url. */
  appUrl: string
  /** One-line product framing for the SoftwareApplication schema. */
  appDescription: string
  /** Same const that drives the on-page FaqAccordion (single source → schema + render). */
  faqItems: FAQItem[]
  /** Optional shorter keyword string for the BlogPosting schema (defaults to `keywords`). */
  schemaKeywords?: string
  /** Author id from lib/blog-authors (defaults to the founder). */
  authorId?: string
}

export function buildBlogPostMetadata(c: BlogPostConfig): Metadata {
  const url = `/blog/${c.slug}`
  return {
    title: { absolute: `${c.title} | Wellness Projection Lab` },
    description: c.description,
    keywords: c.keywords,
    alternates: { canonical: url },
    openGraph: { title: c.title, description: c.description, type: 'article', url },
    twitter: { card: 'summary_large_image', title: c.title, description: c.description },
  }
}

/** Returns the 4 schema objects (BlogPosting+Person, FAQPage, SoftwareApplication, Breadcrumb). */
export function buildBlogPostJsonLd(c: BlogPostConfig) {
  const author = getBlogAuthor(c.authorId)
  const url = `/blog/${c.slug}`
  return [
    blogPostingSchema({
      headline: c.title,
      description: c.description,
      slug: c.slug,
      datePublished: c.datePublished,
      dateModified: c.dateModified,
      keywords: c.schemaKeywords ?? c.keywords,
      author: { name: author.name, url: author.url, jobTitle: author.role, knowsAbout: author.knowsAbout },
    }),
    faqPageSchema(c.faqItems),
    softwareApplicationSchema({
      name: 'Wellness Projection Lab',
      description: c.appDescription,
      url: c.appUrl,
    }),
    breadcrumbListSchema([
      { name: 'Blog', path: '/blog' },
      { name: c.title, path: url },
    ]),
  ]
}
