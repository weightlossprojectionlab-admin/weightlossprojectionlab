/**
 * Codebase Feature Extractor
 * Analyzes codebase and extracts features for ML classification
 *
 * NO EXTERNAL APIs - Pure local analysis
 */

import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import {
  TECH_TO_SKILLS_MAP,
  DOMAIN_TERMS
} from './knowledge-base'
import type {
  CodebaseFeatures,
  TechStackAnalysis,
  Technology,
  TechCategory,
  ComplexityMetrics,
  SkillGap,
  FilePatternAnalysis,
  CommitPatternAnalysis
} from './types'

/**
 * Extract all features from codebase
 */
export function extractCodebaseFeatures(projectRoot: string = process.cwd()): CodebaseFeatures {
  const startTime = Date.now()

  // Analyze tech stack
  const techStack = analyzeTechStack(projectRoot)

  // Analyze file patterns
  const filePatterns = analyzeFilePatterns(projectRoot)

  // Analyze commits
  const commitPatterns = analyzeCommitPatterns(projectRoot)

  // Calculate complexity
  const complexity = calculateComplexity(techStack, filePatterns, commitPatterns)

  // Detect domain
  const { domain, confidence: domainConfidence } = detectDomain(projectRoot, techStack)

  // Identify skill gaps
  const skillGaps = identifySkillGaps(techStack, commitPatterns)

  const processingTime = Date.now() - startTime

  console.log(`[Feature Extractor] Extracted features in ${processingTime}ms`)

  return {
    techStack,
    complexity,
    skillGaps,
    domain,
    domainConfidence,
    filePatterns,
    commitPatterns
  }
}

/**
 * Analyze tech stack from package.json
 */
function analyzeTechStack(projectRoot: string): TechStackAnalysis {
  const packageJsonPath = join(projectRoot, 'package.json')

  if (!existsSync(packageJsonPath)) {
    return emptyTechStack()
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  }

  const technologies: Technology[] = []
  const languageSet = new Set<string>()
  const frameworkSet = new Set<string>()
  const databaseSet = new Set<string>()
  const cloudSet = new Set<string>()
  const mlSet = new Set<string>()
  const testingSet = new Set<string>()
  const devOpsSet = new Set<string>()

  // Map dependencies to technologies
  Object.keys(allDeps).forEach(dep => {
    const normalizedDep = dep.toLowerCase().replace(/^@[\w-]+\//, '')

    // Check if we have this tech in our knowledge base
    const techInfo = TECH_TO_SKILLS_MAP[normalizedDep] || TECH_TO_SKILLS_MAP[dep]

    if (techInfo) {
      const tech: Technology = {
        name: dep,
        category: techInfo.category,
        confidence: 1.0,
        usage: 'core' // Would need git analysis to determine actual usage
      }

      technologies.push(tech)

      // Categorize
      switch (techInfo.category) {
        case 'language':
          languageSet.add(dep)
          break
        case 'framework':
          frameworkSet.add(dep)
          break
        case 'database':
          databaseSet.add(dep)
          break
        case 'cloud':
          cloudSet.add(dep)
          break
        case 'ml':
          mlSet.add(dep)
          break
        case 'testing':
          testingSet.add(dep)
          break
        case 'devops':
          devOpsSet.add(dep)
          break
      }
    }
  })

  // Infer additional technologies from file structure
  const additionalTechs = inferTechnologiesFromFiles(projectRoot)
  additionalTechs.forEach(tech => {
    if (!technologies.find(t => t.name === tech.name)) {
      technologies.push(tech)

      switch (tech.category) {
        case 'language':
          languageSet.add(tech.name)
          break
        case 'framework':
          frameworkSet.add(tech.name)
          break
      }
    }
  })

  return {
    languages: Array.from(technologies.filter(t => t.category === 'language')),
    frameworks: Array.from(technologies.filter(t => t.category === 'framework')),
    databases: Array.from(technologies.filter(t => t.category === 'database')),
    cloudServices: Array.from(technologies.filter(t => t.category === 'cloud')),
    mlTools: Array.from(technologies.filter(t => t.category === 'ml')),
    testingTools: Array.from(technologies.filter(t => t.category === 'testing')),
    devOps: Array.from(technologies.filter(t => t.category === 'devops')),
    allTechnologies: Array.from(new Set(technologies.map(t => t.name)))
  }
}

/**
 * Infer technologies from file structure
 */
function inferTechnologiesFromFiles(projectRoot: string): Technology[] {
  const technologies: Technology[] = []

  try {
    // Check for specific file patterns
    const files = execSync('git ls-files', {
      cwd: projectRoot,
      encoding: 'utf-8'
    }).split('\n')

    // TypeScript
    if (files.some(f => f.endsWith('.ts') || f.endsWith('.tsx'))) {
      technologies.push({
        name: 'TypeScript',
        category: 'language',
        confidence: 1.0,
        usage: 'core'
      })
    }

    // React
    if (files.some(f => f.endsWith('.tsx') || f.endsWith('.jsx'))) {
      technologies.push({
        name: 'React',
        category: 'framework',
        confidence: 0.95,
        usage: 'core'
      })
    }

    // Next.js (check for app/ or pages/ directory)
    if (files.some(f => f.startsWith('app/') || f.startsWith('pages/'))) {
      technologies.push({
        name: 'Next.js',
        category: 'framework',
        confidence: 0.9,
        usage: 'core'
      })
    }

    // Python
    if (files.some(f => f.endsWith('.py'))) {
      technologies.push({
        name: 'Python',
        category: 'language',
        confidence: 1.0,
        usage: 'core'
      })
    }

    // Tailwind CSS
    if (existsSync(join(projectRoot, 'tailwind.config.js')) ||
        existsSync(join(projectRoot, 'tailwind.config.ts'))) {
      technologies.push({
        name: 'Tailwind CSS',
        category: 'framework',
        confidence: 1.0,
        usage: 'core'
      })
    }
  } catch (error) {
    // Git ls-files failed, skip inference
  }

  return technologies
}

/**
 * Analyze file patterns
 */
function analyzeFilePatterns(projectRoot: string): FilePatternAnalysis {
  try {
    const files = execSync('git ls-files', {
      cwd: projectRoot,
      encoding: 'utf-8'
    }).split('\n').filter(f => f.trim())

    const patterns: FilePatternAnalysis = {
      frontend: 0,
      backend: 0,
      ml: 0,
      infrastructure: 0,
      testing: 0,
      documentation: 0,
      total: files.length
    }

    files.forEach(file => {
      // Frontend
      if (file.match(/\/(components|app\/\(.*\)|pages|styles|public)\//)) {
        patterns.frontend++
      }

      // Backend/API
      if (file.match(/\/(api|server|functions|lib\/.*-operations\.ts)\//)) {
        patterns.backend++
      }

      // ML/AI
      if (file.match(/\/(ml|ai|models)\//)) {
        patterns.ml++
      }

      // Infrastructure
      if (file.match(/\.(yaml|yml|dockerfile|sh|ps1|tf)$/i)) {
        patterns.infrastructure++
      }

      // Testing
      if (file.match(/\.(test|spec)\.(ts|tsx|js|jsx|py)$/)) {
        patterns.testing++
      }

      // Documentation
      if (file.match(/\.(md|mdx|txt)$/)) {
        patterns.documentation++
      }
    })

    return patterns
  } catch (error) {
    return {
      frontend: 0,
      backend: 0,
      ml: 0,
      infrastructure: 0,
      testing: 0,
      documentation: 0,
      total: 0
    }
  }
}

/**
 * Analyze commit patterns
 */
function analyzeCommitPatterns(projectRoot: string, count: number = 50): CommitPatternAnalysis {
  try {
    // Get recent commits
    const log = execSync(`git log -${count} --format="%H|%ad" --date=iso`, {
      cwd: projectRoot,
      encoding: 'utf-8'
    })

    const commits = log.trim().split('\n').filter(l => l.trim())
    const totalCommits = commits.length

    if (totalCommits === 0) {
      return emptyCommitPatterns()
    }

    // Calculate commit velocity (commits per day)
    const firstCommit = commits[commits.length - 1]
    const lastCommit = commits[0]
    const firstDate = new Date(firstCommit.split('|')[1])
    const lastDate = new Date(lastCommit.split('|')[1])
    const daysDiff = Math.max(1, Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)))
    const velocity = totalCommits / daysDiff

    // Calculate average commit size and complexity
    let totalLinesChanged = 0
    let complexCommits = 0
    const categories: Record<string, number> = {}

    commits.forEach(commit => {
      const hash = commit.split('|')[0]

      try {
        // Get commit stats
        const stats = execSync(`git show --shortstat --format="" ${hash}`, {
          cwd: projectRoot,
          encoding: 'utf-8'
        })

        const insertionsMatch = stats.match(/(\d+) insertion/)
        const deletionsMatch = stats.match(/(\d+) deletion/)
        const insertions = insertionsMatch ? parseInt(insertionsMatch[1]) : 0
        const deletions = deletionsMatch ? parseInt(deletionsMatch[1]) : 0
        const linesChanged = insertions + deletions

        totalLinesChanged += linesChanged

        // Complex commit threshold: > 200 lines
        if (linesChanged > 200) {
          complexCommits++
        }

        // Categorize commit
        const filesChanged = execSync(`git show --name-only --format="" ${hash}`, {
          cwd: projectRoot,
          encoding: 'utf-8'
        }).split('\n').filter(f => f.trim())

        filesChanged.forEach(file => {
          if (file.match(/\/(components|app|pages)\//)) {
            categories['frontend'] = (categories['frontend'] || 0) + 1
          }
          if (file.match(/\/api\//)) {
            categories['backend'] = (categories['backend'] || 0) + 1
          }
          if (file.match(/\/(ml|ai)\//)) {
            categories['ml'] = (categories['ml'] || 0) + 1
          }
          if (file.match(/\.(yaml|yml|dockerfile|sh)$/)) {
            categories['infrastructure'] = (categories['infrastructure'] || 0) + 1
          }
        })
      } catch (error) {
        // Skip this commit if analysis fails
      }
    })

    const avgCommitSize = Math.floor(totalLinesChanged / totalCommits)

    // Determine activity level
    let recentActivity: 'very_high' | 'high' | 'medium' | 'low'
    if (velocity > 5) recentActivity = 'very_high'
    else if (velocity > 2) recentActivity = 'high'
    else if (velocity > 0.5) recentActivity = 'medium'
    else recentActivity = 'low'

    return {
      totalCommits,
      avgCommitSize,
      complexCommits,
      categories,
      recentActivity,
      velocity
    }
  } catch (error) {
    return emptyCommitPatterns()
  }
}

/**
 * Calculate complexity metrics
 */
function calculateComplexity(
  techStack: TechStackAnalysis,
  filePatterns: FilePatternAnalysis,
  commitPatterns: CommitPatternAnalysis
): ComplexityMetrics {
  // Calculate complexity score (0-100)
  let score = 0

  // Tech stack diversity (0-30 points)
  const techCount = techStack.allTechnologies.length
  if (techCount > 20) score += 30
  else if (techCount > 10) score += 20
  else if (techCount > 5) score += 10

  // File count (0-20 points)
  if (filePatterns.total > 500) score += 20
  else if (filePatterns.total > 200) score += 15
  else if (filePatterns.total > 100) score += 10
  else if (filePatterns.total > 50) score += 5

  // Commit complexity (0-20 points)
  const complexityRatio = commitPatterns.complexCommits / Math.max(1, commitPatterns.totalCommits)
  if (complexityRatio > 0.5) score += 20
  else if (complexityRatio > 0.3) score += 15
  else if (complexityRatio > 0.1) score += 10

  // ML/AI presence (0-15 points)
  if (techStack.mlTools.length > 2) score += 15
  else if (techStack.mlTools.length > 0) score += 10

  // Infrastructure complexity (0-15 points)
  if (techStack.devOps.length > 3 || filePatterns.infrastructure > 20) score += 15
  else if (techStack.devOps.length > 0 || filePatterns.infrastructure > 5) score += 10

  // Determine architecture complexity
  let architectureComplexity: 'low' | 'medium' | 'high' | 'very_high'
  if (score >= 70) architectureComplexity = 'very_high'
  else if (score >= 50) architectureComplexity = 'high'
  else if (score >= 30) architectureComplexity = 'medium'
  else architectureComplexity = 'low'

  // Estimate integration points
  const integrationPoints = techStack.databases.length +
    techStack.cloudServices.length +
    techStack.mlTools.length

  // Estimate microservices (rough heuristic)
  const microservicesCount = filePatterns.backend > 50 ? Math.floor(filePatterns.backend / 50) : 1

  return {
    linesOfCode: commitPatterns.avgCommitSize * commitPatterns.totalCommits,
    filesChanged: filePatterns.total,
    complexityScore: score,
    architectureComplexity,
    integrationPoints,
    microservicesCount
  }
}

/**
 * Detect domain (healthtech, fintech, etc.)
 */
function detectDomain(
  projectRoot: string,
  techStack: TechStackAnalysis
): { domain: string; confidence: number } {
  // Check package.json for domain clues
  try {
    const packageJsonPath = join(projectRoot, 'package.json')
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
      const name = packageJson.name?.toLowerCase() || ''
      const description = packageJson.description?.toLowerCase() || ''

      // Health tech detection
      if (name.includes('health') || name.includes('medical') || name.includes('patient') ||
          description.includes('health') || description.includes('medical')) {
        return { domain: 'healthtech', confidence: 0.9 }
      }

      // Fintech detection
      if (name.includes('payment') || name.includes('finance') || name.includes('bank') ||
          description.includes('payment') || description.includes('finance')) {
        return { domain: 'fintech', confidence: 0.9 }
      }

      // E-commerce detection
      if (name.includes('shop') || name.includes('commerce') || name.includes('store') ||
          description.includes('shop') || description.includes('commerce')) {
        return { domain: 'ecommerce', confidence: 0.9 }
      }
    }

    // Check for domain-specific dependencies
    if (techStack.allTechnologies.some(t => t.toLowerCase().includes('stripe'))) {
      return { domain: 'fintech', confidence: 0.7 }
    }

    // Check README for domain clues
    const readmePath = join(projectRoot, 'README.md')
    if (existsSync(readmePath)) {
      const readme = readFileSync(readmePath, 'utf-8').toLowerCase()

      if (readme.includes('hipaa') || readme.includes('patient') || readme.includes('medical')) {
        return { domain: 'healthtech', confidence: 0.85 }
      }
    }
  } catch (error) {
    // Ignore errors
  }

  return { domain: 'saas', confidence: 0.5 }
}

/**
 * Identify skill gaps based on tech stack and commit patterns
 */
function identifySkillGaps(
  techStack: TechStackAnalysis,
  commitPatterns: CommitPatternAnalysis
): SkillGap[] {
  const gaps: SkillGap[] = []

  // High activity in a category suggests need for expertise
  const { categories } = commitPatterns

  // Frontend expertise needed
  if ((categories['frontend'] || 0) > commitPatterns.totalCommits * 0.3) {
    gaps.push({
      technology: 'Frontend Development',
      category: 'framework',
      priority: 'high',
      reason: 'High volume of frontend commits',
      estimatedTimeToFill: '1-2 months'
    })
  }

  // Backend expertise needed
  if ((categories['backend'] || 0) > commitPatterns.totalCommits * 0.3) {
    gaps.push({
      technology: 'Backend Development',
      category: 'framework',
      priority: 'high',
      reason: 'High volume of backend/API commits',
      estimatedTimeToFill: '1-2 months'
    })
  }

  // ML expertise needed
  if (techStack.mlTools.length > 0 || (categories['ml'] || 0) > 0) {
    gaps.push({
      technology: 'Machine Learning',
      category: 'ml',
      priority: 'critical',
      reason: 'ML/AI features in development',
      estimatedTimeToFill: '3-6 months'
    })
  }

  // Infrastructure expertise needed
  if ((categories['infrastructure'] || 0) > commitPatterns.totalCommits * 0.2) {
    gaps.push({
      technology: 'DevOps/Infrastructure',
      category: 'devops',
      priority: 'high',
      reason: 'Active infrastructure changes',
      estimatedTimeToFill: '2-3 months'
    })
  }

  return gaps
}

/**
 * Empty tech stack (fallback)
 */
function emptyTechStack(): TechStackAnalysis {
  return {
    languages: [],
    frameworks: [],
    databases: [],
    cloudServices: [],
    mlTools: [],
    testingTools: [],
    devOps: [],
    allTechnologies: []
  }
}

/**
 * Empty commit patterns (fallback)
 */
function emptyCommitPatterns(): CommitPatternAnalysis {
  return {
    totalCommits: 0,
    avgCommitSize: 0,
    complexCommits: 0,
    categories: {},
    recentActivity: 'low',
    velocity: 0
  }
}
