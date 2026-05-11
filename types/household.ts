/**
 * Household Types
 *
 * Household is the residential cluster — kitchen + shopping unit. A
 * patient's residence is the single source of truth: `Patient.householdId`
 * points to at most one household. The household doc itself does NOT
 * store a membership array — "who lives here?" is answered by querying
 * patients with `where('householdId', '==', X)`. This avoids the
 * two-arrays-to-sync class of bug that the 2026-05-11 restructure killed.
 *
 * Deferred (see memory/project_household_deferred.md):
 *   - Household.type (residential / care_facility / temporary / ...)
 *   - Temporal residence windows for joint custody / snowbird / visits
 *   - Cross-account residence notes
 */

export interface HouseholdAddress {
  street: string
  city: string
  state: string
  zipCode?: string
  country?: string
}

export interface KitchenConfig {
  hasSharedInventory: boolean
  separateShoppingLists: boolean
}

export interface Household {
  id: string
  name: string
  nickname?: string
  /** Address is optional — a household can be real before we know its
   *  zip code. Geo-aware shopping (future) will require it; the
   *  household-as-tracked-unit doesn't. */
  address?: HouseholdAddress
  primaryCaregiverId: string
  additionalCaregiverIds?: string[]
  kitchenConfig?: KitchenConfig
  createdBy: string
  createdAt: string
  updatedAt: string
  isActive: boolean
}

export interface HouseholdFormData {
  name: string
  nickname?: string
  address?: HouseholdAddress
  /** Ephemeral input only — server uses this to cascade
   *  `Patient.householdId` writes on create/update. Not persisted on
   *  the Household doc. */
  memberIds?: string[]
  kitchenConfig?: KitchenConfig
}
