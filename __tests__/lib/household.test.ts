/**
 * Regression tests for lib/household.ts — the semantic mapping
 * between a patient's relationship and which household they
 * belong to. Pure functions; easy to lock down.
 *
 * If the mapping changes (e.g., "sibling" moves from extended to
 * nuclear), update the test alongside the code so the invariant
 * is explicit.
 */

import { describe, it, expect } from '@jest/globals'
import {
  relationshipToHouseholdType,
  defaultHouseholdName,
  householdEmoji,
  HOUSEHOLD_SORT_ORDER,
} from '@/lib/household'
import type { HouseholdType } from '@/types/medical'

describe('relationshipToHouseholdType — semantic mapping', () => {
  it('maps nuclear-household relationships', () => {
    expect(relationshipToHouseholdType('self')).toBe('nuclear')
    expect(relationshipToHouseholdType('Spouse')).toBe('nuclear')
    expect(relationshipToHouseholdType('Husband')).toBe('nuclear')
    expect(relationshipToHouseholdType('Wife')).toBe('nuclear')
    expect(relationshipToHouseholdType('Child')).toBe('nuclear')
    expect(relationshipToHouseholdType('Son')).toBe('nuclear')
    expect(relationshipToHouseholdType('Daughter')).toBe('nuclear')
    expect(relationshipToHouseholdType('Newborn')).toBe('nuclear')
    expect(relationshipToHouseholdType('Pet')).toBe('nuclear')
  })

  it('maps parents-household relationships', () => {
    expect(relationshipToHouseholdType('Parent')).toBe('parents')
    expect(relationshipToHouseholdType('Mother')).toBe('parents')
    expect(relationshipToHouseholdType('Father')).toBe('parents')
    expect(relationshipToHouseholdType('Mom')).toBe('parents')
    expect(relationshipToHouseholdType('Dad')).toBe('parents')
  })

  it('maps grandparents-household relationships', () => {
    expect(relationshipToHouseholdType('Grandparent')).toBe('grandparents')
    expect(relationshipToHouseholdType('Grandmother')).toBe('grandparents')
    expect(relationshipToHouseholdType('Grandfather')).toBe('grandparents')
    expect(relationshipToHouseholdType('Grandma')).toBe('grandparents')
    expect(relationshipToHouseholdType('Grandpa')).toBe('grandparents')
    expect(relationshipToHouseholdType('maternal_grandparent')).toBe('grandparents')
    expect(relationshipToHouseholdType('paternal_grandparent')).toBe('grandparents')
  })

  it('maps extended-household relationships', () => {
    expect(relationshipToHouseholdType('Sibling')).toBe('extended')
    expect(relationshipToHouseholdType('Brother')).toBe('extended')
    expect(relationshipToHouseholdType('Sister')).toBe('extended')
    expect(relationshipToHouseholdType('Aunt')).toBe('extended')
    expect(relationshipToHouseholdType('Uncle')).toBe('extended')
    expect(relationshipToHouseholdType('Mother-in-law')).toBe('extended')
    expect(relationshipToHouseholdType('Cousin')).toBe('extended')
  })

  it('maps kids-household (adult children)', () => {
    expect(relationshipToHouseholdType('Adult Child')).toBe('kids')
    expect(relationshipToHouseholdType('adult_child')).toBe('kids')
  })

  it('falls back to "nuclear" for empty / null / undefined', () => {
    // The owner adding themselves first (no relationship yet) should
    // anchor on nuclear by default.
    expect(relationshipToHouseholdType(undefined)).toBe('nuclear')
    expect(relationshipToHouseholdType(null)).toBe('nuclear')
    expect(relationshipToHouseholdType('')).toBe('nuclear')
  })

  it('falls back to "other" for unrecognized relationships', () => {
    expect(relationshipToHouseholdType('Neighbor')).toBe('other')
    expect(relationshipToHouseholdType('Friend')).toBe('other')
    expect(relationshipToHouseholdType('Coworker')).toBe('other')
  })

  it('is case-insensitive and whitespace-tolerant', () => {
    expect(relationshipToHouseholdType('  SPOUSE  ')).toBe('nuclear')
    expect(relationshipToHouseholdType('parent')).toBe('parents')
    expect(relationshipToHouseholdType('GRANDPARENT')).toBe('grandparents')
  })
})

describe('defaultHouseholdName — display defaults', () => {
  it('returns a non-empty name for every household type', () => {
    const types: HouseholdType[] = [
      'nuclear',
      'parents',
      'grandparents',
      'kids',
      'extended',
      'other',
    ]
    for (const t of types) {
      const name = defaultHouseholdName(t)
      expect(typeof name).toBe('string')
      expect(name.length).toBeGreaterThan(0)
    }
  })

  it('uses possessive forms for parents and grandparents', () => {
    expect(defaultHouseholdName('parents')).toContain("Parents'")
    expect(defaultHouseholdName('grandparents')).toContain("Grandparents'")
  })
})

describe('HOUSEHOLD_SORT_ORDER — display ordering', () => {
  it('starts with nuclear (closest to the owner)', () => {
    expect(HOUSEHOLD_SORT_ORDER[0]).toBe('nuclear')
  })

  it('includes every household type exactly once', () => {
    const allTypes: HouseholdType[] = [
      'nuclear',
      'parents',
      'grandparents',
      'kids',
      'extended',
      'other',
    ]
    expect(HOUSEHOLD_SORT_ORDER).toEqual(expect.arrayContaining(allTypes))
    expect(HOUSEHOLD_SORT_ORDER.length).toBe(allTypes.length)
  })
})

describe('householdEmoji — cosmetic helper', () => {
  it('returns a non-empty emoji for every household type', () => {
    const types: HouseholdType[] = [
      'nuclear',
      'parents',
      'grandparents',
      'kids',
      'extended',
      'other',
    ]
    for (const t of types) {
      const emoji = householdEmoji(t)
      expect(typeof emoji).toBe('string')
      expect(emoji.length).toBeGreaterThan(0)
    }
  })
})
