/**
 * Household Types
 * Defines types for multi-patient household management
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
  address: HouseholdAddress
  memberIds: string[] // Patient IDs
  primaryResidentId?: string // Primary patient in household
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
  address: HouseholdAddress
  memberIds?: string[]
  primaryResidentId?: string
  kitchenConfig?: KitchenConfig
}

export interface HouseholdMember {
  patientId: string
  name: string
  residenceType: 'full_time' | 'part_time' | 'visitor'
  isPrimaryResident: boolean
}
