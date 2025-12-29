/**
 * ML Job Generator Types
 * Type definitions for the proprietary ML-based job generation system
 *
 * This is a STANDALONE ML SYSTEM - does NOT use external APIs
 */

export interface CodebaseFeatures {
  // Tech Stack Analysis
  techStack: TechStackAnalysis

  // Complexity Metrics
  complexity: ComplexityMetrics

  // Skill Gap Analysis
  skillGaps: SkillGap[]

  // Domain Detection
  domain: string
  domainConfidence: number

  // File Patterns
  filePatterns: FilePatternAnalysis

  // Commit Patterns
  commitPatterns: CommitPatternAnalysis
}

export interface TechStackAnalysis {
  languages: Technology[]
  frameworks: Technology[]
  databases: Technology[]
  cloudServices: Technology[]
  mlTools: Technology[]
  testingTools: Technology[]
  devOps: Technology[]
  allTechnologies: string[]
}

export interface Technology {
  name: string
  category: TechCategory
  confidence: number
  usage: 'core' | 'supporting' | 'occasional'
  firstSeen?: Date
  lastSeen?: Date
}

export type TechCategory =
  | 'language'
  | 'framework'
  | 'database'
  | 'cloud'
  | 'ml'
  | 'testing'
  | 'devops'
  | 'tool'

export interface ComplexityMetrics {
  linesOfCode: number
  filesChanged: number
  complexityScore: number // 0-100
  architectureComplexity: 'low' | 'medium' | 'high' | 'very_high'
  integrationPoints: number
  microservicesCount: number
}

export interface SkillGap {
  technology: string
  category: TechCategory
  priority: 'critical' | 'high' | 'medium' | 'low'
  reason: string
  estimatedTimeToFill: string // e.g., "3-6 months"
}

export interface FilePatternAnalysis {
  frontend: number
  backend: number
  ml: number
  infrastructure: number
  testing: number
  documentation: number
  total: number
}

export interface CommitPatternAnalysis {
  totalCommits: number
  avgCommitSize: number
  complexCommits: number
  categories: Record<string, number>
  recentActivity: 'very_high' | 'high' | 'medium' | 'low'
  velocity: number // commits per day
}

export interface RoleClassification {
  primaryRole: Role
  secondaryRole?: Role
  seniority: Seniority
  confidence: number
  reasoning: string[]
  scores: RoleScores
}

export interface Role {
  title: string
  department: Department
  category: RoleCategory
}

export type Department =
  | 'Engineering'
  | 'Product'
  | 'Design'
  | 'Data'
  | 'Security'
  | 'DevOps'

export type RoleCategory =
  | 'frontend'
  | 'backend'
  | 'fullstack'
  | 'ml'
  | 'data'
  | 'devops'
  | 'mobile'
  | 'security'

export type Seniority =
  | 'Junior (1-3 years)'
  | 'Mid-Level (3-5 years)'
  | 'Senior (5-8 years)'
  | 'Staff (8-12 years)'
  | 'Principal (12+ years)'

export interface RoleScores {
  frontend: number
  backend: number
  fullstack: number
  ml: number
  data: number
  devops: number
  mobile: number
  security: number
}

export interface JobRequirements {
  required: string[]
  preferred: string[]
  education: string[]
  experience: ExperienceRequirement[]
  certifications: string[]
}

export interface ExperienceRequirement {
  area: string
  years: string
  importance: 'required' | 'preferred'
}

export interface SalaryEstimate {
  min: number
  max: number
  equity: string
  confidence: number
  marketData: MarketData
  adjustments: SalaryAdjustment[]
}

export interface MarketData {
  role: string
  seniority: Seniority
  location: string
  marketRate: { min: number; max: number }
  source: string
  lastUpdated: Date
}

export interface SalaryAdjustment {
  factor: string
  amount: number
  reason: string
}

export interface GeneratedJobDescription {
  title: string
  summary: string
  about: string
  whyCritical: string
  responsibilities: string[]
  successMetrics: {
    month1: string[]
    month2: string[]
    month3: string[]
  }
  whyJoin: string[]
  challenges: string[]
}

export interface MLGeneratedJob {
  job: {
    slug: string
    title: string
    department: Department
    location: string
    locationType: 'remote' | 'hybrid' | 'onsite'
    salaryMin: number
    salaryMax: number
    equity: string
    reportsTo: string
    about: string
    whyCritical: string
    responsibilities: string[]
    requiredQualifications: string[]
    niceToHave: string[]
    successMetrics: {
      month1: string[]
      month2: string[]
      month3: string[]
    }
    whyJoin: string[]
    status: 'draft'
    metaDescription?: string
    keywords?: string[]
  }
  metadata: MLGenerationMetadata
  confidence: number
  rationale: string
}

export interface MLGenerationMetadata {
  modelVersion: string
  generatedBy: 'WLPL-ML-Engine'
  generatedAt: Date
  features: CodebaseFeatures
  classification: RoleClassification
  requirements: JobRequirements
  salary: SalaryEstimate
  processingTime: number
  confidence: number
}

export interface MLModelConfig {
  maxJobs?: number
  minConfidence?: number
  includeDrafts?: boolean
  targetDepartments?: Department[]
}

export interface MLGenerationResult {
  jobs: MLGeneratedJob[]
  features: CodebaseFeatures
  summary: {
    jobsGenerated: number
    avgConfidence: number
    topRoles: string[]
    topTechnologies: string[]
  }
  modelVersion: string
  totalProcessingTime: number
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  score: number // 0-100
}

export interface JobValidationResult {
  job: MLGeneratedJob
  validation: ValidationResult
}
