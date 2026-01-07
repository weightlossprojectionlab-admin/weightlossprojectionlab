/**
 * Public API endpoint for job postings
 * GET /api/jobs - List all published job postings
 */

import { NextResponse } from 'next/server'
import { collection, query, where, getDocs, orderBy, limit as firestoreLimit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import type { JobPosting } from '@/types/jobs'

export const dynamic = 'force-dynamic'
export const revalidate = 300 // Revalidate every 5 minutes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const locationType = searchParams.get('locationType')
    const limitParam = searchParams.get('limit')
    const limitNum = limitParam ? parseInt(limitParam, 10) : 100

    // Build query - simplified to avoid index requirements
    let q = query(
      collection(db, 'job_postings'),
      where('status', '==', 'published'),
      firestoreLimit(Math.min(limitNum, 100)) // Max 100 jobs
    )

    const snapshot = await getDocs(q)
    let jobs: JobPosting[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    })) as JobPosting[]

    // Apply client-side filters if needed
    if (department) {
      jobs = jobs.filter(job => job.department === department)
    }

    if (locationType) {
      jobs = jobs.filter(job => job.locationType === locationType)
    }

    // Sort by creation date (newest first)
    jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    logger.info(`Fetched ${jobs.length} published jobs`)

    return NextResponse.json({
      success: true,
      data: jobs,
      count: jobs.length,
    })
  } catch (error: any) {
    logger.error('Error fetching jobs:', error as Error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch jobs',
      },
      { status: 500 }
    )
  }
}
