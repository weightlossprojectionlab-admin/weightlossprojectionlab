/**
 * Health Condition Question Library
 *
 * Contains condition-specific follow-up questions for detailed health profiling.
 * Questions are shown in a modal after user selects a condition in onboarding.
 *
 * WLPL uses this data to generate accurate dietary restrictions and meal recommendations.
 */

export interface HealthConditionQuestion {
  id: string
  question: string
  type: 'select' | 'text' | 'number' | 'date' | 'multiselect' | 'medication-scanner'
  options?: Array<{ value: string; label: string }>
  required: boolean
  tooltip?: string // "Why WLPL asks this"
  placeholder?: string
  min?: number
  max?: number
  unit?: string
}

export interface HealthConditionQuestionnaire {
  conditionName: string
  conditionKey: string
  description: string
  questions: HealthConditionQuestion[]
}

/**
 * Questionnaire: Kidney Disease (CKD)
 */
export const ckdQuestionnaire: HealthConditionQuestionnaire = {
  conditionName: 'Chronic Kidney Disease (CKD)',
  conditionKey: 'kidney-disease-ckd',
  description: 'WLPL needs to know about your kidney function to set safe sodium, potassium, phosphorus, and protein limits.',
  questions: [
    {
      id: 'ckd_stage',
      question: 'What stage is your CKD?',
      type: 'select',
      options: [
        { value: 'stage-1', label: 'Stage 1 (GFR ≥90)' },
        { value: 'stage-2', label: 'Stage 2 (GFR 60-89)' },
        { value: 'stage-3a', label: 'Stage 3a (GFR 45-59)' },
        { value: 'stage-3b', label: 'Stage 3b (GFR 30-44)' },
        { value: 'stage-4', label: 'Stage 4 (GFR 15-29)' },
        { value: 'stage-5', label: 'Stage 5 (GFR <15 or dialysis)' },
        { value: 'unknown', label: 'I don\'t know' }
      ],
      required: true,
      tooltip: 'CKD stage determines safe sodium (1500-2300mg), potassium (2000-3000mg), and protein limits (0.6-0.8g/kg).'
    },
    {
      id: 'ckd_gfr',
      question: 'What is your most recent GFR (kidney function)?',
      type: 'number',
      min: 5,
      max: 120,
      unit: 'mL/min/1.73m²',
      required: false,
      placeholder: 'e.g., 45',
      tooltip: 'GFR shows how well your kidneys filter waste. WLPL uses this to calculate safe protein intake.'
    },
    {
      id: 'ckd_sodium_limit',
      question: 'Has your doctor set a sodium limit for you?',
      type: 'number',
      min: 500,
      max: 3000,
      unit: 'mg/day',
      required: false,
      placeholder: 'e.g., 1500',
      tooltip: 'CKD patients typically need 1500-2300mg/day sodium. WLPL will flag high-sodium meals.'
    },
    {
      id: 'ckd_potassium_limit',
      question: 'Has your doctor set a potassium limit for you?',
      type: 'number',
      min: 1000,
      max: 4000,
      unit: 'mg/day',
      required: false,
      placeholder: 'e.g., 2000',
      tooltip: 'Advanced CKD requires low potassium (2000-3000mg/day). WLPL will warn about bananas, potatoes, tomatoes.'
    },
    {
      id: 'ckd_on_dialysis',
      question: 'Are you currently on dialysis?',
      type: 'select',
      options: [
        { value: 'no', label: 'No' },
        { value: 'hemodialysis', label: 'Yes, hemodialysis' },
        { value: 'peritoneal', label: 'Yes, peritoneal dialysis' }
      ],
      required: true,
      tooltip: 'Dialysis patients need higher protein (1.2g/kg) but strict fluid and electrolyte control.'
    },
    {
      id: 'ckd_phosphorus_restriction',
      question: 'Do you need to limit phosphorus?',
      type: 'select',
      options: [
        { value: 'no', label: 'No restriction' },
        { value: 'yes', label: 'Yes, doctor recommended' }
      ],
      required: false,
      tooltip: 'Advanced CKD requires low phosphorus (<1000mg/day). WLPL will flag dairy, nuts, beans, soda.'
    }
  ]
}

/**
 * Questionnaire: Cancer (Active or Recent Treatment)
 */
export const cancerQuestionnaire: HealthConditionQuestionnaire = {
  conditionName: 'Cancer (Active or Recent Treatment)',
  conditionKey: 'cancer-active-or-recent-treatment',
  description: 'WLPL adjusts meal suggestions for appetite changes, nausea, taste alterations, and protein needs during treatment.',
  questions: [
    {
      id: 'cancer_type',
      question: 'What type of cancer?',
      type: 'text',
      required: false,
      placeholder: 'e.g., Breast, Colon, Leukemia',
      tooltip: 'Different cancers affect nutrition differently. GI cancers often require low-fiber, small meals.'
    },
    {
      id: 'cancer_treatment_status',
      question: 'Treatment status',
      type: 'select',
      options: [
        { value: 'active-chemo', label: 'Currently on chemotherapy' },
        { value: 'active-radiation', label: 'Currently on radiation' },
        { value: 'active-both', label: 'Currently on both' },
        { value: 'recent-completed', label: 'Completed treatment <6 months ago' },
        { value: 'old-completed', label: 'Completed treatment >6 months ago' },
        { value: 'surgery-only', label: 'Surgery only, no chemo/radiation' }
      ],
      required: true,
      tooltip: 'Active treatment causes appetite loss, nausea, taste changes. WLPL suggests gentle, high-calorie foods.'
    },
    {
      id: 'cancer_appetite',
      question: 'How is your appetite?',
      type: 'select',
      options: [
        { value: 'normal', label: 'Normal appetite' },
        { value: 'reduced', label: 'Reduced appetite' },
        { value: 'very-poor', label: 'Very poor appetite' },
        { value: 'no-appetite', label: 'No appetite at all' }
      ],
      required: true,
      tooltip: 'Poor appetite requires small, frequent, calorie-dense meals. WLPL will suggest smoothies, soups, soft foods.'
    },
    {
      id: 'cancer_nausea',
      question: 'Do you experience nausea?',
      type: 'select',
      options: [
        { value: 'no', label: 'No nausea' },
        { value: 'occasional', label: 'Occasional nausea' },
        { value: 'frequent', label: 'Frequent nausea' },
        { value: 'severe', label: 'Severe nausea (daily)' }
      ],
      required: true,
      tooltip: 'Nausea requires bland foods (crackers, rice, applesauce). WLPL will avoid greasy, spicy, strong-smelling foods.'
    },
    {
      id: 'cancer_taste_changes',
      question: 'Are you experiencing taste changes?',
      type: 'multiselect',
      options: [
        { value: 'metallic-taste', label: 'Metallic taste' },
        { value: 'bitter-taste', label: 'Bitter taste' },
        { value: 'no-taste', label: 'Food has no taste' },
        { value: 'sweet-aversion', label: 'Aversion to sweets' },
        { value: 'meat-aversion', label: 'Aversion to meat' },
        { value: 'none', label: 'No taste changes' }
      ],
      required: true,
      tooltip: 'Chemo causes metallic/bitter taste. WLPL suggests plastic utensils, citrus flavors, cold foods to mask taste.'
    },
    {
      id: 'cancer_weight_loss',
      question: 'Have you lost weight unintentionally?',
      type: 'select',
      options: [
        { value: 'no', label: 'No weight loss' },
        { value: 'mild', label: 'Yes, <5% of body weight' },
        { value: 'moderate', label: 'Yes, 5-10% of body weight' },
        { value: 'severe', label: 'Yes, >10% of body weight' }
      ],
      required: true,
      tooltip: 'Unintentional weight loss >5% requires high-protein, high-calorie diet. WLPL will prioritize nutrient-dense foods.'
    }
  ]
}

/**
 * Questionnaire: Type 1 Diabetes
 */
export const type1DiabetesQuestionnaire: HealthConditionQuestionnaire = {
  conditionName: 'Type 1 Diabetes',
  conditionKey: 'type-1-diabetes',
  description: 'WLPL helps you count carbs, balance meals, and avoid hypo/hyperglycemia.',
  questions: [
    {
      id: 't1d_insulin_regimen',
      question: 'What insulin regimen do you use?',
      type: 'select',
      options: [
        { value: 'mdi', label: 'Multiple Daily Injections (MDI)' },
        { value: 'pump', label: 'Insulin Pump' },
        { value: 'pump-cgm', label: 'Insulin Pump + CGM' },
        { value: 'other', label: 'Other' }
      ],
      required: true,
      tooltip: 'Pump users can adjust insulin for meals. MDI requires consistent carb timing.'
    },
    {
      id: 't1d_a1c',
      question: 'What is your most recent A1C?',
      type: 'number',
      min: 4,
      max: 15,
      unit: '%',
      required: false,
      placeholder: 'e.g., 7.2',
      tooltip: 'A1C >8% means blood sugar control needs improvement. WLPL will suggest lower-carb meals.'
    },
    {
      id: 't1d_carb_ratio',
      question: 'What is your insulin-to-carb ratio (I:C)?',
      type: 'text',
      required: false,
      placeholder: 'e.g., 1:10',
      tooltip: 'Your I:C ratio (e.g., 1:10) tells WLPL how many grams of carbs are covered by 1 unit of insulin.'
    },
    {
      id: 't1d_hypo_frequency',
      question: 'How often do you experience low blood sugar (hypoglycemia)?',
      type: 'select',
      options: [
        { value: 'rarely', label: 'Rarely (less than once a month)' },
        { value: 'occasional', label: 'Occasionally (1-2 times per month)' },
        { value: 'frequent', label: 'Frequently (1-2 times per week)' },
        { value: 'daily', label: 'Daily or multiple times per week' }
      ],
      required: true,
      tooltip: 'Frequent hypos mean you need more consistent carb intake. WLPL will suggest balanced meals with protein/fat.'
    },
    {
      id: 't1d_hypo_awareness',
      question: 'Do you feel symptoms when your blood sugar goes low?',
      type: 'select',
      options: [
        { value: 'yes', label: 'Yes, I feel shakiness, sweating, etc.' },
        { value: 'sometimes', label: 'Sometimes I notice, sometimes not' },
        { value: 'no', label: 'No, I have hypoglycemia unawareness' }
      ],
      required: true,
      tooltip: 'Hypoglycemia unawareness is dangerous. WLPL will recommend higher carb targets and frequent small meals.'
    }
  ]
}

/**
 * Questionnaire: Type 2 Diabetes
 */
export const type2DiabetesQuestionnaire: HealthConditionQuestionnaire = {
  conditionName: 'Type 2 Diabetes',
  conditionKey: 'type-2-diabetes',
  description: 'WLPL helps you manage blood sugar with low-glycemic meals and carb control.',
  questions: [
    {
      id: 't2d_a1c',
      question: 'What is your most recent A1C?',
      type: 'number',
      min: 4,
      max: 15,
      unit: '%',
      required: false,
      placeholder: 'e.g., 7.5',
      tooltip: 'A1C <7% is controlled. 7-9% needs improvement. >9% is poorly controlled. WLPL tightens carb limits for higher A1C.'
    },
    {
      id: 't2d_blood_sugar_control',
      question: 'How well-controlled is your blood sugar?',
      type: 'select',
      options: [
        { value: 'excellent', label: 'Excellent (A1C <6.5%)' },
        { value: 'good', label: 'Good (A1C 6.5-7.5%)' },
        { value: 'fair', label: 'Fair (A1C 7.5-9%)' },
        { value: 'poor', label: 'Poor (A1C >9%)' }
      ],
      required: true,
      tooltip: 'Poor control requires strict carb limits (30-45g per meal). WLPL will prioritize low-glycemic foods.'
    },
    {
      id: 't2d_carb_target',
      question: 'Has your doctor given you a daily carb target?',
      type: 'number',
      min: 50,
      max: 300,
      unit: 'g/day',
      required: false,
      placeholder: 'e.g., 150',
      tooltip: 'Typical T2D carb targets: 100-150g/day (low-carb) or 150-200g/day (moderate). WLPL will track your carb intake.'
    }
  ]
}

/**
 * Questionnaire: Recent Surgery / Wound Healing
 */
export const surgeryQuestionnaire: HealthConditionQuestionnaire = {
  conditionName: 'Recent Surgery / Wound Healing',
  conditionKey: 'recent-surgery-wound-healing',
  description: 'WLPL ensures you get enough protein, calories, and nutrients for optimal healing.',
  questions: [
    {
      id: 'surgery_type',
      question: 'What type of surgery did you have?',
      type: 'select',
      options: [
        { value: 'bariatric', label: 'Bariatric (weight loss surgery)' },
        { value: 'abdominal', label: 'Abdominal surgery' },
        { value: 'orthopedic', label: 'Orthopedic (bone/joint)' },
        { value: 'cardiac', label: 'Cardiac (heart surgery)' },
        { value: 'gi', label: 'GI (stomach, intestines, colon)' },
        { value: 'other', label: 'Other' }
      ],
      required: true,
      tooltip: 'GI surgery requires low-fiber, soft foods. Bariatric requires high-protein, small meals. WLPL adapts recommendations.'
    },
    {
      id: 'surgery_date',
      question: 'When was your surgery?',
      type: 'date',
      required: true,
      tooltip: 'First 2 weeks: soft foods, high protein. Weeks 3-6: gradual return to normal. WLPL adjusts based on healing phase.'
    },
    {
      id: 'surgery_healing_phase',
      question: 'What phase of healing are you in?',
      type: 'select',
      options: [
        { value: 'immediate', label: 'Immediate post-op (<2 weeks)' },
        { value: 'early', label: 'Early healing (2-6 weeks)' },
        { value: 'late', label: 'Late healing (6+ weeks)' }
      ],
      required: true,
      tooltip: 'Immediate phase: soft, gentle foods. Early phase: protein focus. Late phase: normal diet. WLPL suggests appropriate textures.'
    },
    {
      id: 'surgery_protein_needs',
      question: 'Has your doctor recommended increased protein intake?',
      type: 'select',
      options: [
        { value: 'no', label: 'No specific recommendation' },
        { value: 'yes-moderate', label: 'Yes, moderately increased (1.0-1.2g/kg)' },
        { value: 'yes-high', label: 'Yes, significantly increased (1.5-2g/kg)' }
      ],
      required: false,
      tooltip: 'Wound healing requires 1.5-2g protein/kg body weight. WLPL will prioritize protein-rich meals.'
    },
    {
      id: 'surgery_dietary_restrictions',
      question: 'Do you have post-surgery dietary restrictions?',
      type: 'multiselect',
      options: [
        { value: 'soft-foods', label: 'Soft foods only' },
        { value: 'low-fiber', label: 'Low fiber' },
        { value: 'no-raw-veg', label: 'No raw vegetables' },
        { value: 'small-meals', label: 'Small, frequent meals' },
        { value: 'no-restrictions', label: 'No restrictions' }
      ],
      required: true,
      tooltip: 'WLPL will filter meal suggestions based on your post-surgery restrictions.'
    }
  ]
}

/**
 * Questionnaire: Pregnancy
 */
export const pregnancyQuestionnaire: HealthConditionQuestionnaire = {
  conditionName: 'Pregnancy',
  conditionKey: 'pregnancy-nursing',
  description: 'WLPL ensures you and your baby get proper nutrition while managing pregnancy symptoms.',
  questions: [
    {
      id: 'pregnancy_trimester',
      question: 'Which trimester are you in?',
      type: 'select',
      options: [
        { value: 'first', label: 'First trimester (weeks 1-12)' },
        { value: 'second', label: 'Second trimester (weeks 13-26)' },
        { value: 'third', label: 'Third trimester (weeks 27-40)' },
        { value: 'nursing', label: 'Not pregnant, but breastfeeding' }
      ],
      required: true,
      tooltip: 'First trimester: small, frequent meals for nausea. Second/third: increased calories (+300-500). Nursing: +500 calories.'
    },
    {
      id: 'pregnancy_gestational_diabetes',
      question: 'Do you have gestational diabetes?',
      type: 'select',
      options: [
        { value: 'no', label: 'No' },
        { value: 'yes-diet', label: 'Yes, diet-controlled' },
        { value: 'yes-insulin', label: 'Yes, on insulin' }
      ],
      required: true,
      tooltip: 'Gestational diabetes requires carb limits (150-175g/day), spread across 3 meals + 2-3 snacks. WLPL tracks carbs closely.'
    },
    {
      id: 'pregnancy_preeclampsia',
      question: 'Do you have preeclampsia or high blood pressure?',
      type: 'select',
      options: [
        { value: 'no', label: 'No' },
        { value: 'yes', label: 'Yes, diagnosed with preeclampsia' },
        { value: 'high-bp', label: 'High blood pressure only' }
      ],
      required: true,
      tooltip: 'Preeclampsia requires low sodium (<2300mg/day) and adequate protein (70-100g/day). WLPL flags high-sodium foods.'
    },
    {
      id: 'pregnancy_morning_sickness',
      question: 'Are you experiencing morning sickness or nausea?',
      type: 'select',
      options: [
        { value: 'no', label: 'No nausea' },
        { value: 'mild', label: 'Mild nausea, manageable' },
        { value: 'moderate', label: 'Moderate nausea, affects eating' },
        { value: 'severe', label: 'Severe nausea (hyperemesis gravidarum)' }
      ],
      required: true,
      tooltip: 'Morning sickness requires bland, dry foods (crackers, toast). Small, frequent meals. WLPL suggests gentle options.'
    },
    {
      id: 'pregnancy_food_aversions',
      question: 'Do you have specific food aversions?',
      type: 'text',
      required: false,
      placeholder: 'e.g., Meat, eggs, strong smells',
      tooltip: 'Pregnancy aversions are common. WLPL will avoid suggesting these foods.'
    }
  ]
}

/**
 * Questionnaire: Inflammatory Bowel Disease (IBD)
 */
export const ibdQuestionnaire: HealthConditionQuestionnaire = {
  conditionName: 'Inflammatory Bowel Disease (IBD)',
  conditionKey: 'inflammatory-bowel-disease-ibd',
  description: 'WLPL adjusts fiber, fat, and trigger foods based on whether you\'re in remission or flaring.',
  questions: [
    {
      id: 'ibd_type',
      question: 'What type of IBD do you have?',
      type: 'select',
      options: [
        { value: 'crohns', label: 'Crohn\'s Disease' },
        { value: 'ulcerative-colitis', label: 'Ulcerative Colitis' },
        { value: 'unknown', label: 'Not sure / unspecified IBD' }
      ],
      required: true,
      tooltip: 'Crohn\'s can affect entire GI tract. UC affects colon only. WLPL tailors fiber/fat recommendations.'
    },
    {
      id: 'ibd_flare_status',
      question: 'Are you currently in a flare?',
      type: 'select',
      options: [
        { value: 'remission', label: 'Remission (no symptoms)' },
        { value: 'mild-flare', label: 'Mild flare (some symptoms)' },
        { value: 'moderate-flare', label: 'Moderate flare' },
        { value: 'severe-flare', label: 'Severe flare' }
      ],
      required: true,
      tooltip: 'Flare = low-fiber, low-fat, easy-to-digest foods. Remission = normal diet with caution. WLPL adjusts accordingly.'
    },
    {
      id: 'ibd_fiber_tolerance',
      question: 'How do you tolerate fiber?',
      type: 'select',
      options: [
        { value: 'well', label: 'Well tolerated' },
        { value: 'moderate', label: 'Some foods cause issues' },
        { value: 'poor', label: 'Most fiber causes pain/diarrhea' },
        { value: 'none', label: 'Cannot tolerate any fiber' }
      ],
      required: true,
      tooltip: 'IBD flares require low-residue diet (<10g fiber/day). WLPL will avoid raw veggies, whole grains, nuts, seeds.'
    },
    {
      id: 'ibd_trigger_foods',
      question: 'What foods trigger your symptoms?',
      type: 'text',
      required: false,
      placeholder: 'e.g., Dairy, spicy foods, raw vegetables',
      tooltip: 'Common IBD triggers: dairy, caffeine, alcohol, spicy foods, high-fat foods. WLPL will avoid your specific triggers.'
    },
    {
      id: 'ibd_strictures',
      question: 'Do you have intestinal strictures (narrowing)?',
      type: 'select',
      options: [
        { value: 'no', label: 'No strictures' },
        { value: 'yes', label: 'Yes, I have strictures' }
      ],
      required: false,
      tooltip: 'Strictures require low-fiber, soft, well-cooked foods to prevent blockages. WLPL will avoid tough meats, raw veggies.'
    }
  ]
}

/**
 * Master list of all questionnaires
 */
export const healthConditionQuestionnaires: HealthConditionQuestionnaire[] = [
  ckdQuestionnaire,
  cancerQuestionnaire,
  type1DiabetesQuestionnaire,
  type2DiabetesQuestionnaire,
  surgeryQuestionnaire,
  pregnancyQuestionnaire,
  ibdQuestionnaire
]

/**
 * Get questionnaire for a specific condition
 */
export function getQuestionnaireForCondition(conditionName: string): HealthConditionQuestionnaire | null {
  // Normalize condition name for matching
  const normalizedName = conditionName.toLowerCase().trim()

  return healthConditionQuestionnaires.find(q =>
    q.conditionName.toLowerCase() === normalizedName ||
    q.conditionKey.toLowerCase() === normalizedName
  ) || null
}

/**
 * Check if a condition has a detailed questionnaire
 */
export function hasDetailedQuestionnaire(conditionName: string): boolean {
  return getQuestionnaireForCondition(conditionName) !== null
}
