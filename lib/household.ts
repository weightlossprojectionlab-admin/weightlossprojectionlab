/**
 * Household helpers — semantic mapping between a patient's
 * relationship to the owner and which household they operationally
 * belong to.
 *
 * Household model intent:
 *   - A user's "nuclear" household = themselves + spouse + kids + pets
 *   - "parents" household = the user's mother/father (different home)
 *   - "grandparents" household = the user's grandparents
 *   - "kids" household = adult children living separately
 *   - "extended" household = aunts/uncles/siblings/in-laws
 *   - "other" household = anything not fitting above
 *
 * The owner can subscribe once and operate multiple households
 * (Family Premium = 10 households × 20 patients × 50 caregivers).
 * Each household has its own caregivers, defaults, and emergency
 * protocols (future-extensible).
 *
 * This module is the boundary that maps wizard-level relationship
 * choices to household types. Pure functions — no Firestore access.
 */

import type { HouseholdType } from '@/types/medical'

/**
 * Map a patient's relationship string to the household bucket they
 * operationally belong to. Accepts both the wizard's title-case
 * values ("Spouse", "Parent", "Newborn", etc.) and the lowercase
 * canonical values from PatientProfile.relationship.
 *
 * Conservative bias: when in doubt, returns 'other' so the user
 * sees the household and can re-assign explicitly if needed.
 */
export function relationshipToHouseholdType(
  relationship: string | undefined | null,
): HouseholdType {
  if (!relationship) return 'nuclear' // default for self-onboarding

  const r = relationship.toLowerCase().trim()

  // Nuclear household — people who share daily operations with the owner
  if (
    [
      'self',
      'spouse',
      'partner',
      'husband',
      'wife',
      'child',
      'son',
      'daughter',
      'newborn',
      'infant',
      'baby',
      'pet',
    ].includes(r)
  ) {
    return 'nuclear'
  }

  // Parents' household — user's mother/father, typically separate home
  if (['parent', 'mother', 'father', 'mom', 'dad', 'mum'].includes(r)) {
    return 'parents'
  }

  // Grandparents' household
  if (
    [
      'grandparent',
      'grandmother',
      'grandfather',
      'grandma',
      'grandpa',
      'maternal_grandparent',
      'paternal_grandparent',
    ].includes(r)
  ) {
    return 'grandparents'
  }

  // Adult children with their own homes
  if (['adult_child', 'adult child', 'grown child'].includes(r)) {
    return 'kids'
  }

  // Extended — siblings (live separately), aunts, uncles, in-laws
  if (
    [
      'sibling',
      'brother',
      'sister',
      'aunt',
      'uncle',
      'aunt_uncle',
      'in-law',
      'in_law',
      'mother-in-law',
      'father-in-law',
      'cousin',
    ].includes(r)
  ) {
    return 'extended'
  }

  return 'other'
}

/**
 * Display name for a household type — used when the user hasn't
 * provided a custom name. Conventions chosen so the patients list
 * groups feel natural ("Nuclear", "Parents' Household", etc.).
 */
export function defaultHouseholdName(type: HouseholdType): string {
  switch (type) {
    case 'nuclear':
      return 'Nuclear Household'
    case 'parents':
      return "Parents' Household"
    case 'grandparents':
      return "Grandparents' Household"
    case 'kids':
      return "Kids' Household"
    case 'extended':
      return 'Extended Family'
    case 'other':
      return 'Other'
  }
}

/**
 * Stable sort order for displaying households in the /patients
 * list. Nuclear first (most common, closest to owner), then
 * parents, then grandparents, then kids, then extended, then
 * other. Patients are grouped under headers in this order.
 */
export const HOUSEHOLD_SORT_ORDER: HouseholdType[] = [
  'nuclear',
  'parents',
  'grandparents',
  'kids',
  'extended',
  'other',
]

/**
 * Emoji shorthand for each household type — used in badges /
 * section headers. Optional cosmetic; downstream code should
 * tolerate a missing emoji.
 */
export function householdEmoji(type: HouseholdType): string {
  switch (type) {
    case 'nuclear':
      return '🏠'
    case 'parents':
      return '👴👵'
    case 'grandparents':
      return '🧓'
    case 'kids':
      return '🧒'
    case 'extended':
      return '👨‍👩‍👧‍👦'
    case 'other':
      return '🏘️'
  }
}
