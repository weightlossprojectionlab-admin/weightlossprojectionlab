# Zod Validation Schemas

This directory contains Zod validation schemas for API input validation across the application.

## Overview

All API routes should use Zod schemas for request validation to ensure:
- Type safety at runtime
- Consistent validation across endpoints
- Clear error messages for API consumers
- Automatic TypeScript type inference

## Available Schemas

### Meal Logs (`meal-logs.ts`)
- `CreateMealLogRequestSchema` - For creating new meal logs
- `UpdateMealLogRequestSchema` - For updating meal logs
- `GetMealLogsQuerySchema` - For query parameters
- `FoodItemSchema` - For individual food items
- `AIAnalysisSchema` - For AI-generated meal analysis

### User Profile (`user-profile.ts`)
- `UserProfileSchema` - Complete user profile
- `UpdateUserProfileRequestSchema` - For partial profile updates
- `UserPreferencesSchema` - User preferences and settings
- `UserGoalsSchema` - User health and fitness goals
- `UpdateBiometricRequestSchema` - For biometric data updates

### Health Vitals (`health-vitals.ts`)
- `BloodSugarLogSchema` - Blood glucose measurements
- `BloodPressureLogSchema` - Blood pressure readings
- `ExerciseLogSchema` - Exercise activity logs
- `GenerateHealthProfileRequestSchema` - For AI health profile generation
- `AIHealthProfileResponseSchema` - AI-generated health profile response

### Weight Logs (`weight-logs.ts`)
- Weight tracking validation schemas

## Usage Examples

### Basic Validation in API Routes

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { CreateMealLogRequestSchema } from '@/lib/validations/meal-logs'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate with Zod - throws ZodError if invalid
    const validatedData = CreateMealLogRequestSchema.parse(body)

    // Use validated data (now type-safe)
    // ... business logic ...

    return NextResponse.json({ success: true })

  } catch (error) {
    // Handle validation errors
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

    // Handle other errors
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Using Validation Helpers

```typescript
import { validateRequestBody, validationErrorResponse } from '@/lib/validation'
import { CreateBloodSugarLogSchema } from '@/lib/validations/health-vitals'

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Validate using helper function
  const result = validateRequestBody(CreateBloodSugarLogSchema, body)

  if (!result.success) {
    return validationErrorResponse(result.errors)
  }

  // Use result.data (type-safe and validated)
  const { glucoseLevel, measurementType } = result.data

  // ... business logic ...
}
```

### Query Parameter Validation

```typescript
import { validateQueryParams } from '@/lib/validation'
import { GetMealLogsQuerySchema } from '@/lib/validations/meal-logs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const queryParams = {
    limit: searchParams.get('limit'),
    startDate: searchParams.get('startDate'),
    endDate: searchParams.get('endDate'),
    mealType: searchParams.get('mealType'),
  }

  // Validate query parameters
  const result = validateQueryParams(GetMealLogsQuerySchema, queryParams)

  if (!result.success) {
    return validationErrorResponse(result.errors)
  }

  // Use result.data
  const { limit, startDate, endDate } = result.data

  // ... fetch logic ...
}
```

## Validation Error Response Format

When validation fails, the API returns a consistent error response:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "glucoseLevel",
      "message": "Glucose level must be at least 20 mg/dL"
    },
    {
      "field": "measurementType",
      "message": "Invalid enum value. Expected 'fasting' | 'before-meal' | 'after-meal' | 'bedtime' | 'random'"
    }
  ]
}
```

## Adding New Schemas

1. Create schema in appropriate file (e.g., `lib/validations/my-feature.ts`)
2. Export from `lib/validations/index.ts`
3. Use in API routes with proper error handling

Example schema:

```typescript
import { z } from 'zod'

export const MyFeatureSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  value: z.number().min(0, 'Value must be non-negative'),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime().optional(),
})

export type MyFeature = z.infer<typeof MyFeatureSchema>
```

## Validation Helper Functions

Located in `lib/validation.ts`:

- `validateRequestBody<T>()` - Validate request body
- `validateQueryParams<T>()` - Validate query parameters
- `validationErrorResponse()` - Create standardized error response
- `handleValidationError()` - Handle Zod errors in catch blocks

## Best Practices

1. **Always validate user input** - Never trust client data
2. **Use `.parse()` for required validation** - Throws error if invalid
3. **Use `.safeParse()` for optional validation** - Returns result object
4. **Handle validation errors consistently** - Use standardized error format
5. **Provide clear error messages** - Help API consumers fix issues
6. **Use TypeScript inference** - `z.infer<typeof Schema>` for types
7. **Create partial schemas for updates** - Use `.partial()` for PATCH/PUT
8. **Validate at API boundaries** - Validate all external inputs

## Migration from Manual Validation

Before (manual validation):
```typescript
const { email, name } = body

if (!email || !name) {
  return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
}
```

After (Zod validation):
```typescript
const validatedData = CreateUserSchema.parse(body)
const { email, name } = validatedData // Type-safe!
```

## Testing Validation

```typescript
import { CreateMealLogRequestSchema } from '@/lib/validations/meal-logs'

test('validates meal log creation', () => {
  const validData = {
    mealType: 'breakfast',
    aiAnalysis: { /* ... */ },
    loggedAt: new Date().toISOString()
  }

  const result = CreateMealLogRequestSchema.parse(validData)
  expect(result.mealType).toBe('breakfast')
})

test('rejects invalid meal log', () => {
  const invalidData = {
    mealType: 'invalid-type',
  }

  expect(() => {
    CreateMealLogRequestSchema.parse(invalidData)
  }).toThrow()
})
```

## Additional Resources

- [Zod Documentation](https://zod.dev/)
- [Zod GitHub](https://github.com/colinhacks/zod)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
