/**
 * Public API endpoint for individual job posting
 * GET /api/jobs/[slug] - Get single job by slug
 */

import { NextResponse } from 'next/server'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import type { JobPosting } from '@/types/jobs'

export const dynamic = 'force-dynamic'
export const revalidate = 300 // Revalidate every 5 minutes

const notFound = () =>
  NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Filter on BOTH slug and status. The Firestore `list` rule on
  // `job_postings` allows non-admin reads only when the query itself
  // is provably restricted to status=='published' — without that
  // clause, a duplicate draft doc sharing the slug (the AI generator
  // creates a fresh doc on every run, so this happens) causes the
  // entire query to be rejected as permission-denied. Two equality
  // filters need no composite index.
  let snapshot
  try {
    snapshot = await getDocs(
      query(
        collection(db, 'job_postings'),
        where('slug', '==', slug),
        where('status', '==', 'published'),
        limit(1),
      ),
    )
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      return notFound()
    }
    logger.error('Error fetching job:', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch job' },
      { status: 500 },
    )
  }

  if (snapshot.empty) return notFound()

  const doc = snapshot.docs[0]
  const job: JobPosting = {
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
  } as JobPosting

  logger.info(`Fetched job: ${job.title} (${job.id})`)
  return NextResponse.json({ success: true, data: job })
}
