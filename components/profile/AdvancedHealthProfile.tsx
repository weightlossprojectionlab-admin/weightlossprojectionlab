/**
 * Advanced Health Profile Component
 *
 * Provides detailed health and dietary information collection beyond basic onboarding.
 * Used in profile settings to give AI more context for personalized recommendations.
 *
 * Features:
 * - Reuses existing health condition questionnaires (DRY)
 * - HIPAA/PHI compliant data storage
 * - Collapsible sections for better UX
 * - Medication scanner integration
 * - Lifestyle factors (smoking, alcohol, drugs)
 * - Body measurements tracking
 * - Detailed condition-specific questionnaires
 */

'use client'

import { useState, useEffect } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import MedicationList from '@/components/health/MedicationList'
import HealthConditionModal from '@/components/onboarding/HealthConditionModal'
import { healthConditionQuestionnaires } from '@/lib/health-condition-questions'
import type { HealthConditionQuestionnaire } from '@/lib/health-condition-questions'
import { useMedications } from '@/hooks/useMedications'
import toast from 'react-hot-toast'

interface AdvancedHealthProfileProps {
  // Patient or User profile data
  profileData: any
  onSave: (updates: any) => Promise<void>
  isPatientProfile?: boolean // true if managing a family member's profile
  patientId?: string
}

interface CollapsibleSectionProps {
  title: string
  description: string
  icon: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  badge?: string | number
}

function CollapsibleSection({
  title,
  description,
  icon,
  isOpen,
  onToggle,
  children,
  badge
}: CollapsibleSectionProps) {
  return (
    <div className="bg-card rounded-lg border-2 border-border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          <span className="text-2xl" aria-hidden="true">
            {icon}
          </span>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {badge && (
            <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
              {badge}
            </span>
          )}
          {isOpen ? (
            <ChevronUpIcon className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="px-6 py-4 border-t border-border">
          {children}
        </div>
      )}
    </div>
  )
}

export function AdvancedHealthProfile({
  profileData,
  onSave,
  isPatientProfile = false,
  patientId
}: AdvancedHealthProfileProps) {
  // Section open/close state (dietary section starts OPEN for safety)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    summary: false, // Profile summary overview
    dietary: true, // Always start open - critical safety information
    medications: false,
    lifestyle: false,
    bodyMeasurements: false,
    conditionDetails: false // Health condition questionnaires
  })

  // Form state
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(
    profileData?.preferences?.dietaryPreferences || profileData?.dietaryPreferences || []
  )
  const [foodAllergies, setFoodAllergies] = useState<string[]>(
    profileData?.profile?.foodAllergies || profileData?.foodAllergies || []
  )
  const [healthConditions, setHealthConditions] = useState<string[]>(
    profileData?.profile?.healthConditions || profileData?.healthConditions || []
  )

  // Use real-time medications hook (DRY)
  const { medications, loading: loadingMedications } = useMedications({
    patientId: patientId || '',
    autoFetch: !!patientId // Only fetch if patientId exists
  })

  const [lifestyle, setLifestyle] = useState(
    profileData?.lifestyle || {
      smoking: 'never',
      alcoholFrequency: 'never',
      weeklyDrinks: 0,
      recreationalDrugs: 'no'
    }
  )
  const [bodyMeasurements, setBodyMeasurements] = useState(profileData?.bodyMeasurements || {})
  const [conditionDetails, setConditionDetails] = useState<Record<string, Record<string, any>>>(
    profileData?.conditionDetails || {}
  )
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Sync state when profileData changes
  useEffect(() => {
    setDietaryPreferences(
      profileData?.preferences?.dietaryPreferences || profileData?.dietaryPreferences || []
    )
    setFoodAllergies(
      profileData?.profile?.foodAllergies || profileData?.foodAllergies || []
    )
    setHealthConditions(
      profileData?.profile?.healthConditions || profileData?.healthConditions || []
    )
    setLifestyle(
      profileData?.lifestyle || {
        smoking: 'never',
        alcoholFrequency: 'never',
        weeklyDrinks: 0,
        recreationalDrugs: 'no'
      }
    )
    setBodyMeasurements(profileData?.bodyMeasurements || {})
    setConditionDetails(profileData?.conditionDetails || {})
  }, [profileData])

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({
        dietaryPreferences,
        foodAllergies,
        healthConditions,
        lifestyle,
        bodyMeasurements,
        conditionDetails
      })
    } finally {
      setSaving(false)
    }
  }

  // Get available questionnaires for selected health conditions
  const availableQuestionnaires = healthConditions
    .map(condition => {
      const key = condition.toLowerCase().replace(/\s+/g, '-')
      return healthConditionQuestionnaires.find(q => q.conditionKey === key)
    })
    .filter(Boolean) as HealthConditionQuestionnaire[]

  // Count profile items for summary
  const profileItemCounts = {
    dietary: dietaryPreferences.length,
    allergies: foodAllergies.length,
    conditions: healthConditions.length,
    medications: medications.length,
    lifestyle: (lifestyle.smoking !== 'never' ? 1 : 0) + (lifestyle.alcoholFrequency !== 'never' ? 1 : 0) + (lifestyle.recreationalDrugs !== 'no' ? 1 : 0),
    measurements: Object.keys(bodyMeasurements).filter(k => bodyMeasurements[k]).length
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-6 border-2 border-primary/20">
        <div className="flex items-start gap-3">
          <span className="text-3xl">🏥</span>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground mb-2">
              Advanced Health Profile
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              Provide detailed health information to get more accurate AI recommendations, meal
              suggestions, and health insights. All data is encrypted and HIPAA/PHI compliant.
            </p>
            <div className="flex items-center gap-2 text-xs text-primary">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>HIPAA Compliant • Encrypted • Private</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Summary */}
      <CollapsibleSection
        title="Profile Summary"
        description="Quick overview of your health profile"
        icon="📊"
        isOpen={openSections.summary}
        onToggle={() => toggleSection('summary')}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-muted rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">{profileItemCounts.dietary}</div>
            <div className="text-sm text-muted-foreground">Dietary Preferences</div>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <div className="text-2xl font-bold text-error">{profileItemCounts.allergies}</div>
            <div className="text-sm text-muted-foreground">Food Allergies</div>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <div className="text-2xl font-bold text-warning">{profileItemCounts.conditions}</div>
            <div className="text-sm text-muted-foreground">Health Conditions</div>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{profileItemCounts.medications}</div>
            <div className="text-sm text-muted-foreground">Medications</div>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <div className="text-2xl font-bold text-foreground">{profileItemCounts.lifestyle}</div>
            <div className="text-sm text-muted-foreground">Lifestyle Factors</div>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <div className="text-2xl font-bold text-success">{profileItemCounts.measurements}</div>
            <div className="text-sm text-muted-foreground">Body Measurements</div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Dietary & Allergy Information */}
      <CollapsibleSection
        title="⚠️ Dietary & Allergy Information"
        description="Critical safety information for AI meal recommendations"
        icon="🥗"
        isOpen={openSections.dietary}
        onToggle={() => toggleSection('dietary')}
      >
        <div className="space-y-6">
          <div className="bg-error-light/20 border-2 border-error rounded-lg p-4">
            <p className="text-sm text-error-dark">
              <strong>Important:</strong> Please confirm your dietary restrictions, allergies, and
              health conditions. Even if you have none, please select &quot;None&quot; to confirm.
            </p>
          </div>

          {/* Dietary Preferences */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Dietary Preferences
              <span className="text-xs text-muted-foreground ml-2">
                (Select all that apply, or &quot;None&quot;)
              </span>
            </label>

            {/* Smart Recommendations */}
            {healthConditions.includes('High Blood Pressure') && !dietaryPreferences.includes('Low-Sodium') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>💡 Recommendation:</strong> Consider adding &quot;Low-Sodium&quot; to your dietary preferences.
                  A low-sodium diet can help manage high blood pressure.
                </p>
                <button
                  onClick={() => setDietaryPreferences([...dietaryPreferences, 'Low-Sodium'])}
                  className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Low-Sodium
                </button>
              </div>
            )}

            {healthConditions.includes('Celiac') && !dietaryPreferences.includes('Gluten-Free') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>💡 Recommendation:</strong> Consider adding &quot;Gluten-Free&quot; to your dietary preferences.
                  People with Celiac disease must avoid gluten.
                </p>
                <button
                  onClick={() => setDietaryPreferences([...dietaryPreferences, 'Gluten-Free'])}
                  className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Gluten-Free
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDietaryPreferences([])}
                className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                  dietaryPreferences.length === 0
                    ? 'border-success bg-success-light/20 font-bold'
                    : 'border-border hover:border-success/50'
                }`}
              >
                ✓ None
              </button>
              {['Vegan', 'Vegetarian', 'Pescatarian', 'Keto', 'Paleo', 'Halal', 'Kosher', 'Gluten-Free', 'Dairy-Free', 'Low-Carb', 'Low-Sodium'].map(
                pref => (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => {
                      if (dietaryPreferences.includes(pref)) {
                        setDietaryPreferences(dietaryPreferences.filter(p => p !== pref))
                      } else {
                        setDietaryPreferences([...dietaryPreferences, pref])
                      }
                    }}
                    className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                      dietaryPreferences.includes(pref)
                        ? 'border-primary bg-primary/10 font-medium'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {pref}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Food Allergies */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Food Allergies
              <span className="text-xs text-muted-foreground ml-2">
                (Select all that apply, or &quot;None&quot;)
              </span>
            </label>
            <p className="text-xs text-error mb-3">
              ⚠️ Critical for meal safety - AI will never recommend foods with these allergens.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFoodAllergies([])}
                className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                  foodAllergies.length === 0
                    ? 'border-success bg-success-light/20 font-bold'
                    : 'border-border hover:border-success/50'
                }`}
              >
                ✓ None
              </button>
              {['Peanuts', 'Tree Nuts', 'Dairy', 'Eggs', 'Shellfish', 'Soy', 'Wheat/Gluten', 'Fish', 'Sesame', 'Corn'].map(
                allergy => (
                  <button
                    key={allergy}
                    type="button"
                    onClick={() => {
                      if (foodAllergies.includes(allergy)) {
                        setFoodAllergies(foodAllergies.filter(a => a !== allergy))
                      } else {
                        setFoodAllergies([...foodAllergies, allergy])
                      }
                    }}
                    className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                      foodAllergies.includes(allergy)
                        ? 'border-error bg-error-light/20 font-bold'
                        : 'border-border hover:border-error/50'
                    }`}
                  >
                    {allergy}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Health Conditions */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Health Conditions
              <span className="text-xs text-muted-foreground ml-2">
                (Select all that apply, or &quot;None&quot;)
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setHealthConditions([])}
                className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                  healthConditions.length === 0
                    ? 'border-success bg-success-light/20 font-bold'
                    : 'border-border hover:border-success/50'
                }`}
              >
                ✓ None
              </button>
              {['Type 2 Diabetes', 'Type 1 Diabetes', 'Heart Disease', 'High Blood Pressure', 'High Cholesterol', 'Kidney Disease', 'Celiac', 'GERD'].map(
                condition => (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => {
                      if (healthConditions.includes(condition)) {
                        setHealthConditions(healthConditions.filter(c => c !== condition))
                      } else {
                        setHealthConditions([...healthConditions, condition])
                      }
                    }}
                    className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                      healthConditions.includes(condition)
                        ? 'border-warning bg-warning-light/20 font-medium'
                        : 'border-border hover:border-warning/50'
                    }`}
                  >
                    {condition}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : '💾 Save Dietary Information'}
          </button>
        </div>
      </CollapsibleSection>

      {/* Medications Section */}
      {patientId && (
        <CollapsibleSection
          title="Medications"
          description="Manage current medications and prescriptions"
          icon="💊"
          isOpen={openSections.medications}
          onToggle={() => toggleSection('medications')}
          badge={loadingMedications ? 'Loading...' : medications.length || undefined}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Track medications to get drug interaction warnings and ensure meal recommendations
              don&apos;t conflict with your prescriptions.
            </p>
            {loadingMedications ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading medications...</p>
              </div>
            ) : (
              <MedicationList
                medications={medications}
                onChange={async () => {
                  // No need to manually update - real-time listener will handle it
                  toast.success('Medications updated')
                }}
                label="Current Medications"
                description="Scan prescription bottles or add medications manually"
              />
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Lifestyle Factors */}
      <CollapsibleSection
        title="Lifestyle Factors"
        description="Smoking, alcohol, and other lifestyle habits"
        icon="🚬"
        isOpen={openSections.lifestyle}
        onToggle={() => toggleSection('lifestyle')}
      >
        <div className="space-y-6">
          {/* Smoking */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Smoking Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'never', label: 'Never Smoked' },
                { value: 'quit-old', label: 'Quit (6+ months)' },
                { value: 'quit-recent', label: 'Recently Quit' },
                { value: 'current-light', label: 'Current (Light)' },
                { value: 'current-heavy', label: 'Current (Heavy)' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLifestyle({ ...lifestyle, smoking: option.value })}
                  className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                    lifestyle.smoking === option.value
                      ? 'border-primary bg-primary/10 font-medium'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Alcohol */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Alcohol Consumption
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Frequency</label>
                <select
                  value={lifestyle.alcoholFrequency}
                  onChange={e => setLifestyle({ ...lifestyle, alcoholFrequency: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none"
                >
                  <option value="never">Never</option>
                  <option value="light">Light (1-2 times/week)</option>
                  <option value="moderate">Moderate (3-4 times/week)</option>
                  <option value="heavy">Heavy (5+ times/week)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Drinks per Week</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={lifestyle.weeklyDrinks}
                  onChange={e => setLifestyle({ ...lifestyle, weeklyDrinks: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Recreational Drugs */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Recreational Drug Use
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'no', label: 'No' },
                { value: 'cannabis-occasional', label: 'Cannabis (Occasional)' },
                { value: 'cannabis-regular', label: 'Cannabis (Regular)' },
                { value: 'other', label: 'Other (Consult Healthcare)' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLifestyle({ ...lifestyle, recreationalDrugs: option.value })}
                  className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                    lifestyle.recreationalDrugs === option.value
                      ? 'border-primary bg-primary/10 font-medium'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This information helps AI provide safer recommendations and avoid drug interactions.
            </p>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : '💾 Save Lifestyle Information'}
          </button>
        </div>
      </CollapsibleSection>

      {/* Body Measurements */}
      <CollapsibleSection
        title="Body Measurements"
        description="Track measurements for progress and body composition"
        icon="📏"
        isOpen={openSections.bodyMeasurements}
        onToggle={() => toggleSection('bodyMeasurements')}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Optional measurements help track progress beyond just weight. Measurements are in inches.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { key: 'waist', label: 'Waist', placeholder: '32' },
              { key: 'hips', label: 'Hips', placeholder: '38' },
              { key: 'chest', label: 'Chest', placeholder: '40' },
              { key: 'arms', label: 'Arms', placeholder: '14' },
              { key: 'thighs', label: 'Thighs', placeholder: '22' },
              { key: 'neck', label: 'Neck', placeholder: '15' }
            ].map(field => (
              <div key={field.key}>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  {field.label}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={bodyMeasurements[field.key] || ''}
                    onChange={e =>
                      setBodyMeasurements({
                        ...bodyMeasurements,
                        [field.key]: parseFloat(e.target.value) || undefined
                      })
                    }
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 pr-12 border-2 border-border rounded-lg focus:border-primary focus:outline-none"
                  />
                  <span className="absolute right-3 top-2 text-sm text-muted-foreground">in</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : '💾 Save Measurements'}
          </button>
        </div>
      </CollapsibleSection>

      {/* Health Condition Details - Questionnaires */}
      {availableQuestionnaires.length > 0 && (
        <CollapsibleSection
          title="Health Condition Details"
          description="Answer detailed questions about your health conditions"
          icon="📋"
          isOpen={openSections.conditionDetails}
          onToggle={() => toggleSection('conditionDetails')}
          badge={availableQuestionnaires.length}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Provide detailed information about your health conditions to receive more accurate
              dietary restrictions and meal recommendations.
            </p>

            {availableQuestionnaires.map(questionnaire => {
              const hasAnswers = !!conditionDetails[questionnaire.conditionKey]
              return (
                <div key={questionnaire.conditionKey} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-foreground">{questionnaire.conditionName}</h4>
                      <p className="text-sm text-muted-foreground">{questionnaire.description}</p>
                    </div>
                    {hasAnswers && (
                      <span className="px-2 py-1 bg-success/10 text-success text-xs font-medium rounded">
                        ✓ Completed
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedCondition(questionnaire.conditionKey)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
                  >
                    {hasAnswers ? 'Update Answers' : 'Answer Questions'}
                  </button>
                </div>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Health Condition Modal */}
      {selectedCondition && (() => {
        const questionnaire = healthConditionQuestionnaires.find(q => q.conditionKey === selectedCondition)
        if (!questionnaire) return null

        return (
          <HealthConditionModal
            isOpen={true}
            onClose={() => setSelectedCondition(null)}
            questionnaire={questionnaire}
            existingResponses={conditionDetails[selectedCondition] || {}}
            onSave={async (conditionKey, responses) => {
              const newConditionDetails = {
                ...conditionDetails,
                [conditionKey]: responses
              }
              setConditionDetails(newConditionDetails)

              // Save immediately
              try {
                await onSave({
                  dietaryPreferences,
                  foodAllergies,
                  healthConditions,
                  lifestyle,
                  bodyMeasurements,
                  conditionDetails: newConditionDetails
                })
                toast.success('Health condition details saved')
              } catch (error) {
                toast.error('Failed to save condition details')
              }

              setSelectedCondition(null)
            }}
          />
        )
      })()}
    </div>
  )
}
