# Quick Start: Veterinary Vitals Intelligence System

## Overview

The veterinary vitals system intelligently recommends which vitals to track based on your pet's species, breed, age, and health conditions.

---

## Usage

### 1. Get Recommendations for a Pet

```typescript
import { getVitalRecommendations } from '@/lib/veterinary/vital-recommendation-engine'

const recommendations = getVitalRecommendations({
  species: 'Dog',
  breed: 'Bulldog',
  age: 8,
  weight: 50,
  healthConditions: ['heart_disease', 'diabetes']
})

// Returns array of VitalRecommendation objects
recommendations.forEach(rec => {
  console.log(`${rec.userFriendlyName} (${rec.priority}): ${rec.reason}`)
})
```

### 2. Check if a Vital Reading is Normal

```typescript
import { isVitalNormal } from '@/lib/veterinary/vital-ranges'

const result = isVitalNormal(
  'temperature',
  103.5,  // value
  'Dog',  // species
  'Bulldog',  // breed (optional)
  'senior'  // age category (optional)
)

if (result.isCritical) {
  alert('CRITICAL: Seek emergency veterinary care!')
} else if (!result.isNormal) {
  console.log('Abnormal reading. Consult your veterinarian.')
}
```

### 3. Get Vital Ranges for a Species

```typescript
import { getVitalRanges } from '@/lib/veterinary/vital-ranges'

const ranges = getVitalRanges('Dog', 'Great Dane', 'senior')

ranges.forEach(range => {
  console.log(`${range.vitalType}: ${range.normalMin}-${range.normalMax} ${range.unit}`)
  console.log(`  Notes: ${range.measurementNotes}`)
})
```

### 4. Display Veterinary Disclaimer

```typescript
import { VeterinaryDisclaimer } from '@/components/pets/VeterinaryDisclaimer'

// Compact disclaimer for wizard
<VeterinaryDisclaimer variant="compact" context="vitals" />

// Full disclaimer for settings page
<VeterinaryDisclaimer variant="full" context="recommendations" />

// Inline disclaimer (small text)
<VeterinaryDisclaimer variant="inline" />
```

---

## Examples

### Example 1: Dashboard with Intelligent Vitals

```typescript
'use client'

import { getVitalRecommendations } from '@/lib/veterinary/vital-recommendation-engine'

export default function PetDashboard({ patient }) {
  const recommendations = patient.type === 'pet'
    ? getVitalRecommendations({
        species: patient.species,
        breed: patient.breed,
        age: calculateAge(patient.dateOfBirth),
        weight: patient.weight,
        healthConditions: patient.healthConditions || []
      })
    : null

  // Get only essential and recommended vitals
  const vitalTypes = recommendations
    ?.filter(r => r.priority === 'essential' || r.priority === 'recommended')
    .map(r => r.vitalType) || []

  return (
    <div>
      <h2>Track These Vitals for {patient.name}:</h2>
      <ul>
        {recommendations?.map(rec => (
          <li key={rec.vitalType}>
            <strong>{rec.userFriendlyName}</strong> ({rec.priority})
            <p>{rec.reason}</p>
            {rec.veterinaryAdvice && (
              <p className="text-sm">{rec.veterinaryAdvice}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

### Example 2: Vital Entry Form with Validation

```typescript
'use client'

import { useState } from 'react'
import { isVitalNormal } from '@/lib/veterinary/vital-ranges'

export function VitalEntryForm({ patient }) {
  const [temperature, setTemperature] = useState('')

  const handleSubmit = () => {
    const value = parseFloat(temperature)

    const validation = isVitalNormal(
      'temperature',
      value,
      patient.species,
      patient.breed,
      getAgeCategory(patient.age)
    )

    if (validation.isCritical) {
      alert(`CRITICAL! Temperature ${value}°F is ${validation.status}. ` +
            `Normal range: ${validation.range?.normalMin}-${validation.range?.normalMax}°F. ` +
            `Seek emergency veterinary care immediately!`)
      return
    }

    if (!validation.isNormal) {
      console.warn('Abnormal reading detected')
    }

    // Save vital...
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="number"
        value={temperature}
        onChange={(e) => setTemperature(e.target.value)}
        placeholder="Temperature (°F)"
      />
      <button type="submit">Save</button>
    </form>
  )
}
```

### Example 3: Display Recommendations with Explanations

```typescript
import { getRecommendationSummary } from '@/lib/veterinary/vital-recommendation-engine'

export function VitalGuidance({ patient }) {
  const summary = getRecommendationSummary({
    species: patient.species,
    breed: patient.breed,
    age: patient.age,
    healthConditions: patient.healthConditions
  })

  return (
    <div className="bg-blue-50 p-4 rounded">
      <h3>Recommended Vitals for {patient.name}</h3>
      <pre className="whitespace-pre-wrap">{summary}</pre>
    </div>
  )
}

// Output:
// For your Dog (Bulldog), we recommend tracking:
//
// **Essential vitals:**
// - Weight: Weight tracking is fundamental for all pets to monitor health trends
// - Body Temperature: Temperature helps detect infections, fever, and illness
// - Breathing Rate: Bulldog is a brachycephalic (flat-faced) breed with increased respiratory disease risk
//
// **Recommended vitals:**
// - Heart Rate: Heart rate monitoring helps detect cardiovascular issues
```

---

## Data Types

### VitalRecommendation
```typescript
interface VitalRecommendation {
  vitalType: VitalType  // 'weight', 'temperature', 'heart_rate', etc.
  priority: 'essential' | 'recommended' | 'optional' | 'advanced'
  reason: string  // WHY this vital is important
  userFriendlyName: string  // "Body Temperature" instead of "temperature"
  canMeasureAtHome: boolean
  requiresEquipment?: string  // "Digital rectal thermometer"
  veterinaryAdvice?: string  // Guidance from veterinary sources
}
```

### PatientProfile
```typescript
interface PatientProfile {
  species: string  // 'Dog', 'Cat', 'Bird', 'Rabbit'
  breed?: string  // 'Bulldog', 'Great Dane', etc.
  age?: number  // Age in years
  weight?: number  // Current weight in lbs
  healthConditions?: string[]  // ['diabetes', 'heart_disease']
}
```

### VitalRange
```typescript
interface VitalRange {
  vitalType: VitalType
  normalMin: number
  normalMax: number
  unit: string  // '°F', 'bpm', 'breaths/min', 'lbs'
  criticalLow?: number  // Emergency threshold
  criticalHigh?: number  // Emergency threshold
  measurementNotes?: string  // How to measure correctly
}
```

---

## Species Differences

| Species | Normal Temp | Normal Heart Rate | Normal Resp Rate |
|---------|------------|-------------------|------------------|
| **Dog** | 101-102.5°F | 60-140 bpm | 10-35 breaths/min |
| **Cat** | 100.5-102.5°F | 140-220 bpm | 20-30 breaths/min |
| **Bird** | 102-112°F | N/A | 15-45 breaths/min |
| **Rabbit** | 101-103°F | 180-250 bpm | 30-60 breaths/min |

**Key Differences:**
- Birds have MUCH higher body temperatures than mammals
- Cats have faster heart rates than dogs
- Rabbits have VERY fast heart rates (prey animal physiology)
- Normal temp for pets is NOT 98.6°F (that's human!)

---

## Breed Considerations

### Brachycephalic Breeds (Flat-Faced)
**Dogs:** Bulldog, Pug, French Bulldog, Boston Terrier, Boxer
**Cats:** Persian, Himalayan, Exotic Shorthair

**Why it matters:**
- Higher respiratory rates are normal
- Increased risk of respiratory emergencies
- Need respiratory rate monitoring

### Giant Breeds
**Dogs:** Great Dane, Mastiff, St. Bernard, Irish Wolfhound

**Why it matters:**
- Slower heart rates are normal (larger heart)
- Higher risk of dilated cardiomyopathy (DCM)
- Need heart rate monitoring

### Small/Toy Breeds
**Dogs:** Chihuahua, Yorkie, Pomeranian

**Why it matters:**
- Faster heart rates are normal (smaller heart)
- Different weight expectations

---

## Condition-Based Monitoring

| Condition | Added Vitals | Why |
|-----------|-------------|-----|
| **Diabetes** | Blood glucose | Monitor insulin effectiveness |
| **Heart Disease** | Heart rate, Respiratory rate, Blood pressure | Detect heart failure early |
| **Kidney Disease** | Blood pressure, Weight | Hypertension common, monitor wasting |
| **Asthma** | Respiratory rate, Pulse oximetry | Detect breathing difficulty |

---

## Legal/Compliance

### VCPR Compliance
- **Always show disclaimers** when providing veterinary guidance
- App does NOT establish Veterinary-Client-Patient Relationship
- Only licensed vets can diagnose/treat

### Use Disclaimers:
```typescript
// Required for ANY veterinary recommendations
<VeterinaryDisclaimer variant="compact" context="vitals" />

// Required for emergency/critical vitals
<EmergencyVeterinaryDisclaimer />
```

---

## Testing

### Unit Tests (Future)
```typescript
import { getVitalRecommendations, isVitalNormal } from '@/lib/veterinary'

test('Bulldog gets respiratory monitoring', () => {
  const recs = getVitalRecommendations({
    species: 'Dog',
    breed: 'Bulldog'
  })

  const resp = recs.find(r => r.vitalType === 'respiratory_rate')
  expect(resp).toBeDefined()
  expect(resp?.priority).toBe('essential')
})

test('Diabetic cat gets blood glucose', () => {
  const recs = getVitalRecommendations({
    species: 'Cat',
    healthConditions: ['diabetes']
  })

  const glucose = recs.find(r => r.vitalType === 'blood_glucose')
  expect(glucose).toBeDefined()
  expect(glucose?.priority).toBe('essential')
})

test('Critical temperature detection', () => {
  const result = isVitalNormal('temperature', 105.0, 'Dog')
  expect(result.isCritical).toBe(true)
  expect(result.status).toBe('critical-high')
})
```

---

## FAQ

### Q: Can I add custom vital ranges for my clinic?
**A:** Yes, extend `SPECIES_VITAL_RANGES` in `vital-ranges.ts`:
```typescript
SPECIES_VITAL_RANGES['Dog_CustomClinic'] = {
  species: 'Dog',
  baseVitals: [ /* custom ranges */ ]
}
```

### Q: How do I add a new species?
**A:** Add to `vital-ranges.ts`:
```typescript
export const FERRET_VITAL_RANGES: SpeciesVitalRanges = {
  species: 'Ferret',
  baseVitals: [
    {
      vitalType: 'temperature',
      normalMin: 100.0,
      normalMax: 104.0,
      unit: '°F'
    }
    // ...
  ]
}

SPECIES_VITAL_RANGES['Ferret'] = FERRET_VITAL_RANGES
```

### Q: How do I add a new health condition?
**A:** Update `getVitalRecommendations()` in `vital-recommendation-engine.ts`:
```typescript
// Hyperthyroidism (common in cats)
if (conditions_lower.some(c => c.includes('hyperthyroid'))) {
  recommendations.push({
    vitalType: 'heart_rate',
    priority: 'essential',
    reason: 'Hyperthyroidism causes elevated heart rate',
    // ...
  })
}
```

### Q: Where are the disclaimers required?
**A:** Show disclaimers whenever:
- Displaying vital recommendations
- Showing vital ranges
- Providing health guidance
- Logging symptoms
- Analyzing vital trends

---

## Support

For questions or issues:
1. Check `VETERINARY_INTELLIGENCE_SYSTEM_COMPLETE.md` for full documentation
2. Review source code in `lib/veterinary/`
3. Contact development team

**Data Sources:**
- American Veterinary Medical Association (AVMA)
- Cornell University College of Veterinary Medicine
- Merck Veterinary Manual
