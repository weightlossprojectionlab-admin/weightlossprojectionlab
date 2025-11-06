/**
 * Validation Schema Tests
 * Tests for Zod validation schemas
 */

import { describe, test, expect } from '@jest/globals'
import {
  BloodSugarLogSchema,
  BloodPressureLogSchema,
  ExerciseLogSchema,
  GenerateHealthProfileRequestSchema,
  CreateMealLogRequestSchema,
  UpdateUserProfileRequestSchema
} from '../index'

describe('Blood Sugar Validation', () => {
  test('accepts valid blood sugar log', () => {
    const validData = {
      glucoseLevel: 120,
      measurementType: 'fasting' as const,
      loggedAt: new Date().toISOString(),
      notes: 'Morning reading'
    }

    const result = BloodSugarLogSchema.parse(validData)
    expect(result.glucoseLevel).toBe(120)
    expect(result.measurementType).toBe('fasting')
  })

  test('rejects glucose level below minimum', () => {
    const invalidData = {
      glucoseLevel: 10,
      measurementType: 'fasting' as const
    }

    expect(() => BloodSugarLogSchema.parse(invalidData)).toThrow()
  })

  test('rejects glucose level above maximum', () => {
    const invalidData = {
      glucoseLevel: 700,
      measurementType: 'fasting' as const
    }

    expect(() => BloodSugarLogSchema.parse(invalidData)).toThrow()
  })

  test('rejects invalid measurement type', () => {
    const invalidData = {
      glucoseLevel: 120,
      measurementType: 'invalid-type'
    }

    expect(() => BloodSugarLogSchema.parse(invalidData)).toThrow()
  })
})

describe('Blood Pressure Validation', () => {
  test('accepts valid blood pressure log', () => {
    const validData = {
      systolic: 120,
      diastolic: 80,
      heartRate: 72,
      loggedAt: new Date().toISOString()
    }

    const result = BloodPressureLogSchema.parse(validData)
    expect(result.systolic).toBe(120)
    expect(result.diastolic).toBe(80)
    expect(result.heartRate).toBe(72)
  })

  test('rejects when systolic <= diastolic', () => {
    const invalidData = {
      systolic: 80,
      diastolic: 120
    }

    expect(() => BloodPressureLogSchema.parse(invalidData)).toThrow()
  })

  test('rejects invalid systolic range', () => {
    const invalidData = {
      systolic: 300,
      diastolic: 80
    }

    expect(() => BloodPressureLogSchema.parse(invalidData)).toThrow()
  })

  test('accepts blood pressure without heart rate', () => {
    const validData = {
      systolic: 120,
      diastolic: 80
    }

    const result = BloodPressureLogSchema.parse(validData)
    expect(result.heartRate).toBeUndefined()
  })
})

describe('Exercise Log Validation', () => {
  test('accepts valid exercise log', () => {
    const validData = {
      activityType: 'Running',
      duration: 30,
      intensity: 'moderate' as const,
      caloriesBurned: 250,
      distance: 5.0,
      loggedAt: new Date().toISOString()
    }

    const result = ExerciseLogSchema.parse(validData)
    expect(result.activityType).toBe('Running')
    expect(result.duration).toBe(30)
    expect(result.intensity).toBe('moderate')
  })

  test('rejects empty activity type', () => {
    const invalidData = {
      activityType: '',
      duration: 30,
      intensity: 'moderate' as const
    }

    expect(() => ExerciseLogSchema.parse(invalidData)).toThrow()
  })

  test('rejects duration over 24 hours', () => {
    const invalidData = {
      activityType: 'Walking',
      duration: 2000,
      intensity: 'low' as const
    }

    expect(() => ExerciseLogSchema.parse(invalidData)).toThrow()
  })

  test('rejects invalid intensity', () => {
    const invalidData = {
      activityType: 'Running',
      duration: 30,
      intensity: 'extreme'
    }

    expect(() => ExerciseLogSchema.parse(invalidData)).toThrow()
  })

  test('accepts exercise without optional fields', () => {
    const validData = {
      activityType: 'Yoga',
      duration: 45,
      intensity: 'low' as const
    }

    const result = ExerciseLogSchema.parse(validData)
    expect(result.caloriesBurned).toBeUndefined()
    expect(result.distance).toBeUndefined()
  })
})

describe('Health Profile Generation Validation', () => {
  test('accepts valid health profile request', () => {
    const validData = {
      healthConditions: ['diabetes', 'hypertension'],
      age: 45,
      gender: 'male' as const,
      currentWeight: 180,
      height: 70,
      activityLevel: 'moderately-active' as const
    }

    const result = GenerateHealthProfileRequestSchema.parse(validData)
    expect(result.healthConditions).toHaveLength(2)
    expect(result.age).toBe(45)
  })

  test('rejects empty health conditions', () => {
    const invalidData = {
      healthConditions: [],
      age: 45
    }

    expect(() => GenerateHealthProfileRequestSchema.parse(invalidData)).toThrow()
  })

  test('rejects age below minimum', () => {
    const invalidData = {
      healthConditions: ['diabetes'],
      age: 10
    }

    expect(() => GenerateHealthProfileRequestSchema.parse(invalidData)).toThrow()
  })

  test('accepts minimal valid request', () => {
    const validData = {
      healthConditions: ['diabetes']
    }

    const result = GenerateHealthProfileRequestSchema.parse(validData)
    expect(result.healthConditions).toHaveLength(1)
    expect(result.age).toBeUndefined()
  })
})

describe('Meal Log Validation', () => {
  test('accepts meal log with AI analysis', () => {
    const validData = {
      mealType: 'breakfast' as const,
      aiAnalysis: {
        foodItems: [
          {
            name: 'Oatmeal',
            portion: '1 cup',
            calories: 150,
            protein: 5,
            carbs: 27,
            fat: 3,
            fiber: 4
          }
        ],
        totalCalories: 150,
        totalMacros: {
          protein: 5,
          carbs: 27,
          fat: 3,
          fiber: 4
        },
        confidence: 85
      }
    }

    const result = CreateMealLogRequestSchema.parse(validData)
    expect(result.mealType).toBe('breakfast')
    expect(result.aiAnalysis?.totalCalories).toBe(150)
  })

  test('accepts meal log with manual entries', () => {
    const validData = {
      mealType: 'lunch' as const,
      manualEntries: [
        {
          food: 'Chicken Breast',
          calories: 200,
          quantity: '6 oz'
        }
      ]
    }

    const result = CreateMealLogRequestSchema.parse(validData)
    expect(result.mealType).toBe('lunch')
    expect(result.manualEntries).toHaveLength(1)
  })

  test('rejects meal log without AI analysis or manual entries', () => {
    const invalidData = {
      mealType: 'dinner' as const
    }

    expect(() => CreateMealLogRequestSchema.parse(invalidData)).toThrow()
  })
})

describe('User Profile Update Validation', () => {
  test('accepts partial profile update', () => {
    const validData = {
      age: 30,
      currentWeight: 170,
      activityLevel: 'moderately-active' as const
    }

    const result = UpdateUserProfileRequestSchema.parse(validData)
    expect(result.age).toBe(30)
    expect(result.currentWeight).toBe(170)
  })

  test('rejects invalid age', () => {
    const invalidData = {
      age: 10
    }

    expect(() => UpdateUserProfileRequestSchema.parse(invalidData)).toThrow()
  })

  test('accepts preferences update', () => {
    const validData = {
      preferences: {
        units: 'metric' as const,
        notifications: true,
        biometricEnabled: false,
        themePreference: 'dark' as const
      }
    }

    const result = UpdateUserProfileRequestSchema.parse(validData)
    expect(result.preferences?.units).toBe('metric')
    expect(result.preferences?.themePreference).toBe('dark')
  })

  test('accepts empty update object', () => {
    const validData = {}

    const result = UpdateUserProfileRequestSchema.parse(validData)
    expect(result).toEqual({})
  })
})
