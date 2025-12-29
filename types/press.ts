/**
 * Type definitions for press & media functionality
 */

import { Timestamp } from 'firebase/firestore'

export interface PressRelease {
  id: string
  slug: string
  title: string
  subtitle: string
  date: string // ISO date string
  category: 'product' | 'company' | 'partnership' | 'certification' | 'feature'
  summary: string
  content: string // Markdown or HTML content
  author: string
  contactEmail: string
  featured: boolean
  tags: string[]
  imageUrl?: string
  pdfUrl?: string
  externalUrl?: string
}

export interface Executive {
  id: string
  name: string
  title: string
  bio: string
  photoUrl: string
  email: string
  linkedin?: string
  twitter?: string
  order: number // For display ordering
}

export interface PressSubscriber {
  email: string
  subscribedAt: Timestamp
  source: 'press-page' | 'blog' | 'newsletter-footer' | 'other'
  verified: boolean
  ipAddress?: string
  userAgent?: string
}

export interface PressDownload {
  id: string
  asset: string // Asset identifier (e.g., 'logos', 'brand-guidelines', 'fact-sheet')
  downloadedAt: Timestamp
  ipAddress?: string
  userAgent?: string
  referrer?: string
}

export interface PressDownloadStats {
  asset: string
  totalDownloads: number
  lastDownloaded?: Date
  downloadsByDay: Record<string, number>
}

export interface NewsArticle {
  id: string
  title: string
  publication: string
  date: string
  excerpt: string
  url: string
  imageUrl?: string
}

export interface MediaAsset {
  id: string
  name: string
  description: string
  category: 'logo' | 'screenshot' | 'guideline' | 'photo' | 'document' | 'kit'
  fileUrl: string
  fileSize?: string
  fileType: string
  thumbnailUrl?: string
  downloadCount: number
}

export interface BrandColors {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  error: string
  success: string
  warning: string
}

export interface CompanyFactSheet {
  name: string
  founded: string
  headquarters: string
  industry: string[]
  certifications: string[]
  website: string
  description: string
  keyFeatures: string[]
  statistics: {
    label: string
    value: string
  }[]
  contact: {
    press: string
    partnerships: string
    support: string
  }
}

// API Response Types
export interface NewsletterSubscriptionResponse {
  success: boolean
  message: string
  alreadySubscribed?: boolean
}

export interface DownloadResponse {
  success: boolean
  downloadUrl: string
  message?: string
}

export interface PressReleasesResponse {
  releases: PressRelease[]
  total: number
  page: number
  pageSize: number
}

// Press Contact Tracking
export interface PressContact {
  id: string
  releaseId: string
  releaseSlug: string
  releaseTitle: string
  contactedAt: Timestamp
  ipAddress?: string
  userAgent?: string
  referrer?: string
  source: 'release-page' | 'release-list' | 'email'
}

export interface PressContactStats {
  releaseSlug: string
  releaseTitle: string
  totalContacts: number
  lastContactedAt?: Date
  contactsByDay: Record<string, number>
}

export interface ContactResponse {
  success: boolean
  message: string
}
