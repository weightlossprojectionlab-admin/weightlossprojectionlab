/**
 * Job Posting Types
 * Schema for careers page and job management
 */

export type JobStatus = 'draft' | 'published' | 'closed'
export type JobLocationType = 'remote' | 'hybrid' | 'onsite'
export type JobDepartment =
  | 'Engineering'
  | 'Product'
  | 'Design'
  | 'Marketing'
  | 'Customer Success'
  | 'Security'
  | 'Data'

export interface JobSuccessMetrics {
  month1: string[]
  month2: string[]
  month3: string[]
}

export interface JobPosting {
  id: string
  slug: string // URL-friendly (e.g., "senior-full-stack-engineer")
  title: string
  department: JobDepartment
  location: string // e.g., "Remote (US, Canada, EU)"
  locationType: JobLocationType
  salaryMin: number
  salaryMax: number
  equity: string // e.g., "0.25%-0.75%"
  reportsTo: string // e.g., "Head of Engineering"

  // Job description sections
  about: string // Rich text/markdown - about the role
  whyCritical: string // Why this role is critical for the platform
  responsibilities: string[] // Bulleted list
  requiredQualifications: string[] // Must-have skills
  niceToHave: string[] // Bonus skills
  successMetrics: JobSuccessMetrics // What success looks like in first 90 days
  whyJoin: string[] // Compelling reasons to join

  // Meta
  status: JobStatus
  createdAt: Date
  updatedAt: Date
  createdBy: string // Admin UID
  updatedBy?: string // Admin UID

  // SEO
  metaDescription?: string
  keywords?: string[]

  // AI Generation metadata
  isAIGenerated?: boolean
  generationMetadata?: JobGenerationMetadata
}

/**
 * Metadata for AI-generated job postings
 * Tracks how and when the job was generated
 */
export interface JobGenerationMetadata {
  generatedFrom: string // Commit hash that triggered generation
  analyzedFiles: string[] // Files analyzed to generate this job
  analyzedCommits?: string[] // Commit hashes analyzed
  confidence: number // 0-1 confidence score
  generatedAt: Date
  techStack: string[] // Technologies identified from codebase
  lastRegeneratedAt?: Date
  regenerationCount?: number
  model: string // AI model used (e.g., "gpt-4-turbo")
}

export interface AIResumeAnalysis {
  // Skills extraction
  technicalSkills: string[]
  softSkills: string[]
  tools: string[]

  // Experience
  yearsOfExperience?: number
  relevantExperience: string[]

  // Education
  education: string[]
  certifications: string[]

  // Match analysis
  matchScore: number // 0-100
  matchReasons: string[]
  gaps: string[]

  // Summary
  summary: string
  strengths: string[]
  concerns: string[]

  // Recommendations
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no'
  nextSteps: string[]

  // Metadata
  analyzedAt: Date
  model: string // e.g., "gemini-2.0-flash" or "gpt-4"
  confidence: number // 0-1
}

export interface JobApplication {
  id: string
  jobId: string
  jobTitle: string // Denormalized for easy display
  jobSlug: string // For easy linking

  // Applicant info
  applicantName: string
  applicantEmail: string
  applicantPhone?: string
  applicantLinkedIn?: string
  applicantWebsite?: string
  resumeUrl?: string // Firebase Storage URL
  resumeFileName?: string
  coverLetter?: string
  whyExcited?: string // Why excited about WPL

  // AI Analysis
  aiAnalysis?: AIResumeAnalysis
  aiAnalysisStatus?: 'pending' | 'processing' | 'completed' | 'failed'
  aiAnalysisError?: string

  // Status tracking
  status: 'pending' | 'reviewing' | 'interview' | 'offer' | 'rejected' | 'hired'
  reviewedBy?: string // Admin UID
  reviewNotes?: string // Internal notes

  // Timestamps
  appliedAt: Date
  reviewedAt?: Date
  statusUpdatedAt?: Date
}

// For form validation
export interface JobApplicationForm {
  jobId: string
  applicantName: string
  applicantEmail: string
  applicantPhone?: string
  applicantLinkedIn?: string
  applicantWebsite?: string
  coverLetter?: string
  whyExcited?: string
  resume?: File
}

// For admin job creation/editing
export interface JobPostingForm {
  title: string
  department: JobDepartment
  location: string
  locationType: JobLocationType
  salaryMin: number
  salaryMax: number
  equity: string
  reportsTo: string
  about: string
  whyCritical: string
  responsibilities: string[]
  requiredQualifications: string[]
  niceToHave: string[]
  successMetrics: JobSuccessMetrics
  whyJoin: string[]
  status: JobStatus
  metaDescription?: string
  keywords?: string[]
}

// Firestore converter helpers
export const jobPostingConverter = {
  toFirestore: (job: Partial<JobPosting>) => {
    return {
      ...job,
      createdAt: job.createdAt || new Date(),
      updatedAt: new Date(),
    }
  },
  fromFirestore: (snapshot: any): JobPosting => {
    const data = snapshot.data()
    return {
      id: snapshot.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    }
  },
}

export const jobApplicationConverter = {
  toFirestore: (application: Partial<JobApplication>) => {
    return {
      ...application,
      appliedAt: application.appliedAt || new Date(),
      statusUpdatedAt: application.statusUpdatedAt || new Date(),
    }
  },
  fromFirestore: (snapshot: any): JobApplication => {
    const data = snapshot.data()
    return {
      id: snapshot.id,
      ...data,
      appliedAt: data.appliedAt?.toDate() || new Date(),
      reviewedAt: data.reviewedAt?.toDate(),
      statusUpdatedAt: data.statusUpdatedAt?.toDate(),
    }
  },
}
