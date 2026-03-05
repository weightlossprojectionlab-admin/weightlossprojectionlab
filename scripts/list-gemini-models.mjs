/**
 * List available Gemini models
 * Run with: node scripts/list-gemini-models.mjs
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

async function listModels() {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found')
      process.exit(1)
    }

    console.log('Fetching available models from Gemini API...\n')

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Failed to fetch models:', response.status, error)
      process.exit(1)
    }

    const data = await response.json()

    console.log('Available models:\n')
    if (data.models && data.models.length > 0) {
      data.models.forEach((model) => {
        console.log(`Name: ${model.name}`)
        console.log(`Display Name: ${model.displayName}`)
        console.log(`Description: ${model.description}`)
        console.log(`Supported methods: ${model.supportedGenerationMethods?.join(', ')}`)
        console.log('---')
      })

      // Find vision-capable models
      const visionModels = data.models.filter(m =>
        m.supportedGenerationMethods?.includes('generateContent') &&
        (m.name.includes('pro') || m.name.includes('vision') || m.name.includes('flash'))
      )

      console.log('\n\nRecommended models for image analysis:')
      visionModels.forEach(m => {
        const modelId = m.name.replace('models/', '')
        console.log(`- ${modelId}`)
      })
    } else {
      console.log('No models found')
    }
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

listModels()
