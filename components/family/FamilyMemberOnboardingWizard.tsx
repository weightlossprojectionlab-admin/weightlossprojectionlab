'use client'

import { useState, useMemo } from 'react'
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
import PetVitalsWizard, { PetVitalsData } from '@/components/pets/PetVitalsWizard'
import { getSpeciesCategory } from '@/lib/pet-species-utils'
import { PetWeightStatusIndicator } from '@/components/pets/PetWeightStatusIndicator'
import { getPetWeightConditions } from '@/hooks/usePetWeightConditions'
import { getTodayDateString, isValidBirthDate, getBirthDateErrorMessage } from '@/lib/date-utils'
import {
  getHumanLifeStage,
  formatHumanAgeDisplay,
  getHumanLifeStageNotices,
  getPetLifeStage,
  formatPetAgeDisplay,
  getPetLifeStageNotices,
  getPediatricConditions,
  getDefaultWeightUnit,
} from '@/lib/life-stage-utils'
import { NameInput } from '@/components/form/NameInput'

interface WizardStep {
  id: string
  title: string
  subtitle?: string
}

const getWizardSteps = (isPet: boolean, isNewborn: boolean, hasSelectedType: boolean): WizardStep[] => {
  const steps: WizardStep[] = [];

  // Step 0: Type selection (human vs pet)
  if (!hasSelectedType) {
    steps.push({
      id: 'type_selection',
      title: 'Who are you adding?',
      subtitle: 'Select the type of family member'
    });
  }

  // Step 1: Basic info
  steps.push({
    id: 'basic_info',
    title: isPet ? 'What type of pet?' : isNewborn ? 'About the newborn' : 'Who is this person?',
    subtitle: isPet ? 'Species and breed information' : isNewborn ? 'Basic newborn information' : 'Basic information'
  });

  // Step 2: Vitals
  steps.push({
    id: 'vitals',
    title: isPet ? 'Pet vitals' : isNewborn ? 'Newborn health check' : 'Health vitals',
    subtitle: isPet ? 'Weight and activity for health tracking' : isNewborn ? 'Birth weight, feeding & pediatrician' : 'Height and weight for health tracking'
  });

  // Step 3: Conditions
  steps.push({
    id: 'conditions',
    title: isPet ? 'Pet health conditions' : isNewborn ? 'Newborn health concerns' : 'Health conditions',
    subtitle: isPet ? 'Common pet health issues' : isNewborn ? 'Any known conditions or concerns' : 'Confirm AI-detected conditions'
  });

  // Step 4: Review
  steps.push({
    id: 'review',
    title: 'Review & create',
    subtitle: 'Confirm the details'
  });

  return steps;
}

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
  ],
  Horse: [
    'Colic', 'Laminitis', 'Arthritis', 'Heaves (RAO)', 'Navicular Disease',
    'Cushing\'s Disease', 'Equine Metabolic Syndrome', 'Cribbing/Wind Sucking',
    'Skin Conditions', 'Dental Disease', 'Parasites', 'Ulcers', 'Respiratory Infections',
    'Hoof Abscesses', 'Other'
  ],
  Cow: [
    'Mastitis', 'Lameness', 'Bloat', 'Milk Fever', 'Ketosis',
    'Bovine Respiratory Disease', 'Johne\'s Disease', 'Pink Eye', 'Foot Rot',
    'Hardware Disease', 'Parasites', 'Scours (Diarrhea)', 'Bloat',
    'Displaced Abomasum', 'Other'
  ],
  Pig: [
    'Respiratory Disease', 'Diarrhea/Scours', 'Swine Flu', 'Arthritis',
    'Skin Conditions', 'Parasites', 'Pneumonia', 'Greasy Pig Disease',
    'Erysipelas', 'Porcine Stress Syndrome', 'Lameness', 'Obesity',
    'Other'
  ],
  Goat: [
    'Parasites (Internal/External)', 'Bloat', 'Pneumonia', 'Caseous Lymphadenitis',
    'Foot Rot', 'Listeriosis', 'Ketosis', 'Scours (Diarrhea)', 'Mastitis',
    'Arthritis', 'Urinary Calculi', 'Pink Eye', 'Copper Deficiency',
    'Other'
  ],
  Sheep: [
    'Parasites (Internal/External)', 'Foot Rot', 'Bloat', 'Pneumonia',
    'Scrapie', 'Mastitis', 'Wool Blindness', 'Arthritis', 'Scours (Diarrhea)',
    'Urinary Calculi', 'Copper Toxicity', 'Pink Eye', 'Johne\'s Disease',
    'Other'
  ],
  Chicken: [
    'Respiratory Infections', 'Coccidiosis', 'Marek\'s Disease', 'Fowl Pox',
    'Newcastle Disease', 'Bumblefoot', 'Egg Binding', 'Sour Crop',
    'Infectious Bronchitis', 'Avian Influenza', 'Parasites (Mites/Lice/Worms)',
    'Pecking/Cannibalism', 'Vent Prolapse', 'Other'
  ],
  Duck: [
    'Respiratory Infections', 'Botulism', 'Duck Viral Enteritis', 'Aspergillosis',
    'Angel Wing', 'Bumblefoot', 'Egg Binding', 'Niacin Deficiency',
    'Parasites (Internal/External)', 'Vent Prolapse', 'Impacted Crop',
    'Wet Feather', 'Other'
  ],
  // Exotic Pets
  Ferret: [
    'Adrenal Disease', 'Insulinoma', 'Lymphoma', 'Gastrointestinal Blockage',
    'Cardiomyopathy', 'Dental Disease', 'Skin Tumors', 'Ear Mites',
    'Influenza', 'Distemper', 'Parasites', 'Other'
  ],
  Hedgehog: [
    'Wobbly Hedgehog Syndrome', 'Obesity', 'Dental Disease', 'Mites',
    'Respiratory Infections', 'Tumors', 'Hibernation Attempt',
    'Fatty Liver Disease', 'Skin Infections', 'Parasites', 'Other'
  ],
  'Sugar Glider': [
    'Nutritional Deficiencies', 'Parasites', 'Dental Disease', 'Obesity',
    'Self-Mutilation', 'Stress-Related Illness', 'Hind Leg Paralysis',
    'Respiratory Infections', 'Diarrhea', 'Other'
  ],
  Chinchilla: [
    'Dental Malocclusion', 'GI Stasis', 'Fur Slip', 'Heat Stroke',
    'Respiratory Infections', 'Bumblefoot', 'Ringworm',
    'Constipation', 'Bloat', 'Eye Infections', 'Other'
  ],
  Parrot: [
    'Psittacine Beak and Feather Disease', 'Psittacosis', 'Aspergillosis',
    'Feather Plucking', 'Obesity', 'Fatty Liver Disease', 'Beak Overgrowth',
    'Egg Binding', 'Respiratory Infections', 'Bumblefoot', 'Nutritional Deficiencies',
    'Polyomavirus', 'Other'
  ],
  Tortoise: [
    'Metabolic Bone Disease', 'Respiratory Infections', 'Shell Rot',
    'Pyramiding', 'Parasites', 'Dehydration', 'Mouth Rot',
    'Eye Infections', 'Bladder Stones', 'Impaction', 'Other'
  ],
  Snake: [
    'Respiratory Infections', 'Mouth Rot', 'Scale Rot', 'Mites',
    'Inclusion Body Disease', 'Impaction', 'Parasites',
    'Dehydration', 'Burns', 'Regurgitation', 'Other'
  ],
  Lizard: [
    'Metabolic Bone Disease', 'Mouth Rot', 'Respiratory Infections',
    'Impaction', 'Parasites', 'Skin Infections', 'Dehydration',
    'Eye Infections', 'Tail Loss', 'Burns', 'Gout', 'Other'
  ],
  'Pot-Bellied Pig': [
    'Obesity', 'Arthritis', 'Dental Disease', 'Mange', 'Skin Conditions',
    'Respiratory Infections', 'Parasites', 'Hoof Problems',
    'Erysipelas', 'Salt Toxicity', 'Other'
  ],
  Monkey: [
    'Herpes B Virus', 'Tuberculosis', 'Hepatitis', 'Simian Immunodeficiency Virus',
    'Parasites', 'Dental Disease', 'Obesity', 'Diabetes',
    'Behavioral Issues', 'Zoonotic Diseases', 'Other'
  ],
  // Wildlife / Zoo Animals
  Alpaca: [
    'Parasites (Internal/External)', 'Heat Stress', 'Dental Disease',
    'Foot Rot', 'Mycoplasma', 'Vitamin D Deficiency', 'Fighting Injuries',
    'Respiratory Infections', 'Skin Conditions', 'Other'
  ],
  Deer: [
    'Chronic Wasting Disease', 'Parasites', 'Respiratory Infections',
    'Foot Rot', 'Antler Injuries', 'Malnutrition', 'Bloat',
    'Enterotoxemia', 'Skin Conditions', 'Other'
  ],
  Emu: [
    'Parasites (Internal/External)', 'Respiratory Infections',
    'Impaction', 'Bumblefoot', 'Leg Injuries', 'Nutritional Deficiencies',
    'Egg Binding', 'Heat Stress', 'Other'
  ],
  Peacock: [
    'Respiratory Infections', 'Parasites', 'Bumblefoot', 'Feather Mites',
    'Nutritional Deficiencies', 'Egg Binding', 'Blackhead Disease',
    'Coccidiosis', 'Other'
  ],
  Turkey: [
    'Blackhead Disease', 'Respiratory Infections', 'Coccidiosis',
    'Newcastle Disease', 'Bumblefoot', 'Leg Problems',
    'Parasites', 'Nutritional Deficiencies', 'Other'
  ],
  'Miniature Donkey': [
    'Dental Disease', 'Laminitis', 'Parasites', 'Hoof Problems',
    'Obesity', 'Colic', 'Rain Rot', 'Respiratory Infections',
    'Eye Infections', 'Other'
  ],
  'Exotic Bird': [
    'Respiratory Infections', 'Parasites', 'Nutritional Deficiencies',
    'Bumblefoot', 'Feather Plucking', 'Egg Binding', 'Beak Overgrowth',
    'Aspergillosis', 'Other'
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
  'Self', 'Spouse', 'Partner', 'Parent', 'Child', 'Newborn', 'Sibling', 'Grandparent',
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
  ],
  Horse: [
    'Quarter Horse', 'Thoroughbred', 'Arabian', 'Paint Horse', 'Appaloosa',
    'Tennessee Walker', 'Morgan', 'Mustang', 'Standardbred', 'Warmblood',
    'Clydesdale', 'Percheron', 'Belgian', 'Andalusian', 'Friesian',
    'Shetland Pony', 'Welsh Pony', 'Miniature Horse', 'Mixed Breed', 'Other'
  ],
  Cow: [
    'Holstein', 'Angus', 'Hereford', 'Jersey', 'Guernsey',
    'Brown Swiss', 'Simmental', 'Charolais', 'Limousin', 'Brahman',
    'Texas Longhorn', 'Shorthorn', 'Dexter', 'Highland', 'Belted Galloway',
    'Mixed Breed', 'Other'
  ],
  Pig: [
    'Yorkshire', 'Duroc', 'Hampshire', 'Berkshire', 'Landrace',
    'Chester White', 'Poland China', 'Spot', 'Tamworth', 'Large Black',
    'Gloucester Old Spots', 'Kunekune', 'Vietnamese Pot-Bellied', 'American Guinea Hog',
    'Mixed Breed', 'Other'
  ],
  Goat: [
    'Nubian', 'Boer', 'Alpine', 'Saanen', 'LaMancha',
    'Oberhasli', 'Toggenburg', 'Nigerian Dwarf', 'Pygmy', 'Kiko',
    'Spanish', 'Tennessee Fainting', 'Angora', 'Cashmere',
    'Mixed Breed', 'Other'
  ],
  Sheep: [
    'Suffolk', 'Dorset', 'Hampshire', 'Merino', 'Rambouillet',
    'Southdown', 'Texel', 'Katahdin', 'Corriedale', 'Romney',
    'Border Leicester', 'Jacob', 'Shetland', 'Icelandic', 'Cheviot',
    'Mixed Breed', 'Other'
  ],
  Chicken: [
    'Rhode Island Red', 'Plymouth Rock', 'Leghorn', 'Orpington', 'Wyandotte',
    'Sussex', 'Brahma', 'Cochin', 'Silkie', 'Australorp',
    'Marans', 'Easter Egger', 'Ameraucana', 'Polish', 'Barnevelder',
    'Cornish Cross', 'New Hampshire', 'Delaware', 'Mixed Breed', 'Other'
  ],
  Duck: [
    'Pekin', 'Muscovy', 'Khaki Campbell', 'Runner', 'Rouen',
    'Swedish', 'Cayuga', 'Buff', 'Welsh Harlequin', 'Magpie',
    'Mallard', 'Call Duck', 'Crested', 'Mixed Breed', 'Other'
  ],
  // Exotic Pets
  Ferret: [
    'Standard', 'Angora', 'Sable', 'Albino', 'Dark-Eyed White',
    'Black Sable', 'Chocolate', 'Champagne', 'Cinnamon', 'Other'
  ],
  Hedgehog: [
    'African Pygmy', 'Algerian', 'Egyptian Long-Eared',
    'European', 'Four-Toed', 'Other'
  ],
  'Sugar Glider': [
    'Classic Grey', 'Leucistic', 'Albino', 'Creamino',
    'Platinum', 'Mosaic', 'Other'
  ],
  Chinchilla: [
    'Standard Grey', 'White', 'Beige', 'Ebony', 'Violet',
    'Sapphire', 'Mosaic', 'TOV (Touch of Velvet)', 'Other'
  ],
  Parrot: [
    'African Grey', 'Amazon', 'Macaw (Blue & Gold)', 'Macaw (Scarlet)',
    'Cockatoo (Umbrella)', 'Cockatoo (Moluccan)', 'Eclectus',
    'Conure (Sun)', 'Conure (Green Cheek)', 'Quaker Parrot',
    'Senegal Parrot', 'Meyer\'s Parrot', 'Other'
  ],
  Tortoise: [
    'Russian Tortoise', 'Greek Tortoise', 'Hermann\'s Tortoise',
    'Sulcata (African Spurred)', 'Leopard Tortoise', 'Red-Footed Tortoise',
    'Yellow-Footed Tortoise', 'Pancake Tortoise', 'Other'
  ],
  Snake: [
    'Ball Python', 'Corn Snake', 'King Snake', 'Milk Snake',
    'Boa Constrictor', 'Garter Snake', 'Rat Snake', 'Hognose Snake',
    'Sand Boa', 'Carpet Python', 'Blood Python', 'Other'
  ],
  Lizard: [
    'Bearded Dragon', 'Blue-Tongued Skink', 'Monitor (Savannah)',
    'Monitor (Nile)', 'Iguana (Green)', 'Iguana (Rhinoceros)',
    'Tegu (Argentine)', 'Uromastyx', 'Chameleon (Veiled)',
    'Chameleon (Panther)', 'Water Dragon', 'Other'
  ],
  'Pot-Bellied Pig': [
    'Vietnamese Pot-Bellied', 'Juliana', 'KuneKune',
    'Mini Pig', 'Micro Pig', 'Other'
  ],
  Monkey: [
    'Capuchin', 'Marmoset', 'Squirrel Monkey', 'Spider Monkey',
    'Macaque', 'Tamarin', 'Other'
  ],
  // Wildlife / Zoo Animals
  Alpaca: [
    'Huacaya Alpaca', 'Suri Alpaca', 'Classic Llama',
    'Woolly Llama', 'Other'
  ],
  Deer: [
    'White-Tailed Deer', 'Mule Deer', 'Fallow Deer',
    'Sika Deer', 'Red Deer', 'Axis Deer', 'Other'
  ],
  Emu: [
    'Emu', 'Ostrich (Common)', 'Ostrich (Red-Necked)',
    'Ostrich (Blue-Necked)', 'Other'
  ],
  Peacock: [
    'Indian Blue Peafowl', 'Green Peafowl', 'Congo Peafowl',
    'White Peafowl', 'Spalding Peafowl', 'Other'
  ],
  Turkey: [
    'Broad Breasted White', 'Broad Breasted Bronze', 'Bourbon Red',
    'Narragansett', 'Royal Palm', 'Wild Turkey', 'Heritage Turkey',
    'Other'
  ],
  'Miniature Donkey': [
    'Standard Miniature Donkey', 'Mediterranean Miniature',
    'Sicilian Donkey', 'Standard Donkey', 'Other'
  ],
  'Exotic Bird': [
    'Toucan', 'Hornbill', 'Mynah Bird', 'Lorikeet',
    'Rosella', 'Pheasant', 'Guinea Fowl', 'Swan',
    'Flamingo', 'Crane', 'Other'
  ]
}

interface FamilyMemberData {
  // Step 0: Type selection
  memberType: '' | 'human' | 'pet'

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
  weightUnit: 'lbs' | 'kg' | 'oz' | 'g'
  heightUnit: 'imperial' | 'metric'
  activityLevel: '' | 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active'
  targetWeight: string
  weightGoal: '' | 'lose-weight' | 'maintain-weight' | 'gain-muscle' | 'improve-health'

  // Step 3: Conditions
  conditions: string[]

  // Newborn-specific fields
  feedingPreference?: 'breastfeeding' | 'formula' | 'combination' | ''
  pediatricianName?: string
  pediatricianPhone?: string
  headCircumference?: string
  apgarScore?: string
  gestationalWeeks?: string
  nicuStay?: boolean
  nicuDays?: string
  breathingSupport?: boolean
  kangarooCare?: boolean

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
  const [showPetVitalsWizard, setShowPetVitalsWizard] = useState(false)
  const [petVitalsData, setPetVitalsData] = useState<PetVitalsData | null>(null)
  const [petVitalsMode, setPetVitalsMode] = useState<'basic' | 'advanced' | null>(null)

  const [data, setData] = useState<FamilyMemberData>({
    memberType: '',
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
    conditions: [],
    feedingPreference: '',
    pediatricianName: '',
    pediatricianPhone: '',
    headCircumference: '',
    apgarScore: '',
    gestationalWeeks: '',
    nicuStay: false,
    nicuDays: '',
    breathingSupport: false,
    kangarooCare: false,
  })

  const isPet = data.memberType === 'pet' || data.relationship === 'Pet'
  const isNewborn = data.relationship === 'Newborn'
  const hasSelectedType = data.memberType !== ''
  const WIZARD_STEPS = getWizardSteps(isPet, isNewborn, hasSelectedType)
  const currentStepData = WIZARD_STEPS[currentStep]
  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100

  // Calculate suggested conditions at component level (not in render function)
  // Using useMemo to prevent unnecessary recalculations
  const petSuggestedConditions = useMemo(() => {
    if (!isPet || !data.currentWeight || !data.species) return []

    const availableConditions = PET_HEALTH_CONDITIONS[data.species] || DEFAULT_PET_CONDITIONS
    return getPetWeightConditions({
      weight: data.currentWeight,
      weightUnit: data.weightUnit,
      species: data.species,
      breed: data.breed,
      availableConditions
    })
  }, [isPet, data.currentWeight, data.weightUnit, data.species, data.breed])

  function handleNext() {
    // Validation before moving forward
    if (currentStepData.id === 'type_selection') {
      if (!data.memberType) {
        toast.error('Please select whether you are adding a human or pet')
        return
      }
      // Auto-set relationship based on type
      if (data.memberType === 'pet') {
        setData({ ...data, relationship: 'Pet' })
      }
    }

    if (currentStepData.id === 'basic_info') {
      const isPet = data.memberType === 'pet' || data.relationship === 'Pet'

      // Check required fields based on type
      if (isPet) {
        if (!data.name || !data.dateOfBirth || !data.species) {
          toast.error('Please fill in all required fields')
          return
        }
        // Pet creation allowed - subscription check removed for pets
      } else {
        if (!data.name || !data.dateOfBirth || !data.relationship || !data.gender) {
          toast.error('Please fill in all required fields')
          return
        }
      }

      // Validate date of birth is not in the future
      if (!isValidBirthDate(data.dateOfBirth)) {
        toast.error(getBirthDateErrorMessage(data.dateOfBirth))
        return
      }
    }

    if (currentStepData.id === 'vitals') {
      const isPet = data.memberType === 'pet' || data.relationship === 'Pet'

      if (isPet) {
        // For pets, weight is required for proper diet and health tracking
        // Check if using basic mode or advanced mode (petVitalsData)
        if (petVitalsMode === 'basic') {
          if (!data.currentWeight) {
            toast.error('Please enter pet weight for diet and health tracking')
            return
          }
        } else {
          // Advanced mode - check if vitals wizard completed with weight
          if (!petVitalsData || !petVitalsData.weight) {
            toast.error('Please complete the health check with weight measurement')
            return
          }
        }
      } else if (data.relationship === 'Newborn') {
        // Newborns: birth weight and feeding preference required
        if (!data.currentWeight) {
          toast.error('Please enter birth weight')
          return
        }
        if (!data.feedingPreference) {
          toast.error('Please select a feeding method')
          return
        }
      } else {
        // For humans, weight is required
        if (!data.currentWeight) {
          toast.error('Please enter current weight')
          return
        }

        // Height is required for humans
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
      const isPet = data.memberType === 'pet' || data.relationship === 'Pet'

      // Compute life stage
      const lifeStage = isPet
        ? getPetLifeStage(data.dateOfBirth, data.species || '').stage
        : getHumanLifeStage(data.dateOfBirth).stage

      const patientData: any = {
        userId: user.uid,
        name: data.name,
        dateOfBirth: data.dateOfBirth,
        age: age,
        isMinor: isMinor,
        lifeStage: lifeStage,
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

        // Add newborn-specific fields
        if (data.relationship === 'Newborn') {
          patientData.isNewborn = true
          patientData.lifeStage = 'newborn'
          if (data.feedingPreference) patientData.feedingPreference = data.feedingPreference
          if (data.headCircumference) patientData.headCircumference = parseFloat(data.headCircumference)
          if (data.apgarScore) patientData.apgarScore = parseInt(data.apgarScore)
          if (data.pediatricianName) patientData.pediatricianName = data.pediatricianName
          if (data.pediatricianPhone) patientData.pediatricianPhone = data.pediatricianPhone

          // Preemie data
          if (data.gestationalWeeks) {
            const weeks = parseInt(data.gestationalWeeks)
            patientData.gestationalWeeks = weeks
            patientData.isPreemie = weeks < 37
            if (weeks < 25) patientData.preemieType = 'extremely_preterm'
            else if (weeks < 32) patientData.preemieType = 'very_preterm'
            else if (weeks < 34) patientData.preemieType = 'moderately_preterm'
            else if (weeks <= 36) patientData.preemieType = 'late_preterm'
          }
          if (data.nicuStay) {
            patientData.nicuStay = true
            if (data.nicuDays) patientData.nicuDays = parseInt(data.nicuDays)
          }
          if (data.breathingSupport) patientData.breathingSupport = true
          if (data.kangarooCare) patientData.kangarooCare = true
        }
      }

      // Add vitals if provided
      if (isPet && petVitalsData) {
        // Store pet-specific vitals
        if (petVitalsData.weight) {
          patientData.currentWeight = petVitalsData.weight;
          patientData.weightUnit = petVitalsData.weightUnit || 'lbs';
        }

        // Store pet vitals data for future reference
        patientData.petVitals = {
          temperature: petVitalsData.temperature,
          heartRate: petVitalsData.heartRate,
          respiratoryRate: petVitalsData.respiratoryRate,
          bodyConditionScore: petVitalsData.bodyConditionScore,
          bodyConditionScale: petVitalsData.bodyConditionScale,

          // Mammal-specific
          mucousMembraneColor: petVitalsData.mucousMembraneColor,
          capillaryRefillTime: petVitalsData.capillaryRefillTime,
          hydrationStatus: petVitalsData.hydrationStatus,

          // Avian-specific
          cropStatus: petVitalsData.cropStatus,
          featherCondition: petVitalsData.featherCondition,
          tailBobbing: petVitalsData.tailBobbing,

          // Reptile-specific
          baskingTemp: petVitalsData.baskingTemp,
          coolSideTemp: petVitalsData.coolSideTemp,
          humidity: petVitalsData.humidity,
          lastShed: petVitalsData.lastShed,
          shedCompleteness: petVitalsData.shedCompleteness,

          // Fish-specific
          waterTemp: petVitalsData.waterTemp,
          pH: petVitalsData.pH,
          ammonia: petVitalsData.ammonia,
          nitrite: petVitalsData.nitrite,
          nitrate: petVitalsData.nitrate,
          swimmingBehavior: petVitalsData.swimmingBehavior,

          // Small mammal-specific
          gutMotility: petVitalsData.gutMotility,
          dentalHealth: petVitalsData.dentalHealth,

          lastUpdated: Timestamp.now()
        };

        patientData.vitalsComplete = true;
      } else if (!isPet) {
        // Human vitals
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

    // Convert weight to lbs for BMI calculation
    const rawWeight = parseFloat(data.currentWeight)
    let weightInLbs = rawWeight
    if (data.weightUnit === 'kg') weightInLbs = rawWeight * 2.20462
    else if (data.weightUnit === 'oz') weightInLbs = rawWeight / 16
    else if (data.weightUnit === 'g') weightInLbs = rawWeight / 453.592

    // BMI not meaningful for very small weights (newborns/infants)
    if (weightInLbs < 5) return []

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
      case 'type_selection':
        return renderTypeSelectionStep()
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

  function renderTypeSelectionStep() {
    return (
      <div className="space-y-6">
        <p className="text-center text-muted-foreground mb-8">
          Are you adding a human family member or a pet?
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Human Option */}
          <button
            type="button"
            onClick={() => setData({ ...data, memberType: 'human' })}
            className={`
              p-8 rounded-2xl border-2 transition-all text-center
              ${data.memberType === 'human'
                ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105'
                : 'bg-accent border-border hover:border-primary/50 hover:scale-105'
              }
            `}
          >
            <div className="text-5xl mb-4">👤</div>
            <h3 className="text-xl font-semibold mb-2">Human</h3>
            <p className="text-sm opacity-80">
              Family member, friend, or person you care for
            </p>
          </button>

          {/* Pet Option */}
          <button
            type="button"
            onClick={() => setData({ ...data, memberType: 'pet' })}
            className={`
              p-8 rounded-2xl border-2 transition-all text-center
              ${data.memberType === 'pet'
                ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105'
                : 'bg-accent border-border hover:border-primary/50 hover:scale-105'
              }
            `}
          >
            <div className="text-5xl mb-4">🐾</div>
            <h3 className="text-xl font-semibold mb-2">Pet</h3>
            <p className="text-sm opacity-80">
              Dog, cat, or any pet family member
            </p>
          </button>
        </div>
      </div>
    )
  }

  function renderNewbornVitalsStep() {
    // Detect low birth weight → possible preemie
    const weightInLbs = (() => {
      const w = parseFloat(data.currentWeight)
      if (!w || w <= 0) return null
      switch (data.weightUnit) {
        case 'oz': return w / 16
        case 'kg': return w * 2.20462
        case 'g': return w / 453.592
        default: return w // lbs
      }
    })()
    const isLowBirthWeight = weightInLbs !== null && weightInLbs < 5.5

    // Classify preemie type based on gestational weeks
    const gestWeeks = data.gestationalWeeks ? parseInt(data.gestationalWeeks) : null
    const preemieType = gestWeeks !== null
      ? gestWeeks < 25 ? 'Extremely Preterm' : gestWeeks < 32 ? 'Very Preterm' : gestWeeks < 34 ? 'Moderately Preterm' : gestWeeks <= 36 ? 'Late Preterm' : 'Full Term'
      : null

    return (
      <div className="space-y-6">
        {/* Birth Weight */}
        <div>
          <label className="block text-sm font-medium mb-2">Birth Weight *</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={data.currentWeight}
              onChange={(e) => setData({ ...data, currentWeight: e.target.value })}
              placeholder="e.g. 7.5"
              step="0.1"
              min="0"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
            />
            <select
              value={data.weightUnit}
              onChange={(e) => setData({ ...data, weightUnit: e.target.value as 'lbs' | 'kg' | 'oz' | 'g' })}
              className="px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
            >
              <option value="lbs">lbs</option>
              <option value="oz">oz</option>
              <option value="kg">kg</option>
              <option value="g">g</option>
            </select>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Average newborn: 5 lbs 8 oz – 8 lbs 13 oz</p>
        </div>

        {/* Preemie Detection — shown when birth weight is below average */}
        {isLowBirthWeight && (
          <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">👶</span>
              <div>
                <h4 className="font-semibold text-amber-700 dark:text-amber-300">Low Birth Weight Detected</h4>
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  Birth weight is below average ({weightInLbs?.toFixed(1)} lbs). Was this baby born prematurely?
                </p>
              </div>
            </div>

            {/* Gestational Age */}
            <div>
              <label className="block text-sm font-medium mb-2">Gestational Age at Birth (weeks)</label>
              <input
                type="number"
                value={data.gestationalWeeks || ''}
                onChange={(e) => setData({ ...data, gestationalWeeks: e.target.value })}
                placeholder="e.g. 34 (full term = 37–42)"
                min="22"
                max="42"
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
              />
              {preemieType && preemieType !== 'Full Term' && (
                <div className={`mt-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  preemieType === 'Extremely Preterm' ? 'bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/40' :
                  preemieType === 'Very Preterm' ? 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-500/40' :
                  preemieType === 'Moderately Preterm' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40' :
                  'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border border-yellow-500/40'
                }`}>
                  {preemieType} ({gestWeeks} weeks)
                  {preemieType === 'Extremely Preterm' && ' — Requires intensive NICU care'}
                  {preemieType === 'Very Preterm' && ' — Typically requires extended NICU stay'}
                  {preemieType === 'Moderately Preterm' && ' — May need NICU monitoring'}
                  {preemieType === 'Late Preterm' && ' — Close monitoring recommended'}
                </div>
              )}
            </div>

            {/* NICU Stay */}
            <div>
              <label className="block text-sm font-medium mb-2">NICU Stay</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setData({ ...data, nicuStay: true })}
                  className={`px-4 py-3 rounded-xl font-medium transition-all ${
                    data.nicuStay === true
                      ? 'bg-primary text-primary-foreground border-2 border-primary'
                      : 'bg-accent border-2 border-transparent hover:border-primary/30'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setData({ ...data, nicuStay: false, nicuDays: '' })}
                  className={`px-4 py-3 rounded-xl font-medium transition-all ${
                    data.nicuStay === false
                      ? 'bg-primary text-primary-foreground border-2 border-primary'
                      : 'bg-accent border-2 border-transparent hover:border-primary/30'
                  }`}
                >
                  No
                </button>
              </div>
              {data.nicuStay && (
                <input
                  type="number"
                  value={data.nicuDays || ''}
                  onChange={(e) => setData({ ...data, nicuDays: e.target.value })}
                  placeholder="Number of days in NICU"
                  min="0"
                  className="w-full mt-3 px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                />
              )}
            </div>

            {/* Breathing Support */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Breathing Support Required</p>
                <p className="text-xs text-muted-foreground">Ventilator, CPAP, or supplemental oxygen</p>
              </div>
              <button
                type="button"
                onClick={() => setData({ ...data, breathingSupport: !data.breathingSupport })}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  data.breathingSupport ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                  data.breathingSupport ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* Kangaroo Care */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Kangaroo Care (Skin-to-Skin)</p>
                <p className="text-xs text-muted-foreground">Stabilizes heart rate and breathing</p>
              </div>
              <button
                type="button"
                onClick={() => setData({ ...data, kangarooCare: !data.kangarooCare })}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  data.kangarooCare ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                  data.kangarooCare ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        )}

        {/* Birth Length (optional) */}
        <div>
          <label className="block text-sm font-medium mb-2">Birth Length <span className="text-muted-foreground">(optional)</span></label>
          <div className="flex gap-2">
            <input
              type="number"
              value={data.heightCm}
              onChange={(e) => setData({ ...data, heightCm: e.target.value })}
              placeholder="e.g. 20"
              step="0.1"
              min="0"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
            />
            <span className="px-4 py-3 rounded-xl border-2 border-border bg-accent text-muted-foreground">inches</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Average newborn: 18 – 22 inches</p>
        </div>

        {/* Head Circumference (optional) */}
        <div>
          <label className="block text-sm font-medium mb-2">Head Circumference <span className="text-muted-foreground">(optional)</span></label>
          <div className="flex gap-2">
            <input
              type="number"
              value={data.headCircumference || ''}
              onChange={(e) => setData({ ...data, headCircumference: e.target.value })}
              placeholder="e.g. 13.5"
              step="0.1"
              min="0"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
            />
            <span className="px-4 py-3 rounded-xl border-2 border-border bg-accent text-muted-foreground">inches</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Average newborn: 13 – 14.5 inches</p>
        </div>

        {/* Feeding Method */}
        <div>
          <label className="block text-sm font-medium mb-2">Feeding Method *</label>
          <div className="grid grid-cols-1 gap-3">
            {([
              { value: 'breastfeeding', label: 'Breastfeeding', icon: '🤱', desc: 'Exclusive breastfeeding' },
              { value: 'formula', label: 'Formula', icon: '🍼', desc: 'Formula feeding' },
              { value: 'combination', label: 'Combination', icon: '🤱🍼', desc: 'Both breast milk and formula' },
            ] as const).map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setData({ ...data, feedingPreference: option.value })}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-left
                  ${data.feedingPreference === option.value
                    ? 'bg-primary text-primary-foreground border-2 border-primary'
                    : 'bg-accent border-2 border-transparent hover:border-primary/30'
                  }
                `}
              >
                <span className="text-2xl">{option.icon}</span>
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs opacity-70">{option.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* APGAR Score (optional) */}
        <div>
          <label className="block text-sm font-medium mb-2">APGAR Score <span className="text-muted-foreground">(optional)</span></label>
          <input
            type="number"
            value={data.apgarScore || ''}
            onChange={(e) => setData({ ...data, apgarScore: e.target.value })}
            placeholder="Score (0-10)"
            min="0"
            max="10"
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
          />
          <p className="text-xs text-muted-foreground mt-1">Scored at 1 and 5 minutes after birth (0–10). Ask your delivery team if unsure.</p>
        </div>

        {/* Pediatrician Info */}
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-semibold mb-3">Pediatrician Information <span className="text-muted-foreground font-normal">(optional)</span></h4>
          <div className="space-y-3">
            <input
              type="text"
              value={data.pediatricianName || ''}
              onChange={(e) => setData({ ...data, pediatricianName: e.target.value })}
              placeholder="Pediatrician name"
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
            />
            <input
              type="tel"
              value={data.pediatricianPhone || ''}
              onChange={(e) => setData({ ...data, pediatricianPhone: e.target.value })}
              placeholder="Pediatrician phone"
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          All measurements can be updated later from the newborn&apos;s profile
        </p>
      </div>
    )
  }

  function renderVitalsStep() {
    const isPet = data.memberType === 'pet' || data.relationship === 'Pet'

    // For newborns, show pediatric-specific vitals
    if (data.relationship === 'Newborn') {
      return renderNewbornVitalsStep()
    }

    // For pets, show mode selection or vitals wizard
    if (isPet) {
      // If no mode selected yet, show mode selection
      if (!petVitalsMode && !petVitalsData) {
        return (
          <div className="space-y-6">
            <p className="text-center text-muted-foreground mb-6">
              How much detail would you like to provide?
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Mode */}
              <button
                type="button"
                onClick={() => setPetVitalsMode('basic')}
                className="p-6 rounded-2xl border-2 border-border hover:border-primary/50 hover:scale-105 transition-all text-left bg-accent"
              >
                <div className="text-3xl mb-3">📋</div>
                <h3 className="text-lg font-semibold mb-2 text-white">Basic (Recommended)</h3>
                <p className="text-sm text-white/80 mb-3">
                  Simple essentials like weight and general observations
                </p>
                <ul className="text-xs text-white/70 space-y-1">
                  <li>✓ Weight tracking</li>
                  <li>✓ Basic appearance notes</li>
                  <li>✓ Perfect for most pet owners</li>
                </ul>
              </button>

              {/* Advanced Mode */}
              <button
                type="button"
                onClick={() => setPetVitalsMode('advanced')}
                className="p-6 rounded-2xl border-2 border-border hover:border-primary/50 hover:scale-105 transition-all text-left bg-accent"
              >
                <div className="text-3xl mb-3">🔬</div>
                <h3 className="text-lg font-semibold mb-2 text-white">Advanced</h3>
                <p className="text-sm text-white/80 mb-3">
                  Detailed vitals for veterinary professionals or enthusiasts
                </p>
                <ul className="text-xs text-white/70 space-y-1">
                  <li>✓ Temperature, heart rate</li>
                  <li>✓ Species-specific metrics</li>
                  <li>✓ Vet-level detail</li>
                </ul>
              </button>
            </div>
          </div>
        )
      }

      // Mode selected, show vitals section
      return (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-accent/50 border-2 border-primary/30 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{petVitalsMode === 'basic' ? '📋' : '🔬'}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-2">
                  {petVitalsMode === 'basic' ? 'Basic Health Check' : 'Advanced Veterinary Health Check'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {petVitalsMode === 'basic'
                    ? 'Record basic health information for your pet.'
                    : 'Record detailed vital signs using our veterinary-specific health wizard.'}
                </p>

                {/* Basic Mode - Simple form */}
                {petVitalsMode === 'basic' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white">Weight *</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={data.currentWeight}
                          onChange={(e) => setData({ ...data, currentWeight: e.target.value })}
                          placeholder="Enter weight"
                          required
                          step="0.1"
                          className="flex-1 px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                        />
                        <select
                          value={data.weightUnit}
                          onChange={(e) => setData({ ...data, weightUnit: e.target.value as 'lbs' | 'kg' | 'oz' | 'g' })}
                          className="px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
                        >
                          <option value="lbs">lbs</option>
                          <option value="kg">kg</option>
                          <option value="oz">oz</option>
                          <option value="g">g</option>
                        </select>
                      </div>

                      {/* Weight Status Indicator */}
                      {data.currentWeight && parseFloat(data.currentWeight) > 0 && (
                        <PetWeightStatusIndicator
                          weight={parseFloat(data.currentWeight)}
                          weightUnit={data.weightUnit}
                          species={data.species}
                          breed={data.breed}
                          size="lg"
                          className="mt-3"
                        />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPetVitalsMode(null)
                      }}
                      className="w-full text-sm text-white/70 hover:text-white transition-colors"
                    >
                      ← Switch to Advanced Mode
                    </button>
                  </div>
                ) : (
                  /* Advanced Mode - Launch full wizard */
                  <>
                    {petVitalsData ? (
                      <div className="space-y-3">
                        <div className="p-4 bg-background/50 rounded-lg space-y-2">
                          <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">✓ Health check completed</p>
                          {petVitalsData.weight && (
                            <p className="text-sm text-muted-foreground">
                              Weight: {petVitalsData.weight} {petVitalsData.weightUnit}
                            </p>
                          )}
                          {petVitalsData.temperature && (
                            <p className="text-sm text-muted-foreground">
                              Temperature: {petVitalsData.temperature}°F
                            </p>
                          )}
                          {petVitalsData.bodyConditionScore && (
                            <p className="text-sm text-muted-foreground">
                              Body Condition: {petVitalsData.bodyConditionScore}/{petVitalsData.bodyConditionScale === '1-9' ? '9' : petVitalsData.bodyConditionScale === '1-5' ? '5' : 'Keel'}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowPetVitalsWizard(true)}
                          className="w-full px-4 py-3 rounded-xl border-2 border-primary text-primary font-medium hover:bg-primary/10 transition-colors"
                        >
                          Edit Health Information
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPetVitalsData(null)
                            setPetVitalsMode(null)
                          }}
                          className="w-full text-sm text-white/70 hover:text-white transition-colors"
                        >
                          ← Switch to Basic Mode
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setShowPetVitalsWizard(true)}
                          className="w-full px-6 py-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                        >
                          Start Veterinary Health Check
                        </button>
                        <button
                          type="button"
                          onClick={() => setPetVitalsMode(null)}
                          className="w-full text-sm text-white/70 hover:text-white transition-colors"
                        >
                          ← Switch to Basic Mode
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {petVitalsData && (
            <p className="text-xs text-muted-foreground text-center">
              Health information can be updated later from your pet's profile
            </p>
          )}
        </div>
      );
    }

    // For humans, use the standard vitals form
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
    const isPet = data.memberType === 'pet' || data.relationship === 'Pet'

    // Use memoized suggested conditions (calculated at component level)
    const suggestedConditions = isPet ? petSuggestedConditions : getSuggestedConditions()

    // Get species-specific conditions for pets - split into observable and vet-diagnosed
    let commonConditions: string[] = []
    let vetDiagnosedConditions: string[] = []

    if (isPet && data.species) {
      const allConditions = PET_HEALTH_CONDITIONS[data.species] || DEFAULT_PET_CONDITIONS

      // Observable conditions that owners can see
      const observableKeywords = ['obesity', 'dental', 'skin', 'respiratory', 'feather', 'beak', 'ear']
      commonConditions = allConditions.filter(condition =>
        observableKeywords.some(keyword => condition.toLowerCase().includes(keyword)) || condition === 'Other'
      )

      // Vet-diagnosed conditions
      vetDiagnosedConditions = allConditions.filter(condition =>
        !commonConditions.includes(condition)
      )
    }

    const adultConditions = ['Arthritis', 'Asthma', 'Thyroid Disorder', 'Kidney Disease', 'Allergies', 'Other']
    const otherConditions = !isPet
      ? (getPediatricConditions(data.dateOfBirth) || adultConditions)
      : commonConditions

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

        {/* Common/Observable Conditions */}
        {isPet && commonConditions.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2 text-foreground">Common Observable Issues</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Things you can see or notice without a vet visit
            </p>
            <div className="grid grid-cols-2 gap-3">
              {commonConditions.map(condition => {
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
        )}

        {/* Vet-Diagnosed Conditions */}
        {isPet && vetDiagnosedConditions.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2 text-foreground">Vet-Diagnosed Conditions</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Medical conditions diagnosed by a veterinarian
            </p>
            <div className="grid grid-cols-2 gap-3">
              {vetDiagnosedConditions.map(condition => {
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
        )}

        {/* Human Conditions */}
        {!isPet && (
          <div>
            <h3 className="font-semibold mb-3 text-foreground">
              {getPediatricConditions(data.dateOfBirth) ? 'Pediatric Conditions (Optional)' : 'Other Conditions (Optional)'}
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
        )}

        <p className="text-sm text-muted-foreground">
          Don't worry if you're not sure - you can always update this later in their profile.
        </p>
      </div>
    )
  }

  function renderBasicInfoStep() {
    const isPet = data.memberType === 'pet' || data.relationship === 'Pet'

    return (
      <div className="space-y-6">
        {/* Name */}
        <NameInput
          value={data.name}
          onChange={(name) => setData({ ...data, name })}
          label="Name"
          placeholder={isPet ? "Enter your pet's name" : "Enter name"}
          required
        />

        {/* Date of Birth */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {isPet ? 'Date of Birth or Adoption *' : 'Date of Birth *'}
          </label>
          <input
            type="date"
            value={data.dateOfBirth}
            onChange={(e) => {
              const dob = e.target.value
              const suggestedUnit = getDefaultWeightUnit(dob, isPet ? 'pet' : 'human', data.species)
              setData({ ...data, dateOfBirth: dob, weightUnit: suggestedUnit })
            }}
            max={getTodayDateString()}
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Relationship (only for humans) */}
        {!isPet && (
          <div>
            <label className="block text-sm font-medium mb-2">Relationship *</label>
            <select
              value={data.relationship}
              onChange={(e) => {
                const rel = e.target.value
                const updates: Partial<FamilyMemberData> = { relationship: rel }
                // Auto-configure for newborns
                if (rel === 'Newborn') {
                  updates.weightUnit = 'lbs'
                }
                setData({ ...data, ...updates })
              }}
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
            >
              <option value="">Select relationship</option>
              {RELATIONSHIPS.filter(rel => rel !== 'Pet').map(rel => (
                <option key={rel} value={rel}>{rel}</option>
              ))}
            </select>
          </div>
        )}

        {/* Pet-specific fields */}
        {isPet && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Species *</label>
              <select
                value={data.species || ''}
                onChange={(e) => setData({ ...data, species: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
              >
                <option value="">Select species</option>
                <optgroup label="Common Pets">
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                  <option value="Bird">Bird</option>
                  <option value="Fish">Fish</option>
                  <option value="Rabbit">Rabbit</option>
                  <option value="Guinea Pig">Guinea Pig</option>
                  <option value="Hamster">Hamster</option>
                  <option value="Reptile">Reptile</option>
                </optgroup>
                <optgroup label="Livestock / Farm Animals">
                  <option value="Horse">Horse</option>
                  <option value="Cow">Cow</option>
                  <option value="Pig">Pig</option>
                  <option value="Goat">Goat</option>
                  <option value="Sheep">Sheep</option>
                  <option value="Chicken">Chicken</option>
                  <option value="Duck">Duck</option>
                </optgroup>
                <optgroup label="Exotic Pets">
                  <option value="Ferret">Ferret</option>
                  <option value="Hedgehog">Hedgehog</option>
                  <option value="Sugar Glider">Sugar Glider</option>
                  <option value="Chinchilla">Chinchilla</option>
                  <option value="Parrot">Parrot (Large)</option>
                  <option value="Tortoise">Tortoise</option>
                  <option value="Snake">Snake</option>
                  <option value="Lizard">Lizard (Large)</option>
                  <option value="Pot-Bellied Pig">Pot-Bellied Pig</option>
                  <option value="Monkey">Primate</option>
                </optgroup>
                <optgroup label="Wildlife / Zoo Animals">
                  <option value="Alpaca">Alpaca / Llama</option>
                  <option value="Deer">Deer</option>
                  <option value="Emu">Emu / Ostrich</option>
                  <option value="Peacock">Peacock / Peafowl</option>
                  <option value="Turkey">Turkey</option>
                  <option value="Miniature Donkey">Miniature Donkey</option>
                  <option value="Exotic Bird">Exotic Bird</option>
                </optgroup>
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

            {/* Microchip - only for mammals (dogs, cats, rabbits, guinea pigs, hamsters) */}
            {(data.species === 'Dog' ||
              data.species === 'Cat' ||
              data.species === 'Rabbit' ||
              data.species === 'Guinea Pig' ||
              data.species === 'Hamster') && (
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
            )}
          </>
        )}

        {/* Gender (only for humans) */}
        {!isPet && (
          <div>
            {(() => {
              const isYoungChild = data.dateOfBirth
                ? ['newborn', 'infant'].includes(getHumanLifeStage(data.dateOfBirth).stage)
                : false
              const genderOptions = ['Male', 'Female']
              const labelText = isYoungChild ? 'Sex *' : 'Gender *'
              return (
                <>
                  <label className="block text-sm font-medium mb-2">{labelText}</label>
                  <div className="grid grid-cols-2 gap-3">
                      {genderOptions.map(gender => (
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
                  </>
              )
            })()}
          </div>
        )}

        {/* Option: Scan Driver's License (only for 17+) */}
        {!isPet && (() => {
          if (!data.dateOfBirth) return false
          const stage = getHumanLifeStage(data.dateOfBirth).stage
          return !['newborn', 'infant', 'toddler', 'child', 'teen'].includes(stage)
        })() && (
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
    const isPet = data.memberType === 'pet' || data.relationship === 'Pet'

    // Compute life stage and age display
    const lifeStageResult = isPet
      ? getPetLifeStage(data.dateOfBirth, data.species || '')
      : getHumanLifeStage(data.dateOfBirth)
    const ageDisplay = isPet
      ? formatPetAgeDisplay(data.dateOfBirth)
      : formatHumanAgeDisplay(data.dateOfBirth)
    const lifeStageNotices = isPet
      ? getPetLifeStageNotices(data.dateOfBirth, data.species || '')
      : getHumanLifeStageNotices(data.dateOfBirth)

    const isMinor = !isPet && ['newborn', 'infant', 'toddler', 'child', 'teen'].includes(lifeStageResult.stage)

    // Calculate height display
    let heightDisplay = ''
    if (data.heightUnit === 'imperial' && data.heightFeet) {
      heightDisplay = `${data.heightFeet}'${data.heightInches || 0}"`
    } else if (data.heightUnit === 'metric' && data.heightCm) {
      heightDisplay = `${data.heightCm} cm`
    }

    // Calculate weight display
    const weightDisplay = data.currentWeight ? `${data.currentWeight} ${data.weightUnit}` : ''

    // Life stage badge color
    const badgeColor = (() => {
      switch (lifeStageResult.stage) {
        case 'newborn': return 'bg-pink-500/20 text-pink-300 border-pink-500/50'
        case 'infant': return 'bg-pink-500/20 text-pink-300 border-pink-500/50'
        case 'toddler': return 'bg-orange-500/20 text-orange-300 border-orange-500/50'
        case 'child': return 'bg-blue-500/20 text-blue-300 border-blue-500/50'
        case 'teen': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
        case 'young': return 'bg-green-500/20 text-green-300 border-green-500/50'
        case 'senior': return 'bg-amber-500/20 text-amber-300 border-amber-500/50'
        default: return 'bg-white/10 text-white/80 border-white/20'
      }
    })()

    return (
      <div className="space-y-6">
        {/* Minor / Dependent Warning */}
        {isMinor && (
          <div className="p-4 rounded-xl bg-yellow-500/20 border-2 border-yellow-500/50">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="font-semibold mb-1 text-yellow-900 dark:text-yellow-100">
                  {lifeStageResult.label} Detected ({ageDisplay})
                </div>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  As a parent/guardian, you&apos;re responsible for managing this dependent&apos;s health data and consent.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Life Stage Health Notices */}
        {lifeStageNotices.length > 0 && (
          <div className="space-y-2">
            {lifeStageNotices.map((notice, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl text-sm ${
                  notice.type === 'warning'
                    ? 'bg-red-500/20 border border-red-500/50 text-red-800 dark:text-red-200'
                    : 'bg-blue-500/20 border border-blue-500/50 text-blue-800 dark:text-blue-200'
                }`}
              >
                {notice.message}
              </div>
            ))}
          </div>
        )}

        <div className="p-6 rounded-xl bg-accent border border-white/20 space-y-4">
          {/* Basic Info */}
          <div>
            <h3 className="font-semibold mb-2 text-white">Basic Information</h3>
            <div className="space-y-1 text-sm text-white/90">
              <p><span className="text-white/70">Name:</span> {data.name}</p>
              <p>
                <span className="text-white/70">Date of Birth:</span> {data.dateOfBirth}
                {ageDisplay && ` (${ageDisplay})`}
                <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${badgeColor}`}>
                  {lifeStageResult.label}
                </span>
              </p>
              {!isPet && <p><span className="text-white/70">Relationship:</span> {data.relationship}</p>}
              {!isPet && <p><span className="text-white/70">Gender:</span> {data.gender}</p>}
              {isPet && <p><span className="text-white/70">Species:</span> {data.species}</p>}
              {isPet && data.breed && <p><span className="text-white/70">Breed:</span> {data.breed}</p>}
              {isPet && data.microchipNumber && <p><span className="text-white/70">Microchip:</span> {data.microchipNumber}</p>}
            </div>
          </div>

          {/* Vitals */}
          {(heightDisplay || weightDisplay) && (
            <div className="pt-4 border-t border-white/20">
              <h3 className="font-semibold mb-2 text-white">Health Vitals</h3>
              <div className="space-y-3 text-sm text-white/90">
                {heightDisplay && <p><span className="text-white/70">Height:</span> {heightDisplay}</p>}
                {weightDisplay && (
                  <>
                    <p><span className="text-white/70">Weight:</span> {weightDisplay}</p>
                    {/* Weight Status Indicator for Pets */}
                    {isPet && data.currentWeight && parseFloat(data.currentWeight) > 0 && (
                      <PetWeightStatusIndicator
                        weight={parseFloat(data.currentWeight)}
                        weightUnit={data.weightUnit}
                        species={data.species}
                        breed={data.breed}
                        size="sm"
                      />
                    )}
                  </>
                )}
                {data.activityLevel && <p><span className="text-white/70">Activity Level:</span> {data.activityLevel}</p>}
                {data.weightGoal && <p><span className="text-white/70">Goal:</span> {data.weightGoal.replace(/-/g, ' ')}</p>}
                {data.targetWeight && <p><span className="text-white/70">Target Weight:</span> {data.targetWeight} {data.weightUnit}</p>}
              </div>
            </div>
          )}

          {/* Newborn-specific review */}
          {data.relationship === 'Newborn' && (
            <div className="pt-4 border-t border-white/20">
              <h3 className="font-semibold mb-2 text-white">Newborn Details</h3>
              <div className="space-y-1 text-sm text-white/90">
                {data.feedingPreference && (
                  <p><span className="text-white/70">Feeding:</span> {data.feedingPreference === 'breastfeeding' ? 'Breastfeeding' : data.feedingPreference === 'formula' ? 'Formula' : 'Combination'}</p>
                )}
                {data.headCircumference && (
                  <p><span className="text-white/70">Head Circumference:</span> {data.headCircumference} in</p>
                )}
                {data.apgarScore && (
                  <p><span className="text-white/70">APGAR Score:</span> {data.apgarScore}/10</p>
                )}
                {data.gestationalWeeks && (
                  <p>
                    <span className="text-white/70">Gestational Age:</span> {data.gestationalWeeks} weeks
                    {parseInt(data.gestationalWeeks) < 37 && (
                      <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/50">
                        Preemie
                      </span>
                    )}
                  </p>
                )}
                {data.nicuStay && (
                  <p><span className="text-white/70">NICU Stay:</span> Yes{data.nicuDays ? ` (${data.nicuDays} days)` : ''}</p>
                )}
                {data.breathingSupport && (
                  <p><span className="text-white/70">Breathing Support:</span> Required</p>
                )}
                {data.kangarooCare && (
                  <p><span className="text-white/70">Kangaroo Care:</span> Yes</p>
                )}
                {data.pediatricianName && (
                  <p><span className="text-white/70">Pediatrician:</span> {data.pediatricianName}</p>
                )}
                {data.pediatricianPhone && (
                  <p><span className="text-white/70">Pediatrician Phone:</span> {data.pediatricianPhone}</p>
                )}
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

      {/* Pet Vitals Wizard Modal */}
      {isPet && (
        <PetVitalsWizard
          isOpen={showPetVitalsWizard}
          onClose={() => setShowPetVitalsWizard(false)}
          petData={{
            speciesCategory: getSpeciesCategory(data.species),
            speciesDetail: data.species,
            breed: data.breed,
            name: data.name
          }}
          onComplete={(vitalsData) => {
            setPetVitalsData(vitalsData);
            setShowPetVitalsWizard(false);

            // Auto-populate weight from pet vitals
            if (vitalsData.weight) {
              const weightUnit = vitalsData.weightUnit || 'lbs';
              setData({
                ...data,
                currentWeight: vitalsData.weight.toString(),
                weightUnit: weightUnit as 'lbs' | 'kg' | 'oz' | 'g'
              });
            }

            toast.success('Health information saved!');
          }}
        />
      )}
    </div>
  )
}
