/**
 * PetFoodProfileWizard Component
 * Add/edit pet food profiles
 */

'use client'

import { useState, useEffect } from 'react'
import { usePetFoodProfiles } from '@/hooks/usePetFoodProfiles'
import { useAuth } from '@/hooks/useAuth'
import { PetFoodProfile } from '@/types/pet-feeding'
import { XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'
import { getPetFoodOptions } from '@/lib/pet-food-data'
import { getBrandProducts, brandHasProducts } from '@/lib/pet-food-products'

interface PetFoodProfileWizardProps {
  isOpen: boolean
  onClose: () => void
  petId: string
  petName: string
  petSpecies?: string
  editProfile?: PetFoodProfile | null
  onSuccess?: () => void
}

export function PetFoodProfileWizard({
  isOpen,
  onClose,
  petId,
  petName,
  petSpecies,
  editProfile,
  onSuccess
}: PetFoodProfileWizardProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const { createFoodProfile, updateFoodProfile } = usePetFoodProfiles({
    userId: user?.uid || '',
    petId,
    autoFetch: false
  })

  // Get species-specific food options
  const foodOptions = getPetFoodOptions(petSpecies)
  const [customBrand, setCustomBrand] = useState(false)
  const [customFoodName, setCustomFoodName] = useState(false)

  // Form state - MUST be declared before being used
  const [formData, setFormData] = useState({
    foodName: editProfile?.foodName || '',
    brand: editProfile?.brand || '',
    foodType: (editProfile?.foodType || 'dry') as 'dry' | 'wet' | 'raw' | 'freeze-dried' | 'homemade' | 'prescription',
    servingSize: editProfile?.servingSize || 1,
    servingUnit: (editProfile?.servingUnit || 'cups') as 'cups' | 'grams' | 'oz' | 'cans' | 'tbsp',
    caloriesPerServing: editProfile?.caloriesPerServing || 0,
    isCurrentFood: editProfile?.isCurrentFood ?? true,
    notes: editProfile?.notes || ''
  })

  // Get products for selected brand
  const [availableProducts, setAvailableProducts] = useState<string[]>([])
  const showProductDropdown = brandHasProducts(petSpecies, formData.brand) && !customBrand

  // Update available products when brand changes
  useEffect(() => {
    if (formData.brand && !customBrand) {
      const products = getBrandProducts(petSpecies, formData.brand)
      setAvailableProducts(products)
      // Reset food name when brand changes
      if (products.length > 0 && !customFoodName) {
        setFormData(prev => ({ ...prev, foodName: '' }))
      }
    } else {
      setAvailableProducts([])
    }
  }, [formData.brand, petSpecies, customBrand, customFoodName])

  const handleSubmit = async () => {
    try {
      setLoading(true)

      // Validation
      if (!formData.foodName.trim()) {
        throw new Error('Please enter food name')
      }
      if (!formData.brand.trim()) {
        throw new Error('Please enter brand name')
      }
      if (formData.servingSize <= 0) {
        throw new Error('Serving size must be greater than 0')
      }
      if (formData.caloriesPerServing < 0) {
        throw new Error('Calories cannot be negative')
      }

      const profileData = {
        foodName: formData.foodName.trim(),
        brand: formData.brand.trim(),
        foodType: formData.foodType,
        servingSize: formData.servingSize,
        servingUnit: formData.servingUnit,
        caloriesPerServing: formData.caloriesPerServing,
        isCurrentFood: formData.isCurrentFood,
        startedAt: formData.isCurrentFood ? new Date().toISOString() : (editProfile?.startedAt || new Date().toISOString()),
        notes: formData.notes.trim() || undefined
      }

      if (editProfile) {
        await updateFoodProfile(editProfile.id, profileData)
      } else {
        await createFoodProfile(profileData)
      }

      onSuccess?.()
      onClose()
    } catch (err: any) {
      logger.error('[PetFoodProfileWizard] Error saving profile', err)
      toast.error(err.message || 'Failed to save food profile')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {editProfile ? 'Edit Food Profile' : 'Add Food Profile'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">for {petName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Brand */}
          <div>
            <label className="block text-sm font-medium mb-2">Brand *</label>
            {!customBrand ? (
              <div className="flex gap-2">
                <select
                  value={formData.brand}
                  onChange={(e) => {
                    if (e.target.value === 'Other') {
                      setCustomBrand(true)
                      setFormData(prev => ({ ...prev, brand: '' }))
                    } else {
                      setFormData(prev => ({ ...prev, brand: e.target.value }))
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select brand</option>
                  {foodOptions.brands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="Enter custom brand"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCustomBrand(false)
                    setFormData(prev => ({ ...prev, brand: '' }))
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  ← Choose from list
                </button>
              </div>
            )}
          </div>

          {/* Food Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Food Name *</label>
            {showProductDropdown && availableProducts.length > 0 ? (
              <div className="space-y-2">
                <select
                  value={formData.foodName}
                  onChange={(e) => {
                    if (e.target.value === 'Custom') {
                      setCustomFoodName(true)
                      setFormData(prev => ({ ...prev, foodName: '' }))
                    } else {
                      setFormData(prev => ({ ...prev, foodName: e.target.value }))
                    }
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select product</option>
                  {availableProducts.map(product => (
                    <option key={product} value={product}>{product}</option>
                  ))}
                  <option value="Custom">Other/Custom Product</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Select a common {formData.brand} product or choose "Other/Custom"
                </p>
              </div>
            ) : customFoodName || !formData.brand || availableProducts.length === 0 ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.foodName}
                  onChange={(e) => setFormData(prev => ({ ...prev, foodName: e.target.value }))}
                  placeholder="Complete Food Name"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {customFoodName && formData.brand && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomFoodName(false)
                      setFormData(prev => ({ ...prev, foodName: '' }))
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    ← Choose from {formData.brand} products
                  </button>
                )}
                <p className="text-xs text-muted-foreground">
                  e.g., {
                    petSpecies === 'Dog' || petSpecies === 'Cat' ? 'Adult Chicken & Rice' :
                    petSpecies === 'Bird' ? 'Daily Pellet Blend' :
                    petSpecies === 'Fish' ? 'Tropical Flakes' :
                    petSpecies === 'Guinea Pig' ? 'Timothy Hay' :
                    petSpecies === 'Rabbit' ? 'Timothy Hay' :
                    petSpecies === 'Hamster' ? 'Lab Blocks' :
                    petSpecies === 'Reptile' ? 'Bearded Dragon Food' :
                    petSpecies === 'Horse' ? 'Timothy Hay or Senior Grain' :
                    petSpecies === 'Cow' ? 'Grass Hay or Dairy Feed' :
                    petSpecies === 'Goat' ? 'Alfalfa Hay or Goat Grain' :
                    petSpecies === 'Sheep' ? 'Grass Hay or Sheep Pellets' :
                    petSpecies === 'Pig' ? 'Grower Pellets or Finisher Feed' :
                    petSpecies === 'Chicken' ? 'Layer Crumbles or Grower Feed' :
                    petSpecies === 'Duck' ? 'Waterfowl Pellets or Layer Feed' :
                    'Complete Food Name'
                  }
                </p>
              </div>
            ) : null}
          </div>

          {/* Food Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Food Type</label>
            <select
              value={formData.foodType}
              onChange={(e) => setFormData(prev => ({ ...prev, foodType: e.target.value as any }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {foodOptions.foodTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Serving Size & Unit */}
          <div>
            <label className="block text-sm font-medium mb-2">Serving Size *</label>
            <div className="flex gap-3">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={formData.servingSize}
                onChange={(e) => setFormData(prev => ({ ...prev, servingSize: parseFloat(e.target.value) || 0 }))}
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <select
                value={formData.servingUnit}
                onChange={(e) => setFormData(prev => ({ ...prev, servingUnit: e.target.value as any }))}
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {foodOptions.servingUnits.map(unit => (
                  <option key={unit.value} value={unit.value}>{unit.label}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              One serving = {formData.servingSize} {formData.servingUnit}
            </p>
          </div>

          {/* Calories per Serving */}
          <div>
            <label className="block text-sm font-medium mb-2">Calories per Serving {petSpecies === 'Dog' || petSpecies === 'Cat' ? '' : '(Optional)'}</label>
            <input
              type="number"
              min="0"
              step="1"
              value={formData.caloriesPerServing}
              onChange={(e) => setFormData(prev => ({ ...prev, caloriesPerServing: parseInt(e.target.value) || 0 }))}
              placeholder="350"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {petSpecies === 'Dog' || petSpecies === 'Cat'
                ? `Check the food bag for calories per ${formData.servingUnit}`
                : 'Most commonly available for commercial pellets/kibble'}
            </p>
          </div>

          {/* Current Food Toggle */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <p className="font-medium">Current Food</p>
              <p className="text-sm text-muted-foreground">Mark this as the food {petName} is currently eating</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, isCurrentFood: !prev.isCurrentFood }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.isCurrentFood ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.isCurrentFood ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g., Sensitive stomach formula, vet recommended, grain-free..."
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            disabled={loading}
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : editProfile ? 'Update Profile' : 'Add Food Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}
