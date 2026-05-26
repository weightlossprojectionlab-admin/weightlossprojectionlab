/**
 * AI-Powered Job Generator
 * Analyzes git commits and codebase to automatically generate job postings
 *
 * This module uses the existing AI orchestration infrastructure to:
 * 1. Analyze git commit diffs
 * 2. Scan package.json for tech stack
 * 3. Examine file structure and patterns
 * 4. Generate realistic job postings based on actual codebase needs
 */

import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { JobPosting, JobGenerationMetadata, JobDepartment } from '@/types/jobs'
import { logger } from '@/lib/logger'

/**
 * Input for job generation
 */
export interface JobGenerationInput {
  commitCount?: number // Number of recent commits to analyze (default: 10)
  commitHash?: string // Specific commit to analyze
  projectRoot?: string // Root directory of the project
  existingJobs?: JobPosting[] // Existing jobs to avoid duplicates
}

/**
 * Analysis result from codebase
 */
export interface CodebaseAnalysis {
  techStack: string[]
  frameworks: string[]
  languages: string[]
  recentChanges: CommitAnalysis[]
  projectComplexity: 'low' | 'medium' | 'high' | 'very_high'
  dominantAreas: string[] // e.g., ['frontend', 'backend', 'ml', 'infrastructure']
  filesByCategory: Record<string, string[]>
}

/**
 * Individual commit analysis
 */
export interface CommitAnalysis {
  hash: string
  message: string
  date: Date
  filesChanged: string[]
  linesAdded: number
  linesDeleted: number
  categories: string[] // e.g., ['frontend', 'api', 'database']
  technologies: string[]
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex'
}

/**
 * Generated job with metadata
 */
export interface GeneratedJob {
  job: Partial<JobPosting>
  metadata: JobGenerationMetadata
  confidence: number
  rationale: string
}

/**
 * Main job generation function
 * Analyzes codebase and generates job postings
 */
export async function generateJobsFromCodebase(
  input: JobGenerationInput
): Promise<GeneratedJob[]> {
  const projectRoot = input.projectRoot || process.cwd()

  try {
    // Step 1: Analyze codebase
    logger.info('[Job Generator] Analyzing codebase...', { projectRoot })
    const analysis = await analyzeCodebase(input)

    // Step 2: Determine what jobs are needed
    logger.info('[Job Generator] Determining job needs...', {
      techStack: analysis.techStack,
      dominantAreas: analysis.dominantAreas
    })
    const jobNeeds = determineJobNeeds(analysis, input.existingJobs || [])

    // Step 3: Generate job postings using AI
    logger.info('[Job Generator] Generating job postings...', {
      jobCount: jobNeeds.length
    })
    const generatedJobs = await Promise.all(
      jobNeeds.map(need => generateJobPosting(need, analysis))
    )

    logger.info('[Job Generator] Job generation complete', {
      generated: generatedJobs.length
    })
    return generatedJobs
  } catch (error) {
    logger.error('[Job Generator] Generation failed', error as Error)
    throw error
  }
}

/**
 * Analyze codebase from git history and file structure
 */
async function analyzeCodebase(
  input: JobGenerationInput
): Promise<CodebaseAnalysis> {
  const projectRoot = input.projectRoot || process.cwd()
  const commitCount = input.commitCount || 10

  // Analyze git commits
  const commits = analyzeGitCommits(projectRoot, commitCount, input.commitHash)

  // Analyze package.json
  const techStack = analyzeTechStack(projectRoot)

  // Categorize files
  const filesByCategory = categorizeFiles(projectRoot)

  // Determine project complexity
  const projectComplexity = assessProjectComplexity(commits, techStack, filesByCategory)

  // Identify dominant areas
  const dominantAreas = identifyDominantAreas(commits, filesByCategory)

  return {
    techStack: techStack.allTechnologies,
    frameworks: techStack.frameworks,
    languages: techStack.languages,
    recentChanges: commits,
    projectComplexity,
    dominantAreas,
    filesByCategory,
  }
}

/**
 * Analyze recent git commits
 */
function analyzeGitCommits(
  projectRoot: string,
  count: number,
  specificHash?: string
): CommitAnalysis[] {
  try {
    // Get commit history
    const logFormat = '%H|%s|%ad|%an|%ae'
    const logCommand = specificHash
      ? `git log -1 --format="${logFormat}" --date=iso ${specificHash}`
      : `git log -${count} --format="${logFormat}" --date=iso`

    const log = execSync(logCommand, {
      cwd: projectRoot,
      encoding: 'utf-8',
    })

    const commits = log
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, message, date] = line.split('|')

        // Get file stats for this commit
        const statCommand = `git show --stat --format="" ${hash}`
        const stats = execSync(statCommand, {
          cwd: projectRoot,
          encoding: 'utf-8',
        })

        const filesChanged = stats
          .split('\n')
          .filter(line => line.includes('|'))
          .map(line => line.trim().split('|')[0].trim())

        // Get line changes
        const diffCommand = `git show --shortstat --format="" ${hash}`
        const diffStats = execSync(diffCommand, {
          cwd: projectRoot,
          encoding: 'utf-8',
        })

        const linesAddedMatch = diffStats.match(/(\d+) insertion/)
        const linesDeletedMatch = diffStats.match(/(\d+) deletion/)
        const linesAdded = linesAddedMatch ? parseInt(linesAddedMatch[1]) : 0
        const linesDeleted = linesDeletedMatch ? parseInt(linesDeletedMatch[1]) : 0

        // Categorize files
        const categories = categorizeCommitFiles(filesChanged)
        const technologies = extractTechnologiesFromFiles(filesChanged)
        const complexity = assessCommitComplexity(linesAdded, linesDeleted, filesChanged.length)

        return {
          hash: hash.substring(0, 7),
          message,
          date: new Date(date),
          filesChanged,
          linesAdded,
          linesDeleted,
          categories,
          technologies,
          complexity,
        }
      })

    return commits
  } catch (error) {
    logger.error('[Job Generator] Git analysis failed', error as Error)
    return []
  }
}

/**
 * Categorize commit files
 */
function categorizeCommitFiles(files: string[]): string[] {
  const categories = new Set<string>()

  files.forEach(file => {
    // Frontend
    if (file.match(/\/(components|app|pages)\//)) {
      categories.add('frontend')
    }
    // API/Backend
    if (file.match(/\/api\//)) {
      categories.add('api')
    }
    // Database
    if (file.match(/\/(firestore|database|migrations)\//)) {
      categories.add('database')
    }
    // ML/AI
    if (file.match(/\/(ml|ai|models)\//)) {
      categories.add('ml')
    }
    // Infrastructure
    if (file.match(/\.(yaml|yml|dockerfile|sh|ps1)$/i) || file.includes('config')) {
      categories.add('infrastructure')
    }
    // Testing
    if (file.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/)) {
      categories.add('testing')
    }
    // Documentation
    if (file.match(/\.(md|mdx)$/)) {
      categories.add('documentation')
    }
  })

  return Array.from(categories)
}

/**
 * Extract technologies from file extensions
 */
function extractTechnologiesFromFiles(files: string[]): string[] {
  const tech = new Set<string>()

  files.forEach(file => {
    // TypeScript/JavaScript
    if (file.match(/\.(ts|tsx)$/)) tech.add('TypeScript')
    if (file.match(/\.(js|jsx)$/)) tech.add('JavaScript')

    // Python
    if (file.match(/\.py$/)) tech.add('Python')

    // React
    if (file.match(/\.(tsx|jsx)$/) || file.includes('components/')) tech.add('React')

    // Next.js
    if (file.match(/\/app\//) || file.match(/\/pages\//)) tech.add('Next.js')

    // Firebase
    if (file.includes('firebase')) tech.add('Firebase')

    // Styling
    if (file.match(/\.(css|scss|sass)$/)) tech.add('CSS')
    if (file.includes('tailwind')) tech.add('Tailwind CSS')
  })

  return Array.from(tech)
}

/**
 * Assess commit complexity
 */
function assessCommitComplexity(
  linesAdded: number,
  linesDeleted: number,
  filesChanged: number
): 'trivial' | 'simple' | 'moderate' | 'complex' {
  const totalLines = linesAdded + linesDeleted

  if (totalLines < 10 && filesChanged <= 2) return 'trivial'
  if (totalLines < 50 && filesChanged <= 5) return 'simple'
  if (totalLines < 200 && filesChanged <= 10) return 'moderate'
  return 'complex'
}

/**
 * Analyze tech stack from package.json
 */
function analyzeTechStack(projectRoot: string): {
  allTechnologies: string[]
  frameworks: string[]
  languages: string[]
  dependencies: Record<string, string>
} {
  try {
    const packageJsonPath = join(projectRoot, 'package.json')
    if (!existsSync(packageJsonPath)) {
      return {
        allTechnologies: [],
        frameworks: [],
        languages: [],
        dependencies: {},
      }
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }

    const frameworks: string[] = []
    const languages: string[] = []
    const technologies: string[] = []

    // Map dependencies to technologies
    const techMapping: Record<string, { type: 'framework' | 'language' | 'tool'; name: string }> = {
      'react': { type: 'framework', name: 'React' },
      'next': { type: 'framework', name: 'Next.js' },
      'typescript': { type: 'language', name: 'TypeScript' },
      'firebase': { type: 'framework', name: 'Firebase' },
      'firebase-admin': { type: 'framework', name: 'Firebase Admin SDK' },
      '@google/generative-ai': { type: 'framework', name: 'Gemini AI' },
      'openai': { type: 'framework', name: 'OpenAI' },
      '@anthropic-ai/sdk': { type: 'framework', name: 'Claude AI' },
      'stripe': { type: 'framework', name: 'Stripe' },
      'tailwindcss': { type: 'framework', name: 'Tailwind CSS' },
      'recharts': { type: 'framework', name: 'Recharts' },
      'playwright': { type: 'framework', name: 'Playwright' },
      'jest': { type: 'framework', name: 'Jest' },
    }

    Object.keys(allDeps).forEach(dep => {
      const tech = techMapping[dep]
      if (tech) {
        technologies.push(tech.name)
        if (tech.type === 'framework') frameworks.push(tech.name)
        if (tech.type === 'language') languages.push(tech.name)
      }
    })

    // Always add TypeScript if package.json exists
    if (!languages.includes('TypeScript')) languages.push('TypeScript')

    return {
      allTechnologies: Array.from(new Set(technologies)),
      frameworks: Array.from(new Set(frameworks)),
      languages: Array.from(new Set(languages)),
      dependencies: allDeps,
    }
  } catch (error) {
    logger.error('[Job Generator] Tech stack analysis failed', error as Error)
    return {
      allTechnologies: [],
      frameworks: [],
      languages: [],
      dependencies: {},
    }
  }
}

/**
 * Categorize files in the project
 */
function categorizeFiles(projectRoot: string): Record<string, string[]> {
  const categories: Record<string, string[]> = {
    frontend: [],
    backend: [],
    ml: [],
    infrastructure: [],
    testing: [],
    documentation: [],
  }

  try {
    // Use git ls-files to get tracked files only
    const files = execSync('git ls-files', {
      cwd: projectRoot,
      encoding: 'utf-8',
    })
      .split('\n')
      .filter(f => f.trim())

    files.forEach(file => {
      if (file.match(/\/(components|app\/\(.*\))\//)) categories.frontend.push(file)
      if (file.match(/\/api\//)) categories.backend.push(file)
      if (file.match(/\/(ml|ai)\//)) categories.ml.push(file)
      if (file.match(/\.(yaml|yml|dockerfile|sh)$/i)) categories.infrastructure.push(file)
      if (file.match(/\.(test|spec)\./)) categories.testing.push(file)
      if (file.match(/\.(md|mdx)$/)) categories.documentation.push(file)
    })

    return categories
  } catch (error) {
    logger.error('[Job Generator] File categorization failed', error as Error)
    return categories
  }
}

/**
 * Assess overall project complexity
 */
function assessProjectComplexity(
  commits: CommitAnalysis[],
  techStack: { allTechnologies: string[] },
  filesByCategory: Record<string, string[]>
): 'low' | 'medium' | 'high' | 'very_high' {
  const techCount = techStack.allTechnologies.length
  const totalFiles = Object.values(filesByCategory).reduce((sum, files) => sum + files.length, 0)
  const complexCommits = commits.filter(c => c.complexity === 'complex').length

  // Calculate complexity score
  let score = 0
  if (techCount > 10) score += 2
  else if (techCount > 5) score += 1

  if (totalFiles > 200) score += 2
  else if (totalFiles > 100) score += 1

  if (complexCommits > commits.length * 0.5) score += 2
  else if (complexCommits > commits.length * 0.3) score += 1

  if (score >= 5) return 'very_high'
  if (score >= 3) return 'high'
  if (score >= 1) return 'medium'
  return 'low'
}

/**
 * Identify dominant development areas
 */
function identifyDominantAreas(
  commits: CommitAnalysis[],
  filesByCategory: Record<string, string[]>
): string[] {
  // Count commit categories
  const categoryCount: Record<string, number> = {}
  commits.forEach(commit => {
    commit.categories.forEach(cat => {
      categoryCount[cat] = (categoryCount[cat] || 0) + 1
    })
  })

  // Count files by category
  const fileCounts = Object.entries(filesByCategory).map(([category, files]) => ({
    category,
    count: files.length,
  }))

  // Combine signals
  const dominantAreas = new Set<string>()

  // Areas with most commits
  const topCommitAreas = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat)
  topCommitAreas.forEach(area => dominantAreas.add(area))

  // Areas with most files
  const topFileAreas = fileCounts
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(({ category }) => category)
  topFileAreas.forEach(area => dominantAreas.add(area))

  return Array.from(dominantAreas)
}

/**
 * Catalog-driven role spec. Each entry encapsulates:
 *   - signal:        when the codebase warrants suggesting this role.
 *   - dedupPatterns: word-boundary regexes tested against existing
 *                    job titles (lowercased). Any match → skip.
 *                    Word-boundaries matter so "ml" doesn't dedup
 *                    against "HTML Email Specialist" the way a raw
 *                    substring check would.
 *   - technologyFilter / seniority: how to populate the JobNeed.
 *
 * Adding a new role = appending an entry here; the loop in
 * `determineJobNeeds` does the rest.
 */
interface RoleSpec {
  role: string
  department: JobDepartment
  reason: string
  signal: (a: CodebaseAnalysis) => boolean
  dedupPatterns: RegExp[]
  technologyFilter: (techStack: string[]) => string[]
  seniority: (a: CodebaseAnalysis) => JobNeed['seniority']
}

const hasArea = (a: CodebaseAnalysis, ...areas: string[]) =>
  areas.some(area => a.dominantAreas.includes(area))

const hasTech = (a: CodebaseAnalysis, ...techs: string[]) =>
  techs.some(t => a.techStack.includes(t))

const filesTouch = (a: CodebaseAnalysis, regex: RegExp) =>
  a.recentChanges.some(c => c.filesChanged.some(f => regex.test(f)))

const commitMessagesMatch = (a: CodebaseAnalysis, regex: RegExp) =>
  a.recentChanges.some(c => regex.test(c.message))

const seniorityFromComplexity = (a: CodebaseAnalysis): JobNeed['seniority'] =>
  a.projectComplexity === 'very_high' || a.projectComplexity === 'high' ? 'Senior' : 'Mid-Level'

const ROLE_CATALOG: RoleSpec[] = [
  {
    role: 'Frontend Engineer',
    department: 'Engineering',
    reason: 'Significant frontend development activity detected',
    signal: a => hasArea(a, 'frontend'),
    dedupPatterns: [/\bfront[\s-]?end\b/, /\bweb\s+engineer\b/],
    technologyFilter: ts => ts.filter(t => ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'].includes(t)),
    seniority: seniorityFromComplexity,
  },
  {
    role: 'Backend Engineer',
    department: 'Engineering',
    reason: 'Active API development and backend features',
    signal: a => hasArea(a, 'api', 'backend'),
    dedupPatterns: [/\bback[\s-]?end\b/, /\bapi\s+engineer\b/, /\bserver[\s-]?side\s+engineer\b/],
    technologyFilter: ts => ts.filter(t => ['Firebase', 'Firebase Admin SDK', 'Next.js', 'TypeScript', 'Stripe'].includes(t)),
    seniority: a => (a.projectComplexity === 'very_high' ? 'Senior' : 'Mid-Level'),
  },
  {
    role: 'Full-Stack Engineer',
    department: 'Engineering',
    reason: 'Full-stack development across frontend and backend',
    signal: a => hasArea(a, 'frontend') && hasArea(a, 'api', 'backend'),
    dedupPatterns: [/\bfull[\s-]?stack\b/],
    technologyFilter: ts => ts,
    seniority: a => (a.projectComplexity === 'very_high' ? 'Senior' : 'Mid-Level'),
  },
  {
    role: 'Machine Learning Engineer',
    department: 'Engineering',
    reason: 'AI/ML features being developed',
    signal: a => hasArea(a, 'ml') || hasTech(a, 'Gemini AI', 'OpenAI', 'Claude AI'),
    dedupPatterns: [
      /\bmachine\s+learning\b/,
      /\bml\s+(engineer|scientist|lead|manager)\b/,
      /\bai\s+(engineer|scientist|lead|researcher)\b/,
      /\bapplied\s+(ml|ai)\b/,
    ],
    technologyFilter: ts => ts.filter(t => ['Gemini AI', 'OpenAI', 'Claude AI'].includes(t)),
    seniority: () => 'Senior',
  },
  {
    role: 'Mobile Engineer',
    department: 'Engineering',
    reason: 'Mobile codebase or native integrations in use',
    signal: a =>
      hasTech(a, 'React Native', 'Expo', 'Swift', 'Kotlin', 'iOS', 'Android') ||
      filesTouch(a, /(^|\/)(ios|android|mobile)\//i),
    dedupPatterns: [
      /\bmobile\s+engineer\b/,
      /\bios\s+engineer\b/,
      /\bandroid\s+engineer\b/,
      /\breact[\s-]?native\b/,
    ],
    technologyFilter: ts => ts.filter(t => ['React Native', 'Expo', 'Swift', 'Kotlin'].includes(t)),
    seniority: seniorityFromComplexity,
  },
  {
    role: 'DevOps / Platform Engineer',
    department: 'Engineering',
    reason: 'Active CI/CD, infrastructure, and deployment work',
    signal: a =>
      hasArea(a, 'infrastructure') &&
      (a.filesByCategory.infrastructure?.length ?? 0) >= 5,
    dedupPatterns: [
      /\bdev[\s-]?ops\b/,
      /\bplatform\s+engineer\b/,
      /\bsre\b/,
      /\bsite\s+reliability\b/,
      /\binfra(structure)?\s+engineer\b/,
    ],
    technologyFilter: ts => ts.filter(t => ['Firebase', 'Next.js'].includes(t)),
    seniority: seniorityFromComplexity,
  },
  {
    role: 'Data Engineer',
    department: 'Data',
    reason: 'Active database, migration, and pipeline work',
    signal: a =>
      hasArea(a, 'database') || filesTouch(a, /\/(migrations|schemas|seeds|etl|pipelines)\//i),
    dedupPatterns: [
      /\bdata\s+engineer\b/,
      /\banalytics\s+engineer\b/,
      /\bdatabase\s+engineer\b/,
    ],
    technologyFilter: ts => ts.filter(t => ['Firebase', 'Firebase Admin SDK'].includes(t)),
    seniority: seniorityFromComplexity,
  },
  {
    role: 'Security Engineer',
    department: 'Security',
    reason: 'Authentication, authorization, and security primitives under active development',
    signal: a =>
      filesTouch(a, /\/(security|rbac|auth|csrf|middleware|hipaa|compliance)\b/i) ||
      commitMessagesMatch(a, /\b(csrf|xss|sql\s*injection|secret|hipaa|rate[\s-]?limit|rbac)\b/i),
    dedupPatterns: [
      /\bsecurity\s+(engineer|architect|analyst)\b/,
      /\bappsec\b/,
      /\binfo[\s-]?sec\b/,
    ],
    technologyFilter: ts => ts.filter(t => ['Firebase', 'Stripe'].includes(t)),
    seniority: () => 'Senior',
  },
  {
    role: 'QA / Test Engineer',
    department: 'Engineering',
    reason: 'Active test surface with Playwright / Jest under regular maintenance',
    signal: a => hasArea(a, 'testing') && hasTech(a, 'Playwright', 'Jest'),
    dedupPatterns: [
      /\b(qa|sdet)\s+engineer\b/,
      /\btest\s+engineer\b/,
      /\bquality\s+(assurance|engineer)\b/,
    ],
    technologyFilter: ts => ts.filter(t => ['Playwright', 'Jest', 'TypeScript'].includes(t)),
    seniority: seniorityFromComplexity,
  },
  {
    role: 'Technical Writer',
    department: 'Product',
    reason: 'Large body of docs/content under active maintenance',
    signal: a => hasArea(a, 'documentation') && (a.filesByCategory.documentation?.length ?? 0) >= 20,
    dedupPatterns: [
      /\btechnical\s+writer\b/,
      /\bcontent\s+designer\b/,
      /\bdocumentation\s+engineer\b/,
    ],
    technologyFilter: ts => ts.filter(t => ['TypeScript'].includes(t)),
    seniority: () => 'Mid-Level',
  },
]

/**
 * Determine what jobs are needed based on analysis.
 *
 * Catalog-driven: iterates ROLE_CATALOG, gates on each spec's signal,
 * then dedups against existing job titles using word-boundary regexes
 * (so dedup tokens like "ml" or "api" don't false-match unrelated
 * titles such as "HTML Email Specialist").
 */
function determineJobNeeds(
  analysis: CodebaseAnalysis,
  existingJobs: JobPosting[],
): JobNeed[] {
  const existingTitles = existingJobs.map(j => (j.title || '').toLowerCase())

  return ROLE_CATALOG
    .filter(spec => spec.signal(analysis))
    .filter(spec => !spec.dedupPatterns.some(pat => existingTitles.some(t => pat.test(t))))
    .map(spec => ({
      role: spec.role,
      department: spec.department,
      seniority: spec.seniority(analysis),
      reason: spec.reason,
      technologies: spec.technologyFilter(analysis.techStack),
    }))
}

/**
 * Job need determination
 */
interface JobNeed {
  role: string
  department: JobDepartment
  seniority: 'Junior' | 'Mid-Level' | 'Senior' | 'Staff' | 'Principal'
  reason: string
  technologies: string[]
}

/**
 * Generate job posting using PROPRIETARY ML system (NOT OpenAI)
 */
async function generateJobPosting(
  need: JobNeed,
  analysis: CodebaseAnalysis
): Promise<GeneratedJob> {
  try {
    logger.info('[Job Generator] Using PROPRIETARY ML model (NOT OpenAI)')

    // Use our custom ML job generator
    const { generateJob } = await import('@/lib/ml/job-generator/model')

    // Convert analysis to ML model input format
    const mlInput = {
      role: need.role,
      seniority: need.seniority,
      department: need.department,
      techStack: need.technologies || [],
      projectComplexity: analysis.projectComplexity,
      dominantAreas: analysis.dominantAreas || [],
      recentCommits: (analysis.recentChanges || []).map(c => ({
        message: c?.message || '',
        filesChanged: c?.filesChanged || [],
        technologies: c?.technologies || [],
      })),
      reason: need.reason,
    }

    // Generate using proprietary ML
    const mlResult = await generateJob(mlInput)

    // Extract job details from ML response
    const job = mapAIResponseToJob(mlResult, need)

    // Generate metadata
    const latestCommit = analysis.recentChanges[0]
    const metadata: JobGenerationMetadata = {
      generatedFrom: latestCommit?.hash || 'unknown',
      analyzedFiles: Object.values(analysis.filesByCategory).flat().slice(0, 20),
      analyzedCommits: analysis.recentChanges.map(c => c.hash),
      confidence: mlResult.confidence || 0.85,
      generatedAt: new Date(),
      techStack: need.technologies,
      model: 'wlpl-ml-v1.0.0', // Our proprietary model
    }

    return {
      job,
      metadata,
      confidence: mlResult.confidence || 0.85,
      rationale: mlResult.rationale || need.reason,
    }
  } catch (error) {
    logger.error('[Job Generator] ML generation failed', error as Error)
    throw error
  }
}

/**
 * Build AI generation prompt
 */
function buildJobGenerationPrompt(need: JobNeed, analysis: CodebaseAnalysis): string {
  return `Generate a realistic job posting for a ${need.seniority} ${need.role} position based on actual codebase analysis.

**Codebase Context:**
- Tech Stack: ${analysis.techStack.join(', ')}
- Frameworks: ${analysis.frameworks.join(', ')}
- Project Complexity: ${analysis.projectComplexity}
- Active Development Areas: ${analysis.dominantAreas.join(', ')}
- Recent Activity: ${analysis.recentChanges.slice(0, 5).map(c => c.message).join('; ')}

**Job Requirements:**
- Role: ${need.role}
- Department: ${need.department}
- Seniority: ${need.seniority}
- Key Technologies: ${need.technologies.join(', ')}
- Reason for Hiring: ${need.reason}

**Instructions:**
Generate a JSON object with the following structure:
{
  "title": "Specific job title (e.g., 'Senior Frontend Engineer - React & Next.js')",
  "salaryMin": number (realistic min salary in USD based on seniority),
  "salaryMax": number (realistic max salary in USD based on seniority),
  "equity": "equity range (e.g., '0.1%-0.5%')",
  "location": "Remote (US, Canada, EU)" or specific location,
  "about": "2-3 paragraph description of the role (be specific about actual work)",
  "whyCritical": "Why this role is critical right now (reference actual features/technologies)",
  "responsibilities": ["bullet 1", "bullet 2", ...] (5-7 specific responsibilities),
  "requiredQualifications": ["bullet 1", "bullet 2", ...] (5-6 must-have skills),
  "niceToHave": ["bullet 1", "bullet 2", ...] (3-4 bonus skills),
  "successMetrics": {
    "month1": ["metric 1", "metric 2"],
    "month2": ["metric 1", "metric 2"],
    "month3": ["metric 1", "metric 2"]
  },
  "whyJoin": ["reason 1", "reason 2", ...] (4-5 compelling reasons),
  "confidence": 0.0-1.0 (your confidence in this job need),
  "rationale": "Brief explanation of why this role is needed based on codebase"
}

**Guidelines:**
- Use realistic salary ranges based on US market rates for the seniority level
- Reference actual technologies from the tech stack
- Be specific - mention actual features, not generic "fast-paced environment" BS
- Success metrics should be measurable and realistic
- Avoid corporate jargon - write like a real engineer describing real work
- Make it compelling but honest`
}

/**
 * Map AI response to JobPosting structure
 */
function mapAIResponseToJob(aiResponse: any, need: JobNeed): Partial<JobPosting> {
  // Generate slug from title
  const slug = (aiResponse.title || need.role)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return {
    slug,
    title: aiResponse.title || `${need.seniority} ${need.role}`,
    department: need.department,
    location: aiResponse.location || 'Remote (US, Canada, EU)',
    locationType: 'remote',
    salaryMin: aiResponse.salaryMin || getSalaryRange(need.seniority).min,
    salaryMax: aiResponse.salaryMax || getSalaryRange(need.seniority).max,
    equity: aiResponse.equity || getEquityRange(need.seniority),
    reportsTo: getReportsTo(need.department, need.seniority),
    about: aiResponse.about || '',
    whyCritical: aiResponse.whyCritical || need.reason,
    responsibilities: aiResponse.responsibilities || [],
    requiredQualifications: aiResponse.requiredQualifications || need.technologies,
    niceToHave: aiResponse.niceToHave || [],
    successMetrics: aiResponse.successMetrics || {
      month1: ['Onboarding complete', 'First PR merged'],
      month2: ['First feature shipped', 'Team collaboration established'],
      month3: ['Independent contributions', 'Technical ownership demonstrated'],
    },
    whyJoin: aiResponse.whyJoin || [],
    status: 'draft', // Always start as draft
  }
}

/**
 * Get salary range based on seniority
 */
function getSalaryRange(seniority: string): { min: number; max: number } {
  const ranges: Record<string, { min: number; max: number }> = {
    Junior: { min: 70000, max: 100000 },
    'Mid-Level': { min: 100000, max: 140000 },
    Senior: { min: 140000, max: 180000 },
    Staff: { min: 180000, max: 220000 },
    Principal: { min: 220000, max: 280000 },
  }
  return ranges[seniority] || { min: 100000, max: 140000 }
}

/**
 * Get equity range based on seniority
 */
function getEquityRange(seniority: string): string {
  const ranges: Record<string, string> = {
    Junior: '0.05%-0.15%',
    'Mid-Level': '0.1%-0.3%',
    Senior: '0.25%-0.75%',
    Staff: '0.5%-1.5%',
    Principal: '1.0%-2.5%',
  }
  return ranges[seniority] || '0.1%-0.5%'
}

/**
 * Determine who the role reports to
 */
function getReportsTo(department: JobDepartment, seniority: string): string {
  if (department === 'Engineering') {
    if (seniority === 'Principal' || seniority === 'Staff') return 'CTO'
    return 'Head of Engineering'
  }
  if (department === 'Product') return 'Head of Product'
  if (department === 'Design') return 'Head of Design'
  if (department === 'Data') return 'Head of Data'
  return 'Department Lead'
}
