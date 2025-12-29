/**
 * AI Resume Analysis Utility
 * Uses Google Gemini or Anthropic Claude to analyze resumes
 */

import type { AIResumeAnalysis, JobPosting } from '@/types/jobs'
import { logger } from '@/lib/logger'

interface AnalyzeResumeOptions {
  resumeText: string
  jobPosting: JobPosting
  model?: 'gemini' | 'claude'
}

/**
 * Extract text from resume URL (PDF, DOC, DOCX, TXT)
 * For PDFs, you'd need a library like pdf-parse
 * For now, this is a placeholder that should be implemented with proper parsing
 */
export async function extractTextFromResume(resumeUrl: string): Promise<string> {
  // TODO: Implement PDF parsing with pdf-parse or similar
  // For MVP, we'll return an error asking for text resume
  throw new Error(
    'PDF parsing not yet implemented. Please provide resume text directly or use txt format.'
  )
}

/**
 * Analyze resume using AI (Gemini or Claude)
 */
export async function analyzeResume(
  options: AnalyzeResumeOptions
): Promise<AIResumeAnalysis> {
  const { resumeText, jobPosting, model = 'gemini' } = options

  logger.info(`Analyzing resume for job: ${jobPosting.title} using ${model}`)

  const prompt = `You are an expert technical recruiter analyzing a resume for a job posting.

JOB POSTING:
Title: ${jobPosting.title}
Department: ${jobPosting.department}
Salary: $${jobPosting.salaryMin}-${jobPosting.salaryMax}
Location: ${jobPosting.location}

About: ${jobPosting.about}

Why Critical: ${jobPosting.whyCritical}

Required Qualifications:
${jobPosting.requiredQualifications.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Nice to Have:
${jobPosting.niceToHave?.map((n, i) => `${i + 1}. ${n}`).join('\n') || 'None specified'}

Responsibilities:
${jobPosting.responsibilities.map((r, i) => `${i + 1}. ${r}`).join('\n')}

---

RESUME:
${resumeText}

---

INSTRUCTIONS:
Analyze this resume against the job posting and provide a comprehensive evaluation in JSON format with the following structure:

{
  "technicalSkills": ["skill1", "skill2", ...], // Extract all technical skills
  "softSkills": ["skill1", "skill2", ...], // Extract soft skills (leadership, communication, etc.)
  "tools": ["tool1", "tool2", ...], // Specific tools/technologies mentioned
  "yearsOfExperience": 5, // Total years of professional experience (number or null)
  "relevantExperience": ["experience1", "experience2", ...], // Most relevant past roles/projects
  "education": ["degree1", "degree2", ...], // Education background
  "certifications": ["cert1", "cert2", ...], // Professional certifications
  "matchScore": 85, // 0-100 score for job fit
  "matchReasons": ["reason1", "reason2", ...], // Why they're a good fit (3-5 reasons)
  "gaps": ["gap1", "gap2", ...], // Missing qualifications or concerns (2-4 items)
  "summary": "2-3 sentence summary of candidate", // Concise overview
  "strengths": ["strength1", "strength2", ...], // Top 3-5 strengths for this role
  "concerns": ["concern1", "concern2", ...], // Top 2-3 concerns or red flags
  "recommendation": "yes", // One of: "strong_yes", "yes", "maybe", "no", "strong_no"
  "nextSteps": ["step1", "step2", ...] // Recommended next steps (phone screen, technical interview, etc.)
}

Be thorough, honest, and data-driven. Focus on match with the specific requirements of this role.`

  try {
    let analysis: AIResumeAnalysis

    if (model === 'gemini') {
      analysis = await analyzeWithGemini(prompt)
    } else {
      analysis = await analyzeWithClaude(prompt)
    }

    // Add metadata
    analysis.analyzedAt = new Date()
    analysis.model = model === 'gemini' ? 'gemini-2.0-flash' : 'claude-3.5-sonnet'
    analysis.confidence = calculateConfidence(analysis)

    logger.info(
      `Resume analysis complete. Match score: ${analysis.matchScore}, Recommendation: ${analysis.recommendation}`
    )

    return analysis
  } catch (error: any) {
    logger.error('Error analyzing resume:', error)
    throw new Error(`AI analysis failed: ${error.message}`)
  }
}

/**
 * Analyze using Google Gemini
 */
async function analyzeWithGemini(prompt: string): Promise<AIResumeAnalysis> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent analysis
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${error}`)
  }

  const data = await response.json()
  const text = data.candidates[0].content.parts[0].text

  try {
    return JSON.parse(text)
  } catch (parseError) {
    logger.error('Failed to parse Gemini JSON response:', text)
    throw new Error('Invalid JSON response from Gemini')
  }
}

/**
 * Analyze using Anthropic Claude
 */
async function analyzeWithClaude(prompt: string): Promise<AIResumeAnalysis> {
  // TODO: Implement Claude API integration
  // For now, throw error
  throw new Error('Claude integration not yet implemented. Use Gemini instead.')
}

/**
 * Calculate confidence score based on analysis completeness
 */
function calculateConfidence(analysis: AIResumeAnalysis): number {
  let confidence = 0.5 // Base confidence

  // More complete analysis = higher confidence
  if (analysis.technicalSkills.length > 0) confidence += 0.1
  if (analysis.yearsOfExperience !== undefined) confidence += 0.1
  if (analysis.education.length > 0) confidence += 0.1
  if (analysis.matchReasons.length >= 3) confidence += 0.1
  if (analysis.strengths.length >= 3) confidence += 0.1

  return Math.min(confidence, 1.0)
}

/**
 * Batch analyze multiple resumes
 */
export async function batchAnalyzeResumes(
  applications: Array<{ id: string; resumeText: string; jobPosting: JobPosting }>
): Promise<Map<string, AIResumeAnalysis>> {
  const results = new Map<string, AIResumeAnalysis>()

  // Process in batches of 5 to avoid rate limits
  const batchSize = 5
  for (let i = 0; i < applications.length; i += batchSize) {
    const batch = applications.slice(i, i + batchSize)

    await Promise.all(
      batch.map(async app => {
        try {
          const analysis = await analyzeResume({
            resumeText: app.resumeText,
            jobPosting: app.jobPosting,
          })
          results.set(app.id, analysis)
        } catch (error) {
          logger.error(`Failed to analyze resume for application ${app.id}:`, error as Error)
        }
      })
    )

    // Wait 1 second between batches to respect rate limits
    if (i + batchSize < applications.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return results
}
