import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { adminAuth } from '@/lib/firebase-admin'
import {
  fetchUserContext,
  buildContextPrompt,
  getChatHistory,
  saveChatMessage,
  COACH_SYSTEM_PROMPT,
  type ChatMessage
} from '@/lib/ai-coach'
import { logger } from '@/lib/logger'
import { aiRateLimit, dailyRateLimit, getRateLimitHeaders } from '@/lib/utils/rate-limit'
import { ErrorHandler } from '@/lib/utils/error-handler'
import { errorResponse } from '@/lib/api-response'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * POST /api/ai/chat
 * Send a message to the AI Coach and get a response
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing token' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Parse request body
    const body = await request.json()
    const { message, includeContext = true } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: message is required' },
        { status: 400 }
      )
    }

    // Check rate limits (both per-minute and daily)
    const [minuteLimit, dayLimit] = await Promise.all([
      aiRateLimit?.limit(userId),
      dailyRateLimit?.limit(userId)
    ])

    if (minuteLimit && !minuteLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit: 10 requests per minute. Please try again in a moment.' },
        {
          status: 429,
          headers: getRateLimitHeaders(minuteLimit)
        }
      )
    }

    if (dayLimit && !dayLimit.success) {
      return NextResponse.json(
        { error: 'Daily limit reached (500 requests). Please try again tomorrow.' },
        {
          status: 429,
          headers: getRateLimitHeaders(dayLimit)
        }
      )
    }

    logger.debug('Processing AI chat message', { userId })

    // Fetch user context and chat history
    const [context, history] = await Promise.all([
      includeContext ? fetchUserContext(userId) : Promise.resolve({}),
      getChatHistory(userId, 10) // Last 10 messages for context
    ])

    // Save user message
    const userMessage: Omit<ChatMessage, 'id'> = {
      userId,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      metadata: { source: 'chat' }
    }
    await saveChatMessage(userMessage)

    // Build conversation context
    const contextPrompt = includeContext ? buildContextPrompt(context) : ''

    // Build chat history for Gemini (excluding system messages)
    const conversationHistory = history
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))

    // Create Gemini model
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1024,
      },
    })

    // Build full prompt
    let fullPrompt = COACH_SYSTEM_PROMPT

    if (contextPrompt) {
      fullPrompt += `\n\n${contextPrompt}`
    }

    fullPrompt += `\n\n**User Question:** ${message}`

    // Start chat session with history
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: COACH_SYSTEM_PROMPT }]
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. I\'m your supportive nutrition coach, ready to provide personalized, evidence-based guidance. I\'ll keep responses concise and actionable, reference your data, and maintain a warm, encouraging tone. How can I help you today?' }]
        },
        ...conversationHistory
      ]
    })

    // Send message and get response
    const result = await chat.sendMessage(fullPrompt)
    const response = result.response
    const responseText = response.text()

    logger.debug('Generated AI chat response', {
      preview: responseText.substring(0, 100)
    })

    // Save assistant response
    const assistantMessage: Omit<ChatMessage, 'id'> = {
      userId,
      role: 'assistant',
      content: responseText,
      timestamp: new Date().toISOString(),
      metadata: { source: 'chat' }
    }
    await saveChatMessage(assistantMessage)

    return NextResponse.json({
      success: true,
      message: responseText,
      context: includeContext ? {
        userProfile: (context as any).userProfile,
        currentStreak: (context as any).currentStreak,
        level: (context as any).level
      } : undefined
    })

  } catch (error) {
    // Check for specific error types before generic handling
    if (error instanceof Error && error.message.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a moment.' },
        { status: 429 }
      )
    }

    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'AI service configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    return errorResponse(error, {
      route: '/api/ai/chat',
      operation: 'post'
    })
  }
}

/**
 * GET /api/ai/chat
 * Get chat history for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing token' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Get chat history
    const history = await getChatHistory(userId, 50)

    return NextResponse.json({
      success: true,
      messages: history
    })

  } catch (error) {
    return errorResponse(error, {
      route: '/api/ai/chat',
      operation: 'get_history'
    })
  }
}
