import { adminDb } from '@/lib/firebase-admin'

/**
 * Check whether a `job_postings` doc with this slug already exists.
 * Used to enforce slug uniqueness at write time — the AI generator
 * happily fabricates the same slug on repeat runs, and the public
 * detail route does `where('slug', '==', x).limit(1)`, so duplicates
 * silently shadow each other.
 *
 * Pass `excludeId` to ignore a specific doc (e.g. on rename so the
 * doc doesn't conflict with itself).
 */
export async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
  const snap = await adminDb
    .collection('job_postings')
    .where('slug', '==', slug)
    .limit(2)
    .get()

  if (snap.empty) return false
  if (excludeId) {
    return snap.docs.some(d => d.id !== excludeId)
  }
  return true
}
