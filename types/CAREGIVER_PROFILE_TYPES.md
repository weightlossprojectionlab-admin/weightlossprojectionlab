# Caregiver Profile Types Documentation

## Overview
Comprehensive TypeScript interfaces and Zod validation schemas for caregiver/family member management in the Weight Loss Project Lab.

**File Location:** `types/caregiver-profile.ts`

---

## Key Interfaces

### 1. CaregiverProfile (Main Interface)
The primary interface for individual caregiver/family member profiles.

```typescript
interface CaregiverProfile {
  userId: string
  displayName: string
  email: string
  phoneNumber?: string
  photoUrl?: string
  relationshipToPatients: Record<string, string> // { patientId: "Mother" }
  professionalInfo?: ProfessionalInfo
  availability?: Availability
  emergencyContact?: EmergencyContact
  address?: Address
  preferences: CaregiverPreferences
  duties?: CaregiverDuties
  onboardingComplete: boolean
  onboardingStep: OnboardingStep
  isProfessional: boolean
  accountStatus: 'active' | 'inactive' | 'suspended' | 'pending'
  createdAt: string
  updatedAt: string
  lastActiveAt?: string
  adminNotes?: string
}
```

---

### 2. WeeklySchedule Interface
Defines weekly availability for caregivers.

```typescript
interface WeeklySchedule {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

interface DaySchedule {
  available: boolean
  startTime?: string // 24-hour format (e.g., "09:00")
  endTime?: string   // 24-hour format (e.g., "17:00")
  notes?: string
}
```

**Usage Example:**
```typescript
const schedule: WeeklySchedule = {
  monday: { available: true, startTime: "09:00", endTime: "17:00" },
  tuesday: { available: true, startTime: "09:00", endTime: "17:00" },
  wednesday: { available: false },
  // ... etc
}
```

---

### 3. ProfessionalInfo Interface
For licensed caregivers (nurses, home health aides, etc.)

```typescript
interface ProfessionalInfo {
  title: string // e.g., "Registered Nurse"
  credentials: string[] // e.g., ["RN", "BSN"]
  certifications: string[] // e.g., ["CPR", "First Aid"]
  specializations: string[] // e.g., ["Diabetes Management"]
  licenseNumber?: string
  licenseExpiresAt?: string
  yearsOfExperience?: number
  backgroundCheckCompleted?: boolean
  backgroundCheckDate?: string
}
```

---

### 4. CaregiverDuties Interface
Household care duties assignment system.

```typescript
interface CaregiverDuties {
  assignedDuties: HouseholdDuty[]
  customDuties?: CustomDuty[]
}

interface HouseholdDuty {
  id: string
  type: 'laundry' | 'shopping' | 'cleaning_bedroom' | 'cleaning_bathroom' |
        'cleaning_kitchen' | 'meal_prep' | 'medication_management' |
        'transportation' | 'companionship' | 'personal_care' | 'custom'
  name: string
  assigned: boolean
  frequency?: string // e.g., "daily", "weekly"
  scheduledDays?: DayOfWeek[]
  estimatedMinutes?: number
  notes?: string
  assignedAt?: string
  lastCompletedAt?: string
}

interface CustomDuty extends Omit<HouseholdDuty, 'type'> {
  type: 'custom'
  description: string
  createdBy: string
  createdAt: string
}
```

**Example Usage:**
```typescript
const duties: CaregiverDuties = {
  assignedDuties: [
    {
      id: "duty-1",
      type: "laundry",
      name: "Laundry",
      assigned: true,
      frequency: "weekly",
      scheduledDays: ["monday", "thursday"],
      estimatedMinutes: 90
    },
    {
      id: "duty-2",
      type: "shopping",
      name: "Grocery Shopping",
      assigned: true,
      frequency: "weekly",
      scheduledDays: ["saturday"],
      estimatedMinutes: 120
    }
  ],
  customDuties: [
    {
      id: "custom-1",
      type: "custom",
      name: "Garden Maintenance",
      description: "Water plants and maintain garden",
      assigned: true,
      frequency: "bi-weekly",
      createdBy: "user-123",
      createdAt: "2025-12-05T10:00:00Z"
    }
  ]
}
```

---

### 5. Availability Interface
Comprehensive availability configuration.

```typescript
interface Availability {
  schedule: WeeklySchedule
  timezone: string // e.g., "America/New_York"
  isAvailableForEmergencies: boolean
  emergencyResponseTime?: number // in minutes
  maxHoursPerWeek?: number
}
```

---

### 6. CaregiverPreferences Interface
Communication and notification preferences.

```typescript
interface CaregiverPreferences {
  languagesSpoken: string[]
  preferredContactMethod: 'email' | 'phone' | 'sms' | 'app'
  alternateContactMethods?: ('email' | 'phone' | 'sms' | 'app')[]
  communicationStyle?: string
  notifications?: {
    email: boolean
    sms: boolean
    push: boolean
    emergencyOnly: boolean
  }
  quietHours?: {
    startTime: string // 24-hour format
    endTime: string   // 24-hour format
  }
}
```

---

## Enums

### RelationshipType Enum
Comprehensive list of caregiver-patient relationships.

```typescript
enum RelationshipType {
  // Family
  MOTHER = 'Mother',
  FATHER = 'Father',
  SPOUSE = 'Spouse',
  CHILD = 'Child',
  SIBLING = 'Sibling',
  GRANDPARENT = 'Grandparent',

  // Professional
  PROFESSIONAL_CAREGIVER = 'Professional Caregiver',
  NURSE = 'Nurse',
  REGISTERED_NURSE = 'Registered Nurse (RN)',
  HOME_HEALTH_AIDE = 'Home Health Aide',
  DOCTOR = 'Doctor',

  // Other
  FRIEND = 'Friend',
  NEIGHBOR = 'Neighbor',
  OTHER = 'Other'
}
```

### OnboardingStep Enum
Progressive onboarding flow.

```typescript
enum OnboardingStep {
  WELCOME = 0,
  BASIC_INFO = 1,
  ROLE = 2,
  PROFESSIONAL = 3,
  AVAILABILITY = 4,
  PREFERENCES = 5,
  COMPLETE = 6
}
```

---

## Utility Types

### CreateCaregiverProfileParams
For creating new caregiver profiles.

```typescript
type CreateCaregiverProfileParams = Omit<
  CaregiverProfile,
  'userId' | 'createdAt' | 'updatedAt' | 'lastActiveAt' |
  'onboardingComplete' | 'onboardingStep' | 'accountStatus'
> & {
  userId?: string // Optional - can be generated
}
```

### UpdateCaregiverProfileParams
For updating existing profiles.

```typescript
type UpdateCaregiverProfileParams = Partial<
  Omit<CaregiverProfile, 'userId' | 'createdAt'>
>
```

### CaregiverProfileFilter
For querying/filtering caregiver profiles.

```typescript
interface CaregiverProfileFilter {
  patientId?: string
  isProfessional?: boolean
  accountStatus?: 'active' | 'inactive' | 'suspended' | 'pending'
  relationshipType?: string
  availableOn?: DayOfWeek[]
  languagesSpoken?: string[]
  onboardingComplete?: boolean
  searchQuery?: string
}
```

### CaregiverProfileSummary
Lightweight profile for list views.

```typescript
interface CaregiverProfileSummary {
  userId: string
  displayName: string
  email: string
  photoUrl?: string
  isProfessional: boolean
  accountStatus: CaregiverProfile['accountStatus']
  relationshipToPatients: Record<string, string>
  onboardingComplete: boolean
  lastActiveAt?: string
}
```

---

## Zod Validation Schemas

All interfaces have corresponding Zod schemas for runtime validation:

- `CaregiverProfileSchema` - Full profile validation
- `CreateCaregiverProfileSchema` - Create profile validation
- `UpdateCaregiverProfileSchema` - Update profile validation
- `CaregiverProfileFilterSchema` - Filter validation
- `WeeklyScheduleSchema` - Schedule validation
- `DayScheduleSchema` - Individual day validation
- `ProfessionalInfoSchema` - Professional info validation
- `AvailabilitySchema` - Availability validation
- `EmergencyContactSchema` - Emergency contact validation
- `AddressSchema` - Address validation
- `CaregiverPreferencesSchema` - Preferences validation
- `HouseholdDutySchema` - Duty validation
- `CustomDutySchema` - Custom duty validation
- `CaregiverDutiesSchema` - Duties collection validation

### Example Usage:

```typescript
import {
  CreateCaregiverProfileSchema,
  CaregiverProfileSchema
} from '@/types/caregiver-profile'

// Validate create request
const result = CreateCaregiverProfileSchema.safeParse(requestBody)
if (!result.success) {
  console.error('Validation errors:', result.error)
  return
}

// Use validated data
const validProfile = result.data
```

---

## Helper Functions

### createDefaultWeeklySchedule()
Creates a default weekly schedule with all days unavailable.

```typescript
const schedule = createDefaultWeeklySchedule()
// All days set to { available: false }
```

### createDefaultCaregiverPreferences()
Creates default preferences.

```typescript
const preferences = createDefaultCaregiverPreferences()
// Returns default settings (app notifications, English language, etc.)
```

### isAvailableAt(availability, day, time)
Check if caregiver is available at specific time.

```typescript
const available = isAvailableAt(
  caregiverAvailability,
  'monday',
  '14:30'
)
// Returns: boolean
```

### getAssignedPatientIds(profile)
Get all patient IDs assigned to caregiver.

```typescript
const patientIds = getAssignedPatientIds(caregiverProfile)
// Returns: string[]
```

### isAssignedToPatient(profile, patientId)
Check if caregiver is assigned to specific patient.

```typescript
const assigned = isAssignedToPatient(profile, 'patient-123')
// Returns: boolean
```

### getRelationshipToPatient(profile, patientId)
Get relationship type for specific patient.

```typescript
const relationship = getRelationshipToPatient(profile, 'patient-123')
// Returns: "Mother" | "Nurse" | etc. | null
```

### getTotalAssignedDuties(profile)
Calculate total assigned duties.

```typescript
const count = getTotalAssignedDuties(profile)
// Returns: number
```

---

## API Integration Example

### Create Caregiver Profile Endpoint

```typescript
// app/api/caregivers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
  CreateCaregiverProfileSchema,
  CaregiverProfile
} from '@/types/caregiver-profile'
import { validateRequestBody } from '@/lib/validation'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate request body
    const validation = validateRequestBody(CreateCaregiverProfileSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    // Create profile in Firestore
    const profile: CaregiverProfile = {
      ...validation.data,
      userId: generateUserId(),
      onboardingComplete: false,
      onboardingStep: OnboardingStep.WELCOME,
      accountStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await db.collection('caregivers').doc(profile.userId).set(profile)

    return NextResponse.json({ success: true, data: profile })
  } catch (error) {
    console.error('Error creating caregiver profile:', error)
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    )
  }
}
```

---

## Database Schema (Firestore)

### Collection: `caregivers`
Document ID: `{userId}`

**Document Structure:**
```typescript
{
  userId: string
  displayName: string
  email: string
  phoneNumber?: string
  photoUrl?: string
  relationshipToPatients: {
    [patientId]: string // relationship type
  }
  professionalInfo?: {
    title: string
    credentials: string[]
    certifications: string[]
    specializations: string[]
    licenseNumber?: string
    licenseExpiresAt?: string
    yearsOfExperience?: number
    backgroundCheckCompleted?: boolean
    backgroundCheckDate?: string
  }
  availability?: {
    schedule: {
      monday: { available: boolean, startTime?: string, endTime?: string, notes?: string }
      // ... other days
    }
    timezone: string
    isAvailableForEmergencies: boolean
    emergencyResponseTime?: number
    maxHoursPerWeek?: number
  }
  emergencyContact?: {
    name: string
    relationship: string
    phoneNumber: string
    email?: string
    alternatePhone?: string
  }
  address?: {
    street: string
    unit?: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  preferences: {
    languagesSpoken: string[]
    preferredContactMethod: string
    alternateContactMethods?: string[]
    communicationStyle?: string
    notifications?: {
      email: boolean
      sms: boolean
      push: boolean
      emergencyOnly: boolean
    }
    quietHours?: {
      startTime: string
      endTime: string
    }
  }
  duties?: {
    assignedDuties: Array<{
      id: string
      type: string
      name: string
      assigned: boolean
      frequency?: string
      scheduledDays?: string[]
      estimatedMinutes?: number
      notes?: string
      assignedAt?: string
      lastCompletedAt?: string
    }>
    customDuties?: Array<{
      // same as above plus:
      description: string
      createdBy: string
      createdAt: string
    }>
  }
  onboardingComplete: boolean
  onboardingStep: number
  isProfessional: boolean
  accountStatus: string
  createdAt: string
  updatedAt: string
  lastActiveAt?: string
  adminNotes?: string
}
```

### Indexes Required:
1. `accountStatus` (for filtering active caregivers)
2. `isProfessional` (for filtering professional vs family caregivers)
3. `onboardingComplete` (for finding incomplete onboardings)
4. Composite: `accountStatus + isProfessional` (for advanced queries)

---

## Summary

This comprehensive type system provides:

1. **Strong Type Safety** - Full TypeScript coverage for all caregiver-related data
2. **Runtime Validation** - Zod schemas for API request/response validation
3. **Flexible Relationships** - Support for both family members and professional caregivers
4. **Household Duties** - Comprehensive duty assignment system with custom duties
5. **Availability Management** - Weekly schedules with emergency availability
6. **Professional Credentials** - Support for licensed caregivers with certifications
7. **Communication Preferences** - Multi-channel contact preferences
8. **Progressive Onboarding** - Step-by-step profile setup
9. **Helper Utilities** - Convenience functions for common operations

All types are exported from `types/index.ts` for easy importing throughout the application.
