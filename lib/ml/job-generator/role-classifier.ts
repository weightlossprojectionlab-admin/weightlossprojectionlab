/**
 * Role Classifier
 * Rule-based classification with weighted scoring
 *
 * NO EXTERNAL APIs - Pure algorithmic classification
 */

import type {
  CodebaseFeatures,
  RoleClassification,
  Role,
  Seniority,
  RoleScores,
  Department,
  RoleCategory
} from './types'

/**
 * Classify role based on codebase features
 */
export function classifyRole(features: CodebaseFeatures): RoleClassification {
  // Calculate scores for each role category
  const scores = calculateRoleScores(features)

  // Determine primary and secondary roles
  const sortedScores = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])

  const primaryCategory = sortedScores[0][0] as RoleCategory
  const primaryScore = sortedScores[0][1]
  const secondaryCategory = sortedScores[1][0] as RoleCategory
  const secondaryScore = sortedScores[1][1]

  // Determine seniority based on complexity
  const seniority = determineSeniority(features)

  // Create role objects
  const primaryRole = createRole(primaryCategory, features.domain)
  const secondaryRole = secondaryScore > 20 ? createRole(secondaryCategory, features.domain) : undefined

  // Calculate confidence (0-1)
  const confidence = calculateConfidence(primaryScore, secondaryScore, features)

  // Generate reasoning
  const reasoning = generateReasoning(primaryCategory, seniority, features, scores)

  return {
    primaryRole,
    secondaryRole,
    seniority,
    confidence,
    reasoning,
    scores
  }
}

/**
 * Calculate scores for each role category
 */
function calculateRoleScores(features: CodebaseFeatures): RoleScores {
  const scores: RoleScores = {
    frontend: 0,
    backend: 0,
    fullstack: 0,
    ml: 0,
    data: 0,
    devops: 0,
    mobile: 0,
    security: 0
  }

  const { techStack, filePatterns, commitPatterns, complexity } = features

  // Frontend scoring
  const frontendTechs = ['react', 'next.js', 'vue', 'angular', 'tailwindcss']
  frontendTechs.forEach(tech => {
    if (techStack.allTechnologies.some(t => t.toLowerCase().includes(tech))) {
      scores.frontend += 15
    }
  })

  // File patterns
  if (filePatterns.frontend > 0) {
    scores.frontend += Math.min(30, (filePatterns.frontend / filePatterns.total) * 100)
  }

  // Commit patterns
  if (commitPatterns.categories['frontend']) {
    scores.frontend += Math.min(25, (commitPatterns.categories['frontend'] / commitPatterns.totalCommits) * 100)
  }

  // Backend scoring
  const backendTechs = ['node.js', 'express', 'nestjs', 'fastapi', 'django', 'go', 'rust']
  backendTechs.forEach(tech => {
    if (techStack.allTechnologies.some(t => t.toLowerCase().includes(tech))) {
      scores.backend += 15
    }
  })

  // API files
  if (filePatterns.backend > 0) {
    scores.backend += Math.min(30, (filePatterns.backend / filePatterns.total) * 100)
  }

  // Commit patterns
  if (commitPatterns.categories['backend'] || commitPatterns.categories['api']) {
    const backendCommits = (commitPatterns.categories['backend'] || 0) + (commitPatterns.categories['api'] || 0)
    scores.backend += Math.min(25, (backendCommits / commitPatterns.totalCommits) * 100)
  }

  // Database expertise
  if (techStack.databases.length > 0) {
    scores.backend += techStack.databases.length * 10
  }

  // Full-stack scoring (combination of frontend + backend)
  if (scores.frontend > 20 && scores.backend > 20) {
    scores.fullstack = (scores.frontend + scores.backend) / 2 + 20 // Bonus for versatility
  }

  // ML scoring
  const mlTechs = ['tensorflow', 'pytorch', 'openai', '@anthropic-ai/sdk', '@google/generative-ai', 'scikit-learn']
  mlTechs.forEach(tech => {
    if (techStack.allTechnologies.some(t => t.toLowerCase().includes(tech))) {
      scores.ml += 20
    }
  })

  if (filePatterns.ml > 0) {
    scores.ml += Math.min(40, (filePatterns.ml / filePatterns.total) * 200)
  }

  if (commitPatterns.categories['ml']) {
    scores.ml += Math.min(30, (commitPatterns.categories['ml'] / commitPatterns.totalCommits) * 150)
  }

  // Data science scoring
  const dataTechs = ['pandas', 'numpy', 'jupyter', 'matplotlib', 'seaborn']
  dataTechs.forEach(tech => {
    if (techStack.allTechnologies.some(t => t.toLowerCase().includes(tech))) {
      scores.data += 15
    }
  })

  // Analytics/reporting patterns
  const analyticsTechs = ['recharts', 'chart.js', 'd3']
  analyticsTechs.forEach(tech => {
    if (techStack.allTechnologies.some(t => t.toLowerCase().includes(tech))) {
      scores.data += 10
    }
  })

  // DevOps scoring
  const devopsTechs = ['docker', 'kubernetes', 'terraform', 'aws', 'gcp', 'azure', 'github actions']
  devopsTechs.forEach(tech => {
    if (techStack.allTechnologies.some(t => t.toLowerCase().includes(tech))) {
      scores.devops += 15
    }
  })

  if (filePatterns.infrastructure > 0) {
    scores.devops += Math.min(35, (filePatterns.infrastructure / filePatterns.total) * 150)
  }

  if (commitPatterns.categories['infrastructure']) {
    scores.devops += Math.min(25, (commitPatterns.categories['infrastructure'] / commitPatterns.totalCommits) * 100)
  }

  // Mobile scoring
  const mobileTechs = ['react-native', '@capacitor', 'ionic', 'flutter', 'swift', 'kotlin']
  mobileTechs.forEach(tech => {
    if (techStack.allTechnologies.some(t => t.toLowerCase().includes(tech))) {
      scores.mobile += 25
    }
  })

  // Security scoring (look for security-related packages)
  const securityTechs = ['helmet', 'bcrypt', 'jsonwebtoken', 'oauth', 'passport']
  securityTechs.forEach(tech => {
    if (techStack.allTechnologies.some(t => t.toLowerCase().includes(tech))) {
      scores.security += 10
    }
  })

  // HIPAA/healthcare = higher security need
  if (features.domain === 'healthtech') {
    scores.security += 20
  }

  return scores
}

/**
 * Determine seniority based on complexity
 */
function determineSeniority(features: CodebaseFeatures): Seniority {
  const { complexity, techStack, skillGaps } = features
  let seniorityScore = 0

  // Complexity factors
  switch (complexity.architectureComplexity) {
    case 'very_high':
      seniorityScore += 40
      break
    case 'high':
      seniorityScore += 30
      break
    case 'medium':
      seniorityScore += 20
      break
    case 'low':
      seniorityScore += 10
      break
  }

  // Tech stack diversity (more tech = higher seniority needed)
  if (techStack.allTechnologies.length > 15) seniorityScore += 20
  else if (techStack.allTechnologies.length > 10) seniorityScore += 15
  else if (techStack.allTechnologies.length > 5) seniorityScore += 10

  // ML/AI work requires senior talent
  if (techStack.mlTools.length > 0) seniorityScore += 15

  // Critical skill gaps suggest need for senior hire
  const criticalGaps = skillGaps.filter(g => g.priority === 'critical')
  seniorityScore += criticalGaps.length * 10

  // Integration complexity
  if (complexity.integrationPoints > 5) seniorityScore += 15
  else if (complexity.integrationPoints > 2) seniorityScore += 10

  // Microservices = needs experienced engineers
  if (complexity.microservicesCount > 1) seniorityScore += 15

  // Map score to seniority
  if (seniorityScore >= 70) return 'Principal (12+ years)'
  if (seniorityScore >= 55) return 'Staff (8-12 years)'
  if (seniorityScore >= 40) return 'Senior (5-8 years)'
  if (seniorityScore >= 25) return 'Mid-Level (3-5 years)'
  return 'Junior (1-3 years)'
}

/**
 * Create role object from category
 */
function createRole(category: RoleCategory, domain: string): Role {
  const roleMap: Record<RoleCategory, { title: string; department: Department }> = {
    frontend: {
      title: 'Frontend Engineer',
      department: 'Engineering'
    },
    backend: {
      title: 'Backend Engineer',
      department: 'Engineering'
    },
    fullstack: {
      title: 'Full-Stack Engineer',
      department: 'Engineering'
    },
    ml: {
      title: 'Machine Learning Engineer',
      department: 'Engineering'
    },
    data: {
      title: 'Data Scientist',
      department: 'Data'
    },
    devops: {
      title: 'DevOps Engineer',
      department: 'DevOps'
    },
    mobile: {
      title: 'Mobile Engineer',
      department: 'Engineering'
    },
    security: {
      title: 'Security Engineer',
      department: 'Security'
    }
  }

  const base = roleMap[category]

  // Add domain prefix for specialized roles
  if (domain === 'healthtech' && (category === 'backend' || category === 'fullstack')) {
    return {
      title: `${base.title} - Healthcare`,
      department: base.department,
      category
    }
  }

  return {
    title: base.title,
    department: base.department,
    category
  }
}

/**
 * Calculate confidence in classification
 */
function calculateConfidence(
  primaryScore: number,
  secondaryScore: number,
  features: CodebaseFeatures
): number {
  let confidence = 0

  // Strength of primary signal
  if (primaryScore > 60) confidence += 0.4
  else if (primaryScore > 40) confidence += 0.3
  else if (primaryScore > 20) confidence += 0.2
  else confidence += 0.1

  // Clear separation from secondary role
  const separation = primaryScore - secondaryScore
  if (separation > 30) confidence += 0.3
  else if (separation > 15) confidence += 0.2
  else if (separation > 5) confidence += 0.1

  // Data quality
  if (features.commitPatterns.totalCommits > 20) confidence += 0.1
  if (features.filePatterns.total > 50) confidence += 0.1
  if (features.techStack.allTechnologies.length > 5) confidence += 0.1

  return Math.min(1.0, confidence)
}

/**
 * Generate reasoning for classification
 */
function generateReasoning(
  category: RoleCategory,
  seniority: Seniority,
  features: CodebaseFeatures,
  scores: RoleScores
): string[] {
  const reasoning: string[] = []

  // Primary role explanation
  const score = scores[category]
  reasoning.push(`${category.charAt(0).toUpperCase() + category.slice(1)} role selected based on weighted score of ${score.toFixed(1)}`)

  // Tech stack evidence
  const relevantTechs = getRelevantTechnologies(category, features.techStack.allTechnologies)
  if (relevantTechs.length > 0) {
    reasoning.push(`Tech stack includes: ${relevantTechs.slice(0, 5).join(', ')}`)
  }

  // File pattern evidence
  const filePercentage = getFilePercentage(category, features.filePatterns)
  if (filePercentage > 20) {
    reasoning.push(`${filePercentage.toFixed(0)}% of codebase is ${category}-related files`)
  }

  // Commit activity evidence
  const commitActivity = getCommitActivity(category, features.commitPatterns)
  if (commitActivity > 0) {
    reasoning.push(`Recent commits show ${commitActivity.toFixed(0)}% ${category} development activity`)
  }

  // Seniority reasoning
  reasoning.push(`${seniority} level needed due to ${features.complexity.architectureComplexity} complexity`)

  // Additional factors
  if (features.techStack.mlTools.length > 0) {
    reasoning.push(`ML/AI expertise required (${features.techStack.mlTools.length} AI tools in use)`)
  }

  if (features.complexity.integrationPoints > 3) {
    reasoning.push(`Complex integration landscape (${features.complexity.integrationPoints} integration points)`)
  }

  return reasoning
}

/**
 * Get relevant technologies for a role category
 */
function getRelevantTechnologies(category: RoleCategory, allTechs: string[]): string[] {
  const relevanceMap: Record<RoleCategory, string[]> = {
    frontend: ['react', 'next.js', 'vue', 'angular', 'tailwind', 'typescript'],
    backend: ['node', 'express', 'nest', 'fastapi', 'django', 'firebase', 'postgresql', 'mongodb'],
    fullstack: ['next.js', 'react', 'typescript', 'firebase', 'prisma'],
    ml: ['tensorflow', 'pytorch', 'openai', 'anthropic', 'google', 'scikit'],
    data: ['pandas', 'numpy', 'recharts', 'jupyter'],
    devops: ['docker', 'kubernetes', 'terraform', 'aws', 'gcp', 'azure'],
    mobile: ['capacitor', 'react-native', 'ionic', 'flutter'],
    security: ['helmet', 'bcrypt', 'jwt', 'oauth']
  }

  const keywords = relevanceMap[category] || []
  return allTechs.filter(tech =>
    keywords.some(keyword => tech.toLowerCase().includes(keyword))
  )
}

/**
 * Get file percentage for a category
 */
function getFilePercentage(category: RoleCategory, filePatterns: any): number {
  const categoryMap: Record<RoleCategory, string> = {
    frontend: 'frontend',
    backend: 'backend',
    fullstack: 'frontend', // Use frontend as proxy
    ml: 'ml',
    data: 'ml', // Use ml as proxy
    devops: 'infrastructure',
    mobile: 'frontend', // Mobile often in frontend folder
    security: 'backend' // Security often in backend
  }

  const key = categoryMap[category]
  const count = filePatterns[key] || 0
  return (count / Math.max(1, filePatterns.total)) * 100
}

/**
 * Get commit activity percentage for a category
 */
function getCommitActivity(category: RoleCategory, commitPatterns: any): number {
  const categoryMap: Record<RoleCategory, string> = {
    frontend: 'frontend',
    backend: 'backend',
    fullstack: 'frontend', // Use frontend as proxy
    ml: 'ml',
    data: 'ml',
    devops: 'infrastructure',
    mobile: 'frontend',
    security: 'backend'
  }

  const key = categoryMap[category]
  const count = commitPatterns.categories[key] || 0
  return (count / Math.max(1, commitPatterns.totalCommits)) * 100
}
