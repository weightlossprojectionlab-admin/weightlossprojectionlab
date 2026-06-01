/**
 * health-context Tests — the session→engine adapter, and that it feeds the
 * scorer correctly end-to-end (allergen safety fires through the real engine).
 */

import {
  ageFromDateOfBirth,
  toMemberHealthProfile,
  toItemHealthProfile,
} from '@/lib/health-context'
import { inventoryAttentionScore } from '@/lib/inventory-attention'
import { healthDemandWeight, type MemberHealthProfile } from '@/lib/health-demand'
import type { PatientProfile } from '@/types/medical'
import type { ShoppingItem } from '@/types/shopping'

const NOW = new Date('2026-06-01T00:00:00.000Z').getTime()

describe('ageFromDateOfBirth', () => {
  it('computes whole years from an ISO dob', () => {
    expect(ageFromDateOfBirth('2000-01-01', NOW)).toBe(26)
    expect(ageFromDateOfBirth('1956-06-02', NOW)).toBe(69)
  })
  it('returns undefined for absent / unparseable / future dates', () => {
    expect(ageFromDateOfBirth(undefined, NOW)).toBeUndefined()
    expect(ageFromDateOfBirth('not-a-date', NOW)).toBeUndefined()
    expect(ageFromDateOfBirth('2030-01-01', NOW)).toBeUndefined()
  })
})

describe('toMemberHealthProfile', () => {
  it('maps PatientProfile fields + derives ageYears, defaulting missing arrays', () => {
    const p = {
      id: 'gran',
      name: 'Grandma',
      dateOfBirth: '1956-06-02',
      healthConditions: ['hypertension'],
      foodAllergies: ['Shellfish'],
      // dietaryRestrictions omitted
    } as PatientProfile
    expect(toMemberHealthProfile(p, NOW)).toEqual({
      id: 'gran',
      conditions: ['hypertension'],
      allergies: ['Shellfish'],
      dietaryRestrictions: [],
      ageYears: 69,
    })
  })
})

describe('toItemHealthProfile', () => {
  it('passes allergenTags through and omits nutrients (partial-set guard)', () => {
    const item = { allergenTags: ['milk'], nutrition: { fiber: 10 } } as unknown as ShoppingItem
    const r = toItemHealthProfile(item)
    expect(r.allergenTags).toEqual(['milk'])
    expect(r.nutrients).toBeUndefined() // not mapped — would reward without penalizing
  })
  it('defaults to empty tags when the item has none', () => {
    expect(toItemHealthProfile({} as ShoppingItem).allergenTags).toEqual([])
  })
})

describe('toItemHealthProfile — nutrient panel mapping (Tier-2)', () => {
  it('maps the full panel: sugars→addedSugar, calories→calorieDensity', () => {
    const item = {
      nutrients: { sodium: 600, sugars: 20, saturatedFat: 8, transFat: 1, fiber: 6, protein: 10, potassium: 300, calories: 200, basis: 'serving' },
    } as ShoppingItem
    expect(toItemHealthProfile(item).nutrients).toEqual({
      sodium: 600, addedSugar: 20, saturatedFat: 8, transFat: 1, fiber: 6, protein: 10, potassium: 300, calorieDensity: 200,
    })
  })

  it('harm-anchor guard: omits ALL nutrients if a harm anchor (saturatedFat) is missing', () => {
    // only-beneficial partial panel must not attach — would reward without penalty
    const item = { nutrients: { sodium: 100, sugars: 2, fiber: 10, protein: 20, basis: 'serving' } } as ShoppingItem
    expect(toItemHealthProfile(item).nutrients).toBeUndefined()
  })

  it('no panel → no nutrients (D stays inert)', () => {
    expect(toItemHealthProfile({} as ShoppingItem).nutrients).toBeUndefined()
  })
})

describe('demand weight D activates from the panel', () => {
  const hypertensive: MemberHealthProfile[] = [
    { id: 'gran', conditions: ['hypertension'], allergies: [], dietaryRestrictions: [], ageYears: 70 },
  ]
  const diabetic: MemberHealthProfile[] = [
    { id: 'dad', conditions: ['diabetes'], allergies: [], dietaryRestrictions: [], ageYears: 50 },
  ]

  it('high-sodium item lowers D for a hypertensive member', () => {
    const salty = toItemHealthProfile({ nutrients: { sodium: 600, sugars: 2, saturatedFat: 4, basis: 'serving' } } as ShoppingItem)
    expect(healthDemandWeight(salty, hypertensive).D).toBeLessThan(1)
  })

  it('high-sugar item lowers D for a diabetic member', () => {
    const sugary = toItemHealthProfile({ nutrients: { sodium: 50, sugars: 20, saturatedFat: 1, fiber: 0, basis: 'serving' } } as ShoppingItem)
    expect(healthDemandWeight(sugary, diabetic).D).toBeLessThan(1)
  })

  it('a clean, potassium-rich item does not depress D (beneficial)', () => {
    const clean = toItemHealthProfile({ nutrients: { sodium: 20, sugars: 1, saturatedFat: 0.2, fiber: 5, potassium: 400, basis: 'serving' } } as ShoppingItem)
    expect(healthDemandWeight(clean, hypertensive).D).toBeGreaterThanOrEqual(1)
  })

  it('panel without harm anchors leaves D neutral (=1)', () => {
    const partial = toItemHealthProfile({ nutrients: { fiber: 10, protein: 20, basis: 'serving' } } as ShoppingItem)
    expect(healthDemandWeight(partial, diabetic).D).toBe(1)
  })
})

describe('adapter → engine end-to-end', () => {
  it('a peanut-allergic member + a peanut-tagged item produces an unsafeFor warning', () => {
    const patient = {
      id: 'kid',
      name: 'Kid',
      dateOfBirth: '2015-01-01',
      foodAllergies: ['peanuts'], // free-form
    } as PatientProfile
    const item = { allergenTags: ['peanut'] } as ShoppingItem // canonical from ingestion

    const r = inventoryAttentionScore(item, NOW, {
      members: [toMemberHealthProfile(patient, NOW)],
      itemHealth: toItemHealthProfile(item),
    })
    expect(r.unsafeFor).toContain('kid')
  })
})
