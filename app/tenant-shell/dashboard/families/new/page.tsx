'use client'

/**
 * Client Intake Wizard
 *
 * Professional multi-step intake form for franchise owners/staff to
 * onboard a new client. 6 steps:
 *   1. Client Information (name, email, phone, DOB, gender, relationship)
 *   2. Medical History (conditions, allergies, medications, activity level)
 *   3. Physical Measurements (weight, height, goals)
 *   4. Insurance & Emergency Contact
 *   5. Care Goals & Notes
 *   6. Review & Confirm
 *
 * On submit: POST /api/tenant/{tenantId}/clients → creates auth user +
 * user doc + patient profile + attaches to franchise + consumes a seat.
 *
 * No "Myself" option — the franchise owner is always adding a client.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { getCSRFToken } from '@/lib/csrf'
import { logger } from '@/lib/logger'
import { PhoneInput } from '@/components/form/PhoneInput'

// ─── Types ───────────────────────────────────────────────

interface Medication {
  name: string
  dosage: string
  frequency: string
}

interface IntakeForm {
  // Step 1
  firstName: string
  lastName: string
  email: string
  phone: string
  // Step 1 — checkbox: also create as a family member/patient
  addAsFamilyMember: boolean
  dateOfBirth: string
  gender: string
  // Step 2
  healthConditions: string[]
  customCondition: string
  foodAllergies: string[]
  customAllergy: string
  medications: Medication[]
  activityLevel: string
  // Step 3
  currentWeight: string
  weightUnit: string
  height: string
  heightUnit: string
  targetWeight: string
  dailyCalorieGoal: string
  dailyStepGoal: string
  // Emergency contact
  emergencyContactName: string
  emergencyContactPhone: string
  emergencyContactRelationship: string
  // Step 5
  careGoals: string[]
  dietaryRestrictions: string[]
  practiceNotes: string
  consentGiven: boolean
}

const EMPTY_FORM: IntakeForm = {
  firstName: '', lastName: '', email: '', phone: '',
  addAsFamilyMember: false, dateOfBirth: '', gender: '',
  healthConditions: [], customCondition: '', foodAllergies: [], customAllergy: '',
  medications: [], activityLevel: '',
  currentWeight: '', weightUnit: 'lbs', height: '', heightUnit: 'imperial',
  targetWeight: '', dailyCalorieGoal: '', dailyStepGoal: '',
  emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelationship: '',
  careGoals: [], dietaryRestrictions: [], practiceNotes: '', consentGiven: false,
}

// Steps are dynamic — medical history and measurements only show when
// "Also add as family member" is checked. Step IDs are stable so the
// form state doesn't reset when steps are added/removed.
type StepId = 'client' | 'medical' | 'measurements' | 'nutrition' | 'emergency' | 'goals' | 'review'

interface StepDef {
  id: StepId
  label: string
  requiresFamilyMember?: boolean
  // If set, only show for these practice types. Omitted = show for all.
  // Unknown/Other practice types see all steps (generic fallback).
  practiceTypes?: string[]
}

const KNOWN_TYPES = [
  'Solo Nurse / Caregiver',
  'Wellness Coach',
  'Concierge Doctor',
  'Home Care Agency',
  'Patient Advocate',
]

const ALL_STEPS: StepDef[] = [
  { id: 'client', label: 'Client Information' },
  { id: 'medical', label: 'Medical History', requiresFamilyMember: true,
    practiceTypes: ['Solo Nurse / Caregiver', 'Concierge Doctor', 'Home Care Agency'] },
  { id: 'measurements', label: 'Physical Measurements', requiresFamilyMember: true,
    practiceTypes: ['Solo Nurse / Caregiver', 'Concierge Doctor', 'Home Care Agency'] },
  { id: 'nutrition', label: 'Nutrition & Lifestyle', requiresFamilyMember: true,
    practiceTypes: ['Wellness Coach'] },
  { id: 'emergency', label: 'Emergency Contact',
    practiceTypes: ['Solo Nurse / Caregiver', 'Concierge Doctor', 'Home Care Agency', 'Patient Advocate'] },
  { id: 'goals', label: 'Care Goals & Notes' },
  { id: 'review', label: 'Review & Confirm' },
]

const CONDITIONS = [
  'Diabetes (Type 1)', 'Diabetes (Type 2)', 'Hypertension', 'Heart Disease',
  'Asthma', 'COPD', 'Arthritis', 'Depression', 'Anxiety', 'Obesity',
  'High Cholesterol', 'Thyroid Disorder', 'Chronic Pain', 'Sleep Apnea',
  'Celiac Disease', 'IBS', 'GERD', 'Osteoporosis',
]

const ALLERGIES = [
  'Peanuts', 'Tree Nuts', 'Shellfish', 'Fish', 'Milk/Dairy', 'Eggs',
  'Wheat/Gluten', 'Soy', 'Sesame', 'Corn', 'Latex',
]

const CARE_GOALS = [
  'Weight Loss', 'Weight Gain', 'Nutrition Management', 'Medical Tracking',
  'Fitness & Exercise', 'Chronic Disease Management', 'Mental Health',
  'Medication Management', 'Post-Surgery Recovery', 'Prenatal Care',
  'Senior Care', 'Pediatric Care',
]

const DIETARY_RESTRICTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Keto', 'Paleo', 'Low-Sodium',
  'Low-Sugar', 'Halal', 'Kosher', 'Dairy-Free', 'Nut-Free', 'FODMAP',
]

// ─── Main Component ──────────────────────────────────────

export default function ClientIntakePage() {
  const router = useRouter()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [practiceType, setPracticeType] = useState('')
  const [authorized, setAuthorized] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState<IntakeForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const el = document.querySelector('[data-tenant-id]')
    if (el) {
      setTenantId(el.getAttribute('data-tenant-id'))
      setPracticeType(el.getAttribute('data-practice-type') || '')
    }
  }, [])

  useEffect(() => {
    if (!auth) return
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) { router.replace('/login?next=/dashboard/families/new'); return }
      const t = await user.getIdTokenResult()
      const c = t.claims as any
      if (c.role === 'admin' || c.tenantRole === 'franchise_admin' || c.tenantRole === 'franchise_staff') {
        setAuthorized(true)
      } else {
        router.replace('/login?next=/dashboard/families/new')
      }
    })
    return () => unsub()
  }, [router])

  // Compute active steps based on checkbox + practice type
  const isKnownType = KNOWN_TYPES.includes(practiceType)
  const activeSteps = ALL_STEPS.filter(s => {
    if (s.requiresFamilyMember && !form.addAsFamilyMember) return false
    if (s.practiceTypes) {
      // Known type: must match. Unknown/Other: show all (generic fallback).
      if (isKnownType && !s.practiceTypes.includes(practiceType)) return false
    }
    return true
  })
  const currentStep = activeSteps[stepIndex] || activeSteps[0]
  const totalSteps = activeSteps.length

  const update = (fields: Partial<IntakeForm>) => setForm(prev => ({ ...prev, ...fields }))

  const toggleArray = (field: keyof IntakeForm, value: string) => {
    const arr = form[field] as string[]
    update({ [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] })
  }

  const addMedication = () => {
    update({ medications: [...form.medications, { name: '', dosage: '', frequency: '' }] })
  }

  const updateMedication = (index: number, fields: Partial<Medication>) => {
    const meds = [...form.medications]
    meds[index] = { ...meds[index], ...fields }
    update({ medications: meds })
  }

  const removeMedication = (index: number) => {
    update({ medications: form.medications.filter((_, i) => i !== index) })
  }

  const canAdvance = (): boolean => {
    if (currentStep.id === 'client') return !!form.firstName.trim() && !!form.lastName.trim() && !!form.email.trim()
    return true
  }

  const handleSubmit = async () => {
    if (!auth?.currentUser || !tenantId) return
    setSubmitting(true)
    setError(null)
    try {
      const token = await auth.currentUser.getIdToken()
      const csrfToken = getCSRFToken()
      const payload = {
        name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        addAsFamilyMember: form.addAsFamilyMember,
        dateOfBirth: form.addAsFamilyMember ? form.dateOfBirth : undefined,
        gender: form.addAsFamilyMember ? form.gender : undefined,
        healthConditions: [...form.healthConditions, ...(form.customCondition ? [form.customCondition.trim()] : [])],
        foodAllergies: [...form.foodAllergies, ...(form.customAllergy ? [form.customAllergy.trim()] : [])],
        medications: form.medications.filter(m => m.name.trim()),
        activityLevel: form.activityLevel,
        currentWeight: form.currentWeight ? parseFloat(form.currentWeight) : undefined,
        weightUnit: form.weightUnit,
        height: form.height ? parseFloat(form.height) : undefined,
        heightUnit: form.heightUnit,
        targetWeight: form.targetWeight ? parseFloat(form.targetWeight) : undefined,
        dailyCalorieGoal: form.dailyCalorieGoal ? parseInt(form.dailyCalorieGoal) : undefined,
        dailyStepGoal: form.dailyStepGoal ? parseInt(form.dailyStepGoal) : undefined,
        emergencyContactName: form.emergencyContactName.trim(),
        emergencyContactPhone: form.emergencyContactPhone.trim(),
        emergencyContactRelationship: form.emergencyContactRelationship.trim(),
        careGoals: form.careGoals,
        dietaryRestrictions: form.dietaryRestrictions,
        practiceNotes: form.practiceNotes.trim(),
        consentGiven: form.consentGiven,
      }
      const res = await fetch(`/api/tenant/${tenantId}/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Intake failed (${res.status})`)
      router.replace('/dashboard')
    } catch (err) {
      logger.error('[ClientIntake] submit failed', err as Error)
      setError(err instanceof Error ? err.message : 'Intake failed.')
      setSubmitting(false)
    }
  }

  if (!authorized || !tenantId) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Loading&hellip;</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/families" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          &larr; Back to Families
        </Link>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span>Step {stepIndex + 1} of {totalSteps}</span>
          <span>{currentStep.label}</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          {currentStep.label}
        </h2>

        {/* Step: Client Information */}
        {currentStep.id === 'client' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name *" value={form.firstName} onChange={v => update({ firstName: v })} placeholder="Jane" />
              <Field label="Last Name *" value={form.lastName} onChange={v => update({ lastName: v })} placeholder="Henderson" />
            </div>
            <Field label="Email *" value={form.email} onChange={v => update({ email: v })} type="email" placeholder="jane@example.com" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <PhoneInput value={form.phone} onChange={v => update({ phone: v })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
            </div>

            <label className="flex items-start gap-3 cursor-pointer mt-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
              <input
                type="checkbox"
                checked={form.addAsFamilyMember}
                onChange={e => update({ addAsFamilyMember: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Also add this person as a family member
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Check this if the client themselves will be tracked as a patient
                  (vitals, meals, medications). Leave unchecked if they&rsquo;re just the
                  account contact and you&rsquo;ll add family members separately.
                </p>
              </div>
            </label>

            {form.addAsFamilyMember && (
              <div className="space-y-4 pl-4 border-l-2 border-blue-200 dark:border-blue-800 mt-2">
                <Field label="Date of Birth" value={form.dateOfBirth} onChange={v => update({ dateOfBirth: v })} type="date" />
                <Select label="Gender" value={form.gender} onChange={v => update({ gender: v })} options={[
                  { value: '', label: 'Select...' },
                  { value: 'female', label: 'Female' },
                  { value: 'male', label: 'Male' },
                  { value: 'other', label: 'Other' },
                  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
                ]} />
              </div>
            )}
          </div>
        )}

        {/* Step: Medical History (only if family member) */}
        {currentStep.id === 'medical' && (
          <div className="space-y-6">
            <ChipGroup label="Known Health Conditions" options={CONDITIONS} selected={form.healthConditions} onToggle={v => toggleArray('healthConditions', v)} />
            <Field label="Other Condition" value={form.customCondition} onChange={v => update({ customCondition: v })} placeholder="Add a condition not listed above" />
            <ChipGroup label="Food Allergies" options={ALLERGIES} selected={form.foodAllergies} onToggle={v => toggleArray('foodAllergies', v)} />
            <Field label="Other Allergy" value={form.customAllergy} onChange={v => update({ customAllergy: v })} placeholder="Add an allergy not listed above" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Medications</label>
                <button type="button" onClick={addMedication} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">+ Add Medication</button>
              </div>
              {form.medications.map((med, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input value={med.name} onChange={e => updateMedication(i, { name: e.target.value })} placeholder="Name" className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
                  <input value={med.dosage} onChange={e => updateMedication(i, { dosage: e.target.value })} placeholder="Dosage" className="w-24 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
                  <input value={med.frequency} onChange={e => updateMedication(i, { frequency: e.target.value })} placeholder="Frequency" className="w-28 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
                  <button type="button" onClick={() => removeMedication(i)} className="text-red-500 hover:text-red-700 text-sm px-2">✕</button>
                </div>
              ))}
            </div>
            <Select label="Activity Level" value={form.activityLevel} onChange={v => update({ activityLevel: v })} options={[
              { value: '', label: 'Select...' },
              { value: 'sedentary', label: 'Sedentary' },
              { value: 'light', label: 'Light' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'active', label: 'Active' },
              { value: 'very-active', label: 'Very Active' },
            ]} />
          </div>
        )}

        {/* Step: Physical Measurements (only if family member) */}
        {currentStep.id === 'measurements' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Current Weight" value={form.currentWeight} onChange={v => update({ currentWeight: v })} type="number" placeholder="185" />
              <Select label="Unit" value={form.weightUnit} onChange={v => update({ weightUnit: v })} options={[{ value: 'lbs', label: 'lbs' }, { value: 'kg', label: 'kg' }]} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Height (inches or cm)" value={form.height} onChange={v => update({ height: v })} type="number" placeholder="68" />
              <Select label="Unit" value={form.heightUnit} onChange={v => update({ heightUnit: v })} options={[{ value: 'imperial', label: 'Inches' }, { value: 'metric', label: 'cm' }]} />
            </div>
            <Field label="Target Weight (optional)" value={form.targetWeight} onChange={v => update({ targetWeight: v })} type="number" placeholder="165" />
            <Field label="Daily Calorie Goal (optional)" value={form.dailyCalorieGoal} onChange={v => update({ dailyCalorieGoal: v })} type="number" placeholder="2000" />
            <Field label="Daily Step Goal (optional)" value={form.dailyStepGoal} onChange={v => update({ dailyStepGoal: v })} type="number" placeholder="10000" />
          </div>
        )}

        {/* Step: Nutrition & Lifestyle (Wellness Coach) */}
        {currentStep.id === 'nutrition' && (
          <div className="space-y-6">
            <Select label="Activity Level" value={form.activityLevel} onChange={v => update({ activityLevel: v })} options={[
              { value: '', label: 'Select...' },
              { value: 'sedentary', label: 'Sedentary' },
              { value: 'light', label: 'Light' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'active', label: 'Active' },
              { value: 'very-active', label: 'Very Active' },
            ]} />
            <ChipGroup label="Dietary Restrictions" options={DIETARY_RESTRICTIONS} selected={form.dietaryRestrictions} onToggle={v => toggleArray('dietaryRestrictions', v)} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Current Weight" value={form.currentWeight} onChange={v => update({ currentWeight: v })} type="number" placeholder="185" />
              <Select label="Unit" value={form.weightUnit} onChange={v => update({ weightUnit: v })} options={[{ value: 'lbs', label: 'lbs' }, { value: 'kg', label: 'kg' }]} />
            </div>
            <Field label="Target Weight (optional)" value={form.targetWeight} onChange={v => update({ targetWeight: v })} type="number" placeholder="165" />
            <Field label="Daily Calorie Goal (optional)" value={form.dailyCalorieGoal} onChange={v => update({ dailyCalorieGoal: v })} type="number" placeholder="2000" />
            <Field label="Daily Step Goal (optional)" value={form.dailyStepGoal} onChange={v => update({ dailyStepGoal: v })} type="number" placeholder="10000" />
          </div>
        )}

        {/* Step: Emergency Contact */}
        {currentStep.id === 'emergency' && (
          <div className="space-y-4">
            <Field label="Name" value={form.emergencyContactName} onChange={v => update({ emergencyContactName: v })} placeholder="John Henderson" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <PhoneInput value={form.emergencyContactPhone} onChange={v => update({ emergencyContactPhone: v })} placeholder="(555) 987-6543"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
            </div>
            <Field label="Relationship" value={form.emergencyContactRelationship} onChange={v => update({ emergencyContactRelationship: v })} placeholder="Spouse" />
          </div>
        )}

        {/* Step: Care Goals & Notes */}
        {currentStep.id === 'goals' && (
          <div className="space-y-6">
            <ChipGroup label="Primary Care Goals" options={CARE_GOALS} selected={form.careGoals} onToggle={v => toggleArray('careGoals', v)} />
            <ChipGroup label="Dietary Restrictions" options={DIETARY_RESTRICTIONS} selected={form.dietaryRestrictions} onToggle={v => toggleArray('dietaryRestrictions', v)} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Practice Notes (internal)</label>
              <textarea
                value={form.practiceNotes}
                onChange={e => update({ practiceNotes: e.target.value })}
                rows={4}
                maxLength={5000}
                placeholder="Any notes about this client for your team..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                The client will be asked to consent when they first sign in to
                their Wellness Projection Lab account.
              </p>
            </div>
          </div>
        )}

        {/* Step: Review & Confirm */}
        {currentStep.id === 'review' && (
          <div className="space-y-4 text-sm">
            <ReviewSection title="Client" items={[
              ['Name', `${form.firstName} ${form.lastName}`.trim()],
              ['Email', form.email],
              ['Phone', form.phone || '—'],
              ['Also a family member', form.addAsFamilyMember ? 'Yes' : 'No'],
              ...(form.addAsFamilyMember ? [
                ['Date of Birth', form.dateOfBirth || '—'] as [string, string],
                ['Gender', form.gender || '—'] as [string, string],
              ] : []),
            ]} />
            {activeSteps.some(s => s.id === 'medical') && (
              <ReviewSection title="Medical History" items={[
                ['Conditions', form.healthConditions.length ? form.healthConditions.join(', ') : '—'],
                ['Allergies', form.foodAllergies.length ? form.foodAllergies.join(', ') : '—'],
                ['Medications', form.medications.length ? form.medications.map(m => m.name).join(', ') : '—'],
                ['Activity', form.activityLevel || '—'],
              ]} />
            )}
            {activeSteps.some(s => s.id === 'measurements') && (
              <ReviewSection title="Measurements" items={[
                ['Weight', form.currentWeight ? `${form.currentWeight} ${form.weightUnit}` : '—'],
                ['Height', form.height ? `${form.height} ${form.heightUnit === 'imperial' ? 'in' : 'cm'}` : '—'],
                ['Target Weight', form.targetWeight ? `${form.targetWeight} ${form.weightUnit}` : '—'],
              ]} />
            )}
            {activeSteps.some(s => s.id === 'nutrition') && (
              <ReviewSection title="Nutrition & Lifestyle" items={[
                ['Activity', form.activityLevel || '—'],
                ['Dietary Restrictions', form.dietaryRestrictions.length ? form.dietaryRestrictions.join(', ') : '—'],
                ['Weight', form.currentWeight ? `${form.currentWeight} ${form.weightUnit}` : '—'],
                ['Target Weight', form.targetWeight ? `${form.targetWeight} ${form.weightUnit}` : '—'],
                ['Calorie Goal', form.dailyCalorieGoal || '—'],
                ['Step Goal', form.dailyStepGoal || '—'],
              ]} />
            )}
            {activeSteps.some(s => s.id === 'emergency') && (
              <ReviewSection title="Emergency Contact" items={[
                ['Name', form.emergencyContactName || '—'],
                ['Phone', form.emergencyContactPhone || '—'],
                ['Relationship', form.emergencyContactRelationship || '—'],
              ]} />
            )}
            <ReviewSection title="Care Plan" items={[
              ['Goals', form.careGoals.length ? form.careGoals.join(', ') : '—'],
              ['Dietary', form.dietaryRestrictions.length ? form.dietaryRestrictions.join(', ') : '—'],
              ['Notes', form.practiceNotes || '—'],
            ]} />
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setStepIndex(s => Math.max(0, s - 1))}
            disabled={stepIndex === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>
          {stepIndex < totalSteps - 1 ? (
            <button
              type="button"
              onClick={() => setStepIndex(s => s + 1)}
              disabled={!canAdvance()}
              className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
            >
              {submitting ? 'Adding Client...' : 'Add Client'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Form helpers (inline, same file) ────────────────────

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
    </div>
  )
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function ChipGroup({ label, options, selected, onToggle }: {
  label: string; options: string[]; selected: string[]; onToggle: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => onToggle(opt)}
            className={`px-3 py-1.5 text-sm rounded-full transition ${
              selected.includes(opt)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function ReviewSection({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      <dl className="space-y-1">
        {items.map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className="text-gray-900 dark:text-gray-100 text-right max-w-[60%] truncate">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
