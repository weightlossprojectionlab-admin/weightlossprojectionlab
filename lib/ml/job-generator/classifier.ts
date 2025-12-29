/**
 * ML Classifier
 * Custom ML model for classifying job roles from codebase features
 *
 * STANDALONE ML SYSTEM - Does NOT use OpenAI or external APIs
 *
 * Uses a rule-based + scoring system (lightweight ML approach)
 * No need for TensorFlow.js for this use case - pattern matching is sufficient
 */

import type { CodebaseFeatures } from './feature-extractor'
import type { JobDepartment } from '@/types/jobs'

/**
 * Role classification result
 */
export interface RoleClassification {
  role: string
  department: JobDepartment
  seniority: 'Junior' | 'Mid-Level' | 'Senior' | 'Staff' | 'Principal'
  confidence: number // 0-1
  reasoning: string[]
  techStack: string[]
  priority: 'critical' | 'high' | 'medium' | 'low'
}

/**
 * Role detection scores
 */
interface RoleScore {
  role: string
  score: number
  reasons: string[]
}

/**
 * Classify job roles needed based on codebase features
 * Returns ranked list of roles needed
 */
export function classifyJobRoles(features: CodebaseFeatures): RoleClassification[] {
  const roles: RoleClassification[] = []

  // Score each potential role
  const frontendScore = scoreFrontendRole(features)
  const backendScore = scoreBackendRole(features)
  const fullStackScore = scoreFullStackRole(features)
  const mlEngineerScore = scoreMLEngineerRole(features)
  const devopsScore = scoreDevOpsRole(features)
  const mobileScore = scoreMobileRole(features)
  const qaScore = scoreQARole(features)

  // Convert scores to classifications
  const allScores = [
    frontendScore,
    backendScore,
    fullStackScore,
    mlEngineerScore,
    devopsScore,
    mobileScore,
    qaScore,
  ]

  // Filter and sort by score
  const significantRoles = allScores
    .filter(score => score.score > 0.3) // Only include roles with >30% confidence
    .sort((a, b) => b.score - a.score)

  // Take top 3 roles
  significantRoles.slice(0, 3).forEach(roleScore => {
    const classification = scoreToClassification(roleScore, features)
    if (classification) {
      roles.push(classification)
    }
  })

  return roles
}

/**
 * Score frontend role fit
 */
function scoreFrontendRole(features: CodebaseFeatures): RoleScore {
  let score = 0
  const reasons: string[] = []

  // Check for frontend frameworks
  if (features.techStack.frameworks.includes('React')) {
    score += 0.3
    reasons.push('React framework detected')
  }
  if (features.techStack.frameworks.includes('Next.js')) {
    score += 0.25
    reasons.push('Next.js framework detected')
  }
  if (features.techStack.frameworks.includes('Tailwind CSS')) {
    score += 0.1
    reasons.push('Tailwind CSS for styling')
  }

  // Check code structure
  if (features.codeStructure.componentCount > 20) {
    score += 0.2
    reasons.push(`${features.codeStructure.componentCount} components indicate active UI development`)
  }

  // Check activity
  if (features.activity.activeAreas.includes('frontend')) {
    score += 0.3
    reasons.push('Active frontend development detected')
  }

  // Workload distribution
  if (features.teamIndicators.workloadDistribution === 'frontend_heavy') {
    score += 0.2
    reasons.push('Frontend-heavy workload distribution')
  }

  return {
    role: 'Frontend Engineer',
    score: Math.min(1, score),
    reasons,
  }
}

/**
 * Score backend role fit
 */
function scoreBackendRole(features: CodebaseFeatures): RoleScore {
  let score = 0
  const reasons: string[] = []

  // Check for backend frameworks/databases
  if (features.techStack.databases.length > 0) {
    score += 0.25
    reasons.push(`Database integration: ${features.techStack.databases.join(', ')}`)
  }

  // Check API development
  if (features.codeStructure.apiRouteCount > 10) {
    score += 0.3
    reasons.push(`${features.codeStructure.apiRouteCount} API routes indicate backend complexity`)
  } else if (features.codeStructure.apiRouteCount > 5) {
    score += 0.15
  }

  // Check for API framework
  if (features.techStack.frameworks.includes('Express')) {
    score += 0.2
    reasons.push('Express backend framework')
  }

  // Check activity
  if (features.activity.activeAreas.includes('backend')) {
    score += 0.3
    reasons.push('Active backend development')
  }
  if (features.activity.activeAreas.includes('database')) {
    score += 0.15
    reasons.push('Database schema changes detected')
  }

  // Architecture patterns
  if (features.patterns.hasAPI) {
    score += 0.1
    reasons.push('API architecture detected')
  }

  // Workload distribution
  if (features.teamIndicators.workloadDistribution === 'backend_heavy') {
    score += 0.2
    reasons.push('Backend-heavy workload distribution')
  }

  return {
    role: 'Backend Engineer',
    score: Math.min(1, score),
    reasons,
  }
}

/**
 * Score full-stack role fit
 */
function scoreFullStackRole(features: CodebaseFeatures): RoleScore {
  let score = 0
  const reasons: string[] = []

  // Full-stack is needed when both frontend and backend are active
  const hasFrontend = features.codeStructure.componentCount > 10
  const hasBackend = features.codeStructure.apiRouteCount > 5

  if (hasFrontend && hasBackend) {
    score += 0.4
    reasons.push('Both frontend and backend development active')
  }

  // Check for full-stack indicators
  if (features.teamIndicators.workloadDistribution === 'full_stack') {
    score += 0.3
    reasons.push('Full-stack development pattern detected')
  }

  // Small team indicator
  if (features.teamIndicators.estimatedTeamSize <= 3) {
    score += 0.2
    reasons.push('Small team size suggests need for versatile engineers')
  }

  // Multiple active areas
  if (features.activity.activeAreas.length >= 3) {
    score += 0.15
    reasons.push('Multiple areas of development suggest full-stack needs')
  }

  return {
    role: 'Full-Stack Engineer',
    score: Math.min(1, score),
    reasons,
  }
}

/**
 * Score ML engineer role fit
 */
function scoreMLEngineerRole(features: CodebaseFeatures): RoleScore {
  let score = 0
  const reasons: string[] = []

  // Check for AI/ML tools
  if (features.techStack.aiTools.length > 0) {
    score += 0.4
    reasons.push(`AI/ML tools integrated: ${features.techStack.aiTools.join(', ')}`)
  }

  // Check for ML pipeline
  if (features.patterns.hasMLPipeline) {
    score += 0.3
    reasons.push('ML pipeline infrastructure detected')
  }

  // Check activity
  if (features.activity.activeAreas.includes('ml')) {
    score += 0.4
    reasons.push('Active ML/AI development')
  }

  // High complexity projects often need ML
  if (features.activity.complexity === 'very_high' && features.techStack.aiTools.length > 0) {
    score += 0.2
    reasons.push('High complexity project with AI integration')
  }

  return {
    role: 'Machine Learning Engineer',
    score: Math.min(1, score),
    reasons,
  }
}

/**
 * Score DevOps role fit
 */
function scoreDevOpsRole(features: CodebaseFeatures): RoleScore {
  let score = 0
  const reasons: string[] = []

  // Check for microservices
  if (features.patterns.hasMicroservices) {
    score += 0.4
    reasons.push('Microservices architecture requires DevOps expertise')
  }

  // Check for monorepo
  if (features.patterns.hasMonorepo) {
    score += 0.2
    reasons.push('Monorepo setup benefits from DevOps automation')
  }

  // High complexity
  if (features.patterns.architectureComplexity > 60) {
    score += 0.25
    reasons.push('Complex architecture requires DevOps support')
  }

  // Large codebase
  if (features.codeStructure.totalFiles > 200) {
    score += 0.15
    reasons.push('Large codebase benefits from CI/CD automation')
  }

  return {
    role: 'DevOps Engineer',
    score: Math.min(1, score),
    reasons,
  }
}

/**
 * Score mobile engineer role fit
 */
function scoreMobileRole(features: CodebaseFeatures): RoleScore {
  let score = 0
  const reasons: string[] = []

  // Check for mobile app
  if (features.patterns.hasMobileApp) {
    score += 0.6
    reasons.push('Mobile app infrastructure detected')
  }

  // Check for mobile frameworks
  const hasMobileFramework = features.techStack.frameworks.some(f =>
    f.includes('Capacitor') || f.includes('React Native')
  )
  if (hasMobileFramework) {
    score += 0.3
    reasons.push('Mobile development framework integrated')
  }

  return {
    role: 'Mobile Engineer',
    score: Math.min(1, score),
    reasons,
  }
}

/**
 * Score QA engineer role fit
 */
function scoreQARole(features: CodebaseFeatures): RoleScore {
  let score = 0
  const reasons: string[] = []

  // Low test coverage suggests need for QA
  if (features.codeStructure.testCoverage < 30 && features.codeStructure.totalFiles > 50) {
    score += 0.4
    reasons.push(`Low test coverage (${features.codeStructure.testCoverage.toFixed(0)}%) needs improvement`)
  }

  // Testing frameworks present but underutilized
  if (features.techStack.testingFrameworks.length > 0 && features.codeStructure.testCoverage < 50) {
    score += 0.2
    reasons.push('Testing infrastructure exists but needs expansion')
  }

  // High complexity needs QA
  if (features.activity.complexity === 'very_high' && features.codeStructure.testCoverage < 40) {
    score += 0.3
    reasons.push('High complexity with inadequate test coverage')
  }

  return {
    role: 'QA Engineer',
    score: Math.min(1, score),
    reasons,
  }
}

/**
 * Convert role score to classification
 */
function scoreToClassification(
  roleScore: RoleScore,
  features: CodebaseFeatures
): RoleClassification | null {
  if (roleScore.score < 0.3) return null

  // Determine seniority based on project complexity and team size
  const seniority = determineSeniority(roleScore.role, features)

  // Determine department
  const department = determineDepartment(roleScore.role)

  // Determine priority
  const priority = determinePriority(roleScore.score, features)

  // Determine relevant tech stack
  const techStack = determineRelevantTechStack(roleScore.role, features)

  return {
    role: roleScore.role,
    department,
    seniority,
    confidence: roleScore.score,
    reasoning: roleScore.reasons,
    techStack,
    priority,
  }
}

/**
 * Determine seniority level needed
 */
function determineSeniority(
  role: string,
  features: CodebaseFeatures
): 'Junior' | 'Mid-Level' | 'Senior' | 'Staff' | 'Principal' {
  const complexity = features.activity.complexity
  const architectureComplexity = features.patterns.architectureComplexity
  const teamSize = features.teamIndicators.estimatedTeamSize

  // ML roles typically need senior+ engineers
  if (role.includes('Machine Learning') || role.includes('ML')) {
    return 'Senior'
  }

  // DevOps typically needs experienced engineers
  if (role.includes('DevOps')) {
    return teamSize > 5 ? 'Senior' : 'Mid-Level'
  }

  // Based on complexity
  if (complexity === 'very_high' || architectureComplexity > 70) {
    return 'Senior'
  }

  if (complexity === 'high' || architectureComplexity > 50) {
    return teamSize <= 2 ? 'Senior' : 'Mid-Level'
  }

  if (complexity === 'medium') {
    return 'Mid-Level'
  }

  return 'Mid-Level' // Default to mid-level
}

/**
 * Determine department
 */
function determineDepartment(role: string): JobDepartment {
  if (role.includes('Engineer')) return 'Engineering'
  if (role.includes('QA')) return 'Engineering'
  if (role.includes('Product')) return 'Product'
  if (role.includes('Designer')) return 'Design'
  if (role.includes('Data')) return 'Data'
  return 'Engineering'
}

/**
 * Determine hiring priority
 */
function determinePriority(
  confidence: number,
  features: CodebaseFeatures
): 'critical' | 'high' | 'medium' | 'low' {
  const velocity = features.activity.commitVelocity

  if (confidence > 0.8 && velocity > 15) return 'critical'
  if (confidence > 0.7 && velocity > 10) return 'high'
  if (confidence > 0.5) return 'medium'
  return 'low'
}

/**
 * Determine relevant tech stack for role
 */
function determineRelevantTechStack(role: string, features: CodebaseFeatures): string[] {
  const techStack: string[] = []

  // Always include languages
  techStack.push(...features.techStack.languages)

  if (role.includes('Frontend')) {
    techStack.push(
      ...features.techStack.frameworks.filter(f =>
        ['React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'Tailwind CSS'].includes(f)
      )
    )
  }

  if (role.includes('Backend')) {
    techStack.push(...features.techStack.databases)
    techStack.push(
      ...features.techStack.frameworks.filter(f =>
        ['Express', 'Next.js'].includes(f)
      )
    )
  }

  if (role.includes('Full-Stack')) {
    techStack.push(...features.techStack.frameworks)
    techStack.push(...features.techStack.databases)
  }

  if (role.includes('Machine Learning') || role.includes('ML')) {
    techStack.push(...features.techStack.aiTools)
  }

  if (role.includes('Mobile')) {
    techStack.push(
      ...features.techStack.frameworks.filter(f =>
        f.includes('Capacitor') || f.includes('React Native')
      )
    )
  }

  if (role.includes('QA')) {
    techStack.push(...features.techStack.testingFrameworks)
  }

  // Remove duplicates
  return Array.from(new Set(techStack))
}

/**
 * Get human-readable summary of classification
 */
export function getClassificationSummary(classification: RoleClassification): string {
  const lines = [
    `Role: ${classification.role}`,
    `Seniority: ${classification.seniority}`,
    `Department: ${classification.department}`,
    `Priority: ${classification.priority.toUpperCase()}`,
    `Confidence: ${(classification.confidence * 100).toFixed(0)}%`,
    `Tech Stack: ${classification.techStack.join(', ')}`,
    `Reasoning:`,
    ...classification.reasoning.map(r => `  - ${r}`),
  ]

  return lines.join('\n')
}
