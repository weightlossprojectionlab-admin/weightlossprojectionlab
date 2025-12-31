/**
 * Veterinary Health Tracking System
 * Comprehensive TypeScript interfaces for multi-species pet health monitoring
 * Based on veterinary medical standards and species-specific requirements
 */

// ============================================
// SPECIES TAXONOMY
// ============================================

export enum PetSpeciesCategory {
  MAMMAL_CANINE = 'mammal_canine',
  MAMMAL_FELINE = 'mammal_feline',
  MAMMAL_SMALL = 'mammal_small', // Rabbits, guinea pigs, hamsters, ferrets
  AVIAN = 'avian',
  REPTILE = 'reptile',
  AMPHIBIAN = 'amphibian',
  FISH = 'fish',
  OTHER = 'other'
}

// ============================================
// CORE MEASUREMENT STRUCTURES
// ============================================

/**
 * Universal measurement with clinical context
 */
export interface VitalSignMeasurement {
  value: number;
  unit: string;
  timestamp: Date;
  recordedBy: string; // User ID or 'veterinarian'
  method?: string; // e.g., "rectal thermometer", "femoral pulse"
  context?: 'resting' | 'active' | 'stressed' | 'post-exercise';
  notes?: string;
}

/**
 * Reference range with severity indicators
 */
export interface VitalSignReferenceRange {
  normal: { min: number; max: number };
  unit: string;
  criticalLow?: number;
  criticalHigh?: number;
  warningLow?: number;
  warningHigh?: number;
  ageAdjustments?: {
    [ageGroup: string]: { min: number; max: number };
  };
  speciesAdjustments?: {
    [subspecies: string]: { min: number; max: number };
  };
}

// ============================================
// UNIVERSAL VITAL SIGNS
// ============================================

export interface UniversalVitalSigns {
  temperature?: VitalSignMeasurement[];
  heartRate?: VitalSignMeasurement[];
  respiratoryRate?: VitalSignMeasurement[];
  weight?: VitalSignMeasurement[];
  bodyConditionScore?: {
    score: number;
    scale: string; // e.g., "1-9", "1-5"
    timestamp: Date;
    assessedBy: string;
    notes?: string;
  }[];
}

// ============================================
// SPECIES-SPECIFIC METRICS
// ============================================

/**
 * Mammal-specific metrics (dogs, cats, small mammals)
 */
export interface MammalSpecificMetrics {
  capillaryRefillTime?: VitalSignMeasurement[];
  mucousMembraneColor?: {
    color: 'pink' | 'pale' | 'blue' | 'yellow' | 'brick-red';
    timestamp: Date;
    notes?: string;
  }[];
  hydrationStatus?: {
    skinTentSeconds: number;
    assessment: 'normal' | 'mild-dehydration' | 'moderate-dehydration' | 'severe-dehydration';
    timestamp: Date;
  }[];
  dentalHealth?: {
    tartar: 0 | 1 | 2 | 3 | 4; // 0-4 scale
    gingivitis: boolean;
    missingTeeth: number;
    overgrowth?: boolean; // For rabbits, guinea pigs
    timestamp: Date;
    notes?: string;
  }[];
}

/**
 * Avian-specific health metrics
 */
export interface AvianSpecificMetrics {
  cropHealth?: {
    emptyingTime: number; // hours
    status: 'normal' | 'slow' | 'impacted' | 'sour';
    timestamp: Date;
  }[];
  featherCondition?: {
    molting: boolean;
    featherDestructiveBehavior: boolean;
    abnormalFeathers: string[];
    timestamp: Date;
  }[];
  droppings?: {
    fecesConsistency: 'normal' | 'loose' | 'watery' | 'absent';
    urateColor: 'white' | 'cream' | 'yellow' | 'green';
    urineAmount: 'normal' | 'increased' | 'decreased';
    frequency: number; // per day
    timestamp: Date;
  }[];
  beakAndNails?: {
    beakOvergrowth: boolean;
    nailOvergrowth: boolean;
    timestamp: Date;
  }[];
  tailBobbing?: {
    present: boolean;
    severity?: 'mild' | 'moderate' | 'severe';
    timestamp: Date;
  }[];
}

/**
 * Reptile-specific health metrics
 */
export interface ReptileSpecificMetrics {
  environmentalParameters?: {
    temperature: {
      baskingSpot: VitalSignMeasurement;
      coolSide: VitalSignMeasurement;
      nighttime?: VitalSignMeasurement;
    };
    humidity: VitalSignMeasurement;
    uvbExposure?: {
      uviIndex: number;
      hoursPerDay: number;
      lastBulbChange: Date;
    };
    photoperiod: {
      lightHours: number;
      darkHours: number;
    };
    timestamp: Date;
  }[];
  shedding?: {
    inProgress: boolean;
    completeness: 'complete' | 'partial' | 'stuck';
    stuckLocations?: string[];
    daysSinceLastShed?: number;
    timestamp: Date;
  }[];
  shellCondition?: {
    // For turtles/tortoises
    hardness: 'normal' | 'soft' | 'brittle';
    pyramiding: boolean;
    rotPresent: boolean;
    injuries: string[];
    timestamp: Date;
  }[];
  fecalOutput?: {
    fecesPresent: boolean;
    uratesColor: 'white' | 'yellow' | 'brown';
    consistency: 'normal' | 'loose' | 'hard';
    daysSinceLastBowelMovement: number;
    timestamp: Date;
  }[];
}

/**
 * Fish-specific health metrics
 */
export interface FishSpecificMetrics {
  waterQualityParameters?: {
    temperature: VitalSignMeasurement;
    pH: VitalSignMeasurement;
    ammonia: VitalSignMeasurement; // ppm
    nitrite: VitalSignMeasurement; // ppm
    nitrate: VitalSignMeasurement; // ppm
    salinity?: VitalSignMeasurement; // specific gravity for saltwater
    dissolvedOxygen?: VitalSignMeasurement; // mg/L
    timestamp: Date;
  }[];
  behaviorObservations?: {
    swimmingBehavior: 'normal' | 'lethargic' | 'erratic' | 'gasping-at-surface';
    feedingResponse: 'normal' | 'reduced' | 'none';
    bodyPosition: 'normal' | 'floating' | 'sinking' | 'tilted';
    timestamp: Date;
  }[];
  skinAndScales?: {
    lesions: boolean;
    parasitesVisible: boolean;
    colorChanges: boolean;
    fungalGrowth: boolean;
    timestamp: Date;
  }[];
  finCondition?: {
    tears: boolean;
    rotPresent: boolean;
    clamping: boolean;
    timestamp: Date;
  }[];
  gillMovementRate?: VitalSignMeasurement[]; // beats per minute
}

/**
 * Small mammal specific (rabbits, guinea pigs, hamsters)
 */
export interface SmallMammalSpecificMetrics extends MammalSpecificMetrics {
  gutMotility?: {
    fecalOutputNormal: boolean;
    cecotropesPresent?: boolean; // Rabbits
    lastBowelMovement: Date;
    timestamp: Date;
  }[];
  cheekPouchHealth?: {
    // Hamsters
    impacted: boolean;
    abscess: boolean;
    timestamp: Date;
  }[];
  vitaminCSupplementation?: {
    // Guinea pigs
    dailyDose: number; // mg
    method: 'food' | 'water' | 'supplement';
    timestamp: Date;
  }[];
}

// ============================================
// MAIN HEALTH RECORD
// ============================================

export interface PetHealthRecord {
  petId: string;
  householdId: string;
  speciesCategory: PetSpeciesCategory;
  speciesDetail: string; // e.g., "Bearded Dragon", "Golden Retriever"
  breed?: string;

  // Universal vital signs
  universalVitals: UniversalVitalSigns;

  // Species-specific metrics (only populated for relevant species)
  mammalMetrics?: MammalSpecificMetrics;
  avianMetrics?: AvianSpecificMetrics;
  reptileMetrics?: ReptileSpecificMetrics;
  fishMetrics?: FishSpecificMetrics;
  smallMammalMetrics?: SmallMammalSpecificMetrics;

  // Reference ranges (species and age-specific)
  referenceRanges: {
    temperature?: VitalSignReferenceRange;
    heartRate?: VitalSignReferenceRange;
    respiratoryRate?: VitalSignReferenceRange;
    weight?: VitalSignReferenceRange;
    speciesSpecificRanges?: Record<string, VitalSignReferenceRange>;
  };

  // Clinical metadata
  lastVeterinaryVisit?: Date;
  nextScheduledCheckup?: Date;
  veterinarianNotes?: string[];

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// HEALTH CONDITIONS & DIAGNOSIS
// ============================================

export interface HealthCondition {
  conditionId: string;
  petId: string;
  name: string;
  category: 'acute' | 'chronic' | 'preventive' | 'wellness';
  speciesRelevance: PetSpeciesCategory[];
  diagnosisDate?: Date;
  resolvedDate?: Date;
  status: 'active' | 'resolved' | 'monitoring' | 'suspected';
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  diagnosedBy?: string; // Veterinarian name or user
  treatment?: {
    medications: Medication[];
    dietaryChanges?: string;
    environmentalChanges?: string;
    followUpSchedule?: Date[];
  };
  notes?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  route: 'oral' | 'topical' | 'injection' | 'other';
  startDate: Date;
  endDate?: Date;
  prescribedBy?: string;
  refillReminders?: boolean;
}

// ============================================
// VACCINATION & PREVENTIVE CARE
// ============================================

export interface VaccinationRecord {
  vaccinationId: string;
  petId: string;
  vaccineName: string;
  manufacturer?: string;
  lotNumber?: string;
  administeredDate: Date;
  nextDueDate?: Date;
  administeredBy: string; // Veterinarian or clinic
  site?: string; // Injection site
  adverseReactions?: string;
  speciesApplicable: PetSpeciesCategory[];
}

export interface PreventiveCareSchedule {
  petId: string;
  speciesCategory: PetSpeciesCategory;
  schedule: {
    ageWeeks: number;
    careName: string;
    type: 'vaccination' | 'deworming' | 'flea-tick' | 'heartworm' | 'wellness-exam' | 'dental' | 'other';
    dueDate?: Date;
    completed: boolean;
    completedDate?: Date;
    notes?: string;
  }[];
}

// ============================================
// ALERT & MONITORING SYSTEM
// ============================================

export interface VitalSignAlert {
  alertId: string;
  petId: string;
  metric: string;
  value: number;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  recommendedAction?: string;
}

// ============================================
// BODY CONDITION SCORING
// ============================================

export interface BodyConditionScore {
  score: number;
  scale: '1-5' | '1-9' | 'keel-bone';
  description: string;
  visualIndicators: string[];
  palpationIndicators: string[];
  healthImplications?: string;
}

// ============================================
// COMMON CONDITIONS BY SPECIES
// ============================================

export const COMMON_CONDITIONS_BY_SPECIES: Record<PetSpeciesCategory, string[]> = {
  [PetSpeciesCategory.MAMMAL_CANINE]: [
    'Skin Allergies/Dermatitis',
    'Gastrointestinal Issues',
    'Dental Disease',
    'Obesity',
    'Arthritis/Joint Disease',
    'Ear Infections',
    'Urinary Tract Infections',
    'Anxiety/Behavioral Issues',
    'Parasites (Fleas, Ticks, Worms)',
    'Diabetes Mellitus'
  ],
  [PetSpeciesCategory.MAMMAL_FELINE]: [
    'Chronic Kidney Disease',
    'Hyperthyroidism',
    'Urinary Tract Disease (FLUTD)',
    'Dental Disease',
    'Obesity',
    'Diabetes Mellitus',
    'Inflammatory Bowel Disease',
    'Upper Respiratory Infections',
    'Parasites',
    'Hyperthyroidism'
  ],
  [PetSpeciesCategory.AVIAN]: [
    'Psittacosis (Chlamydiosis)',
    'Feather Destructive Behavior',
    'Nutritional Deficiencies',
    'Aspergillosis',
    'Bumblefoot',
    'Egg Binding',
    'Crop Stasis/Sour Crop',
    'Psittacine Beak and Feather Disease (PBFD)',
    'Heavy Metal Toxicity',
    'Obesity'
  ],
  [PetSpeciesCategory.MAMMAL_SMALL]: [
    'Gastrointestinal Stasis',
    'Dental Disease',
    'Urinary Tract Disease',
    'Ear Mites',
    'Respiratory Infections',
    'Obesity',
    'Scurvy (Guinea Pigs)',
    'Wet Tail (Hamsters)',
    'Parasites',
    'Cheek Pouch Impaction (Hamsters)'
  ],
  [PetSpeciesCategory.REPTILE]: [
    'Metabolic Bone Disease (MBD)',
    'Respiratory Infections',
    'Parasites (Internal/External)',
    'Dystocia (Egg Binding)',
    'Shell Rot',
    'Mouth Rot (Stomatitis)',
    'Impaction',
    'Dehydration',
    'Burns',
    'Nutritional Deficiencies'
  ],
  [PetSpeciesCategory.FISH]: [
    'Ich (White Spot Disease)',
    'Fin Rot',
    'Swim Bladder Disorder',
    'Fungal Infections',
    'Ammonia Poisoning',
    'Dropsy',
    'Velvet Disease',
    'Columnaris',
    'Anchor Worms',
    'Pop Eye'
  ],
  [PetSpeciesCategory.AMPHIBIAN]: [
    'Red Leg Disease',
    'Fungal Infections',
    'Parasites',
    'Metabolic Bone Disease',
    'Nutritional Deficiencies',
    'Dehydration',
    'Skin Lesions',
    'Respiratory Infections'
  ],
  [PetSpeciesCategory.OTHER]: []
};
