'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { doc, setDoc, Timestamp, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import toast from 'react-hot-toast'
import type { PersonOnboardingAnswers, PersonRole, AutomationLevelExtended } from '@/types'
import { DriverLicenseScanner } from '@/components/family/DriverLicenseScanner'
import { VitalsFormSection } from '@/components/family/VitalsFormSection'
import { canAccessFeature } from '@/lib/feature-gates'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import { useSubscription } from '@/hooks/useSubscription'

interface WizardStep {
  id: string
  title: string
  subtitle?: string
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 'basic_info', title: 'Who is this person?', subtitle: 'Basic information' },
  { id: 'vitals', title: 'Health vitals', subtitle: 'Height and weight for health tracking' },
  { id: 'conditions', title: 'Health conditions', subtitle: 'Confirm AI-detected conditions' },
  { id: 'review', title: 'Review & create', subtitle: 'Confirm the details' }
]

const HEALTH_GOALS = [
  { id: 'weight_loss', label: 'Weight Loss', description: 'Track weight and calorie goals' },
  { id: 'meal_planning', label: 'Meal Planning', description: 'Plan and log meals' },
  { id: 'medical_tracking', label: 'Medical Tracking', description: 'Track appointments and medications' },
  { id: 'fitness', label: 'Fitness', description: 'Track activity and exercise' },
  { id: 'vitals_monitoring', label: 'Vitals Monitoring', description: 'Monitor blood pressure, glucose, etc.' }
]

const HEALTH_CONDITIONS = [
  'Diabetes', 'Hypertension', 'Heart Disease', 'Asthma', 'Arthritis',
  'High Cholesterol', 'Thyroid Disorder', 'Kidney Disease', 'Allergies', 'Other'
]

const PET_HEALTH_CONDITIONS: Record<string, string[]> = {
  Dog: [
    'Arthritis', 'Hip Dysplasia', 'Allergies', 'Dental Disease',
    'Skin Conditions', 'Ear Infections', 'Obesity', 'Kidney Disease',
    'Heart Disease', 'Diabetes', 'Thyroid Disorder', 'Other'
  ],
  Cat: [
    'Kidney Disease', 'Dental Disease', 'Diabetes', 'Hyperthyroidism',
    'Urinary Tract Issues', 'Obesity', 'Arthritis', 'Allergies',
    'Heart Disease', 'Skin Conditions', 'Other'
  ],
  Bird: [
    'Respiratory Issues', 'Feather Plucking', 'Beak Problems', 'Obesity',
    'Psittacosis', 'Egg Binding', 'Nutritional Deficiencies', 'Parasites',
    'Bumblefoot', 'Other'
  ],
  Fish: [
    'Ich (White Spot Disease)', 'Fin Rot', 'Swim Bladder Disease', 'Fungal Infections',
    'Parasites', 'Dropsy', 'Velvet Disease', 'Bacterial Infections',
    'Columnaris', 'Other'
  ],
  Rabbit: [
    'Dental Disease', 'GI Stasis', 'Obesity', 'Respiratory Issues',
    'Ear Mites', 'Arthritis', 'Urinary Tract Issues', 'Skin Conditions',
    'Parasites', 'Other'
  ],
  'Guinea Pig': [
    'Dental Disease', 'Scurvy (Vitamin C Deficiency)', 'Respiratory Issues',
    'Skin Conditions', 'Obesity', 'Bumblefoot', 'Urinary Stones',
    'Parasites', 'Other'
  ],
  Hamster: [
    'Wet Tail', 'Respiratory Issues', 'Dental Disease', 'Skin Conditions',
    'Tumors', 'Obesity', 'Diabetes', 'Parasites', 'Other'
  ],
  Reptile: [
    'Metabolic Bone Disease', 'Respiratory Infection', 'Shell Rot (Turtles)',
    'Parasites', 'Mouth Rot', 'Impaction', 'Skin Infections',
    'Dehydration', 'Nutritional Deficiencies', 'Other'
  ]
}

// Default pet conditions for species not in the list or "Other"
const DEFAULT_PET_CONDITIONS = [
  'Obesity', 'Dental Disease', 'Skin Conditions', 'Parasites',
  'Nutritional Deficiencies', 'Respiratory Issues', 'Other'
]

const VITAL_TYPES = [
  { id: 'blood_pressure', label: 'Blood Pressure' },
  { id: 'blood_sugar', label: 'Blood Sugar' },
  { id: 'heart_rate', label: 'Heart Rate' },
  { id: 'oxygen_saturation', label: 'Oxygen Saturation' },
  { id: 'temperature', label: 'Temperature' }
]

const RELATIONSHIPS = [
  'Self', 'Spouse', 'Partner', 'Parent', 'Child', 'Sibling', 'Grandparent',
  'Grandchild', 'Other Family', 'Care Recipient', 'Pet'
]

const PET_BREEDS: Record<string, string[]> = {
  Dog: [
    'Labrador Retriever', 'German Shepherd', 'Golden Retriever', 'French Bulldog',
    'Bulldog', 'Poodle', 'Beagle', 'Rottweiler', 'German Shorthaired Pointer',
    'Yorkshire Terrier', 'Boxer', 'Dachshund', 'Siberian Husky', 'Great Dane',
    'Doberman Pinscher', 'Australian Shepherd', 'Miniature Schnauzer', 'Cavalier King Charles Spaniel',
    'Shih Tzu', 'Boston Terrier', 'Pomeranian', 'Havanese', 'Shetland Sheepdog',
    'Brittany', 'Pembroke Welsh Corgi', 'Mixed Breed', 'Other'
  ],
  Cat: [
    'Domestic Shorthair', 'Domestic Longhair', 'Siamese', 'Persian', 'Maine Coon',
    'Ragdoll', 'Bengal', 'Abyssinian', 'Birman', 'Oriental Shorthair',
    'Sphynx', 'Devon Rex', 'American Shorthair', 'British Shorthair', 'Scottish Fold',
    'Exotic Shorthair', 'Burmese', 'Himalayan', 'Russian Blue', 'Norwegian Forest Cat',
    'Mixed Breed', 'Other'
  ],
  Bird: [
    'Parakeet (Budgie)', 'Cockatiel', 'Canary', 'Finch', 'Lovebird',
    'Conure', 'African Grey Parrot', 'Macaw', 'Cockatoo', 'Amazon Parrot',
    'Dove', 'Pigeon', 'Quaker Parrot', 'Other'
  ],
  Fish: [
    'Goldfish', 'Betta Fish', 'Guppy', 'Molly', 'Platy', 'Swordtail',
    'Tetra', 'Angelfish', 'Gourami', 'Cichlid', 'Koi', 'Oscar',
    'Discus', 'Catfish', 'Other'
  ],
  Rabbit: [
    'Holland Lop', 'Netherland Dwarf', 'Mini Rex', 'Lionhead', 'Flemish Giant',
    'Dutch', 'English Lop', 'Mini Lop', 'Rex', 'Angora', 'Mixed Breed', 'Other'
  ],
  'Guinea Pig': [
    'American', 'Abyssinian', 'Peruvian', 'Silkie', 'Teddy', 'Texel',
    'Skinny Pig', 'Mixed Breed', 'Other'
  ],
  Hamster: [
    'Syrian (Golden)', 'Dwarf Campbell Russian', 'Dwarf Winter White Russian',
    'Roborovski', 'Chinese', 'Other'
  ],
  Reptile: [
    'Bearded Dragon', 'Leopard Gecko', 'Crested Gecko', 'Ball Python',
    'Corn Snake', 'Red-Eared Slider Turtle', 'Box Turtle', 'Iguana',
    'Chameleon', 'Blue-Tongued Skink', 'Other'
  ]
}

interface FamilyMemberData {
  // Step 1: Basic Info
  name: string
  dateOfBirth: string
  relationship: string
  gender: string

  // Step 2: Vitals
  heightFeet: string
  heightInches: string
  heightCm: string
  currentWeight: string
  weightUnit: 'lbs' | 'kg'
  heightUnit: 'imperial' | 'metric'
  activityLevel: '' | 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active'
  targetWeight: string
  weightGoal: '' | 'lose-weight' | 'maintain-weight' | 'gain-muscle' | 'improve-health'

  // Step 3: Conditions
  conditions: string[]

  // Pet-specific fields
  species?: string
  breed?: string
  breedDetails?: string  // For "Mixed Breed" or "Other" breed details
  microchipNumber?: string

  // Optional: Goals and Vitals tracking (currently unused)
  goals?: string[]
  trackVitals?: string[]
}

export default function FamilyMemberOnboardingWizard() {
  const { user } = useAuth()
  const router = useRouter()
  const { subscription } = useSubscription()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const [data, setData] = useState<FamilyMemberData>({
    name: '',
    dateOfBirth: '',
    relationship: '',
    gender: '',
    heightFeet: '',
    heightInches: '',
    heightCm: '',
    currentWeight: '',
    weightUnit: 'lbs',
    heightUnit: 'imperial',
    activityLevel: '',
    targetWeight: '',
    weightGoal: '',
    conditions: []
  })

  const currentStepData = WIZARD_STEPS[currentStep]
  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100

  function handleNext() {
    // Validation before moving forward
    if (currentStepData.id === 'basic_info') {
      const isPet = data.relationship === 'Pet'

      // Check required fields based on type
      if (isPet) {
        if (!data.name || !data.dateOfBirth || !data.relationship || !data.species) {
          toast.error('Please fill in all required fields')
          return
        }

        // Check pet-tracking feature access
        if (!subscription || subscription.plan === 'free') {
          setShowUpgradeModal(true)
          return
        }
      } else {
        if (!data.name || !data.dateOfBirth || !data.relationship || !data.gender) {
          toast.error('Please fill in all required fields')
          return
        }
      }
    }

    if (currentStepData.id === 'vitals') {
      const isPet = data.relationship === 'Pet'

      if (!data.currentWeight) {
        toast.error('Please enter current weight')
        return
      }

      // Height is not required for pets
      if (!isPet) {
        if (data.heightUnit === 'imperial' && !data.heightFeet) {
          toast.error('Please enter height')
          return
        }
        if (data.heightUnit === 'metric' && !data.heightCm) {
          toast.error('Please enter height')
          return
        }
      }
    }

    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  function handleSkip() {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  function toggleGoal(goalId: string) {
    setData(prev => ({
      ...prev,
      goals: prev.goals?.includes(goalId)
        ? prev.goals.filter((g: string) => g !== goalId)
        : [...(prev.goals || []), goalId]
    }))
  }

  function toggleCondition(condition: string) {
    setData(prev => ({
      ...prev,
      conditions: prev.conditions.includes(condition)
        ? prev.conditions.filter(c => c !== condition)
        : [...prev.conditions, condition]
    }))
  }

  function toggleVital(vitalId: string) {
    setData(prev => ({
      ...prev,
      trackVitals: prev.trackVitals?.includes(vitalId)
        ? prev.trackVitals.filter((v: string) => v !== vitalId)
        : [...(prev.trackVitals || []), vitalId]
    }))
  }

  async function handleCreate() {
    if (!user) {
      toast.error('You must be logged in')
      return
    }

    setIsSubmitting(true)

    try {
      // Create patient document
      const patientRef = doc(collection(db, 'users', user.uid, 'patients'))
      const patientId = patientRef.id

      // Calculate age from DOB
      let age = 0
      let isMinor = false
      if (data.dateOfBirth) {
        const birthDate = new Date(data.dateOfBirth)
        const today = new Date()
        age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        isMinor = age < 18
      }

      // Prepare vitals data
      const isPet = data.relationship === 'Pet'

      const patientData: any = {
        userId: user.uid,
        name: data.name,
        dateOfBirth: data.dateOfBirth,
        age: age,
        isMinor: isMinor,
        relationship: data.relationship,
        type: isPet ? 'pet' : 'human',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      // Add pet-specific fields
      if (isPet) {
        if (data.species) patientData.species = data.species
        if (data.breed) {
          // If Mixed Breed or Other, combine with details
          if ((data.breed === 'Mixed Breed' || data.breed === 'Other') && data.breedDetails) {
            patientData.breed = `${data.breed} (${data.breedDetails})`
          } else {
            patientData.breed = data.breed
          }
        }
        if (data.microchipNumber) patientData.microchipNumber = data.microchipNumber
      } else {
        // Add human-specific fields
        if (data.gender) patientData.gender = data.gender
      }

      // Add vitals if provided
      if (data.currentWeight) {
        patientData.currentWeight = parseFloat(data.currentWeight)
        patientData.weightUnit = data.weightUnit
      }

      if (data.heightUnit === 'imperial' && data.heightFeet) {
        const feet = parseInt(data.heightFeet) || 0
        const inches = parseInt(data.heightInches) || 0
        patientData.height = (feet * 12) + inches
        patientData.heightUnit = 'imperial'
      } else if (data.heightUnit === 'metric' && data.heightCm) {
        patientData.height = parseFloat(data.heightCm)
        patientData.heightUnit = 'metric'
      }

      if (data.activityLevel) {
        patientData.activityLevel = data.activityLevel
      }

      if (data.targetWeight) {
        patientData.targetWeight = parseFloat(data.targetWeight)
        patientData.targetWeightUnit = data.weightUnit
      }

      if (data.weightGoal) {
        patientData.weightGoal = data.weightGoal
      }

      // Initialize goals object with starting weight
      if (data.currentWeight || data.targetWeight) {
        patientData.goals = {
          ...(data.currentWeight && { startWeight: parseFloat(data.currentWeight) }),
          ...(data.targetWeight && { targetWeight: parseFloat(data.targetWeight) })
        }
      }

      // Mark vitals as complete if we have height and weight
      if (patientData.height && patientData.currentWeight) {
        patientData.vitalsComplete = true
      }

      // Add health conditions if any
      if (data.conditions.length > 0) {
        patientData.healthConditions = data.conditions
      }

      // Save patient profile
      await setDoc(patientRef, patientData)

      toast.success(`${data.name} has been added!`)
      router.push('/patients')
    } catch (error) {
      console.error('Error creating family member:', error)
      toast.error('Failed to create family member. Please try again.')
      setIsSubmitting(false)
    }
  }

  // Handle driver's license scan
  function handleScanComplete(scannedData: {
    name: string
    dateOfBirth: string
    gender: string
  }) {
    setData({
      ...data,
      name: scannedData.name,
      dateOfBirth: scannedData.dateOfBirth,
      gender: scannedData.gender || ''
    })
    setShowScanner(false)
    toast.success('Information auto-filled from license!')
  }

  // Render step content
  // Calculate BMI and suggest conditions
  function getSuggestedConditions() {
    if (!data.currentWeight) return []

    let heightInInches = 0
    if (data.heightUnit === 'imperial' && data.heightFeet) {
      heightInInches = (parseInt(data.heightFeet) || 0) * 12 + (parseInt(data.heightInches) || 0)
    } else if (data.heightUnit === 'metric' && data.heightCm) {
      heightInInches = parseFloat(data.heightCm) / 2.54
    }

    if (heightInInches === 0) return []

    const weightInLbs = data.weightUnit === 'kg' ? parseFloat(data.currentWeight) * 2.20462 : parseFloat(data.currentWeight)
    const bmi = (weightInLbs / (heightInInches * heightInInches)) * 703

    const suggestions: string[] = []

    // BMI-based condition suggestions
    if (bmi >= 30) {
      suggestions.push('Obesity', 'Type 2 Diabetes Risk', 'High Blood Pressure', 'High Cholesterol', 'Heart Disease Risk')
    } else if (bmi >= 25) {
      suggestions.push('Overweight', 'Pre-diabetes Risk', 'High Blood Pressure')
    } else if (bmi < 18.5) {
      suggestions.push('Underweight', 'Nutritional Deficiency Risk')
    }

    return suggestions
  }

  function renderStep() {
    switch (currentStepData.id) {
      case 'basic_info':
        return renderBasicInfoStep()
      case 'vitals':
        return renderVitalsStep()
      case 'conditions':
        return renderConditionsStep()
      case 'review':
        return renderReviewStep()
      default:
        return null
    }
  }

  function renderVitalsStep() {
    const isPet = data.relationship === 'Pet'

    return (
      <VitalsFormSection
        data={{
          heightFeet: data.heightFeet,
          heightInches: data.heightInches,
          heightCm: data.heightCm,
          currentWeight: data.currentWeight,
          weightUnit: data.weightUnit,
          heightUnit: data.heightUnit,
          activityLevel: data.activityLevel,
          targetWeight: data.targetWeight,
          weightGoal: data.weightGoal
        }}
        onChange={(updates) => setData({ ...data, ...updates })}
        required={true}
        showGoals={!isPet}
        hideHeight={isPet}
      />
    )
  }

  function renderConditionsStep() {
    const isPet = data.relationship === 'Pet'
    const suggestedConditions = getSuggestedConditions()

    // Get species-specific conditions for pets
    const otherConditions = isPet
      ? (data.species && PET_HEALTH_CONDITIONS[data.species]
          ? PET_HEALTH_CONDITIONS[data.species]
          : DEFAULT_PET_CONDITIONS)
      : ['Arthritis', 'Asthma', 'Thyroid Disorder', 'Kidney Disease', 'Allergies', 'Other']

    const toggleCondition = (condition: string) => {
      setData(prev => ({
        ...prev,
        conditions: prev.conditions.includes(condition)
          ? prev.conditions.filter(c => c !== condition)
          : [...prev.conditions, condition]
      }))
    }

    return (
      <div className="space-y-6">
        {/* AI Suggestions (only for humans with BMI data) */}
        {!isPet && suggestedConditions.length > 0 && (
          <div>
            <div className="flex items-start gap-3 mb-4 p-4 rounded-lg bg-primary/10 border-2 border-primary/30">
              <span className="text-2xl">🤖</span>
              <div className="flex-1">
                <div className="font-semibold text-foreground mb-1">AI-Detected Risk Factors</div>
                <p className="text-sm text-foreground/80">
                  Based on the BMI analysis, we've identified potential health conditions. Please confirm which apply:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {suggestedConditions.map(condition => {
                const isSelected = data.conditions.includes(condition)
                return (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => toggleCondition(condition)}
                    className={`
                      px-4 py-3 rounded-xl text-left font-medium transition-all
                      ${isSelected
                        ? 'bg-primary text-primary-foreground border-2 border-primary shadow-lg'
                        : 'bg-accent border-2 border-primary/50 hover:border-primary text-white'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm">{condition}</span>
                      {isSelected && <span>✓</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Other Conditions */}
        <div>
          <h3 className="font-semibold mb-3 text-foreground">
            {isPet ? 'Health Conditions (Optional)' : 'Other Conditions (Optional)'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {otherConditions.map(condition => {
              const isSelected = data.conditions.includes(condition)
              return (
                <button
                  key={condition}
                  type="button"
                  onClick={() => toggleCondition(condition)}
                  className={`
                    px-4 py-3 rounded-xl text-left font-medium transition-all
                    ${isSelected
                      ? 'bg-primary text-primary-foreground border-2 border-primary'
                      : 'bg-accent border-2 border-transparent hover:border-primary/30 text-white'
                    }
                  `}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">{condition}</span>
                    {isSelected && <span>✓</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Don't worry if you're not sure - you can always update this later in their profile.
        </p>
      </div>
    )
  }

  function renderBasicInfoStep() {
    return (
      <div className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-2">Name *</label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            placeholder="Enter name"
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block text-sm font-medium mb-2">Date of Birth *</label>
          <input
            type="date"
            value={data.dateOfBirth}
            onChange={(e) => setData({ ...data, dateOfBirth: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Relationship */}
        <div>
          <label className="block text-sm font-medium mb-2">Relationship *</label>
          <select
            value={data.relationship}
            onChange={(e) => setData({ ...data, relationship: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
          >
            <option value="">Select relationship</option>
            {RELATIONSHIPS.map(rel => (
              <option key={rel} value={rel}>{rel}</option>
            ))}
          </select>
        </div>

        {/* Pet-specific fields */}
        {data.relationship === 'Pet' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Species *</label>
              <select
                value={data.species || ''}
                onChange={(e) => setData({ ...data, species: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
              >
                <option value="">Select species</option>
                <option value="Dog">Dog</option>
                <option value="Cat">Cat</option>
                <option value="Bird">Bird</option>
                <option value="Fish">Fish</option>
                <option value="Rabbit">Rabbit</option>
                <option value="Guinea Pig">Guinea Pig</option>
                <option value="Hamster">Hamster</option>
                <option value="Reptile">Reptile</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Breed (Optional)</label>
              {data.species && PET_BREEDS[data.species] ? (
                <>
                  <select
                    value={data.breed || ''}
                    onChange={(e) => setData({ ...data, breed: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                  >
                    <option value="">Select breed</option>
                    {PET_BREEDS[data.species].map(breed => (
                      <option key={breed} value={breed}>{breed}</option>
                    ))}
                  </select>

                  {/* Additional details for Mixed Breed or Other */}
                  {(data.breed === 'Mixed Breed' || data.breed === 'Other') && (
                    <div className="mt-3">
                      <label className="block text-xs text-muted-foreground mb-1">
                        {data.breed === 'Mixed Breed' ? 'Specify mix (e.g., Labrador/Poodle)' : 'Specify breed'}
                      </label>
                      <input
                        type="text"
                        value={data.breedDetails || ''}
                        onChange={(e) => setData({ ...data, breedDetails: e.target.value })}
                        placeholder={data.breed === 'Mixed Breed' ? 'e.g., Labrador/Poodle Mix' : 'Enter specific breed'}
                        className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>
                  )}
                </>
              ) : (
                <input
                  type="text"
                  value={data.breed || ''}
                  onChange={(e) => setData({ ...data, breed: e.target.value })}
                  placeholder={data.species === 'Other' ? 'Enter breed' : 'Select a species first'}
                  disabled={!data.species}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Microchip Number (Optional)</label>
              <input
                type="text"
                value={data.microchipNumber || ''}
                onChange={(e) => setData({ ...data, microchipNumber: e.target.value })}
                placeholder="15-digit microchip ID"
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          </>
        )}

        {/* Gender (only for humans) */}
        {data.relationship !== 'Pet' && (
          <div>
            <label className="block text-sm font-medium mb-2">Gender *</label>
            <div className="grid grid-cols-3 gap-3">
              {['Male', 'Female', 'Other'].map(gender => (
                <button
                  key={gender}
                  type="button"
                  onClick={() => setData({ ...data, gender })}
                  className={`
                    px-4 py-3 rounded-xl font-medium transition-all
                    ${data.gender === gender
                      ? 'bg-primary text-primary-foreground border-2 border-primary'
                      : 'bg-accent border-2 border-transparent hover:border-primary/30'
                    }
                  `}
                >
                  {gender}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Option: Scan Driver's License (only for adults) */}
        {data.relationship.toLowerCase() !== 'child' && data.relationship !== 'Pet' && (
          <div className="pt-4 border-t border-white/20">
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-primary text-primary font-medium hover:bg-primary/10 transition-colors"
            >
              📷 Scan Driver's License
            </button>
          </div>
        )}
      </div>
    )
  }


  function renderReviewStep() {
    // Calculate age from DOB
    let age = 0
    let isMinor = false
    if (data.dateOfBirth) {
      const birthDate = new Date(data.dateOfBirth)
      const today = new Date()
      age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      isMinor = age < 18
    }

    // Calculate height display
    let heightDisplay = ''
    if (data.heightUnit === 'imperial' && data.heightFeet) {
      heightDisplay = `${data.heightFeet}'${data.heightInches || 0}"`
    } else if (data.heightUnit === 'metric' && data.heightCm) {
      heightDisplay = `${data.heightCm} cm`
    }

    // Calculate weight display
    const weightDisplay = data.currentWeight ? `${data.currentWeight} ${data.weightUnit}` : ''

    return (
      <div className="space-y-6">
        {/* Minor Warning */}
        {isMinor && data.relationship.toLowerCase() === 'child' && (
          <div className="p-4 rounded-xl bg-yellow-500/20 border-2 border-yellow-500/50">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="font-semibold mb-1 text-yellow-900 dark:text-yellow-100">Minor Detected (Age {age})</div>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  As a parent/guardian, you're responsible for managing this child's health data and consent.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 rounded-xl bg-accent border border-white/20 space-y-4">
          {/* Basic Info */}
          <div>
            <h3 className="font-semibold mb-2 text-white">Basic Information</h3>
            <div className="space-y-1 text-sm text-white/90">
              <p><span className="text-white/70">Name:</span> {data.name}</p>
              <p><span className="text-white/70">Date of Birth:</span> {data.dateOfBirth} {age > 0 && `(Age ${age})`}</p>
              <p><span className="text-white/70">Relationship:</span> {data.relationship}</p>
              <p><span className="text-white/70">Gender:</span> {data.gender}</p>
            </div>
          </div>

          {/* Vitals */}
          {(heightDisplay || weightDisplay) && (
            <div className="pt-4 border-t border-white/20">
              <h3 className="font-semibold mb-2 text-white">Health Vitals</h3>
              <div className="space-y-1 text-sm text-white/90">
                {heightDisplay && <p><span className="text-white/70">Height:</span> {heightDisplay}</p>}
                {weightDisplay && <p><span className="text-white/70">Weight:</span> {weightDisplay}</p>}
                {data.activityLevel && <p><span className="text-white/70">Activity Level:</span> {data.activityLevel}</p>}
                {data.weightGoal && <p><span className="text-white/70">Goal:</span> {data.weightGoal.replace(/-/g, ' ')}</p>}
                {data.targetWeight && <p><span className="text-white/70">Target Weight:</span> {data.targetWeight} {data.weightUnit}</p>}
              </div>
            </div>
          )}

          {/* Health Conditions */}
          {data.conditions.length > 0 && (
            <div className="pt-4 border-t border-white/20">
              <h3 className="font-semibold mb-2 text-white">Health Conditions</h3>
              <div className="flex flex-wrap gap-2">
                {data.conditions.map(condition => (
                  <span key={condition} className="px-3 py-1 rounded-full bg-white/20 text-white text-sm">
                    {condition}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCurrentStep(0)}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Edit information
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent p-4">
      <div className="max-w-xl w-full space-y-8">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {currentStep + 1} of {WIZARD_STEPS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-card rounded-2xl shadow-2xl p-8 border border-border">
          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {currentStepData.title}
            </h2>
            {currentStepData.subtitle && (
              <p className="text-sm text-muted-foreground mt-2">
                {currentStepData.subtitle}
              </p>
            )}
          </div>

          {/* Step Content */}
          <div className="mb-8">
            {renderStep()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-3 rounded-xl font-medium border-2 border-border hover:bg-accent transition-colors"
              >
                Back
              </button>
            )}

            {currentStepData.id !== 'basic_info' && currentStepData.id !== 'review' && (
              <button
                type="button"
                onClick={handleSkip}
                className="px-6 py-3 rounded-xl font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip
              </button>
            )}

            {currentStepData.id === 'review' ? (
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Family Member'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 px-6 py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Continue
              </button>
            )}
          </div>
        </div>

        {/* Back to List */}
        <button
          type="button"
          onClick={() => router.push('/patients')}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Cancel and go back
        </button>
      </div>

      {/* Driver's License Scanner Modal */}
      <DriverLicenseScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanComplete={handleScanComplete}
      />

      {/* Upgrade Modal for Pet Tracking */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={subscription?.plan}
        currentBillingInterval={subscription?.billingInterval}
        suggestedPlan="family_basic"
      />
    </div>
  )
}
