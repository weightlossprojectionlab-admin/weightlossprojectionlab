/**
 * Environment Variable Validator
 *
 * Validates that all required environment variables are present at startup.
 * Throws descriptive errors in development, logs warnings in production.
 *
 * This file should be imported and executed early in the app initialization
 * process to catch configuration issues before Firebase or API services are used.
 */

import { logger } from '@/lib/logger'

interface EnvVarConfig {
  name: string
  required: boolean
  description: string
}

interface EnvVarGroup {
  name: string
  vars: EnvVarConfig[]
}

/**
 * All environment variables used in the application, grouped by service
 */
const ENV_VARS: EnvVarGroup[] = [
  {
    name: 'Firebase Client (Public)',
    vars: [
      {
        name: 'NEXT_PUBLIC_FIREBASE_API_KEY',
        required: true,
        description: 'Firebase Web API key for client-side authentication'
      },
      {
        name: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        required: true,
        description: 'Firebase Auth domain (e.g., your-app.firebaseapp.com)'
      },
      {
        name: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        required: true,
        description: 'Firebase project ID'
      },
      {
        name: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
        required: true,
        description: 'Firebase Storage bucket (e.g., your-app.appspot.com)'
      },
      {
        name: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        required: true,
        description: 'Firebase Cloud Messaging sender ID'
      },
      {
        name: 'NEXT_PUBLIC_FIREBASE_APP_ID',
        required: true,
        description: 'Firebase app ID'
      },
      {
        name: 'NEXT_PUBLIC_FIREBASE_VAPID_KEY',
        required: false,
        description: 'Firebase VAPID key for push notifications (optional)'
      }
    ]
  },
  {
    name: 'Firebase Admin SDK (Server)',
    vars: [
      {
        name: 'FIREBASE_ADMIN_PROJECT_ID',
        required: true,
        description: 'Firebase Admin SDK project ID'
      },
      {
        name: 'FIREBASE_ADMIN_CLIENT_EMAIL',
        required: true,
        description: 'Firebase Admin SDK service account email'
      },
      {
        name: 'FIREBASE_ADMIN_PRIVATE_KEY',
        required: true,
        description: 'Firebase Admin SDK private key (with \\n newlines)'
      },
      {
        name: 'FIREBASE_STORAGE_BUCKET',
        required: false,
        description: 'Firebase Storage bucket for admin operations (optional, defaults to project ID)'
      }
    ]
  },
  {
    name: 'AI Services - Gemini',
    vars: [
      {
        name: 'GEMINI_API_KEY',
        required: true,
        description: 'Google Gemini API key for meal analysis and AI features'
      },
      {
        name: 'NEXT_PUBLIC_GEMINI_API_KEY',
        required: false,
        description: 'Public Gemini API key for client-side recipe generation (optional)'
      }
    ]
  },
  {
    name: 'AI Services - OpenAI (Optional)',
    vars: [
      {
        name: 'OPENAI_API_KEY',
        required: false,
        description: 'OpenAI API key for AI orchestration (optional)'
      },
      {
        name: 'OPENAI_MODEL_FAST',
        required: false,
        description: 'OpenAI model for fast responses (optional, defaults to gpt-3.5-turbo)'
      },
      {
        name: 'OPENAI_MODEL_BALANCED',
        required: false,
        description: 'OpenAI model for balanced responses (optional, defaults to gpt-4o-mini)'
      },
      {
        name: 'OPENAI_MODEL_ACCURATE',
        required: false,
        description: 'OpenAI model for accurate responses (optional, defaults to gpt-4-turbo)'
      }
    ]
  },
  {
    name: 'Nutrition Data',
    vars: [
      {
        name: 'USDA_API_KEY',
        required: false,
        description: 'USDA FoodData Central API key for nutrition validation (optional but recommended)'
      }
    ]
  },
  {
    name: 'Email Service',
    vars: [
      {
        name: 'RESEND_API_KEY',
        required: false,
        description: 'Resend API key for email campaigns (optional, needed for re-engagement emails)'
      }
    ]
  },
  {
    name: 'App Configuration',
    vars: [
      {
        name: 'NEXT_PUBLIC_APP_URL',
        required: false,
        description: 'Public app URL (optional, defaults to http://localhost:3000)'
      },
      {
        name: 'NEXT_PUBLIC_BASE_URL',
        required: false,
        description: 'Base URL for metadata (optional, defaults to http://localhost:3000)'
      },
      {
        name: 'NODE_ENV',
        required: false,
        description: 'Node environment (development, production, test)'
      }
    ]
  },
  {
    name: 'Feature Flags',
    vars: [
      {
        name: 'NEXT_PUBLIC_PERKS_ENABLED',
        required: false,
        description: 'Enable sponsor perks system (optional, defaults to false)'
      },
      {
        name: 'NEXT_PUBLIC_AI_ORCHESTRATION',
        required: false,
        description: 'Enable AI orchestration layer (optional, defaults to false)'
      },
      {
        name: 'NEXT_PUBLIC_TS_DASHBOARD',
        required: false,
        description: 'Enable trust & safety dashboard (optional, defaults to false)'
      },
      {
        name: 'NEXT_PUBLIC_ANALYTICS',
        required: false,
        description: 'Enable analytics (optional, defaults to false)'
      }
    ]
  }
]

interface ValidationResult {
  valid: boolean
  missing: { name: string; group: string; description: string }[]
  warnings: { name: string; group: string; description: string }[]
}

/**
 * Validate all environment variables
 * Returns detailed validation results
 */
export function validateEnvironmentVariables(): ValidationResult {
  const missing: ValidationResult['missing'] = []
  const warnings: ValidationResult['warnings'] = []

  for (const group of ENV_VARS) {
    for (const envVar of group.vars) {
      const value = process.env[envVar.name]

      if (!value || value.trim() === '') {
        if (envVar.required) {
          missing.push({
            name: envVar.name,
            group: group.name,
            description: envVar.description
          })
        } else {
          warnings.push({
            name: envVar.name,
            group: group.name,
            description: envVar.description
          })
        }
      }
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings
  }
}

/**
 * Format validation error message
 */
function formatValidationError(result: ValidationResult): string {
  let message = '\n========================================\n'
  message += '   ENVIRONMENT VARIABLE VALIDATION FAILED\n'
  message += '========================================\n\n'

  message += `Missing ${result.missing.length} required environment variable(s):\n\n`

  // Group missing vars by service
  const grouped = result.missing.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = []
    }
    acc[item.group].push(item)
    return acc
  }, {} as Record<string, typeof result.missing>)

  for (const [groupName, vars] of Object.entries(grouped)) {
    message += `  ${groupName}:\n`
    for (const v of vars) {
      message += `    - ${v.name}\n`
      message += `      ${v.description}\n`
    }
    message += '\n'
  }

  message += 'To fix this:\n'
  message += '  1. Copy .env.example to .env.local\n'
  message += '  2. Fill in the required values\n'
  message += '  3. Restart your development server\n\n'
  message += 'For production:\n'
  message += '  Set these environment variables in your hosting provider\n'
  message += '  (Vercel, Netlify, etc.)\n\n'
  message += '========================================\n'

  return message
}

/**
 * Format warnings for optional environment variables
 */
function formatWarnings(warnings: ValidationResult['warnings']): string {
  if (warnings.length === 0) return ''

  let message = '\n========================================\n'
  message += '   OPTIONAL ENVIRONMENT VARIABLES\n'
  message += '========================================\n\n'

  message += `${warnings.length} optional variable(s) not set:\n\n`

  // Group warnings by service
  const grouped = warnings.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = []
    }
    acc[item.group].push(item)
    return acc
  }, {} as Record<string, typeof warnings>)

  for (const [groupName, vars] of Object.entries(grouped)) {
    message += `  ${groupName}:\n`
    for (const v of vars) {
      message += `    - ${v.name}\n`
      message += `      ${v.description}\n`
    }
    message += '\n'
  }

  message += 'These features will be disabled or use defaults.\n'
  message += 'See .env.example for more information.\n\n'
  message += '========================================\n'

  return message
}

/**
 * Validate environment variables and throw if required ones are missing
 *
 * @param options.throwOnMissing - Throw error if required vars are missing (default: true in dev, false in prod)
 * @param options.logWarnings - Log warnings for optional vars (default: true)
 */
export function validateEnv(options?: {
  throwOnMissing?: boolean
  logWarnings?: boolean
}): void {
  const isDevelopment = process.env.NODE_ENV !== 'production'
  const throwOnMissing = options?.throwOnMissing ?? isDevelopment
  const logWarnings = options?.logWarnings ?? true

  const result = validateEnvironmentVariables()

  // Handle missing required variables
  if (!result.valid) {
    const errorMessage = formatValidationError(result)

    if (throwOnMissing) {
      throw new Error(errorMessage)
    } else {
      logger.error(errorMessage, new Error('Environment validation failed'))
    }
  }

  // Log warnings for optional variables
  if (logWarnings && result.warnings.length > 0) {
    const warningMessage = formatWarnings(result.warnings)
    logger.warn(warningMessage)
  }

  // Log success in development
  if (isDevelopment && result.valid) {
    logger.info('All required environment variables are configured')

    if (result.warnings.length > 0) {
      logger.info(`${result.warnings.length} optional variable(s) not set (see warnings above)`)
    }
  }
}

/**
 * Get all environment variable groups for documentation
 */
export function getEnvVarGroups(): EnvVarGroup[] {
  return ENV_VARS
}

/**
 * Get all required environment variables
 */
export function getRequiredEnvVars(): string[] {
  return ENV_VARS.flatMap(group =>
    group.vars.filter(v => v.required).map(v => v.name)
  )
}

/**
 * Get all optional environment variables
 */
export function getOptionalEnvVars(): string[] {
  return ENV_VARS.flatMap(group =>
    group.vars.filter(v => !v.required).map(v => v.name)
  )
}
