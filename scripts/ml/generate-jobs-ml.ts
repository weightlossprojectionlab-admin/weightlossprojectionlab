#!/usr/bin/env tsx
/**
 * CLI Tool: Generate Jobs Using Custom ML System
 *
 * STANDALONE ML SYSTEM - Does NOT use OpenAI or external APIs
 *
 * Usage:
 *   npx tsx scripts/ml/generate-jobs-ml.ts              # Generate jobs (preview)
 *   npx tsx scripts/ml/generate-jobs-ml.ts --save       # Save to Firestore
 *   npx tsx scripts/ml/generate-jobs-ml.ts --max 5      # Generate up to 5 jobs
 *   npx tsx scripts/ml/generate-jobs-ml.ts --min-confidence 0.6  # Higher confidence threshold
 *   npx tsx scripts/ml/generate-jobs-ml.ts --report     # Generate detailed reports
 *
 * This script uses our custom ML model (lib/ml/) NOT the AI orchestrator (lib/ai/)
 */

import {
  generateJobsML,
  generateJobsSummary,
  generateClassificationReport,
  validateAllJobs,
  type MLModelConfig,
} from '@/lib/ml/job-generator/model'
import type { JobPosting } from '@/types/jobs'
import * as admin from 'firebase-admin'
import { writeFileSync } from 'fs'
import { join } from 'path'

/**
 * CLI Arguments
 */
interface CLIArgs {
  save: boolean
  report: boolean
  maxJobs: number
  minConfidence: number
  output?: string
  help: boolean
}

/**
 * Parse CLI arguments
 */
function parseArgs(): CLIArgs {
  const args = process.argv.slice(2)
  const parsed: CLIArgs = {
    save: false,
    report: false,
    maxJobs: 3,
    minConfidence: 0.4,
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '--save':
      case '-s':
        parsed.save = true
        break
      case '--report':
      case '-r':
        parsed.report = true
        break
      case '--max':
      case '-m':
        parsed.maxJobs = parseInt(args[++i])
        break
      case '--min-confidence':
      case '-c':
        parsed.minConfidence = parseFloat(args[++i])
        break
      case '--output':
      case '-o':
        parsed.output = args[++i]
        break
      case '--help':
      case '-h':
        parsed.help = true
        break
    }
  }

  return parsed
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
ML Job Generator - Generate job postings using custom ML model

Usage:
  npx tsx scripts/ml/generate-jobs-ml.ts [options]

Options:
  -s, --save                     Save generated jobs to Firestore
  -r, --report                   Generate detailed reports for each job
  -m, --max <n>                  Maximum number of jobs to generate (default: 3)
  -c, --min-confidence <n>       Minimum confidence threshold 0-1 (default: 0.4)
  -o, --output <path>            Save reports to file
  -h, --help                     Show this help message

Examples:
  # Preview jobs (no save)
  npx tsx scripts/ml/generate-jobs-ml.ts

  # Generate and save to Firestore
  npx tsx scripts/ml/generate-jobs-ml.ts --save

  # Generate up to 5 jobs with 60% minimum confidence
  npx tsx scripts/ml/generate-jobs-ml.ts --max 5 --min-confidence 0.6

  # Generate detailed reports
  npx tsx scripts/ml/generate-jobs-ml.ts --report --output jobs-report.txt

About:
  This script uses a CUSTOM ML system built in-house at lib/ml/
  It does NOT use OpenAI, Anthropic, or any external AI API
  The model uses rule-based classification + pattern matching + templates
  Fast inference: < 2 seconds
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
    console.error('[ML CLI] Firebase initialization failed:', (error as Error).message)
    throw error
  }
}

/**
 * Save job to Firestore
 */
async function saveJobToFirestore(job: Partial<JobPosting>): Promise<string> {
  const db = admin.firestore()
  const jobsRef = db.collection('jobs')

  const jobData = {
    ...job,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: 'ML_GENERATOR', // Special identifier for ML-generated jobs
    isAIGenerated: false, // This is ML-generated, not AI-generated
    isMLGenerated: true, // New flag for ML generation
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

  console.log('\n' + '='.repeat(80))
  console.log('ML JOB GENERATOR - Custom ML Model (NOT using OpenAI)')
  console.log('='.repeat(80))

  try {
    // Configure ML model
    const config: MLModelConfig = {
      maxJobs: args.maxJobs,
      minConfidence: args.minConfidence,
    }

    // Initialize Firebase if saving
    if (args.save) {
      console.log('\n[ML CLI] Initializing Firebase...')
      initializeFirebase()
    }

    // Generate jobs using ML model
    console.log('\n[ML CLI] Running ML model...\n')
    const result = await generateJobsML(config)

    // Validate all jobs
    console.log('\n[ML CLI] Validating generated jobs...')
    const validation = validateAllJobs(result)

    if (!validation.allValid) {
      console.log('\n[ML CLI] WARNING: Some jobs have validation errors:')
      validation.results.forEach((r, i) => {
        if (!r.validation.valid) {
          console.log(`\n  Job ${i + 1}: ${r.job.title}`)
          r.validation.errors.forEach(err => console.log(`    - ${err}`))
        }
      })
    } else {
      console.log('[ML CLI] All jobs passed validation!')
    }

    // Generate summary
    const summary = generateJobsSummary(result)
    console.log(summary)

    // Generate detailed reports
    if (args.report) {
      console.log('\n[ML CLI] Generating detailed reports...\n')

      const reports: string[] = []

      result.jobs.forEach((job, i) => {
        const report = generateClassificationReport(job, result.features)
        console.log(report)
        console.log('\n')
        reports.push(report)
      })

      // Save to file if output specified
      if (args.output) {
        const fullReport = reports.join('\n\n')
        writeFileSync(args.output, fullReport, 'utf-8')
        console.log(`[ML CLI] Reports saved to: ${args.output}`)
      }
    }

    // Save to Firestore
    if (args.save) {
      console.log('\n[ML CLI] Saving jobs to Firestore...\n')

      for (let i = 0; i < result.jobs.length; i++) {
        const { job } = result.jobs[i]

        try {
          const jobId = await saveJobToFirestore(job)
          console.log(`  ${i + 1}. ${job.title}`)
          console.log(`     Firestore ID: ${jobId}`)
          console.log(`     Status: DRAFT (requires admin review)`)
        } catch (error) {
          console.error(`  ${i + 1}. ${job.title}`)
          console.error(`     ERROR: ${(error as Error).message}`)
        }
      }

      console.log('\n[ML CLI] Jobs saved successfully!')
      console.log('\nNext steps:')
      console.log('  1. Visit /admin/careers to review ML-generated jobs')
      console.log('  2. Edit and refine job descriptions as needed')
      console.log('  3. Change status to "published" to make them live')
    } else {
      console.log('\n[ML CLI] Preview mode - jobs not saved to Firestore')
      console.log('  Run with --save flag to save jobs')
    }

    // Performance stats
    console.log('\n' + '='.repeat(80))
    console.log('PERFORMANCE STATS')
    console.log('='.repeat(80))
    console.log(`Model Version: ${result.modelVersion}`)
    console.log(`Total Processing Time: ${result.totalProcessingTime}ms`)
    console.log(`Jobs Generated: ${result.jobs.length}`)
    console.log(`Average Time per Job: ${(result.totalProcessingTime / Math.max(1, result.jobs.length)).toFixed(0)}ms`)
    console.log(`Inference Speed: ${result.totalProcessingTime < 2000 ? '✓ FAST' : '⚠ SLOW'} (target: < 2s)`)
    console.log('='.repeat(80))

  } catch (error) {
    console.error('\n[ML CLI] ERROR:', (error as Error).message)
    console.error((error as Error).stack)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { main }
