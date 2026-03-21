'use client'

/**
 * Duty Templates Manager
 *
 * Manage reusable duty presets and apply template bundles.
 * Includes preset bundles for common household setups.
 */

import { useState } from 'react'
import {
  DutyTemplate,
  DutyCategory,
  DutyFrequency,
  DutyPriority,
  CreateDutyRequest,
} from '@/types/household-duties'
import {
  DocumentDuplicateIcon,
  PlusIcon,
  TrashIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { DUTY_CATEGORY_LABELS } from './duty-constants'
import toast from 'react-hot-toast'

interface DutyTemplatesManagerProps {
  householdId: string
  onApplyTemplate: (duties: Omit<CreateDutyRequest, 'householdId'>[]) => Promise<void>
}

// Preset bundles for common household setups
const PRESET_BUNDLES: {
  id: string
  name: string
  description: string
  icon: string
  duties: {
    name: string
    category: DutyCategory
    frequency: DutyFrequency
    priority: DutyPriority
    estimatedDuration?: number
    subtasks?: string[]
  }[]
}[] = [
  {
    id: 'new_household',
    name: 'New Household Setup',
    description: 'Essential duties for a new household: cleaning, laundry, and meal prep.',
    icon: '🏠',
    duties: [
      { name: 'Clean Kitchen', category: 'cleaning_kitchen', frequency: 'daily', priority: 'high', estimatedDuration: 45, subtasks: ['Wash dishes', 'Wipe counters', 'Clean stovetop', 'Sweep floor'] },
      { name: 'Clean Bathroom', category: 'cleaning_bathroom', frequency: 'weekly', priority: 'medium', estimatedDuration: 45, subtasks: ['Clean toilet', 'Scrub sink', 'Clean shower', 'Mop floor'] },
      { name: 'Wash Laundry', category: 'laundry', frequency: 'weekly', priority: 'medium', estimatedDuration: 90 },
      { name: 'Grocery Shopping', category: 'grocery_shopping', frequency: 'weekly', priority: 'high', estimatedDuration: 90 },
      { name: 'Prepare Dinner', category: 'meal_preparation', frequency: 'daily', priority: 'high', estimatedDuration: 60 },
      { name: 'Clean Living Areas', category: 'cleaning_living_areas', frequency: 'weekly', priority: 'medium', estimatedDuration: 60 },
    ],
  },
  {
    id: 'pet_care',
    name: 'Pet Care Basics',
    description: 'Daily and weekly pet care duties: feeding, walking, and litter box.',
    icon: '🐾',
    duties: [
      { name: 'Feed Pet (Morning)', category: 'pet_care', frequency: 'daily', priority: 'high', estimatedDuration: 10 },
      { name: 'Feed Pet (Evening)', category: 'pet_care', frequency: 'daily', priority: 'high', estimatedDuration: 10 },
      { name: 'Walk Dog', category: 'pet_care', frequency: 'daily', priority: 'high', estimatedDuration: 30 },
      { name: 'Clean Litter Box', category: 'pet_care', frequency: 'daily', priority: 'medium', estimatedDuration: 10 },
      { name: 'Groom Pet', category: 'pet_care', frequency: 'weekly', priority: 'low', estimatedDuration: 30 },
    ],
  },
  {
    id: 'elderly_care',
    name: 'Elderly Care Package',
    description: 'Duties for caring for elderly family members: personal care, medication, and transportation.',
    icon: '👴',
    duties: [
      { name: 'Bathing Assistance', category: 'personal_care', frequency: 'daily', priority: 'high', estimatedDuration: 30 },
      { name: 'Dressing Assistance', category: 'personal_care', frequency: 'daily', priority: 'high', estimatedDuration: 15 },
      { name: 'Medication Pickup', category: 'medication_pickup', frequency: 'monthly', priority: 'urgent', estimatedDuration: 20 },
      { name: 'Transport to Appointments', category: 'transportation', frequency: 'as_needed', priority: 'high', estimatedDuration: 120 },
      { name: 'Prepare Meals', category: 'meal_preparation', frequency: 'daily', priority: 'high', estimatedDuration: 45 },
      { name: 'Grooming Assistance', category: 'personal_care', frequency: 'daily', priority: 'medium', estimatedDuration: 20 },
    ],
  },
  {
    id: 'newborn_care',
    name: 'Newborn Care',
    description: 'Duties for households with a newborn: feeding, laundry, and personal care.',
    icon: '👶',
    duties: [
      { name: 'Prepare Baby Bottles', category: 'meal_preparation', frequency: 'daily', priority: 'urgent', estimatedDuration: 15 },
      { name: 'Baby Laundry', category: 'laundry', frequency: 'daily', priority: 'high', estimatedDuration: 45 },
      { name: 'Sterilize Bottles/Pacifiers', category: 'cleaning_kitchen', frequency: 'daily', priority: 'high', estimatedDuration: 20 },
      { name: 'Nursery Cleaning', category: 'cleaning_bedroom', frequency: 'daily', priority: 'medium', estimatedDuration: 20 },
      { name: 'Pharmacy - Baby Supplies', category: 'shopping', frequency: 'weekly', priority: 'high', estimatedDuration: 30 },
      { name: 'Pediatrician Transport', category: 'transportation', frequency: 'as_needed', priority: 'urgent', estimatedDuration: 120 },
    ],
  },
]

export function DutyTemplatesManager({
  householdId,
  onApplyTemplate,
}: DutyTemplatesManagerProps) {
  const [applying, setApplying] = useState<string | null>(null)
  const [expandedBundle, setExpandedBundle] = useState<string | null>(null)

  const handleApplyBundle = async (bundleId: string) => {
    const bundle = PRESET_BUNDLES.find(b => b.id === bundleId)
    if (!bundle) return

    setApplying(bundleId)
    try {
      const dutyRequests: Omit<CreateDutyRequest, 'householdId'>[] = bundle.duties.map(d => ({
        category: d.category,
        name: d.name,
        frequency: d.frequency,
        priority: d.priority,
        estimatedDuration: d.estimatedDuration,
        subtasks: d.subtasks,
        assignedTo: [],
        notifyOnCompletion: true,
        notifyOnOverdue: true,
        reminderEnabled: true,
      }))

      await onApplyTemplate(dutyRequests)
      toast.success(`Applied "${bundle.name}" — ${bundle.duties.length} duties created`)
    } catch (err) {
      toast.error('Failed to apply template')
    } finally {
      setApplying(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SparklesIcon className="w-6 h-6 text-primary" />
        <div>
          <h3 className="font-semibold text-foreground">Duty Template Bundles</h3>
          <p className="text-sm text-muted-foreground">
            Quick-start your household with pre-built duty sets. All duties can be customized after creation.
          </p>
        </div>
      </div>

      {/* Preset Bundles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PRESET_BUNDLES.map(bundle => {
          const isExpanded = expandedBundle === bundle.id
          const isApplying = applying === bundle.id

          return (
            <div
              key={bundle.id}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{bundle.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{bundle.name}</h4>
                    <p className="text-sm text-muted-foreground mt-0.5">{bundle.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {bundle.duties.length} duties
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setExpandedBundle(isExpanded ? null : bundle.id)}
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    {isExpanded ? 'Hide Details' : 'View Duties'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyBundle(bundle.id)}
                    disabled={isApplying}
                    className="flex-1 px-3 py-2 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {isApplying ? (
                      <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-foreground" />
                    ) : (
                      <>
                        <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                        Apply Bundle
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded duty list */}
              {isExpanded && (
                <div className="border-t border-border p-3 bg-accent/30">
                  <div className="space-y-1.5">
                    {bundle.duties.map((duty, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span className="text-foreground font-medium">{duty.name}</span>
                        <span className="text-muted-foreground">
                          · {DUTY_CATEGORY_LABELS[duty.category]} · {duty.frequency}
                        </span>
                        {duty.estimatedDuration && (
                          <span className="text-muted-foreground">· {duty.estimatedDuration}m</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
