/**
 * ML Feature Extractor
 * Analyzes codebase and extracts features for ML model
 *
 * STANDALONE ML SYSTEM - Does NOT use OpenAI or external APIs
 *
 * Features extracted:
 * - Tech stack complexity
 * - Code patterns and architecture
 * - Commit velocity and patterns
 * - File organization and structure
 * - Development activity metrics
 */

import { execSync } from 'child_process'
import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

/**
 * Feature vector extracted from codebase
 * These features are used by the ML classifier
 */
export interface CodebaseFeatures {
  // Tech stack features
  techStack: {
    languages: string[]
    frameworks: string[]
    databases: string[]
    aiTools: string[]
    testingFrameworks: string[]
    complexity: number // 0-100 score
  }

  // Code structure features
  codeStructure: {
    totalFiles: number
    totalLines: number
    componentCount: number
    apiRouteCount: number
    testCoverage: number // estimated 0-100
    documentation: number // 0-100 score
  }

  // Development activity
  activity: {
    commitVelocity: number // commits per week
    recentCommits: number // last 30 days
    activeAreas: string[] // ['frontend', 'backend', 'ml', etc.]
    complexity: 'low' | 'medium' | 'high' | 'very_high'
    linesChangedPerWeek: number
  }

  // Architecture patterns
  patterns: {
    hasMicroservices: boolean
    hasMonorepo: boolean
    hasAPI: boolean
    hasMobileApp: boolean
    hasMLPipeline: boolean
    architectureComplexity: number // 0-100
  }

  // Team indicators (inferred from code)
  teamIndicators: {
    estimatedTeamSize: number
    specializationLevel: 'generalist' | 'specialized' | 'highly_specialized'
    workloadDistribution: 'balanced' | 'frontend_heavy' | 'backend_heavy' | 'full_stack'
  }
}

/**
 * Extract all features from codebase
 */
export async function extractFeatures(projectRoot: string = process.cwd()): Promise<CodebaseFeatures> {
  const techStack = extractTechStack(projectRoot)
  const codeStructure = analyzeCodeStructure(projectRoot)
  const activity = analyzeActivity(projectRoot)
  const patterns = detectPatterns(projectRoot, codeStructure)
  const teamIndicators = inferTeamIndicators(codeStructure, activity)

  return {
    techStack,
    codeStructure,
    activity,
    patterns,
    teamIndicators,
  }
}

/**
 * Extract tech stack features
 */
function extractTechStack(projectRoot: string): CodebaseFeatures['techStack'] {
  const packageJsonPath = join(projectRoot, 'package.json')

  if (!existsSync(packageJsonPath)) {
    return {
      languages: [],
      frameworks: [],
      databases: [],
      aiTools: [],
      testingFrameworks: [],
      complexity: 0,
    }
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  const languages = new Set<string>()
  const frameworks = new Set<string>()
  const databases = new Set<string>()
  const aiTools = new Set<string>()
  const testingFrameworks = new Set<string>()

  // Language detection
  Object.keys(allDeps).forEach(dep => {
    // Languages
    if (dep.includes('typescript') || dep.includes('@types')) languages.add('TypeScript')
    if (dep === 'python' || dep.includes('py-')) languages.add('Python')

    // Frameworks
    if (dep === 'react' || dep.startsWith('@react')) frameworks.add('React')
    if (dep === 'next' || dep.startsWith('next-')) frameworks.add('Next.js')
    if (dep === 'express') frameworks.add('Express')
    if (dep === 'vue') frameworks.add('Vue')
    if (dep === 'angular') frameworks.add('Angular')
    if (dep === 'svelte') frameworks.add('Svelte')
    if (dep === 'tailwindcss') frameworks.add('Tailwind CSS')

    // Databases
    if (dep.includes('firebase')) databases.add('Firebase')
    if (dep.includes('postgres') || dep === 'pg') databases.add('PostgreSQL')
    if (dep.includes('mongo')) databases.add('MongoDB')
    if (dep.includes('mysql')) databases.add('MySQL')
    if (dep.includes('redis')) databases.add('Redis')
    if (dep.includes('sqlite')) databases.add('SQLite')

    // AI/ML Tools
    if (dep.includes('openai')) aiTools.add('OpenAI')
    if (dep.includes('anthropic')) aiTools.add('Claude AI')
    if (dep.includes('generative-ai') || dep.includes('gemini')) aiTools.add('Gemini AI')
    if (dep.includes('tensorflow')) aiTools.add('TensorFlow')
    if (dep.includes('pytorch')) aiTools.add('PyTorch')
    if (dep.includes('transformers')) aiTools.add('Hugging Face')

    // Testing
    if (dep.includes('jest')) testingFrameworks.add('Jest')
    if (dep.includes('playwright')) testingFrameworks.add('Playwright')
    if (dep.includes('cypress')) testingFrameworks.add('Cypress')
    if (dep.includes('vitest')) testingFrameworks.add('Vitest')
    if (dep.includes('mocha')) testingFrameworks.add('Mocha')
  })

  // Calculate complexity score
  const techCount = languages.size + frameworks.size + databases.size + aiTools.size
  const complexity = Math.min(100, (techCount / 20) * 100)

  return {
    languages: Array.from(languages),
    frameworks: Array.from(frameworks),
    databases: Array.from(databases),
    aiTools: Array.from(aiTools),
    testingFrameworks: Array.from(testingFrameworks),
    complexity,
  }
}

/**
 * Analyze code structure
 */
function analyzeCodeStructure(projectRoot: string): CodebaseFeatures['codeStructure'] {
  try {
    // Get all tracked files
    const files = execSync('git ls-files', {
      cwd: projectRoot,
      encoding: 'utf-8',
    })
      .split('\n')
      .filter(f => f.trim())

    // Count different file types
    let totalLines = 0
    let componentCount = 0
    let apiRouteCount = 0
    let testFileCount = 0
    let docFileCount = 0

    files.forEach(file => {
      const filePath = join(projectRoot, file)

      // Count components
      if (file.match(/\/components\/.*\.(tsx|jsx)$/)) {
        componentCount++
      }

      // Count API routes
      if (file.match(/\/api\/.*\.(ts|tsx|js|jsx)$/)) {
        apiRouteCount++
      }

      // Count test files
      if (file.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/)) {
        testFileCount++
      }

      // Count documentation
      if (file.match(/\.(md|mdx)$/)) {
        docFileCount++
      }

      // Count lines (for code files only)
      if (existsSync(filePath) && file.match(/\.(ts|tsx|js|jsx|py)$/)) {
        try {
          const stats = statSync(filePath)
          if (stats.isFile() && stats.size < 1000000) { // Skip very large files
            const content = readFileSync(filePath, 'utf-8')
            totalLines += content.split('\n').length
          }
        } catch (error) {
          // Skip files we can't read
        }
      }
    })

    // Estimate test coverage
    const codeFileCount = files.filter(f => f.match(/\.(ts|tsx|js|jsx)$/) && !f.match(/\.(test|spec)\./)).length
    const testCoverage = codeFileCount > 0 ? Math.min(100, (testFileCount / codeFileCount) * 100) : 0

    // Documentation score
    const documentation = Math.min(100, (docFileCount / Math.max(1, files.length / 20)) * 100)

    return {
      totalFiles: files.length,
      totalLines,
      componentCount,
      apiRouteCount,
      testCoverage,
      documentation,
    }
  } catch (error) {
    return {
      totalFiles: 0,
      totalLines: 0,
      componentCount: 0,
      apiRouteCount: 0,
      testCoverage: 0,
      documentation: 0,
    }
  }
}

/**
 * Analyze development activity
 */
function analyzeActivity(projectRoot: string): CodebaseFeatures['activity'] {
  try {
    // Get commit history for last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const since = thirtyDaysAgo.toISOString().split('T')[0]

    const commits = execSync(`git log --since="${since}" --oneline`, {
      cwd: projectRoot,
      encoding: 'utf-8',
    })
      .trim()
      .split('\n')
      .filter(line => line.trim())

    const recentCommits = commits.length

    // Calculate commit velocity (commits per week)
    const commitVelocity = (recentCommits / 30) * 7

    // Analyze what areas are being worked on
    const activeAreas = new Set<string>()
    let totalLinesChanged = 0

    commits.slice(0, 20).forEach(commit => {
      const hash = commit.split(' ')[0]

      try {
        // Get files changed in this commit
        const files = execSync(`git show --name-only --format="" ${hash}`, {
          cwd: projectRoot,
          encoding: 'utf-8',
        })
          .split('\n')
          .filter(f => f.trim())

        // Categorize files
        files.forEach(file => {
          if (file.match(/\/components\/|\/app\//)) activeAreas.add('frontend')
          if (file.match(/\/api\//)) activeAreas.add('backend')
          if (file.match(/\/ml\/|\/ai\//)) activeAreas.add('ml')
          if (file.match(/\.(test|spec)\./)) activeAreas.add('testing')
          if (file.match(/firestore|database/)) activeAreas.add('database')
        })

        // Get lines changed
        const stats = execSync(`git show --shortstat --format="" ${hash}`, {
          cwd: projectRoot,
          encoding: 'utf-8',
        })
        const match = stats.match(/(\d+) insertion/)
        if (match) {
          totalLinesChanged += parseInt(match[1])
        }
      } catch (error) {
        // Skip commits we can't analyze
      }
    })

    // Calculate lines changed per week
    const linesChangedPerWeek = (totalLinesChanged / Math.min(commits.length, 20)) * commitVelocity

    // Determine complexity based on activity
    let complexity: 'low' | 'medium' | 'high' | 'very_high' = 'low'
    if (commitVelocity > 20 && linesChangedPerWeek > 2000) complexity = 'very_high'
    else if (commitVelocity > 10 && linesChangedPerWeek > 1000) complexity = 'high'
    else if (commitVelocity > 5 && linesChangedPerWeek > 500) complexity = 'medium'

    return {
      commitVelocity,
      recentCommits,
      activeAreas: Array.from(activeAreas),
      complexity,
      linesChangedPerWeek,
    }
  } catch (error) {
    return {
      commitVelocity: 0,
      recentCommits: 0,
      activeAreas: [],
      complexity: 'low',
      linesChangedPerWeek: 0,
    }
  }
}

/**
 * Detect architectural patterns
 */
function detectPatterns(
  projectRoot: string,
  codeStructure: CodebaseFeatures['codeStructure']
): CodebaseFeatures['patterns'] {
  try {
    const files = execSync('git ls-files', {
      cwd: projectRoot,
      encoding: 'utf-8',
    })
      .split('\n')
      .filter(f => f.trim())

    const hasAPI = codeStructure.apiRouteCount > 0
    const hasMicroservices = files.some(f => f.includes('docker') || f.includes('kubernetes'))
    const hasMonorepo = files.some(f => f.includes('packages/') || f.includes('apps/'))
    const hasMobileApp = files.some(f =>
      f.includes('capacitor') ||
      f.includes('react-native') ||
      f.includes('ios/') ||
      f.includes('android/')
    )
    const hasMLPipeline = files.some(f =>
      f.match(/\/ml\/|\/models\/|\/training\//) !== null
    )

    // Calculate architecture complexity
    let architectureComplexity = 0
    if (hasAPI) architectureComplexity += 20
    if (hasMicroservices) architectureComplexity += 30
    if (hasMonorepo) architectureComplexity += 25
    if (hasMobileApp) architectureComplexity += 15
    if (hasMLPipeline) architectureComplexity += 10

    return {
      hasAPI,
      hasMicroservices,
      hasMonorepo,
      hasMobileApp,
      hasMLPipeline,
      architectureComplexity,
    }
  } catch (error) {
    return {
      hasAPI: false,
      hasMicroservices: false,
      hasMonorepo: false,
      hasMobileApp: false,
      hasMLPipeline: false,
      architectureComplexity: 0,
    }
  }
}

/**
 * Infer team characteristics from code
 */
function inferTeamIndicators(
  codeStructure: CodebaseFeatures['codeStructure'],
  activity: CodebaseFeatures['activity']
): CodebaseFeatures['teamIndicators'] {
  // Estimate team size from commit velocity and code volume
  const filesPerDev = 50 // rough estimate
  const estimatedTeamSize = Math.max(1, Math.ceil(codeStructure.totalFiles / filesPerDev))

  // Determine specialization level
  let specializationLevel: 'generalist' | 'specialized' | 'highly_specialized' = 'generalist'
  if (activity.activeAreas.length === 1) {
    specializationLevel = 'highly_specialized'
  } else if (activity.activeAreas.length === 2) {
    specializationLevel = 'specialized'
  }

  // Determine workload distribution
  let workloadDistribution: 'balanced' | 'frontend_heavy' | 'backend_heavy' | 'full_stack' = 'balanced'
  const frontendScore = activity.activeAreas.includes('frontend') ? 1 : 0
  const backendScore = activity.activeAreas.includes('backend') ? 1 : 0

  if (frontendScore && backendScore) {
    workloadDistribution = 'full_stack'
  } else if (frontendScore && !backendScore) {
    workloadDistribution = 'frontend_heavy'
  } else if (!frontendScore && backendScore) {
    workloadDistribution = 'backend_heavy'
  }

  return {
    estimatedTeamSize,
    specializationLevel,
    workloadDistribution,
  }
}

/**
 * Generate summary statistics from features
 */
export function generateFeatureSummary(features: CodebaseFeatures): string {
  const summary = [
    `Tech Stack Complexity: ${features.techStack.complexity.toFixed(0)}/100`,
    `Languages: ${features.techStack.languages.join(', ') || 'None detected'}`,
    `Frameworks: ${features.techStack.frameworks.join(', ') || 'None detected'}`,
    `Total Files: ${features.codeStructure.totalFiles}`,
    `Components: ${features.codeStructure.componentCount}`,
    `API Routes: ${features.codeStructure.apiRouteCount}`,
    `Test Coverage: ${features.codeStructure.testCoverage.toFixed(0)}%`,
    `Commit Velocity: ${features.activity.commitVelocity.toFixed(1)} commits/week`,
    `Active Areas: ${features.activity.activeAreas.join(', ') || 'None'}`,
    `Architecture Complexity: ${features.patterns.architectureComplexity}/100`,
    `Estimated Team Size: ${features.teamIndicators.estimatedTeamSize}`,
  ]

  return summary.join('\n')
}
