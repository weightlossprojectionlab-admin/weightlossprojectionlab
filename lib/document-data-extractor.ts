/**
 * Document Data Extractor
 *
 * Separation of concerns: This module handles ONLY structured data extraction
 * from raw OCR text. It does not handle OCR itself or report generation.
 *
 * Layer 2 of the OCR pipeline:
 *   1. OCR (ocr-gemini.ts) → raw text
 *   2. Extraction (this file) → structured data
 *   3. Report integration (health-summary-generator.ts) → health reports
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '@/lib/logger'
import { classifyDocumentType } from '@/lib/ocr-service'
import type {
  DocumentStructuredData,
  LabResultEntry,
  ExtractedMedicationEntry
} from '@/types/medical'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * Extract structured data from raw OCR text using Gemini AI.
 *
 * @param ocrText - Raw text extracted from document OCR
 * @param documentCategory - Optional hint about document type
 * @returns Structured data with lab results, medications, diagnoses, etc.
 */
export async function extractStructuredData(
  ocrText: string,
  documentCategory?: string
): Promise<DocumentStructuredData | null> {
  if (!ocrText || ocrText.trim().length < 20) {
    logger.warn('[DocumentExtractor] Text too short for extraction', {
      textLength: ocrText?.length
    })
    return null
  }

  if (!process.env.GEMINI_API_KEY) {
    logger.error('[DocumentExtractor] GEMINI_API_KEY not configured')
    return null
  }

  try {
    // Use existing classifyDocumentType (DRY) for type hint
    const classification = classifyDocumentType(ocrText)
    const docTypeHint = documentCategory || classification.suggestedCategory

    logger.info('[DocumentExtractor] Starting structured extraction', {
      textLength: ocrText.length,
      docTypeHint,
      classificationConfidence: classification.confidence
    })

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 1,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json'
      }
    })

    const prompt = buildExtractionPrompt(ocrText, docTypeHint)
    const result = await model.generateContent(prompt)
    const response = await result.response
    const jsonText = response.text()

    const parsed = JSON.parse(jsonText)
    const structured = normalizeExtractionResult(parsed, classification.confidence)

    logger.info('[DocumentExtractor] Extraction complete', {
      documentType: structured.documentType,
      labResultsCount: structured.labResults?.length || 0,
      medicationsCount: structured.medications?.length || 0,
      diagnosesCount: structured.diagnoses?.length || 0,
      confidence: structured.confidence
    })

    return structured
  } catch (error) {
    logger.error('[DocumentExtractor] Extraction failed', error as Error)
    return null
  }
}

/**
 * Build the Gemini prompt for structured extraction.
 * Separated for testability and clarity.
 */
function buildExtractionPrompt(ocrText: string, docTypeHint: string): string {
  return `You are a medical document parser. Extract structured data from the following OCR text of a medical document.

Document type hint: ${docTypeHint}

OCR Text:
---
${ocrText.substring(0, 6000)}
---

Return a JSON object with these fields (include only fields that have data):

{
  "documentType": "lab_result" | "prescription" | "discharge_summary" | "imaging_report" | "insurance" | "vaccination" | "other",
  "labResults": [
    {
      "testName": "string",
      "value": "string",
      "unit": "string or null",
      "referenceRange": "string or null",
      "status": "normal" | "high" | "low" | "critical" | null,
      "category": "string or null (e.g., CBC, Metabolic Panel, Lipid Panel)"
    }
  ],
  "medications": [
    {
      "name": "string",
      "dosage": "string or null",
      "frequency": "string or null",
      "prescribedFor": "string or null",
      "prescribedBy": "string or null"
    }
  ],
  "diagnoses": ["string"],
  "procedures": ["string"],
  "providerName": "string or null",
  "facilityName": "string or null",
  "documentDate": "YYYY-MM-DD or null"
}

Rules:
- Only include fields where you found actual data in the text
- For lab results, determine status by comparing value to reference range if available
- Mark lab results as "critical" only for clearly dangerous values
- If the document is not a medical document, set documentType to "other" and return minimal data
- Do NOT fabricate data not present in the text
- Return valid JSON only, no markdown`
}

/**
 * Normalize the AI extraction result into the expected TypeScript interface.
 */
function normalizeExtractionResult(
  parsed: any,
  classificationConfidence: number
): DocumentStructuredData {
  const documentType = parsed.documentType || 'other'

  const labResults: LabResultEntry[] | undefined = parsed.labResults?.map((lr: any) => ({
    testName: String(lr.testName || ''),
    value: String(lr.value || ''),
    unit: lr.unit || undefined,
    referenceRange: lr.referenceRange || undefined,
    status: ['normal', 'high', 'low', 'critical'].includes(lr.status) ? lr.status : undefined,
    category: lr.category || undefined
  })).filter((lr: LabResultEntry) => lr.testName && lr.value)

  const medications: ExtractedMedicationEntry[] | undefined = parsed.medications?.map((m: any) => ({
    name: String(m.name || ''),
    dosage: m.dosage || undefined,
    frequency: m.frequency || undefined,
    prescribedFor: m.prescribedFor || undefined,
    prescribedBy: m.prescribedBy || undefined
  })).filter((m: ExtractedMedicationEntry) => m.name)

  const diagnoses = parsed.diagnoses?.filter((d: any) => typeof d === 'string' && d.length > 0)
  const procedures = parsed.procedures?.filter((p: any) => typeof p === 'string' && p.length > 0)

  return {
    documentType,
    labResults: labResults?.length ? labResults : undefined,
    medications: medications?.length ? medications : undefined,
    diagnoses: diagnoses?.length ? diagnoses : undefined,
    procedures: procedures?.length ? procedures : undefined,
    providerName: parsed.providerName || undefined,
    facilityName: parsed.facilityName || undefined,
    documentDate: parsed.documentDate || undefined,
    confidence: classificationConfidence,
    extractedAt: new Date().toISOString()
  }
}
