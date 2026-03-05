/**
 * Diagnostic script to test AI vision providers for meal analysis
 * Run with: node scripts/test-ai-vision.mjs
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

async function testGemini() {
  console.log('\n🧪 Testing Gemini API...')

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment')
    }

    console.log('✓ API key found:', process.env.GEMINI_API_KEY.substring(0, 10) + '...')

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 100,
      }
    })

    // Simple text-only test
    const result = await model.generateContent('Say "Hello from Gemini!"')
    const response = result.response
    const text = response.text()

    console.log('✅ Gemini API working!')
    console.log('Response:', text)
    return true
  } catch (error) {
    console.error('❌ Gemini API failed:')
    console.error('Error message:', error.message)
    console.error('Error code:', error.code || 'N/A')
    console.error('Error status:', error.status || 'N/A')
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
    }
    return false
  }
}

async function testOpenAI() {
  console.log('\n🧪 Testing OpenAI API...')

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found in environment')
    }

    console.log('✓ API key found:', process.env.OPENAI_API_KEY.substring(0, 10) + '...')

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Simple text-only test
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: 'Say "Hello from OpenAI!"' }
      ],
      max_tokens: 50
    })

    const text = response.choices[0]?.message?.content

    console.log('✅ OpenAI API working!')
    console.log('Response:', text)
    return true
  } catch (error) {
    console.error('❌ OpenAI API failed:')
    console.error('Error message:', error.message)
    console.error('Error code:', error.code || 'N/A')
    console.error('Error type:', error.type || 'N/A')
    console.error('Status:', error.status || 'N/A')
    return false
  }
}

async function main() {
  console.log('🔍 AI Vision Service Diagnostics')
  console.log('================================')

  const geminiWorks = await testGemini()
  const openaiWorks = await testOpenAI()

  console.log('\n📊 Summary')
  console.log('----------')
  console.log('Gemini:', geminiWorks ? '✅ Working' : '❌ Failed')
  console.log('OpenAI:', openaiWorks ? '✅ Working' : '❌ Failed')

  if (!geminiWorks && !openaiWorks) {
    console.log('\n⚠️  WARNING: Both AI providers are failing!')
    console.log('The app will fall back to mock data.')
    console.log('\nPossible causes:')
    console.log('1. API keys are expired or invalid')
    console.log('2. API quotas have been exceeded')
    console.log('3. Network connectivity issues')
    console.log('4. API services are temporarily down')
    process.exit(1)
  } else if (!geminiWorks) {
    console.log('\n⚠️  Gemini is down, but OpenAI is available as fallback')
  } else if (!openaiWorks) {
    console.log('\n✅ Gemini is working (primary provider)')
  } else {
    console.log('\n✅ All providers working correctly!')
  }
}

main().catch(console.error)
