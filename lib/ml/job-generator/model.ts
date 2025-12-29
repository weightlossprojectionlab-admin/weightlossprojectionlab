/**
 * ML Job Generator Model
 * Core ML model orchestrator - ties everything together
 *
 * STANDALONE ML SYSTEM - Does NOT use OpenAI or external APIs
 *
 * This is a custom, in-house ML system that:
 * 1. Extracts features from codebase
 * 2. Classifies job roles using ML scoring
 * 3. Generates job descriptions from templates
 * 4. Returns complete job postings
 *
 * Architecture: Rule-based ML + Pattern Matching + Template Generation
 * No external APIs, no TensorFlow.js (not needed for this use case)
 * Fast inference (< 2 seconds)
 */

import { extractFeatures, generateFeatureSummary, type CodebaseFeatures } from './feature-extractor'
import { classifyJobRoles, getClassificationSummary, type RoleClassification } from './classifier'
import { generateJobPosting } from './templates'
import type { JobPosting } from '@/types/jobs'

/**
 * ML Generation Result
 */
export interface MLJobGenerationResult {
  jobs: GeneratedMLJob[]
  features: CodebaseFeatures
  totalProcessingTime: number
  modelVersion: string
}

/**
 * Individual generated job with ML metadata
 */
export interface GeneratedMLJob {
  job: Partial<JobPosting>
  classification: RoleClassification
  confidence: number
  generatedAt: Date
}

/**
 * ML Model Configuration
 */
export interface MLModelConfig {
  projectRoot?: string
  maxJobs?: number // Maximum number of jobs to generate
  minConfidence?: number // Minimum confidence threshold (0-1)
  excludeRoles?: string[] // Roles to exclude from generation
}

/**
 * Main ML model entry point
 * Generates job postings using custom ML system
 */
export async function generateJobsML(config: MLModelConfig = {}): Promise<MLJobGenerationResult> {
  const startTime = Date.now()

  const {
    projectRoot = process.cwd(),
    maxJobs = 3,
    minConfidence = 0.4,
    excludeRoles = [],
  } = config

  console.log('[ML Model] Starting job generation...')
  console.log(`[ML Model] Project: ${projectRoot}`)
  console.log(`[ML Model] Max jobs: ${maxJobs}, Min confidence: ${(minConfidence * 100).toFixed(0)}%`)

  // Step 1: Extract features
  console.log('[ML Model] Step 1/3: Extracting features from codebase...')
  const features = await extractFeatures(projectRoot)
  console.log('[ML Model] Features extracted:')
  console.log(generateFeatureSummary(features))

  // Step 2: Classify job roles
  console.log('\n[ML Model] Step 2/3: Classifying job roles...')
  const classifications = classifyJobRoles(features)
    .filter(c => c.confidence >= minConfidence)
    .filter(c => !excludeRoles.includes(c.role))
    .slice(0, maxJobs)

  console.log(`[ML Model] ${classifications.length} roles identified:`)
  classifications.forEach((c, i) => {
    console.log(`\n  ${i + 1}. ${c.role}`)
    console.log(`     Confidence: ${(c.confidence * 100).toFixed(0)}%`)
    console.log(`     Priority: ${c.priority}`)
  })

  // Step 3: Generate job postings
  console.log('\n[ML Model] Step 3/3: Generating job descriptions...')
  const jobs: GeneratedMLJob[] = classifications.map(classification => {
    const job = generateJobPosting(classification, features)

    return {
      job,
      classification,
      confidence: classification.confidence,
      generatedAt: new Date(),
    }
  })

  const totalProcessingTime = Date.now() - startTime
  console.log(`\n[ML Model] Generation complete in ${totalProcessingTime}ms`)
  console.log(`[ML Model] Generated ${jobs.length} job posting(s)`)

  return {
    jobs,
    features,
    totalProcessingTime,
    modelVersion: 'ml-v1.0.0',
  }
}

/**
 * Generate detailed report for a classification
 */
export function generateClassificationReport(
  job: GeneratedMLJob,
  features: CodebaseFeatures
): string {
  const { classification, confidence } = job
  const { job: posting } = job

  const report = [
    '='.repeat(80),
    `JOB POSTING: ${posting.title}`,
    '='.repeat(80),
    '',
    'CLASSIFICATION SUMMARY',
    '-'.repeat(80),
    getClassificationSummary(classification),
    '',
    'CODEBASE ANALYSIS',
    '-'.repeat(80),
    generateFeatureSummary(features),
    '',
    'JOB DETAILS',
    '-'.repeat(80),
    `Title: ${posting.title}`,
    `Department: ${posting.department}`,
    `Location: ${posting.location}`,
    `Salary: $${(posting.salaryMin! / 1000).toFixed(0)}K - $${(posting.salaryMax! / 1000).toFixed(0)}K`,
    `Equity: ${posting.equity}`,
    `Reports To: ${posting.reportsTo}`,
    '',
    'ABOUT THE ROLE',
    '-'.repeat(80),
    posting.about || '',
    '',
    'WHY THIS ROLE IS CRITICAL',
    '-'.repeat(80),
    posting.whyCritical || '',
    '',
    'RESPONSIBILITIES',
    '-'.repeat(80),
    ...(posting.responsibilities?.map((r, i) => `${i + 1}. ${r}`) || []),
    '',
    'REQUIRED QUALIFICATIONS',
    '-'.repeat(80),
    ...(posting.requiredQualifications?.map((q, i) => `${i + 1}. ${q}`) || []),
    '',
    'NICE TO HAVE',
    '-'.repeat(80),
    ...(posting.niceToHave?.map((n, i) => `${i + 1}. ${n}`) || []),
    '',
    'SUCCESS METRICS (FIRST 90 DAYS)',
    '-'.repeat(80),
    'Month 1:',
    ...(posting.successMetrics?.month1?.map(m => `  - ${m}`) || []),
    '',
    'Month 2:',
    ...(posting.successMetrics?.month2?.map(m => `  - ${m}`) || []),
    '',
    'Month 3:',
    ...(posting.successMetrics?.month3?.map(m => `  - ${m}`) || []),
    '',
    'WHY JOIN US',
    '-'.repeat(80),
    ...(posting.whyJoin?.map((w, i) => `${i + 1}. ${w}`) || []),
    '',
    'ML METADATA',
    '-'.repeat(80),
    `Model Version: ml-v1.0.0`,
    `Confidence Score: ${(confidence * 100).toFixed(1)}%`,
    `Generated At: ${job.generatedAt.toISOString()}`,
    `Status: ${posting.status}`,
    '',
    '='.repeat(80),
  ]

  return report.join('\n')
}

/**
 * Get simple summary of all generated jobs
 */
export function generateJobsSummary(result: MLJobGenerationResult): string {
  const { jobs, features, totalProcessingTime, modelVersion } = result

  const lines = [
    '',
    '='.repeat(80),
    'ML JOB GENERATION SUMMARY',
    '='.repeat(80),
    '',
    `Model Version: ${modelVersion}`,
    `Processing Time: ${totalProcessingTime}ms`,
    `Jobs Generated: ${jobs.length}`,
    '',
    'CODEBASE FEATURES',
    '-'.repeat(80),
    generateFeatureSummary(features),
    '',
    'GENERATED JOBS',
    '-'.repeat(80),
  ]

  jobs.forEach((job, i) => {
    lines.push('')
    lines.push(`${i + 1}. ${job.job.title}`)
    lines.push(`   Department: ${job.job.department}`)
    lines.push(`   Salary: $${(job.job.salaryMin! / 1000).toFixed(0)}K - $${(job.job.salaryMax! / 1000).toFixed(0)}K`)
    lines.push(`   Priority: ${job.classification.priority}`)
    lines.push(`   Confidence: ${(job.confidence * 100).toFixed(0)}%`)
    lines.push(`   Tech Stack: ${job.classification.techStack.join(', ')}`)
  })

  lines.push('')
  lines.push('='.repeat(80))

  return lines.join('\n')
}

/**
 * Validate generated job posting
 */
export function validateJobPosting(job: Partial<JobPosting>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!job.title) errors.push('Missing job title')
  if (!job.department) errors.push('Missing department')
  if (!job.salaryMin || job.salaryMin <= 0) errors.push('Invalid salary minimum')
  if (!job.salaryMax || job.salaryMax <= 0) errors.push('Invalid salary maximum')
  if (job.salaryMin && job.salaryMax && job.salaryMin > job.salaryMax) {
    errors.push('Salary minimum greater than maximum')
  }
  if (!job.about || job.about.length < 50) errors.push('About section too short')
  if (!job.responsibilities || job.responsibilities.length < 3) {
    errors.push('Need at least 3 responsibilities')
  }
  if (!job.requiredQualifications || job.requiredQualifications.length < 3) {
    errors.push('Need at least 3 required qualifications')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Batch validate all generated jobs
 */
export function validateAllJobs(result: MLJobGenerationResult): {
  allValid: boolean
  results: Array<{ job: Partial<JobPosting>; validation: ReturnType<typeof validateJobPosting> }>
} {
  const results = result.jobs.map(({ job }) => ({
    job,
    validation: validateJobPosting(job),
  }))

  const allValid = results.every(r => r.validation.valid)

  return { allValid, results }
}

/**
 * Generate a single job posting from input parameters
 * (Convenience wrapper for AI job-generator compatibility)
 */
export async function generateJob(input: {
  role: string
  seniority: string
  department: string
  techStack: string[]
  projectComplexity: string
  dominantAreas: string[]
  recentCommits: Array<{ message: string; filesChanged: string[]; technologies: string[] }>
  reason: string
}): Promise<{
  title: string
  salaryMin: number
  salaryMax: number
  equity: string
  location: string
  about: string
  whyCritical: string
  responsibilities: string[]
  requiredQualifications: string[]
  niceToHave: string[]
  successMetrics: { month1: string[]; month2: string[]; month3: string[] }
  whyJoin: string[]
  confidence: number
  rationale: string
}> {
  // Create a minimal classification from input
  const classification: RoleClassification = {
    role: (input.role || 'Full-Stack Engineer') as any,
    seniority: (input.seniority || 'Senior') as any,
    confidence: 0.85,
    priority: 'high',
    reasoning: [input.reason || 'Based on codebase analysis'],
    techStack: input.techStack || [],
    department: (input.department || 'Engineering') as any,
  }

  // Create minimal CodebaseFeatures object for template generator
  const features: CodebaseFeatures = {
    techStack: {
      languages: ['TypeScript'],
      frameworks: input.techStack || [],
      databases: ['Firebase'],
      aiTools: ['Claude AI', 'Gemini AI'],
      testingFrameworks: ['Jest', 'Playwright'],
      complexity: 75,
    },
    codeStructure: {
      totalFiles: 1000,
      totalLines: 50000,
      componentCount: 100,
      apiRouteCount: 50,
      testCoverage: 75,
      documentation: 80,
    },
    activity: {
      commitVelocity: 30,
      recentCommits: 100,
      activeAreas: input.dominantAreas || [],
      complexity: (input.projectComplexity || 'medium') as 'low' | 'medium' | 'high' | 'very_high',
      linesChangedPerWeek: 1000,
    },
    patterns: {
      hasMicroservices: false,
      hasMonorepo: false,
      hasAPI: true,
      hasMobileApp: true,
      hasMLPipeline: false,
      architectureComplexity: 75,
    },
    teamIndicators: {
      estimatedTeamSize: 10,
      specializationLevel: 'specialized' as const,
      workloadDistribution: 'full_stack' as const,
    },
  }

  // Use template generator to create job posting
  const jobPosting = await generateJobPosting(classification, features)

  return {
    title: jobPosting.title || 'Engineering Position',
    salaryMin: jobPosting.salaryMin || 120000,
    salaryMax: jobPosting.salaryMax || 180000,
    equity: jobPosting.equity || '0.1% - 0.5%',
    location: jobPosting.location || 'Remote',
    about: jobPosting.about || '',
    whyCritical: jobPosting.whyCritical || '',
    responsibilities: jobPosting.responsibilities || [],
    requiredQualifications: jobPosting.requiredQualifications || [],
    niceToHave: jobPosting.niceToHave || [],
    successMetrics: jobPosting.successMetrics || { month1: [], month2: [], month3: [] },
    whyJoin: jobPosting.whyJoin || [],
    confidence: classification.confidence,
    rationale: classification.reasoning.join('; '),
  }
}

/**
 * Export types
 */
export type { CodebaseFeatures, RoleClassification }
