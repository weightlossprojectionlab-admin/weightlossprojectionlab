'use client';

import { useState, useEffect } from 'react';
import { PetSpeciesCategory } from '@/types/pet-health';
import { getReferenceRanges, evaluateVitalSign, getVitalSignAlertMessage } from '@/lib/pet-health-reference-ranges';
import { getWeightUnits, getDefaultWeightUnit } from '@/lib/pet-weight-ranges';

interface PetVitalsWizardProps {
  isOpen: boolean;
  onClose: () => void;
  petData: {
    speciesCategory: PetSpeciesCategory;
    speciesDetail?: string;
    breed?: string;
    name?: string;
  };
  onComplete: (vitalsData: PetVitalsData) => void;
}

export interface PetVitalsData {
  // Universal vitals
  weight?: number;
  weightUnit?: 'lbs' | 'kg' | 'g';
  temperature?: number;
  heartRate?: number;
  respiratoryRate?: number;
  bodyConditionScore?: number;
  bodyConditionScale?: '1-5' | '1-9' | 'keel-bone';

  // Mammal-specific
  mucousMembraneColor?: 'pink' | 'pale' | 'blue' | 'yellow' | 'brick-red';
  capillaryRefillTime?: number;
  hydrationStatus?: 'normal' | 'mild-dehydration' | 'moderate-dehydration' | 'severe-dehydration';

  // Avian-specific
  cropStatus?: 'normal' | 'slow' | 'impacted' | 'sour';
  featherCondition?: 'normal' | 'molting' | 'destructive-behavior' | 'abnormal';
  tailBobbing?: boolean;

  // Reptile-specific
  baskingTemp?: number;
  coolSideTemp?: number;
  humidity?: number;
  lastShed?: Date;
  shedCompleteness?: 'complete' | 'partial' | 'stuck';

  // Fish-specific
  waterTemp?: number;
  pH?: number;
  ammonia?: number;
  nitrite?: number;
  nitrate?: number;
  swimmingBehavior?: 'normal' | 'lethargic' | 'erratic' | 'gasping-at-surface';

  // Small mammal-specific (rabbits, guinea pigs, hamsters)
  gutMotility?: 'normal' | 'reduced' | 'absent';
  dentalHealth?: 'normal' | 'overgrown' | 'concerning';
}

export default function PetVitalsWizard({ isOpen, onClose, petData, onComplete }: PetVitalsWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [vitals, setVitals] = useState<PetVitalsData>({});
  const [alerts, setAlerts] = useState<string[]>([]);

  const { speciesCategory, speciesDetail, name, breed } = petData;
  const referenceRanges = getReferenceRanges(speciesCategory, speciesDetail);

  // Get appropriate weight units for this species/breed
  const availableWeightUnits = getWeightUnits(speciesDetail, breed);
  const defaultWeightUnit = getDefaultWeightUnit(speciesDetail, breed);

  // Determine which steps to show based on species
  const getStepsForSpecies = () => {
    const baseSteps = ['Basic Vitals', 'Body Condition'];

    switch (speciesCategory) {
      case PetSpeciesCategory.MAMMAL_CANINE:
      case PetSpeciesCategory.MAMMAL_FELINE:
        return [...baseSteps, 'Clinical Signs', 'Review'];

      case PetSpeciesCategory.AVIAN:
        return [...baseSteps, 'Avian Health', 'Review'];

      case PetSpeciesCategory.REPTILE:
        return [...baseSteps, 'Environment', 'Shedding', 'Review'];

      case PetSpeciesCategory.FISH:
        return ['Water Quality', 'Behavior', 'Review'];

      case PetSpeciesCategory.MAMMAL_SMALL:
        return [...baseSteps, 'Species-Specific', 'Review'];

      default:
        return [...baseSteps, 'Review'];
    }
  };

  const steps = getStepsForSpecies();
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Validate vital signs and generate alerts
  const validateVitalSign = (metric: string, value: number, unit: string) => {
    const refRange = referenceRanges[metric as keyof typeof referenceRanges];
    if (!refRange) return;

    const evaluation = evaluateVitalSign(value, refRange);
    if (evaluation !== 'normal') {
      const alert = getVitalSignAlertMessage(metric, value, unit, evaluation, speciesCategory);
      setAlerts(prev => [...prev, alert.message]);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete(vitals);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-foreground">
              Pet Health Check: {name || 'New Pet'}
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <span className="capitalize">{speciesDetail || speciesCategory.replace('_', ' ')}</span>
            <span>•</span>
            <span>Step {currentStep + 1} of {steps.length}: {steps[currentStep]}</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mx-6 mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <h3 className="font-semibold text-destructive mb-2">⚠️ Health Alerts</h3>
            <ul className="space-y-1 text-sm text-destructive">
              {alerts.map((alert, idx) => (
                <li key={idx}>• {alert}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 0: Basic Vitals (Most Species) */}
          {currentStep === 0 && speciesCategory !== PetSpeciesCategory.FISH && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Basic Vital Signs</h3>
              <p className="text-sm text-muted-foreground">
                Record your pet's vital signs. These measurements help veterinarians track health trends.
              </p>

              {/* Weight */}
              <div>
                <label className="block text-sm font-medium mb-2">Weight *</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={vitals.weight || ''}
                    onChange={(e) => setVitals({ ...vitals, weight: parseFloat(e.target.value) })}
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                    placeholder="0.0"
                  />
                  <select
                    value={vitals.weightUnit || defaultWeightUnit}
                    onChange={(e) => setVitals({ ...vitals, weightUnit: e.target.value as 'lbs' | 'kg' | 'g' })}
                    className="px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                  >
                    {availableWeightUnits.map(unit => (
                      <option key={unit} value={unit}>
                        {unit === 'g' ? 'grams' : unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Temperature */}
              {referenceRanges.temperature && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Temperature (°F)
                    <span className="text-muted-foreground ml-2 font-normal">
                      Normal: {referenceRanges.temperature.normal.min} - {referenceRanges.temperature.normal.max}°F
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitals.temperature || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      setVitals({ ...vitals, temperature: value });
                      if (value && referenceRanges.temperature) {
                        validateVitalSign('temperature', value, '°F');
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                    placeholder="e.g., 101.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use rectal thermometer for accurate readings
                  </p>
                </div>
              )}

              {/* Heart Rate */}
              {referenceRanges.heartRate && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Heart Rate (bpm)
                    <span className="text-muted-foreground ml-2 font-normal">
                      Normal: {referenceRanges.heartRate.normal.min} - {referenceRanges.heartRate.normal.max} bpm
                    </span>
                  </label>
                  <input
                    type="number"
                    value={vitals.heartRate || ''}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setVitals({ ...vitals, heartRate: value });
                      if (value && referenceRanges.heartRate) {
                        validateVitalSign('heartRate', value, 'bpm');
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                    placeholder="e.g., 120"
                  />
                </div>
              )}

              {/* Respiratory Rate */}
              {referenceRanges.respiratoryRate && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Respiratory Rate (breaths/min)
                    <span className="text-muted-foreground ml-2 font-normal">
                      Normal: {referenceRanges.respiratoryRate.normal.min} - {referenceRanges.respiratoryRate.normal.max} breaths/min
                    </span>
                  </label>
                  <input
                    type="number"
                    value={vitals.respiratoryRate || ''}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setVitals({ ...vitals, respiratoryRate: value });
                      if (value && referenceRanges.respiratoryRate) {
                        validateVitalSign('respiratoryRate', value, 'breaths/min');
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                    placeholder="e.g., 25"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Count chest movements for 15 seconds, multiply by 4
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 0: Water Quality (Fish Only) */}
          {currentStep === 0 && speciesCategory === PetSpeciesCategory.FISH && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Water Quality Parameters</h3>
              <p className="text-sm text-muted-foreground">
                Water quality is the most critical factor in fish health. Test weekly with aquarium test kit.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Temperature (°F) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitals.waterTemp || ''}
                    onChange={(e) => setVitals({ ...vitals, waterTemp: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                    placeholder="e.g., 76.5"
                  />
                </div>

                {/* pH */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    pH *
                    <span className="text-muted-foreground ml-2 font-normal">6.5-7.5</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitals.pH || ''}
                    onChange={(e) => setVitals({ ...vitals, pH: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                    placeholder="e.g., 7.0"
                  />
                </div>

                {/* Ammonia */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Ammonia (ppm) *
                    <span className="text-destructive ml-2 font-normal">Must be 0</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={vitals.ammonia || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      setVitals({ ...vitals, ammonia: value });
                      if (value > 0) {
                        setAlerts(prev => [...prev, '⚠️ CRITICAL: Ammonia detected! Immediate water change required.']);
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                    placeholder="0.00"
                  />
                </div>

                {/* Nitrite */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nitrite (ppm) *
                    <span className="text-destructive ml-2 font-normal">Must be 0</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={vitals.nitrite || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      setVitals({ ...vitals, nitrite: value });
                      if (value > 0) {
                        setAlerts(prev => [...prev, '⚠️ CRITICAL: Nitrite detected! Immediate water change required.']);
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                    placeholder="0.00"
                  />
                </div>

                {/* Nitrate */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Nitrate (ppm)
                    <span className="text-muted-foreground ml-2 font-normal">Safe: &lt;20 ppm</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={vitals.nitrate || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      setVitals({ ...vitals, nitrate: value });
                      if (value > 40) {
                        setAlerts(prev => [...prev, '⚠️ WARNING: Nitrate high. Perform water change soon.']);
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                    placeholder="e.g., 10"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  💡 <strong>Tip:</strong> Ammonia and Nitrite should always be 0 ppm in a healthy, cycled aquarium. Any reading above 0 indicates a serious problem requiring immediate action.
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Body Condition Score */}
          {currentStep === 1 && speciesCategory !== PetSpeciesCategory.FISH && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Body Condition Score</h3>
              <p className="text-sm text-muted-foreground">
                Assess your pet's body condition by feeling their ribs, spine, and observing their overall shape.
              </p>

              <div>
                <label className="block text-sm font-medium mb-2">Body Condition Score</label>
                <select
                  value={vitals.bodyConditionScore || ''}
                  onChange={(e) => {
                    const scale = speciesCategory === PetSpeciesCategory.AVIAN ? 'keel-bone' as const :
                                 speciesCategory === PetSpeciesCategory.MAMMAL_SMALL ? '1-5' as const :
                                 '1-9' as const;
                    setVitals({
                      ...vitals,
                      bodyConditionScore: parseInt(e.target.value),
                      bodyConditionScale: scale
                    });
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="">Select condition...</option>
                  {speciesCategory === PetSpeciesCategory.AVIAN ? (
                    <>
                      <option value="1">Severely Underconditioned - Keel bone very prominent</option>
                      <option value="3">Ideal - Slight muscle over keel, rounded breast</option>
                      <option value="5">Overconditioned - Keel difficult to feel, excessive fat</option>
                    </>
                  ) : speciesCategory === PetSpeciesCategory.MAMMAL_SMALL ? (
                    <>
                      <option value="1">1 - Very Thin (ribs, spine easily visible)</option>
                      <option value="2">2 - Underweight</option>
                      <option value="3">3 - Ideal (ribs palpable, good muscle tone)</option>
                      <option value="4">4 - Overweight</option>
                      <option value="5">5 - Obese (ribs difficult to feel)</option>
                    </>
                  ) : (
                    <>
                      <option value="1">1 - Emaciated</option>
                      <option value="3">3 - Underweight</option>
                      <option value="5">5 - Ideal</option>
                      <option value="7">7 - Overweight</option>
                      <option value="9">9 - Obese</option>
                    </>
                  )}
                </select>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                <p className="text-sm text-green-900 dark:text-green-100">
                  <strong>Ideal Body Condition:</strong> You should be able to feel your pet's ribs easily with light pressure,
                  but they shouldn't be visibly protruding. There should be a visible waist when viewed from above.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Clinical Signs (Dogs & Cats) */}
          {currentStep === 2 && (speciesCategory === PetSpeciesCategory.MAMMAL_CANINE || speciesCategory === PetSpeciesCategory.MAMMAL_FELINE) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Clinical Signs</h3>
              <p className="text-sm text-muted-foreground">
                Additional health indicators veterinarians check during physical exams.
              </p>

              {/* Mucous Membrane Color */}
              <div>
                <label className="block text-sm font-medium mb-2">Gum Color (Mucous Membranes)</label>
                <select
                  value={vitals.mucousMembraneColor || ''}
                  onChange={(e) => setVitals({ ...vitals, mucousMembraneColor: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="">Select color...</option>
                  <option value="pink">Pink (Normal)</option>
                  <option value="pale">Pale (Possible anemia)</option>
                  <option value="blue">Blue (Oxygen deficiency - EMERGENCY)</option>
                  <option value="yellow">Yellow (Possible liver issue)</option>
                  <option value="brick-red">Brick Red (Heat stroke or shock)</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Gently lift the upper lip to examine gum color
                </p>
              </div>

              {/* Capillary Refill Time */}
              <div>
                <label className="block text-sm font-medium mb-2">Capillary Refill Time (seconds)</label>
                <input
                  type="number"
                  step="0.5"
                  value={vitals.capillaryRefillTime || ''}
                  onChange={(e) => setVitals({ ...vitals, capillaryRefillTime: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                  placeholder="e.g., 1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Press on gums until white, release, count seconds until color returns. Normal: &lt;2 seconds
                </p>
              </div>

              {/* Hydration Status */}
              <div>
                <label className="block text-sm font-medium mb-2">Hydration Status</label>
                <select
                  value={vitals.hydrationStatus || ''}
                  onChange={(e) => setVitals({ ...vitals, hydrationStatus: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="">Select status...</option>
                  <option value="normal">Normal (Skin snaps back immediately)</option>
                  <option value="mild-dehydration">Mild Dehydration (Skin slow to return)</option>
                  <option value="moderate-dehydration">Moderate Dehydration (Skin tents briefly)</option>
                  <option value="severe-dehydration">Severe Dehydration (Skin stays tented - EMERGENCY)</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Gently pinch skin on back of neck - healthy skin springs back immediately
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Avian Health */}
          {currentStep === 2 && speciesCategory === PetSpeciesCategory.AVIAN && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Avian Health Indicators</h3>

              <div>
                <label className="block text-sm font-medium mb-2">Crop Status (if applicable)</label>
                <select
                  value={vitals.cropStatus || ''}
                  onChange={(e) => setVitals({ ...vitals, cropStatus: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="">Select status...</option>
                  <option value="normal">Normal (Empties within 2-4 hours)</option>
                  <option value="slow">Slow Emptying</option>
                  <option value="impacted">Impacted (Seek vet immediately)</option>
                  <option value="sour">Sour Crop (Seek vet immediately)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Feather Condition</label>
                <select
                  value={vitals.featherCondition || ''}
                  onChange={(e) => setVitals({ ...vitals, featherCondition: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="">Select condition...</option>
                  <option value="normal">Normal, well-groomed</option>
                  <option value="molting">Currently molting</option>
                  <option value="destructive-behavior">Feather plucking/destructive behavior</option>
                  <option value="abnormal">Abnormal feathers or bare patches</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tail Bobbing (Respiratory Indicator)</label>
                <select
                  value={vitals.tailBobbing ? 'yes' : 'no'}
                  onChange={(e) => setVitals({ ...vitals, tailBobbing: e.target.value === 'yes' })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="no">No tail bobbing (Normal)</option>
                  <option value="yes">Tail bobbing present (Respiratory distress - URGENT)</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Tail bobbing with each breath indicates respiratory difficulty
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Environment (Reptiles) */}
          {currentStep === 2 && speciesCategory === PetSpeciesCategory.REPTILE && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Environmental Parameters</h3>
              <p className="text-sm text-muted-foreground">
                Proper temperature and humidity are critical for reptile health.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Basking Spot Temp (°F) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitals.baskingTemp || ''}
                    onChange={(e) => setVitals({ ...vitals, baskingTemp: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                    placeholder="e.g., 95"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Cool Side Temp (°F) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitals.coolSideTemp || ''}
                    onChange={(e) => setVitals({ ...vitals, coolSideTemp: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                    placeholder="e.g., 78"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Humidity (%)</label>
                <input
                  type="number"
                  value={vitals.humidity || ''}
                  onChange={(e) => setVitals({ ...vitals, humidity: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                  placeholder="e.g., 35"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use digital hygrometer for accurate humidity readings
                </p>
              </div>

              <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                <p className="text-sm text-orange-900 dark:text-orange-100">
                  ⚠️ <strong>Important:</strong> Temperature requirements vary significantly by species.
                  Verify the correct ranges for your specific reptile species.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Shedding (Reptiles) */}
          {currentStep === 3 && speciesCategory === PetSpeciesCategory.REPTILE && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Shedding Status</h3>

              <div>
                <label className="block text-sm font-medium mb-2">Last Shed Date</label>
                <input
                  type="date"
                  value={vitals.lastShed ? new Date(vitals.lastShed).toISOString().split('T')[0] : ''}
                  onChange={(e) => setVitals({ ...vitals, lastShed: new Date(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Shed Completeness</label>
                <select
                  value={vitals.shedCompleteness || ''}
                  onChange={(e) => setVitals({ ...vitals, shedCompleteness: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="">Select completeness...</option>
                  <option value="complete">Complete (Full body shed in one piece)</option>
                  <option value="partial">Partial (Some areas not yet shed)</option>
                  <option value="stuck">Stuck Shed (Retained on toes, tail, or eyes)</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 1: Behavior (Fish) */}
          {currentStep === 1 && speciesCategory === PetSpeciesCategory.FISH && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Behavior & Visual Health</h3>

              <div>
                <label className="block text-sm font-medium mb-2">Swimming Behavior</label>
                <select
                  value={vitals.swimmingBehavior || ''}
                  onChange={(e) => setVitals({ ...vitals, swimmingBehavior: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="">Select behavior...</option>
                  <option value="normal">Normal - Swimming actively, exploring</option>
                  <option value="lethargic">Lethargic - Sitting on bottom, minimal movement</option>
                  <option value="erratic">Erratic - Flashing, darting, unusual movements</option>
                  <option value="gasping-at-surface">Gasping at Surface (URGENT - oxygen issue)</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Species-Specific (Small Mammals) */}
          {currentStep === 2 && speciesCategory === PetSpeciesCategory.MAMMAL_SMALL && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Species-Specific Health</h3>

              <div>
                <label className="block text-sm font-medium mb-2">Gut Motility (Fecal Output)</label>
                <select
                  value={vitals.gutMotility || ''}
                  onChange={(e) => setVitals({ ...vitals, gutMotility: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="">Select status...</option>
                  <option value="normal">Normal - Regular fecal pellets</option>
                  <option value="reduced">Reduced - Fewer pellets than usual</option>
                  <option value="absent">Absent - No fecal output (GI Stasis - EMERGENCY)</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  GI stasis is life-threatening in rabbits and guinea pigs - seek immediate vet care if no fecal output
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Dental Health</label>
                <select
                  value={vitals.dentalHealth || ''}
                  onChange={(e) => setVitals({ ...vitals, dentalHealth: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="">Select condition...</option>
                  <option value="normal">Normal - Eating well, no drooling</option>
                  <option value="overgrown">Overgrown Teeth (Reduced eating, weight loss)</option>
                  <option value="concerning">Concerning (Drooling, not eating - see vet)</option>
                </select>
              </div>
            </div>
          )}

          {/* Review Step */}
          {currentStep === steps.length - 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Review Health Information</h3>
              <p className="text-sm text-muted-foreground">
                Please review the vitals and health information before saving.
              </p>

              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                {vitals.weight && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weight:</span>
                    <span className="font-medium">{vitals.weight} {vitals.weightUnit}</span>
                  </div>
                )}
                {vitals.temperature && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Temperature:</span>
                    <span className="font-medium">{vitals.temperature}°F</span>
                  </div>
                )}
                {vitals.heartRate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Heart Rate:</span>
                    <span className="font-medium">{vitals.heartRate} bpm</span>
                  </div>
                )}
                {vitals.respiratoryRate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Respiratory Rate:</span>
                    <span className="font-medium">{vitals.respiratoryRate} breaths/min</span>
                  </div>
                )}
                {vitals.bodyConditionScore && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Body Condition Score:</span>
                    <span className="font-medium">{vitals.bodyConditionScore}/{vitals.bodyConditionScale === '1-9' ? '9' : vitals.bodyConditionScale === '1-5' ? '5' : 'Keel'}</span>
                  </div>
                )}

                {/* Fish-specific */}
                {vitals.waterTemp && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Water Temp:</span>
                      <span className="font-medium">{vitals.waterTemp}°F</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">pH:</span>
                      <span className="font-medium">{vitals.pH}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ammonia:</span>
                      <span className={`font-medium ${vitals.ammonia && vitals.ammonia > 0 ? 'text-destructive' : ''}`}>
                        {vitals.ammonia} ppm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nitrite:</span>
                      <span className={`font-medium ${vitals.nitrite && vitals.nitrite > 0 ? 'text-destructive' : ''}`}>
                        {vitals.nitrite} ppm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nitrate:</span>
                      <span className="font-medium">{vitals.nitrate} ppm</span>
                    </div>
                  </>
                )}

                {/* Reptile-specific */}
                {vitals.baskingTemp && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Basking Temp:</span>
                      <span className="font-medium">{vitals.baskingTemp}°F</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cool Side Temp:</span>
                      <span className="font-medium">{vitals.coolSideTemp}°F</span>
                    </div>
                    {vitals.humidity && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Humidity:</span>
                        <span className="font-medium">{vitals.humidity}%</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {alerts.length > 0 && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm font-semibold text-destructive mb-2">
                    ⚠️ Please review the health alerts above before completing setup.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4 flex justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="px-6 py-2 rounded-xl border-2 border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>

          {currentStep === steps.length - 1 ? (
            <button
              onClick={handleComplete}
              className="px-6 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              Complete Health Check
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
