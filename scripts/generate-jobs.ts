#!/usr/bin/env tsx
/**
 * CLI Tool: Generate Jobs from Codebase
 *
 * Usage:
 *   npm run generate-jobs              # Analyze last 10 commits
 *   npm run generate-jobs -- --count 20 # Analyze last 20 commits
 *   npm run generate-jobs -- --commit abc123 # Analyze specific commit
 *   npm run generate-jobs -- --save    # Save to Firestore directly
 *   npm run generate-jobs -- --preview # Preview only (default)
 *
 * This script:
 * 1. Analyzes recent git commits
 * 2. Examines codebase structure and tech stack
 * 3. Generates job postings using AI
 * 4. Outputs results or saves to Firestore
 */

import { generateJobsFromCodebase } from '../lib/ai/job-generator'
import { logger } from '../lib/logger'
import type { JobPosting } from '@/types/jobs'
import * as admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { join } from 'path'

// Parse CLI arguments
interface CLIArgs {
  count?: number
  commit?: string
  save: boolean
  preview: boolean
  help: boolean
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2)
  const parsed: CLIArgs = {
    save: false,
    preview: true,
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '--count':
      case '-c':
        parsed.count = parseInt(args[++i])
        break
      case '--commit':
        parsed.commit = args[++i]
        break
      case '--save':
      case '-s':
        parsed.save = true
        parsed.preview = false
        break
      case '--preview':
      case '-p':
        parsed.preview = true
        break
      case '--help':
      case '-h':
        parsed.help = true
        break
    }
  }

  return parsed
}

function showHelp() {
  console.log(`
AI Job Generator - Generate job postings from codebase analysis

Usage:
  npm run generate-jobs [options]

Options:
  -c, --count <n>      Analyze last N commits (default: 10)
  --commit <hash>      Analyze specific commit
  -s, --save           Save generated jobs to Firestore
  -p, --preview        Preview only (default)
  -h, --help           Show this help message

Examples:
  npm run generate-jobs                    # Preview jobs from last 10 commits
  npm run generate-jobs -- --count 20      # Analyze last 20 commits
  npm run generate-jobs -- --save          # Save to Firestore
  npm run generate-jobs -- --commit abc123 # Analyze specific commit

Generated jobs are created as "draft" status and require admin review before publishing.
`)
}

/**
 * Initialize Firebase Admin
 */
function initializeFirebase() {
  if (admin.apps.length > 0) {
    return admin.app()
  }

  try {
    // Load environment variables
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase Admin credentials in environment variables')
    }

    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
  } catch (error) {
    logger.error('[Generate Jobs] Firebase initialization failed', error as Error)
    throw error
  }
}

/**
 * Fetch existing jobs from Firestore
 */
async function fetchExistingJobs(): Promise<JobPosting[]> {
  try {
    const db = admin.firestore()
    const snapshot = await db.collection('jobs').get()

    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as JobPosting
    })
  } catch (error) {
    logger.warn('[Generate Jobs] Could not fetch existing jobs', error as Error)
    return []
  }
}

/**
 * Save generated job to Firestore
 */
async function saveJobToFirestore(job: Partial<JobPosting>): Promise<string> {
  const db = admin.firestore()
  const jobsRef = db.collection('jobs')

  const jobData = {
    ...job,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: 'AI_GENERATOR', // Special identifier for AI-generated jobs
  }

  const docRef = await jobsRef.add(jobData)
  return docRef.id
}

/**
 * Main execution
 */
async function main() {
  const args = parseArgs()

  if (args.help) {
    showHelp()
    process.exit(0)
  }

  console.log('\n🤖 AI Job Generator\n')
  console.log('─'.repeat(60))

  try {
    // Step 1: Analyze codebase
    console.log('\n📊 Analyzing codebase...')
    console.log(`   Commits to analyze: ${args.count || 10}`)
    if (args.commit) {
      console.log(`   Specific commit: ${args.commit}`)
    }

    // Fetch existing jobs if saving
    let existingJobs: JobPosting[] = []
    if (args.save) {
      console.log('\n🔥 Initializing Firebase...')
      initializeFirebase()
      existingJobs = await fetchExistingJobs()
      console.log(`   Found ${existingJobs.length} existing jobs`)
    }

    // Generate jobs
    console.log('\n🧠 Generating job postings with AI...')
    const generatedJobs = await generateJobsFromCodebase({
      commitCount: args.count,
      commitHash: args.commit,
      existingJobs,
    })

    console.log(`\n✅ Generated ${generatedJobs.length} job postings\n`)
    console.log('─'.repeat(60))

    // Display results
    if (generatedJobs.length === 0) {
      console.log('\n📝 No new jobs needed based on codebase analysis.')
      console.log('   This could mean:')
      console.log('   • Existing jobs already cover current needs')
      console.log('   • Recent commits are minor/maintenance work')
      console.log('   • Not enough activity to justify new roles\n')
      process.exit(0)
    }

    for (let i = 0; i < generatedJobs.length; i++) {
      const { job, metadata, confidence, rationale } = generatedJobs[i]

      console.log(`\n📋 Job ${i + 1}: ${job.title}`)
      console.log(`   Department: ${job.department}`)
      console.log(`   Salary: $${(job.salaryMin! / 1000).toFixed(0)}K - $${(job.salaryMax! / 1000).toFixed(0)}K`)
      console.log(`   Location: ${job.location}`)
      console.log(`   Confidence: ${(confidence * 100).toFixed(0)}%`)
      console.log(`   Rationale: ${rationale}`)
      console.log(`   Tech Stack: ${metadata.techStack.join(', ')}`)
      console.log(`   Generated from commit: ${metadata.generatedFrom}`)
      console.log(`   Analyzed ${metadata.analyzedCommits?.length || 0} commits`)

      if (args.preview) {
        console.log('\n   📝 Job Details:')
        console.log(`   About: ${job.about?.substring(0, 150)}...`)
        console.log(`   Why Critical: ${job.whyCritical?.substring(0, 150)}...`)
        console.log(`\n   Responsibilities:`)
        job.responsibilities?.slice(0, 3).forEach(r => console.log(`     • ${r}`))
        console.log(`\n   Required Qualifications:`)
        job.requiredQualifications?.slice(0, 3).forEach(q => console.log(`     • ${q}`))
      }

      if (args.save) {
        try {
          const jobId = await saveJobToFirestore(job)
          console.log(`   ✅ Saved to Firestore: ${jobId}`)
        } catch (error) {
          console.error(`   ❌ Failed to save: ${(error as Error).message}`)
        }
      }

      console.log('─'.repeat(60))
    }

    // Summary
    console.log('\n📊 Summary:')
    console.log(`   Total jobs generated: ${generatedJobs.length}`)
    console.log(`   Average confidence: ${(generatedJobs.reduce((sum, j) => sum + j.confidence, 0) / generatedJobs.length * 100).toFixed(0)}%`)

    if (args.save) {
      console.log('\n   ✅ Jobs saved to Firestore as DRAFT status')
      console.log('   Next steps:')
      console.log('   1. Visit /admin/careers to review generated jobs')
      console.log('   2. Edit and refine job descriptions')
      console.log('   3. Change status to "published" to make them live\n')
    } else {
      console.log('\n   ℹ️  Preview mode - jobs not saved')
      console.log('   Run with --save flag to save to Firestore\n')
    }

  } catch (error) {
    console.error('\n❌ Error:', (error as Error).message)
    logger.error('[Generate Jobs] Script failed', error as Error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { main }
