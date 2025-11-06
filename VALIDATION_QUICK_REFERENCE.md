# Zod Validation Quick Reference

## Quick Start

### Import Schemas
```typescript
import {
  CreateMealLogRequestSchema,
  UpdateUserProfileRequestSchema,
  BloodSugarLogSchema,
  BloodPressureLogSchema,
  ExerciseLogSchema,
  GenerateHealthProfileRequestSchema
} from '@/lib/validations'
import { z } from 'zod'
```

### Basic Validation
```typescript
// In API route
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateMealLogRequestSchema.parse(body)

    // Use validatedData - it's type-safe!

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues.map((e: z.ZodIssue) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }
    throw error
  }
}
```

## Available Schemas

### Health Vitals

#### Blood Sugar Log
```typescript
{
  glucoseLevel: 120,        // 20-600 mg/dL
  measurementType: 'fasting', // fasting | before-meal | after-meal | bedtime | random
  loggedAt?: string,        // ISO 8601 datetime
  notes?: string            // max 500 chars
}
```

#### Blood Pressure Log
```typescript
{
  systolic: 120,           // 70-250 mmHg (must be > diastolic)
  diastolic: 80,           // 40-150 mmHg
  heartRate?: 72,          // 30-250 bpm
  loggedAt?: string,       // ISO 8601 datetime
  notes?: string           // max 500 chars
}
```

#### Exercise Log
```typescript
{
  activityType: 'Running', // required, 1-100 chars
  duration: 30,            // 1-1440 minutes
  intensity: 'moderate',   // low | moderate | high
  caloriesBurned?: 250,    // 0-5000
  distance?: 5.0,          // optional, in km or miles
  loggedAt?: string,       // ISO 8601 datetime
  notes?: string           // max 500 chars
}
```

### Meal Logs

#### Create Meal Log
```typescript
{
  mealType: 'breakfast',   // breakfast | lunch | dinner | snack
  photoUrl?: string,       // valid URL
  aiAnalysis?: {
    foodItems: [           // required if aiAnalysis present
      {
        name: string,
        portion: string,
        calories: number,  // >= 0
        protein: number,   // >= 0
        carbs: number,     // >= 0
        fat: number,       // >= 0
        fiber: number      // >= 0
      }
    ],
    totalCalories: number, // >= 0
    totalMacros: {
      protein: number,
      carbs: number,
      fat: number,
      fiber: number
    },
    confidence: number,    // 0-100
    title?: string
  },
  manualEntries?: [
    {
      food: string,
      calories: number,    // >= 0
      quantity: string
    }
  ],
  notes?: string,
  loggedAt?: string        // ISO 8601 datetime
}
// NOTE: Must have either aiAnalysis OR manualEntries
```

### User Profile

#### Update Profile
```typescript
{
  birthDate?: string,      // ISO 8601 datetime
  age?: number,            // 13-120
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say',
  height?: number,         // > 0
  currentWeight?: number,  // > 0
  activityLevel?: 'sedentary' | 'lightly-active' | 'moderately-active' | 'very-active' | 'extremely-active',
  healthConditions?: string[],
  foodAllergies?: string[],
  preferences?: {
    units: 'metric' | 'imperial',
    notifications: boolean,
    biometricEnabled: boolean,
    themePreference: 'light' | 'dark' | 'system'
  }
}
// All fields optional for updates
```

### AI Health Profile

#### Generate Health Profile
```typescript
{
  healthConditions: string[],  // minimum 1 required
  age?: number,                // 13-120
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say',
  currentWeight?: number,      // > 0
  height?: number,             // > 0
  activityLevel?: 'sedentary' | 'lightly-active' | 'moderately-active' | 'very-active' | 'extremely-active'
}
```

## Common Patterns

### Safe Parse (No Throw)
```typescript
const result = schema.safeParse(data)
if (!result.success) {
  console.error(result.error)
  return error response
}
// Use result.data
```

### Partial Updates
```typescript
const UpdateSchema = CreateSchema.partial()
// All fields become optional
```

### Custom Refinement
```typescript
const schema = z.object({
  password: z.string(),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})
```

### Transform Data
```typescript
const schema = z.object({
  date: z.string().transform(val => new Date(val))
})
```

## Helper Functions

### From lib/validation.ts

```typescript
import {
  validateRequestBody,
  validateQueryParams,
  validationErrorResponse,
  handleValidationError
} from '@/lib/validation'

// Validate body - returns result object
const result = validateRequestBody(schema, body)
if (!result.success) {
  return validationErrorResponse(result.errors)
}

// Validate query params
const queryResult = validateQueryParams(schema, params)

// Handle errors in catch block
try {
  // validation code
} catch (error) {
  return handleValidationError(error) // Handles Zod errors, re-throws others
}
```

## Error Response Format

### Single Field Error
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "glucoseLevel",
      "message": "Glucose level must be at least 20 mg/dL"
    }
  ]
}
```

### Multiple Field Errors
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "age",
      "message": "Number must be greater than or equal to 13"
    },
    {
      "field": "preferences.units",
      "message": "Invalid enum value. Expected 'metric' | 'imperial'"
    },
    {
      "field": "healthConditions",
      "message": "Array must contain at least 1 element(s)"
    }
  ]
}
```

### Refinement Error
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "",
      "message": "Systolic pressure must be greater than diastolic pressure"
    }
  ]
}
```

## TypeScript Type Inference

```typescript
import { CreateMealLogRequestSchema } from '@/lib/validations'
import { z } from 'zod'

// Automatically infer TypeScript type
type CreateMealLogRequest = z.infer<typeof CreateMealLogRequestSchema>

// Use in function signature
function processMealLog(data: CreateMealLogRequest) {
  // data is fully typed!
  const { mealType, aiAnalysis } = data
}
```

## Common Validation Values

### Measurement Types
- Blood Sugar: `fasting`, `before-meal`, `after-meal`, `bedtime`, `random`
- Meal Type: `breakfast`, `lunch`, `dinner`, `snack`
- Intensity: `low`, `moderate`, `high`
- Gender: `male`, `female`, `other`, `prefer-not-to-say`
- Activity Level: `sedentary`, `lightly-active`, `moderately-active`, `very-active`, `extremely-active`

### Valid Ranges
- Blood Glucose: 20-600 mg/dL
- Blood Pressure Systolic: 70-250 mmHg
- Blood Pressure Diastolic: 40-150 mmHg
- Heart Rate: 30-250 bpm
- Exercise Duration: 1-1440 minutes
- Calories Burned: 0-5000
- Age: 13-120 years
- Confidence Score: 0-100

## Testing

```typescript
import { BloodSugarLogSchema } from '@/lib/validations'

test('validates blood sugar', () => {
  const valid = { glucoseLevel: 120, measurementType: 'fasting' }
  expect(() => BloodSugarLogSchema.parse(valid)).not.toThrow()

  const invalid = { glucoseLevel: 10, measurementType: 'fasting' }
  expect(() => BloodSugarLogSchema.parse(invalid)).toThrow()
})
```

## Documentation

For detailed documentation, see:
- `lib/validations/README.md` - Full documentation with examples
- `VALIDATION_IMPLEMENTATION_SUMMARY.md` - Implementation details and changes
