import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * AI Service Health Check Endpoint
 *
 * Tests Gemini API connectivity and configuration
 * Used for production diagnostics
 */
export async function GET(request: NextRequest) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      geminiApiKeyExists: !!process.env.GEMINI_API_KEY,
      geminiApiKeyLength: process.env.GEMINI_API_KEY?.length || 0,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      nodeVersion: process.version,
      netlifyContext: process.env.CONTEXT || 'unknown',
    },
    tests: {} as Record<string, any>
  }

  // Test 1: Gemini API Key
  if (!process.env.GEMINI_API_KEY) {
    diagnostics.tests.geminiApiKey = {
      status: 'FAILED',
      error: 'GEMINI_API_KEY not set in environment variables'
    }
  } else {
    diagnostics.tests.geminiApiKey = {
      status: 'PASSED',
      message: 'API key configured'
    }
  }

  // Test 2: Gemini API Connectivity
  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      await Promise.race([
        model.generateContent('Test connection'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout after 5 seconds')), 5000)
        )
      ])

      diagnostics.tests.geminiConnectivity = {
        status: 'PASSED',
        model: 'gemini-1.5-flash',
        message: 'Successfully connected to Gemini API'
      }
    } catch (error: any) {
      diagnostics.tests.geminiConnectivity = {
        status: 'FAILED',
        error: error.message,
        details: error.stack?.split('\n').slice(0, 3).join('\n')
      }
    }
  } else {
    diagnostics.tests.geminiConnectivity = {
      status: 'SKIPPED',
      message: 'Cannot test connectivity without API key'
    }
  }

  const allPassed = Object.values(diagnostics.tests).every((t: any) => t.status === 'PASSED')

  return NextResponse.json(diagnostics, {
    status: allPassed ? 200 : 500,
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  })
}
