/**
 * Salary Estimator
 * Simple regression model for salary estimation
 *
 * NO EXTERNAL APIs - Uses market data knowledge base
 */

import { ROLE_BASE_SALARIES, EQUITY_RANGES } from './knowledge-base'
import type {
  CodebaseFeatures,
  RoleClassification,
  SalaryEstimate,
  MarketData,
  SalaryAdjustment,
  Seniority
} from './types'

/**
 * Estimate salary for a role
 */
export function estimateSalary(
  classification: RoleClassification,
  features: CodebaseFeatures
): SalaryEstimate {
  const { primaryRole, seniority } = classification
  const { techStack, complexity, domain } = features

  // Get base salary from knowledge base
  const baseSalary = getBaseSalary(primaryRole.title, seniority)

  // Calculate adjustments
  const adjustments = calculateAdjustments(
    techStack,
    complexity,
    domain,
    primaryRole.category
  )

  // Apply adjustments
  let min = baseSalary.min
  let max = baseSalary.max

  adjustments.forEach(adj => {
    min += adj.amount
    max += adj.amount
  })

  // Round to nearest $5k
  min = Math.round(min / 5000) * 5000
  max = Math.round(max / 5000) * 5000

  // Ensure min < max
  if (min >= max) {
    max = min + 20000
  }

  // Get equity range
  const equity = EQUITY_RANGES[seniority] || '0.1%-0.5%'

  // Calculate confidence
  const confidence = calculateSalaryConfidence(adjustments, features)

  // Generate market data
  const marketData: MarketData = {
    role: primaryRole.title,
    seniority,
    location: 'Remote (US)',
    marketRate: { min: baseSalary.min, max: baseSalary.max },
    source: 'WPL Market Data 2024-2025',
    lastUpdated: new Date('2024-12-01')
  }

  return {
    min,
    max,
    equity,
    confidence,
    marketData,
    adjustments
  }
}

/**
 * Get base salary from knowledge base
 */
function getBaseSalary(roleTitle: string, seniority: Seniority): { min: number; max: number } {
  // Normalize role title
  const normalizedRole = normalizeRoleTitle(roleTitle)

  // Look up in knowledge base
  const salaryData = ROLE_BASE_SALARIES[normalizedRole]

  if (salaryData && salaryData[seniority]) {
    return salaryData[seniority]
  }

  // Fallback to generic engineer salary
  const fallback = ROLE_BASE_SALARIES['Full-Stack Engineer']
  if (fallback && fallback[seniority]) {
    return fallback[seniority]
  }

  // Ultimate fallback
  return { min: 100000, max: 140000 }
}

/**
 * Normalize role title for lookup
 */
function normalizeRoleTitle(title: string): string {
  // Remove domain suffixes
  title = title.replace(/ - Healthcare/i, '')
  title = title.replace(/ - HealthTech/i, '')
  title = title.replace(/ - Fintech/i, '')

  // Map variations to canonical names
  const mapping: Record<string, string> = {
    'Frontend Engineer': 'Frontend Engineer',
    'Front-End Engineer': 'Frontend Engineer',
    'Front End Engineer': 'Frontend Engineer',
    'Backend Engineer': 'Backend Engineer',
    'Back-End Engineer': 'Backend Engineer',
    'Back End Engineer': 'Backend Engineer',
    'Full-Stack Engineer': 'Full-Stack Engineer',
    'Full Stack Engineer': 'Full-Stack Engineer',
    'Fullstack Engineer': 'Full-Stack Engineer',
    'ML Engineer': 'ML Engineer',
    'Machine Learning Engineer': 'ML Engineer',
    'AI Engineer': 'ML Engineer',
    'Data Scientist': 'Data Scientist',
    'DevOps Engineer': 'DevOps Engineer',
    'Site Reliability Engineer': 'DevOps Engineer',
    'SRE': 'DevOps Engineer',
    'Mobile Engineer': 'Mobile Engineer',
    'iOS Engineer': 'Mobile Engineer',
    'Android Engineer': 'Mobile Engineer',
    'Security Engineer': 'Security Engineer',
    'InfoSec Engineer': 'Security Engineer'
  }

  return mapping[title] || title
}

/**
 * Calculate salary adjustments based on various factors
 */
function calculateAdjustments(
  techStack: any,
  complexity: any,
  domain: string,
  roleCategory: string
): SalaryAdjustment[] {
  const adjustments: SalaryAdjustment[] = []

  // Tech stack complexity adjustment
  const techCount = techStack.allTechnologies.length
  if (techCount > 15) {
    adjustments.push({
      factor: 'Tech Stack Diversity',
      amount: 15000,
      reason: `Extensive tech stack (${techCount} technologies) requires broad expertise`
    })
  } else if (techCount > 10) {
    adjustments.push({
      factor: 'Tech Stack Diversity',
      amount: 10000,
      reason: `Diverse tech stack (${techCount} technologies) requires versatile skills`
    })
  }

  // ML/AI premium
  if (techStack.mlTools.length > 0 && roleCategory !== 'ml') {
    adjustments.push({
      factor: 'AI/ML Skills',
      amount: 12000,
      reason: `AI/ML integration experience required (${techStack.mlTools.length} AI tools)`
    })
  }

  // Architecture complexity premium
  if (complexity.architectureComplexity === 'very_high') {
    adjustments.push({
      factor: 'Architecture Complexity',
      amount: 18000,
      reason: 'Very high architecture complexity requires exceptional engineering skills'
    })
  } else if (complexity.architectureComplexity === 'high') {
    adjustments.push({
      factor: 'Architecture Complexity',
      amount: 12000,
      reason: 'High architecture complexity requires advanced problem-solving'
    })
  }

  // Integration complexity
  if (complexity.integrationPoints > 5) {
    adjustments.push({
      factor: 'Integration Complexity',
      amount: 8000,
      reason: `Complex integration landscape (${complexity.integrationPoints} integration points)`
    })
  }

  // Microservices experience
  if (complexity.microservicesCount > 1) {
    adjustments.push({
      factor: 'Microservices Architecture',
      amount: 10000,
      reason: 'Microservices architecture experience required'
    })
  }

  // Domain-specific premiums
  if (domain === 'healthtech') {
    adjustments.push({
      factor: 'Healthcare Domain',
      amount: 8000,
      reason: 'HIPAA compliance and healthcare data expertise required'
    })
  } else if (domain === 'fintech') {
    adjustments.push({
      factor: 'Fintech Domain',
      amount: 10000,
      reason: 'Financial regulations and payment security expertise required'
    })
  }

  // Cloud platform experience
  if (techStack.cloudServices.length > 0) {
    adjustments.push({
      factor: 'Cloud Platform Expertise',
      amount: 6000,
      reason: `Multi-cloud experience valued (${techStack.cloudServices.length} platforms)`
    })
  }

  // Testing/quality culture
  if (techStack.testingTools.length > 2) {
    adjustments.push({
      factor: 'Quality Engineering',
      amount: 5000,
      reason: 'Strong testing culture requires quality-focused engineering'
    })
  }

  // Remote work adjustment (already built into base)
  adjustments.push({
    factor: 'Remote Work',
    amount: 0,
    reason: 'Remote-first role with flexible location (US, Canada, EU)'
  })

  return adjustments
}

/**
 * Calculate confidence in salary estimate
 */
function calculateSalaryConfidence(
  adjustments: SalaryAdjustment[],
  features: CodebaseFeatures
): number {
  let confidence = 0.7 // Base confidence

  // More data = higher confidence
  if (features.techStack.allTechnologies.length > 10) confidence += 0.1
  if (features.commitPatterns.totalCommits > 30) confidence += 0.1

  // Large adjustments reduce confidence
  const totalAdjustment = adjustments.reduce((sum, adj) => sum + Math.abs(adj.amount), 0)
  if (totalAdjustment > 40000) confidence -= 0.1
  else if (totalAdjustment > 20000) confidence -= 0.05

  // Domain knowledge increases confidence
  if (features.domainConfidence > 0.8) confidence += 0.05

  return Math.min(1.0, Math.max(0.5, confidence))
}

/**
 * Format salary range for display
 */
export function formatSalaryRange(estimate: SalaryEstimate): string {
  const minFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(estimate.min)

  const maxFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(estimate.max)

  return `${minFormatted} - ${maxFormatted}`
}

/**
 * Generate salary explanation
 */
export function generateSalaryExplanation(estimate: SalaryEstimate): string {
  const lines: string[] = []

  lines.push(`Base Range: $${estimate.marketData.marketRate.min.toLocaleString()} - $${estimate.marketData.marketRate.max.toLocaleString()}`)

  if (estimate.adjustments.length > 0) {
    lines.push('\nAdjustments:')
    estimate.adjustments.forEach(adj => {
      if (adj.amount !== 0) {
        const sign = adj.amount > 0 ? '+' : ''
        lines.push(`  ${sign}$${adj.amount.toLocaleString()} - ${adj.reason}`)
      } else {
        lines.push(`  ${adj.reason}`)
      }
    })
  }

  lines.push(`\nFinal Range: $${estimate.min.toLocaleString()} - $${estimate.max.toLocaleString()}`)
  lines.push(`Equity: ${estimate.equity}`)
  lines.push(`\nConfidence: ${(estimate.confidence * 100).toFixed(0)}%`)

  return lines.join('\n')
}
