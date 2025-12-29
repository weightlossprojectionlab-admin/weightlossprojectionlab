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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Query by slug only (simpler, no index required)
    const q = query(
      collection(db, 'job_postings'),
      where('slug', '==', slug),
      limit(1)
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job not found',
        },
        { status: 404 }
      )
    }

    const doc = snapshot.docs[0]
    const job: JobPosting = {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    } as JobPosting

    // Check if published (client-side check to avoid index)
    if (job.status !== 'published') {
      return NextResponse.json(
        {
          success: false,
          error: 'Job not found',
        },
        { status: 404 }
      )
    }

    logger.info(`Fetched job: ${job.title} (${job.id})`)

    return NextResponse.json({
      success: true,
      data: job,
    })
  } catch (error: any) {
    logger.error('Error fetching job:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch job',
      },
      { status: 500 }
    )
  }
}
