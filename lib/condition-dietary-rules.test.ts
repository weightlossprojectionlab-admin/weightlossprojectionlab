import { normalizeCondition, normalizeConditions, type DietaryCondition } from './condition-dietary-rules'
import { buildMedicalConstraints, evaluateRecipeSafety } from './medical-recipe-engine'
import type { PatientProfile } from '@/types/medical'
import type { MealSuggestion } from './meal-suggestions'

// The whole point of the single source: every capture vocabulary in the
// codebase must resolve to the same canonical key. If any of these regress,
// the recipe engine + portion caps silently go dead for that condition again.
describe('normalizeCondition — every stored vocabulary maps to one canonical key', () => {
  const cases: Array<[string, DietaryCondition]> = [
    // Diabetes — Title-case label, parenthetical, both kebab key sets
    ['Diabetes', 'diabetes'],
    ['Diabetes (Type 2)', 'diabetes'],
    ['Diabetes (Type 1)', 'diabetes'],
    ['type-2-diabetes', 'diabetes'],
    ['diabetes-type-2', 'diabetes'],
    ['pre-diabetes', 'diabetes'],
    // Kidney disease / CKD
    ['Kidney Disease', 'ckd'],
    ['kidney-disease-ckd', 'ckd'],
    ['ckd', 'ckd'],
    ['renal', 'ckd'],
    ['chronic-kidney-disease', 'ckd'],
    // Hypertension
    ['Hypertension', 'hypertension'],
    ['hypertension-high-blood-pressure', 'hypertension'],
    ['High Blood Pressure', 'hypertension'],
    // Heart disease
    ['Heart Disease', 'heart-disease'],
    ['heart-disease', 'heart-disease'],
    ['Congestive Heart Failure', 'heart-disease'],
    // Cholesterol
    ['High Cholesterol', 'high-cholesterol'],
    ['high-cholesterol', 'high-cholesterol'],
    // Cancer
    ['Cancer', 'cancer-treatment'],
    ['cancer-active-or-recent-treatment', 'cancer-treatment'],
  ]

  it.each(cases)('%s → %s', (raw, expected) => {
    expect(normalizeCondition(raw)).toBe(expected)
  })

  it('drops conditions with no dietary rule we act on', () => {
    for (const raw of ['Asthma', 'Arthritis', 'Thyroid Disorder', 'Anxiety', 'Other', '']) {
      expect(normalizeCondition(raw)).toBeNull()
    }
  })
})

describe('normalizeConditions — array normalization', () => {
  it('dedupes conditions that collapse to the same canonical key', () => {
    expect(normalizeConditions(['Diabetes', 'type-2-diabetes', 'Diabetes (Type 2)'])).toEqual(['diabetes'])
  })

  it('keeps distinct conditions and drops unrecognized ones', () => {
    expect(normalizeConditions(['Kidney Disease', 'Asthma', 'Hypertension'])).toEqual(['ckd', 'hypertension'])
  })

  it('handles empty / null / undefined safely', () => {
    expect(normalizeConditions(undefined)).toEqual([])
    expect(normalizeConditions(null)).toEqual([])
    expect(normalizeConditions([])).toEqual([])
  })
})

// Integration: prove the flagship link is actually wired end-to-end — a stored
// free-text label now flows through buildMedicalConstraints into real nutrient
// limits, and a violating recipe is flagged. Before this change the constraints
// came back empty for these patients and every recipe scored 100 "safe".
describe('buildMedicalConstraints fires for real stored labels', () => {
  const patient = (healthConditions: string[]) =>
    ({ id: 'p1', userId: 'u1', healthConditions } as unknown as PatientProfile)

  it('CKD label produces sodium + potassium + protein limits', () => {
    const c = buildMedicalConstraints(patient(['Kidney Disease']), [], [])
    expect(c.sodiumLimitMg).toBeGreaterThan(0)
    expect(c.potassiumLimitMg).toBeGreaterThan(0)
    expect(c.proteinLimitG).toBeGreaterThan(0)
  })

  it('Diabetes label produces carb + low-GI constraints', () => {
    const c = buildMedicalConstraints(patient(['Diabetes']), [], [])
    expect(c.requiresLowGI).toBe(true)
    expect(c.carbLimitG).toBeGreaterThan(0)
  })

  it('non-dietary label produces no constraints', () => {
    const c = buildMedicalConstraints(patient(['Asthma']), [], [])
    expect(c.sodiumLimitMg).toBeUndefined()
    expect(c.carbLimitG).toBeUndefined()
  })

  it('flags a high-sodium recipe as unsafe for a CKD patient', () => {
    const constraints = buildMedicalConstraints(patient(['Kidney Disease']), [], [])
    const saltyRecipe = {
      id: 'r1',
      name: 'Cured Ham Plate',
      calories: 400,
      allergens: [],
      ingredients: ['ham', 'salt'],
      requiresCooking: false,
      macros: { carbs: 10, protein: 25, sodium: 2000, potassium: 100 },
    } as unknown as MealSuggestion

    const result = evaluateRecipeSafety(saltyRecipe, constraints)
    expect(result.isSafe).toBe(false)
    expect(result.violations.join(' ')).toMatch(/sodium/i)
  })
})
