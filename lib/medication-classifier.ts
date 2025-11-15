/**
 * Medication Classification Library
 *
 * Uses Gemini AI to classify medications and identify what health conditions
 * they likely treat. This enables auto-suggesting conditions based on scanned
 * medications, improving UX for users who may not know condition associations.
 *
 * Benefits:
 * - Caregivers can scan medications without knowing what they treat
 * - Discovers conditions user may have forgotten to mention
 * - Maps multi-condition medications (e.g., Metformin = T2D + PCOS)
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { logger } from '@/lib/logger'
import type { ScannedMedication } from './medication-lookup'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface MedicationConditionMapping {
  medicationName: string
  likelyConditions: string[]
  confidence: number // 0-100
  reasoning: string
  isPrimaryTreatment: boolean // true if this is a first-line treatment for the condition
}

/**
 * Schema for Gemini medication classification response
 */
const medicationClassificationSchema = {
  type: SchemaType.OBJECT as const,
  properties: {
    classifications: {
      type: SchemaType.ARRAY as const,
      items: {
        type: SchemaType.OBJECT as const,
        properties: {
          medicationName: { type: SchemaType.STRING as const },
          likelyConditions: {
            type: SchemaType.ARRAY as const,
            items: { type: SchemaType.STRING as const }
          },
          confidence: { type: SchemaType.NUMBER as const },
          reasoning: { type: SchemaType.STRING as const },
          isPrimaryTreatment: { type: SchemaType.BOOLEAN as const }
        },
        required: ['medicationName', 'likelyConditions', 'confidence', 'reasoning', 'isPrimaryTreatment']
      }
    }
  },
  required: ['classifications']
}

/**
 * Classify medications and identify likely health conditions
 *
 * @param medications - Array of scanned medications
 * @returns Array of medication → condition mappings
 */
export async function classifyMedicationConditions(
  medications: ScannedMedication[]
): Promise<MedicationConditionMapping[]> {
  try {
    if (!medications || medications.length === 0) {
      return []
    }

    logger.info('[Medication Classifier] Classifying medications', {
      count: medications.length
    })

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-002',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: medicationClassificationSchema,
        temperature: 0.2 // Low temperature for consistent medical classification
      }
    })

    // Build medication list for prompt
    const medicationList = medications.map((med, index) => {
      let desc = `${index + 1}. ${med.name}`
      if (med.strength) desc += ` ${med.strength}`
      if (med.dosageForm) desc += ` (${med.dosageForm})`
      if (med.brandName) desc += ` [Brand: ${med.brandName}]`
      if (med.drugClass) desc += ` [Class: ${med.drugClass}]`
      return desc
    }).join('\n')

    const prompt = `You are a medical AI assistant specializing in medication classification. Analyze the following medications and identify what health conditions each medication is primarily used to treat.

MEDICATIONS:
${medicationList}

TASK:
For each medication, identify:
1. The likely health condition(s) it treats
2. Confidence level (0-100)
3. Brief reasoning for the classification
4. Whether this is a primary/first-line treatment for the condition

CONDITION MAPPING GUIDELINES:

**Diabetes Medications:**
- Metformin → Type 2 Diabetes (also PCOS)
- Insulin (Humalog, Novolog, Lantus, Basaglar, Levemir, Tresiba) → Type 1 or Type 2 Diabetes
- GLP-1 Agonists (Ozempic, Trulicity, Victoza, Mounjaro, Wegovy) → Type 2 Diabetes (also obesity)
- SGLT2 Inhibitors (Jardiance, Farxiga, Invokana) → Type 2 Diabetes
- Sulfonylureas (Glipizide, Glyburide, Glimepiride) → Type 2 Diabetes
- DPP-4 Inhibitors (Januvia, Tradjenta) → Type 2 Diabetes

**Cardiovascular Medications:**
- ACE Inhibitors (Lisinopril, Enalapril, Ramipril) → High Blood Pressure (also Heart Disease, CKD)
- ARBs (Losartan, Valsartan, Olmesartan) → High Blood Pressure (also Heart Disease, CKD)
- Beta Blockers (Metoprolol, Atenolol, Carvedilol) → High Blood Pressure, Heart Disease
- Calcium Channel Blockers (Amlodipine, Diltiazem) → High Blood Pressure, Heart Disease
- Diuretics (HCTZ, Furosemide, Spironolactone) → High Blood Pressure, Heart Disease
- Statins (Atorvastatin, Simvastatin, Rosuvastatin) → High Cholesterol, Heart Disease
- Blood Thinners (Warfarin, Apixaban, Rivaroxaban, Clopidogrel) → Heart Disease, Atrial Fibrillation

**Thyroid Medications:**
- Levothyroxine (Synthroid) → Hypothyroidism (Thyroid Issues)
- Liothyronine (Cytomel) → Hypothyroidism (Thyroid Issues)
- Methimazole, Propylthiouracil → Hyperthyroidism (Thyroid Issues)

**Gastrointestinal Medications:**
- PPIs (Omeprazole, Esomeprazole, Pantoprazole) → GERD / Acid Reflux
- H2 Blockers (Famotidine, Ranitidine) → GERD / Acid Reflux
- Mesalamine, Sulfasalazine → Inflammatory Bowel Disease (IBD)
- Prednisone → Inflammatory Bowel Disease (IBD), Autoimmune Conditions

**Other Common Medications:**
- Allopurinol → Gout
- Celecoxib, Diclofenac, Naproxen → Injury Recovery, Arthritis
- Prednisone, Prednisolone → Autoimmune Conditions, IBD, Asthma

**Cancer Medications:**
- Chemotherapy drugs (Doxorubicin, Cisplatin, etc.) → Cancer (Active or Recent Treatment)
- Tamoxifen, Anastrozole → Cancer (Breast Cancer)

IMPORTANT NOTES:
- Some medications treat multiple conditions (e.g., Lisinopril = High BP + Heart Disease + CKD)
- GLP-1 agonists are increasingly used for weight loss in non-diabetics
- ACE inhibitors and ARBs are kidney-protective in CKD patients
- Beta blockers treat both hypertension and heart disease
- If medication is unclear or rare, mark confidence <70

Return confidence scores:
- 90-100: Clear, well-known indication (Metformin = T2D)
- 70-89: Common indication but some ambiguity (Lisinopril = High BP or Heart Disease?)
- <70: Unclear, off-label, or rare medication

For each medication in the list above, return its classification.`

    const result = await model.generateContent(prompt)
    const response = result.response.text()
    const parsed = JSON.parse(response)

    const classifications: MedicationConditionMapping[] = parsed.classifications || []

    logger.info('[Medication Classifier] Classification complete', {
      medicationCount: medications.length,
      classificationsFound: classifications.length
    })

    return classifications

  } catch (error) {
    logger.error('[Medication Classifier] Classification failed', error as Error)

    // Fallback: Return empty classifications
    return medications.map(med => ({
      medicationName: med.name,
      likelyConditions: [],
      confidence: 0,
      reasoning: 'AI classification failed',
      isPrimaryTreatment: false
    }))
  }
}

/**
 * Get unique health conditions from medication classifications
 *
 * @param classifications - Medication condition mappings
 * @returns Array of unique condition names with confidence scores
 */
export function getSuggestedConditions(
  classifications: MedicationConditionMapping[]
): Array<{ condition: string; confidence: number; medications: string[] }> {
  const conditionMap = new Map<string, { confidence: number; medications: string[] }>()

  classifications.forEach(classification => {
    classification.likelyConditions.forEach(condition => {
      if (conditionMap.has(condition)) {
        const existing = conditionMap.get(condition)!
        // Take highest confidence and add medication to list
        existing.confidence = Math.max(existing.confidence, classification.confidence)
        existing.medications.push(classification.medicationName)
      } else {
        conditionMap.set(condition, {
          confidence: classification.confidence,
          medications: [classification.medicationName]
        })
      }
    })
  })

  // Convert map to array and sort by confidence
  return Array.from(conditionMap.entries())
    .map(([condition, data]) => ({
      condition,
      confidence: data.confidence,
      medications: data.medications
    }))
    .sort((a, b) => b.confidence - a.confidence)
}

/**
 * Match medication names to condition names
 * Used to normalize condition names from Gemini to app's condition list
 */
export function normalizeConditionName(geminiCondition: string): string {
  const mappings: Record<string, string> = {
    'Type 2 Diabetes': 'Type 2 Diabetes',
    'Type 1 Diabetes': 'Type 1 Diabetes',
    'High Blood Pressure': 'High Blood Pressure',
    'High Cholesterol': 'High Cholesterol',
    'Heart Disease': 'Heart Disease',
    'PCOS': 'PCOS',
    'Thyroid Issues': 'Thyroid Issues',
    'Hypothyroidism': 'Thyroid Issues',
    'Hyperthyroidism': 'Thyroid Issues',
    'Kidney Disease': 'Kidney Disease (CKD)',
    'CKD': 'Kidney Disease (CKD)',
    'Chronic Kidney Disease': 'Kidney Disease (CKD)',
    'Cancer': 'Cancer (Active or Recent Treatment)',
    'Breast Cancer': 'Cancer (Active or Recent Treatment)',
    'GERD': 'GERD / Acid Reflux',
    'Acid Reflux': 'GERD / Acid Reflux',
    'IBD': 'Inflammatory Bowel Disease (IBD)',
    'Inflammatory Bowel Disease': 'Inflammatory Bowel Disease (IBD)',
    'Gout': 'Gout',
    'Autoimmune': 'Autoimmune Condition',
    'Autoimmune Conditions': 'Autoimmune Condition',
    'Injury Recovery': 'Injury Recovery',
    'Atrial Fibrillation': 'Heart Disease' // Map AFib to Heart Disease
  }

  return mappings[geminiCondition] || geminiCondition
}
