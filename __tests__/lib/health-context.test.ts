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
