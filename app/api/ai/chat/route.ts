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

// Rate limiting for Gemini free tier: 10 req/min, 500 req/day
const rateLimiter = {
  minuteRequests: [] as number[],
  dailyRequests: [] as number[],

  canMakeRequest(): { allowed: boolean; reason?: string } {
    const now = Date.now()
    const oneMinuteAgo = now - 60 * 1000
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    // Clean old requests
    this.minuteRequests = this.minuteRequests.filter(t => t > oneMinuteAgo)
    this.dailyRequests = this.dailyRequests.filter(t => t > oneDayAgo)

    // Check limits
    if (this.minuteRequests.length >= 10) {
      return { allowed: false, reason: 'Rate limit: 10 requests per minute. Please try again in a moment.' }
    }
    if (this.dailyRequests.length >= 500) {
      return { allowed: false, reason: 'Daily limit reached. Please try again tomorrow.' }
    }

    return { allowed: true }
  },

  recordRequest() {
    const now = Date.now()
    this.minuteRequests.push(now)
    this.dailyRequests.push(now)
  }
}

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

    // Check rate limit
    const rateLimitCheck = rateLimiter.canMakeRequest()
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: rateLimitCheck.reason },
        { status: 429 }
      )
    }

    console.log('[AI Chat] Processing message for user:', userId)

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
    rateLimiter.recordRequest()
    const result = await chat.sendMessage(fullPrompt)
    const response = result.response
    const responseText = response.text()

    console.log('[AI Chat] Generated response:', responseText.substring(0, 100) + '...')

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
    console.error('[AI Chat] Error:', error)

    // Return helpful error message
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

    return NextResponse.json(
      { error: 'Failed to process message. Please try again.' },
      { status: 500 }
    )
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
    console.error('[AI Chat] Error fetching history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    )
  }
}
