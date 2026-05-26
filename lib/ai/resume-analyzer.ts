/**
 * AI Resume Analysis Utility
 * Uses Google Gemini (or, later, Anthropic Claude) to analyze resumes
 * against a job posting and produce a structured fit assessment.
 *
 * Resumes can be passed as either plain text or as an inline binary
 * file (PDF / DOCX) — Gemini's multimodal input reads the file directly,
 * so no separate text-extraction step is needed.
 */

import type { AIResumeAnalysis, JobPosting } from '@/types/jobs'
import { logger } from '@/lib/logger'
import { generateGeminiJSON, DEFAULT_GEMINI_MODEL } from '@/lib/ai/gemini-client'

interface AnalyzeResumeOptions {
  /** Plain-text resume. Provide this OR `resumeFile`, not both. */
  resumeText?: string
  /**
   * Inline-binary resume (PDF / DOCX). `data` is base64-encoded
   * (raw or data-URL). When set, Gemini reads the file directly.
   */
  resumeFile?: {
    data: string
    mimeType: string
  }
  jobPosting: JobPosting
  model?: 'gemini' | 'claude'
}

/**
 * Analyze resume against a job posting. Throws on missing input,
 * Gemini failure, or malformed model output.
 */
export async function analyzeResume(
  options: AnalyzeResumeOptions,
): Promise<AIResumeAnalysis> {
  const { resumeText, resumeFile, jobPosting, model = 'gemini' } = options

  if (!resumeText && !resumeFile) {
    throw new Error('analyzeResume: provide resumeText or resumeFile')
  }

  if (model !== 'gemini') {
    throw new Error('Claude integration not yet implemented. Use Gemini.')
  }

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
${resumeText ? resumeText : '[Resume provided as attached file — read it directly.]'}

---

INSTRUCTIONS:
Analyze this resume against the job posting and provide a comprehensive evaluation in JSON format with the following structure:

{
  "technicalSkills": ["skill1", "skill2", ...],
  "softSkills": ["skill1", "skill2", ...],
  "tools": ["tool1", "tool2", ...],
  "yearsOfExperience": 5,
  "relevantExperience": ["experience1", "experience2", ...],
  "education": ["degree1", "degree2", ...],
  "certifications": ["cert1", "cert2", ...],
  "matchScore": 85,
  "matchReasons": ["reason1", "reason2", ...],
  "gaps": ["gap1", "gap2", ...],
  "summary": "2-3 sentence summary of candidate",
  "strengths": ["strength1", "strength2", ...],
  "concerns": ["concern1", "concern2", ...],
  "recommendation": "yes",
  "nextSteps": ["step1", "step2", ...]
}

matchScore: 0-100 integer.
recommendation: one of "strong_yes", "yes", "maybe", "no", "strong_no".
Be thorough, honest, and data-driven. Focus on fit against the specific requirements of THIS role — generic praise is worse than honest concerns.`

  const parsed = await generateGeminiJSON<AIResumeAnalysis>({
    fnName: 'analyzeResume',
    prompt,
    images: resumeFile
      ? [{ data: resumeFile.data, mimeType: resumeFile.mimeType }]
      : undefined,
    // Bumped from 0.3 → 0.4 per feedback_gemini_2_5_flash_gotchas #3
    // (low-temp + structured output + a PDF can trigger digit-loops
    // inside string fields). maxOutputTokens defaults to the shared
    // client's generous 16384.
    temperature: 0.4,
    inputSize: resumeText?.length ?? resumeFile?.data.length,
    metadata: {
      jobId: jobPosting.id,
      jobTitle: jobPosting.title,
      inputKind: resumeFile ? 'file' : 'text',
      fileMime: resumeFile?.mimeType,
    },
  })

  // The model returns the body of AIResumeAnalysis; we attach metadata.
  const analysis: AIResumeAnalysis = {
    ...parsed,
    analyzedAt: new Date(),
    model: DEFAULT_GEMINI_MODEL,
    confidence: calculateConfidence(parsed),
  }

  logger.info(
    `Resume analysis complete. Match score: ${analysis.matchScore}, Recommendation: ${analysis.recommendation}`,
  )
  return analysis
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
