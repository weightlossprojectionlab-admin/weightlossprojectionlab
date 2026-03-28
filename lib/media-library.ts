'use client'

/**
 * Media Library — Upload, tag, and reuse images across marketing content
 *
 * Storage path: admin/media-library/{timestamp}_{sanitized-name}.{ext}
 * Firestore: admin/media_library (document with items array)
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { storage, db, auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'

export interface MediaItem {
  id: string
  url: string
  storagePath: string
  filename: string
  tags: string[]
  uploadedAt: string
  width?: number
  height?: number
}

const MEDIA_TAGS = [
  'caregiver',
  'family',
  'medication',
  'vitals',
  'pets',
  'seniors',
  'kids',
  'dashboard',
  'mobile',
  'doctor',
  'hospital',
  'wellness',
  'food',
  'exercise',
  'general',
  // Aspect ratios — for platform filtering
  '1:1',
  '9:16',
  '16:9',
  '4:5',
  '2:3',
] as const

export type MediaTag = typeof MEDIA_TAGS[number]
export { MEDIA_TAGS }

function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.-]/g, '-').replace(/-+/g, '-')
}

/**
 * Upload an image to the media library
 */
export async function uploadMediaImage(
  file: File,
  tags: string[],
): Promise<MediaItem> {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')

  const timestamp = Date.now()
  const ext = file.name.split('.').pop() || 'png'
  const sanitized = sanitizeFilename(file.name.replace(/\.[^.]+$/, ''))
  const storagePath = `admin/media-library/${timestamp}_${sanitized}.${ext}`

  const storageRef = ref(storage, storagePath)
  await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      uploadedBy: user.uid,
      uploadedAt: new Date().toISOString(),
      tags: tags.join(','),
    },
  })

  const url = await getDownloadURL(storageRef)

  const item: MediaItem = {
    id: `${timestamp}_${sanitized}`,
    url,
    storagePath,
    filename: file.name,
    tags,
    uploadedAt: new Date().toISOString(),
  }

  // Save to Firestore index
  await addToMediaIndex(item)

  logger.info('[MediaLibrary] Image uploaded', { filename: file.name, tags })
  return item
}

/**
 * Get all media library items from Firestore index
 */
export async function getMediaLibrary(): Promise<MediaItem[]> {
  try {
    const docRef = doc(db, 'admin', 'media_library')
    const snap = await getDoc(docRef)
    if (!snap.exists()) return []
    return snap.data().items || []
  } catch (error) {
    logger.error('[MediaLibrary] Failed to load library', error as Error)
    return []
  }
}

/**
 * Add item to Firestore media index
 */
async function addToMediaIndex(item: MediaItem): Promise<void> {
  const docRef = doc(db, 'admin', 'media_library')
  const snap = await getDoc(docRef)
  const existing: MediaItem[] = snap.exists() ? snap.data().items || [] : []
  existing.unshift(item) // newest first
  await setDoc(docRef, { items: existing, updatedAt: new Date().toISOString() })
}

/**
 * Remove item from media library index
 */
export async function removeFromMediaLibrary(itemId: string): Promise<void> {
  const docRef = doc(db, 'admin', 'media_library')
  const snap = await getDoc(docRef)
  if (!snap.exists()) return
  const items: MediaItem[] = snap.data().items || []
  const filtered = items.filter(i => i.id !== itemId)
  await setDoc(docRef, { items: filtered, updatedAt: new Date().toISOString() })
}

/**
 * Update tags for a media item
 */
export async function updateMediaTags(itemId: string, tags: string[]): Promise<void> {
  const docRef = doc(db, 'admin', 'media_library')
  const snap = await getDoc(docRef)
  if (!snap.exists()) return
  const items: MediaItem[] = snap.data().items || []
  const updated = items.map(i => i.id === itemId ? { ...i, tags } : i)
  await setDoc(docRef, { items: updated, updatedAt: new Date().toISOString() })
}

/**
 * Find best matching images for given keywords
 */
export function findMatchingMedia(items: MediaItem[], keywords: string[]): MediaItem[] {
  if (!keywords.length || !items.length) return items

  const normalizedKeywords = keywords.map(k => k.toLowerCase())

  return items
    .map(item => {
      const score = item.tags.reduce((s, tag) => {
        return s + (normalizedKeywords.some(k => tag.includes(k) || k.includes(tag)) ? 1 : 0)
      }, 0)
      return { item, score }
    })
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)
}
