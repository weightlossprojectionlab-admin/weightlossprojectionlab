/**
 * Medication Lookup Library
 *
 * Uses RxNorm API (FREE NIH/NLM service) to look up medications by NDC code
 * and retrieve structured drug information.
 *
 * RxNorm API Documentation: https://rxnav.nlm.nih.gov/RxNormAPIs.html
 */

import { logger } from '@/lib/logger'

export interface MedicationInfo {
  name: string // Generic drug name
  brandName?: string // Brand name if applicable
  strength: string // e.g., "500 mg", "10 mg"
  dosageForm: string // e.g., "tablet", "capsule", "gel", "injection"
  rxcui?: string // RxNorm Concept Unique Identifier
  ndc?: string // National Drug Code (optional - may not always be scanned)
  manufacturer?: string
  drugClass?: string // Therapeutic class
}

export interface ScannedMedication extends MedicationInfo {
  frequency?: string // e.g., "2 times daily", "once weekly"
  prescribedFor?: string // Condition name
  rxNumber?: string // Prescription number
  scannedAt: string // ISO timestamp
}

/**
 * Normalize NDC code to 11-digit format (5-4-2)
 * NDCs can be 10 or 11 digits with various formats
 */
function normalizeNDC(ndc: string): string {
  // Remove any non-digit characters
  const digits = ndc.replace(/\D/g, '')

  // If 10 digits, pad to 11 (usually pad middle segment)
  if (digits.length === 10) {
    // Format: XXXXX-XXX-XX → XXXXX-0XXX-XX
    return `${digits.slice(0, 5)}0${digits.slice(5)}`
  }

  return digits
}

/**
 * Look up medication by NDC code using RxNorm API
 *
 * @param ndc - National Drug Code (10 or 11 digits)
 * @returns Medication information or null if not found
 */
export async function lookupMedicationByNDC(ndc: string): Promise<MedicationInfo | null> {
  try {
    const normalizedNDC = normalizeNDC(ndc)

    logger.debug('[Medication Lookup] Looking up NDC', { ndc: normalizedNDC })

    // Step 1: Get RxCUI from NDC
    const ndcStatusUrl = `https://rxnav.nlm.nih.gov/REST/ndcstatus.json?ndc=${normalizedNDC}`
    const ndcResponse = await fetch(ndcStatusUrl)

    if (!ndcResponse.ok) {
      logger.warn('[Medication Lookup] NDC status API failed', { status: ndcResponse.status })
      return null
    }

    const ndcData = await ndcResponse.json()
    const rxcui = ndcData?.ndcStatus?.rxcui

    if (!rxcui) {
      logger.warn('[Medication Lookup] No RxCUI found for NDC', { ndc: normalizedNDC })
      return null
    }

    // Step 2: Get drug properties from RxCUI
    const propsUrl = `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/allProperties.json?prop=all`
    const propsResponse = await fetch(propsUrl)

    if (!propsResponse.ok) {
      logger.warn('[Medication Lookup] Properties API failed', { status: propsResponse.status })
      return null
    }

    const propsData = await propsResponse.json()
    const properties = propsData?.propConceptGroup?.propConcept || []

    // Extract relevant properties
    let name = ''
    let strength = ''
    let dosageForm = ''
    let brandName = ''

    properties.forEach((prop: any) => {
      switch (prop.propName) {
        case 'RxNorm Name':
          name = prop.propValue
          break
        case 'Strength':
          strength = prop.propValue
          break
        case 'Dose Form':
          dosageForm = prop.propValue.toLowerCase()
          break
      }
    })

    // Step 3: Try to get brand name
    try {
      const brandUrl = `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/related.json?tty=BN`
      const brandResponse = await fetch(brandUrl)

      if (brandResponse.ok) {
        const brandData = await brandResponse.json()
        const brandConcepts = brandData?.relatedGroup?.conceptGroup || []

        for (const group of brandConcepts) {
          if (group.tty === 'BN' && group.conceptProperties?.length > 0) {
            brandName = group.conceptProperties[0].name
            break
          }
        }
      }
    } catch (brandError) {
      // Brand name lookup is optional, continue without it
      logger.debug('[Medication Lookup] Brand name lookup failed', { error: brandError })
    }

    // Step 4: Get drug class (therapeutic category)
    let drugClass = ''
    try {
      const classUrl = `https://rxnav.nlm.nih.gov/REST/rxclass/class/byRxcui.json?rxcui=${rxcui}&relaSource=ATC`
      const classResponse = await fetch(classUrl)

      if (classResponse.ok) {
        const classData = await classResponse.json()
        const classes = classData?.rxclassDrugInfoList?.rxclassDrugInfo || []

        if (classes.length > 0) {
          drugClass = classes[0].rxclassMinConceptItem?.className || ''
        }
      }
    } catch (classError) {
      // Drug class lookup is optional
      logger.debug('[Medication Lookup] Drug class lookup failed', { error: classError })
    }

    // Construct result
    const medicationInfo: MedicationInfo = {
      name: name || 'Unknown Medication',
      brandName: brandName || undefined,
      strength: strength || 'Unknown',
      dosageForm: dosageForm || 'Unknown',
      rxcui,
      ndc: normalizedNDC,
      drugClass: drugClass || undefined
    }

    logger.info('[Medication Lookup] Medication found', {
      ndc: normalizedNDC,
      name: medicationInfo.name,
      strength: medicationInfo.strength
    })

    return medicationInfo

  } catch (error) {
    logger.error('[Medication Lookup] Lookup failed', error as Error, { ndc })
    return null
  }
}

/**
 * Search medications by name (for manual entry)
 *
 * @param query - Medication name to search
 * @returns List of matching medications
 */
export async function searchMedicationByName(query: string): Promise<MedicationInfo[]> {
  try {
    logger.debug('[Medication Search] Searching', { query })

    // Use RxNorm approximate match API
    const searchUrl = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(query)}&maxEntries=10`
    const response = await fetch(searchUrl)

    if (!response.ok) {
      logger.warn('[Medication Search] API failed', { status: response.status })
      return []
    }

    const data = await response.json()
    const candidates = data?.approximateGroup?.candidate || []

    // Convert candidates to MedicationInfo format
    const results: MedicationInfo[] = []

    for (const candidate of candidates) {
      if (candidate.rxcui) {
        // Get detailed info for each candidate
        try {
          const propsUrl = `https://rxnav.nlm.nih.gov/REST/rxcui/${candidate.rxcui}/allProperties.json?prop=all`
          const propsResponse = await fetch(propsUrl)

          if (propsResponse.ok) {
            const propsData = await propsResponse.json()
            const properties = propsData?.propConceptGroup?.propConcept || []

            let strength = ''
            let dosageForm = ''

            properties.forEach((prop: any) => {
              if (prop.propName === 'Strength') strength = prop.propValue
              if (prop.propName === 'Dose Form') dosageForm = prop.propValue.toLowerCase()
            })

            results.push({
              name: candidate.name,
              strength: strength || 'Unknown',
              dosageForm: dosageForm || 'Unknown',
              rxcui: candidate.rxcui,
              ndc: '' // No NDC available from search
            })
          }
        } catch (detailError) {
          // If detailed lookup fails, add basic info
          results.push({
            name: candidate.name,
            strength: 'Unknown',
            dosageForm: 'Unknown',
            rxcui: candidate.rxcui,
            ndc: ''
          })
        }
      }
    }

    logger.info('[Medication Search] Found results', {
      query,
      count: results.length
    })

    return results

  } catch (error) {
    logger.error('[Medication Search] Search failed', error as Error, { query })
    return []
  }
}

/**
 * Get common medications for a specific condition
 * Useful for providing suggestions in health questionnaires
 */
export function getCommonMedicationsForCondition(condition: string): string[] {
  const medicationsByCondition: Record<string, string[]> = {
    'Type 2 Diabetes': [
      'Metformin',
      'Insulin (various types)',
      'Ozempic (Semaglutide)',
      'Trulicity (Dulaglutide)',
      'Jardiance (Empagliflozin)',
      'Farxiga (Dapagliflozin)',
      'Glipizide',
      'Glyburide',
      'Januvia (Sitagliptin)',
      'Victoza (Liraglutide)'
    ],
    'Type 1 Diabetes': [
      'Insulin Glargine (Lantus, Basaglar)',
      'Insulin Detemir (Levemir)',
      'Insulin Degludec (Tresiba)',
      'Insulin Aspart (Novolog)',
      'Insulin Lispro (Humalog)',
      'Insulin Regular (Humulin R)'
    ],
    'High Blood Pressure': [
      'Lisinopril',
      'Amlodipine',
      'Losartan',
      'Metoprolol',
      'Hydrochlorothiazide (HCTZ)',
      'Atenolol',
      'Carvedilol',
      'Enalapril',
      'Valsartan'
    ],
    'Heart Disease': [
      'Aspirin',
      'Atorvastatin (Lipitor)',
      'Simvastatin',
      'Rosuvastatin (Crestor)',
      'Clopidogrel (Plavix)',
      'Warfarin',
      'Apixaban (Eliquis)',
      'Rivaroxaban (Xarelto)'
    ],
    'Thyroid Issues': [
      'Levothyroxine (Synthroid)',
      'Liothyronine (Cytomel)',
      'Methimazole',
      'Propylthiouracil (PTU)'
    ],
    'GERD / Acid Reflux': [
      'Omeprazole (Prilosec)',
      'Esomeprazole (Nexium)',
      'Pantoprazole (Protonix)',
      'Lansoprazole (Prevacid)',
      'Ranitidine (Zantac)',
      'Famotidine (Pepcid)'
    ]
  }

  return medicationsByCondition[condition] || []
}
