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

// ─── Types ───────────────────────────────────────────────

interface Medication {
  name: string
  dosage: string
  frequency: string
}

interface IntakeForm {
  // Step 1
  name: string
  email: string
  phone: string
  dateOfBirth: string
  gender: string
  relationship: string
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
  // Step 4
  insuranceProvider: string
  insurancePolicyNumber: string
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
  name: '', email: '', phone: '', dateOfBirth: '', gender: '', relationship: 'client',
  healthConditions: [], customCondition: '', foodAllergies: [], customAllergy: '',
  medications: [], activityLevel: '',
  currentWeight: '', weightUnit: 'lbs', height: '', heightUnit: 'imperial',
  targetWeight: '', dailyCalorieGoal: '', dailyStepGoal: '',
  insuranceProvider: '', insurancePolicyNumber: '',
  emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelationship: '',
  careGoals: [], dietaryRestrictions: [], practiceNotes: '', consentGiven: false,
}

const STEPS = [
  'Client Information',
  'Medical History',
  'Physical Measurements',
  'Insurance & Emergency',
  'Care Goals & Notes',
  'Review & Confirm',
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

const RELATIONSHIPS = [
  { value: 'client', label: 'Client' },
  { value: 'patient', label: 'Patient' },
  { value: 'child', label: 'Family Member (Child)' },
  { value: 'spouse', label: 'Family Member (Spouse)' },
  { value: 'parent', label: 'Family Member (Parent)' },
  { value: 'sibling', label: 'Family Member (Sibling)' },
  { value: 'grandparent', label: 'Family Member (Grandparent)' },
]

// ─── Main Component ──────────────────────────────────────

export default function ClientIntakePage() {
  const router = useRouter()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<IntakeForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const el = document.querySelector('[data-tenant-id]')
    if (el) setTenantId(el.getAttribute('data-tenant-id'))
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
    if (step === 0) return !!form.name.trim() && !!form.email.trim()
    if (step === 4) return form.consentGiven
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
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        relationship: form.relationship,
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
        insuranceProvider: form.insuranceProvider.trim(),
        insurancePolicyNumber: form.insurancePolicyNumber.trim(),
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
          <span>Step {step + 1} of {STEPS.length}</span>
          <span>{STEPS[step]}</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          {STEPS[step]}
        </h2>

        {/* Step 1: Client Information */}
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Full Name *" value={form.name} onChange={v => update({ name: v })} placeholder="Jane Henderson" />
            <Field label="Email *" value={form.email} onChange={v => update({ email: v })} type="email" placeholder="jane@example.com" />
            <Field label="Phone" value={form.phone} onChange={v => update({ phone: v })} type="tel" placeholder="(555) 123-4567" />
            <Field label="Date of Birth" value={form.dateOfBirth} onChange={v => update({ dateOfBirth: v })} type="date" />
            <Select label="Gender" value={form.gender} onChange={v => update({ gender: v })} options={[
              { value: '', label: 'Select...' },
              { value: 'female', label: 'Female' },
              { value: 'male', label: 'Male' },
              { value: 'other', label: 'Other' },
              { value: 'prefer-not-to-say', label: 'Prefer not to say' },
            ]} />
            <Select label="Relationship to Practice" value={form.relationship} onChange={v => update({ relationship: v })} options={RELATIONSHIPS} />
          </div>
        )}

        {/* Step 2: Medical History */}
        {step === 1 && (
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

        {/* Step 3: Physical Measurements */}
        {step === 2 && (
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

        {/* Step 4: Insurance & Emergency Contact */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Insurance (optional)</h3>
              <div className="space-y-4">
                <Field label="Provider" value={form.insuranceProvider} onChange={v => update({ insuranceProvider: v })} placeholder="Blue Cross Blue Shield" />
                <Field label="Policy Number" value={form.insurancePolicyNumber} onChange={v => update({ insurancePolicyNumber: v })} placeholder="BCB-123456" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Emergency Contact</h3>
              <div className="space-y-4">
                <Field label="Name" value={form.emergencyContactName} onChange={v => update({ emergencyContactName: v })} placeholder="John Henderson" />
                <Field label="Phone" value={form.emergencyContactPhone} onChange={v => update({ emergencyContactPhone: v })} type="tel" placeholder="(555) 987-6543" />
                <Field label="Relationship" value={form.emergencyContactRelationship} onChange={v => update({ emergencyContactRelationship: v })} placeholder="Spouse" />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Care Goals & Notes */}
        {step === 4 && (
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
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.consentGiven}
                onChange={e => update({ consentGiven: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Client has consented to care management by this practice. *
              </span>
            </label>
          </div>
        )}

        {/* Step 6: Review & Confirm */}
        {step === 5 && (
          <div className="space-y-4 text-sm">
            <ReviewSection title="Client" items={[
              ['Name', form.name],
              ['Email', form.email],
              ['Phone', form.phone || '—'],
              ['DOB', form.dateOfBirth || '—'],
              ['Gender', form.gender || '—'],
              ['Relationship', form.relationship],
            ]} />
            <ReviewSection title="Medical" items={[
              ['Conditions', form.healthConditions.length ? form.healthConditions.join(', ') : '—'],
              ['Allergies', form.foodAllergies.length ? form.foodAllergies.join(', ') : '—'],
              ['Medications', form.medications.length ? form.medications.map(m => m.name).join(', ') : '—'],
              ['Activity', form.activityLevel || '—'],
            ]} />
            <ReviewSection title="Measurements" items={[
              ['Weight', form.currentWeight ? `${form.currentWeight} ${form.weightUnit}` : '—'],
              ['Height', form.height ? `${form.height} ${form.heightUnit === 'imperial' ? 'in' : 'cm'}` : '—'],
              ['Target Weight', form.targetWeight ? `${form.targetWeight} ${form.weightUnit}` : '—'],
            ]} />
            <ReviewSection title="Insurance & Emergency" items={[
              ['Insurance', form.insuranceProvider || '—'],
              ['Emergency Contact', form.emergencyContactName ? `${form.emergencyContactName} (${form.emergencyContactRelationship})` : '—'],
            ]} />
            <ReviewSection title="Care Plan" items={[
              ['Goals', form.careGoals.length ? form.careGoals.join(', ') : '—'],
              ['Dietary', form.dietaryRestrictions.length ? form.dietaryRestrictions.join(', ') : '—'],
              ['Notes', form.practiceNotes || '—'],
              ['Consent', form.consentGiven ? 'Given' : 'Not given'],
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
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance()}
              className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !form.consentGiven}
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
