/**
 * health-demand Tests — the care-model behaviors that make this more than a sum:
 * neutral-by-default, medical-supply boost, harm asymmetry (β), vulnerability
 * weighting (κ), graceful missing data, hard exclusion, and the D clamp.
 */

import {
  healthDemandWeight,
  calculateHouseholdAlignment,
  DEFAULT_HEALTH_DEMAND_CONFIG as CFG,
  type MemberHealthProfile,
  type ItemHealthProfile,
} from '@/lib/health-demand'

const member = (over: Partial<MemberHealthProfile>): MemberHealthProfile => ({
  id: 'm',
  conditions: [],
  allergies: [],
  dietaryRestrictions: [],
  ...over,
})

const diabeticAdult = member({ id: 'd', conditions: ['diabetes'], ageYears: 30 })
const hyperSenior = member({ id: 's', conditions: ['hypertension'], ageYears: 70 })
const hyperAdult = member({ id: 'a', conditions: ['hypertension'], ageYears: 30 })

describe('healthDemandWeight — neutral & graceful', () => {
  it('no attributes / no conditions → D = 1, nobody unsafe', () => {
    const r = healthDemandWeight({}, [member({})])
    expect(r.D).toBe(1)
    expect(r.unsafeFor).toEqual([])
  })

  it('condition present but item carries no nutrient data → still neutral (graceful skip)', () => {
    // diabetic member, but the item has no addedSugar/fiber → those terms drop.
    expect(healthDemandWeight({}, [diabeticAdult]).D).toBe(1)
  })
})

describe('healthDemandWeight — boosts & suppression', () => {
  it('matching medical supply boosts D (test strips for a diabetic)', () => {
    const item: ItemHealthProfile = { medicalSupplyFor: ['diabetes'] }
    // κ = 1 + 0.3 = 1.3; boost 0.6 → D = 1 + 1.3*0.6 = 1.78
    expect(healthDemandWeight(item, [diabeticAdult]).D).toBeCloseTo(1.78)
  })

  it('high-sodium item is suppressed for a hypertensive member', () => {
    const item: ItemHealthProfile = { nutrients: { sodium: 1200 } } // ν = 1.0
    expect(healthDemandWeight(item, [hyperSenior]).D).toBeLessThan(0.6)
  })

  it('stacked boosts clamp at dMax', () => {
    const item: ItemHealthProfile = { medicalSupplyFor: ['diabetes'], conditionStapleFor: ['diabetes'] }
    const senior = member({ conditions: ['diabetes'], ageYears: 70 })
    expect(healthDemandWeight(item, [senior]).D).toBe(CFG.dMax)
  })
})

describe('care-model invariants', () => {
  it('harm asymmetry: β>1 suppresses harder than a symmetric model', () => {
    const item: ItemHealthProfile = { nutrients: { sodium: 300 } } // ν = 0.5, milder (avoids clamp)
    const withBeta = healthDemandWeight(item, [hyperAdult]).D
    const symmetric = healthDemandWeight(item, [hyperAdult], { ...CFG, beta: 1 }).D
    expect(withBeta).toBeLessThan(symmetric)
  })

  it('vulnerability: a senior household is suppressed more than a same-condition adult', () => {
    const item: ItemHealthProfile = { nutrients: { sodium: 300 } }
    const seniorD = healthDemandWeight(item, [hyperSenior]).D
    const adultD = healthDemandWeight(item, [hyperAdult]).D
    expect(seniorD).toBeLessThan(adultD)
  })

  it('does NOT let a benefit for one member cancel harm to a vulnerable other', () => {
    // sugary item: harmful to the diabetic senior, "fine" for a healthy adult.
    const item: ItemHealthProfile = { nutrients: { addedSugar: 20 } } // ν = 1.0
    const diabeticSenior = member({ id: 'ds', conditions: ['diabetes'], ageYears: 70 })
    const healthyAdult = member({ id: 'ok', ageYears: 30 })
    const { align } = calculateHouseholdAlignment(item, [diabeticSenior, healthyAdult])
    expect(align).toBeLessThan(0) // harm dominates, not cancelled
    expect(healthDemandWeight(item, [diabeticSenior, healthyAdult]).D).toBeLessThan(1)
  })
})

describe('hard exclusion (separate from D)', () => {
  it('flags a member with a matching food allergy', () => {
    const item: ItemHealthProfile = { allergenTags: ['peanuts'] }
    const allergic = member({ id: 'p', allergies: ['Peanuts'] }) // case-insensitive
    const r = healthDemandWeight(item, [allergic])
    expect(r.unsafeFor).toContain('p')
  })

  it('maps a "X-free" restriction to the forbidden allergen', () => {
    const item: ItemHealthProfile = { allergenTags: ['gluten'] }
    const celiacish = member({ id: 'g', dietaryRestrictions: ['gluten-free'] })
    expect(healthDemandWeight(item, [celiacish]).unsafeFor).toContain('g')
  })
})
