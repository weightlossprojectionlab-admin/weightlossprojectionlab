/**
 * Admin API: Generate Jobs from Codebase
 * POST /api/admin/jobs/generate
 *
 * Generates job postings using AI based on codebase analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { adminDb } from '@/lib/firebase-admin'
import { generateJobsFromCodebase } from '@/lib/ai/job-generator'
import { logger } from '@/lib/logger'
import type { JobPosting } from '@/types/jobs'

/**
 * Generate jobs from codebase analysis
 * POST /api/admin/jobs/generate
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Verify admin role
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
    const userData = userDoc.data()

    if (!userData?.role || userData.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { commitCount = 10, saveToFirestore = false } = body

    logger.info('[Admin] Generating jobs from codebase', {
      admin: decodedToken.uid,
      commitCount,
      saveToFirestore,
    })

    // Fetch existing jobs
    const existingJobsSnapshot = await adminDb.collection('job_postings').get()
    const existingJobs = existingJobsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as JobPosting
    })

    // Generate jobs - with fallback if git analysis fails
    let generatedJobs
    try {
      generatedJobs = await generateJobsFromCodebase({
        commitCount,
        existingJobs,
      })
    } catch (gitError) {
      logger.warn('[Admin] Git analysis failed, using ML fallback', { error: (gitError as Error).message })

      // Fallback: Generate jobs using ML model directly
      const { generateJobsML } = await import('@/lib/ml/job-generator/model')
      const mlResult = await generateJobsML({
        projectRoot: process.cwd(),
        maxJobs: 3,
        minConfidence: 0.7,
      })

      // Convert ML results to expected format
      generatedJobs = mlResult.jobs.map((mlJob) => ({
        job: mlJob.job,
        metadata: {
          generatedFrom: 'ml-fallback',
          analyzedFiles: [],
          analyzedCommits: [],
          confidence: mlJob.confidence,
          generatedAt: new Date(),
          techStack: mlJob.classification.techStack,
          model: 'wlpl-ml-v1.0.0',
        },
        confidence: mlJob.confidence,
        rationale: mlJob.classification.reasoning.join('. '),
      }))
    }

    // Save to Firestore if requested
    const savedJobIds: string[] = []
    if (saveToFirestore) {
      for (const { job } of generatedJobs) {
        const jobData = {
          ...job,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: decodedToken.uid,
          status: 'draft', // Always create as draft
          isAIGenerated: true, // Mark as AI-generated
        }

        const docRef = await adminDb.collection('job_postings').add(jobData)
        savedJobIds.push(docRef.id)
      }

      logger.info('[Admin] Jobs saved to Firestore', {
        count: savedJobIds.length,
        jobIds: savedJobIds,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        generatedJobs: generatedJobs.map(({ job, metadata, confidence, rationale }) => ({
          job,
          metadata,
          confidence,
          rationale,
        })),
        savedJobIds: saveToFirestore ? savedJobIds : undefined,
        existingJobCount: existingJobs.length,
      },
    })
  } catch (error) {
    logger.error('[Admin] Job generation failed', error as Error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate jobs',
      },
      { status: 500 }
    )
  }
}
