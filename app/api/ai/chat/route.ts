import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { checkAndIncrementUsage } from '@/lib/usage-tracking'
import {
  fetchUserContext,
  buildContextPrompt,
  getChatHistory,
  saveChatMessage,
  COACH_SYSTEM_PROMPT,
  type ChatMessage
} from '@/lib/ai-coach'
import { logger } from '@/lib/logger'
import { ErrorHandler } from '@/lib/utils/error-handler'
import { errorResponse } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import {
  detectPromptInjection,
  checkOutputSafety,
  checkCrisisRedirect,
  SAFE_FALLBACK_RESPONSE,
} from '@/lib/ai/coach-guardrails'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * POST /api/ai/chat
 * Send a message to the AI Coach and get a response
 */
export async function POST(request: NextRequest) {
  // T5.17 — canonical rate limit (per-minute + per-day). Legacy
  // aiRateLimit/dailyRateLimit imports were dead code (never invoked).
  const minuteLimit = await rateLimit(request, 'ai:gemini')
  if (minuteLimit) return minuteLimit
  const dailyLimit = await rateLimit(request, 'ai:gemini-daily')
  if (dailyLimit) return dailyLimit

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

    // T3.7 #8 input gate — block prompt-injection attempts before
    // they reach Gemini. Conservative: refuse rather than sanitize,
    // because medical context makes false-negatives costlier than
    // false-positives. Logs structurally (no message content in
    // logs to keep PHI out of telemetry).
    const injection = detectPromptInjection(message)
    if (injection.detected) {
      logger.warn('[AI Chat] Prompt-injection attempt blocked', {
        userId,
        pattern: injection.pattern,
      })
      return NextResponse.json(
        {
          error:
            "I can't process that as written. If you're asking a real nutrition or wellness question, please rephrase it directly.",
          code: 'INPUT_REJECTED',
        },
        { status: 400 }
      )
    }

    // (T5.17 rate limits already enforced at the top of POST -- per-minute
    // 'ai:gemini' + per-day 'ai:gemini-daily' via the canonical limiter.
    // Plan-based per-user usage limits below remain separate from quota.)

    // Check plan-based daily chat limit
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const plan: string = userDoc.data()?.subscription?.plan ?? 'free'
    const usage = await checkAndIncrementUsage(userId, 'aiChatMessages', plan)
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: `Daily AI chat limit reached (${usage.limit} messages/day on ${plan} plan). Upgrade for more.`,
          used: usage.used,
          limit: usage.limit,
          upgradeRequired: true,
          code: 'CHAT_LIMIT_REACHED'
        },
        { status: 429 }
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
      model: 'gemini-2.5-flash',
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
    const rawResponseText = response.text()

    // T3.7 #8 output gates — run BEFORE persisting / returning so
    // a model that emitted unsafe content never reaches the user.
    let responseText = rawResponseText
    let safetyTrip: string | undefined

    const safety = checkOutputSafety(rawResponseText)
    if (!safety.safe) {
      safetyTrip = safety.concern
      responseText = SAFE_FALLBACK_RESPONSE
    }

    // Crisis redirect — if user mentioned self-harm and the model
    // didn't redirect, swap in the fallback (which DOES redirect).
    const crisis = checkCrisisRedirect(message, responseText)
    if (crisis.triggered && !crisis.redirected) {
      safetyTrip = (safetyTrip ?? '') + '+missing-crisis-redirect'
      responseText = SAFE_FALLBACK_RESPONSE
    }

    if (safetyTrip) {
      logger.warn('[AI Chat] Output safety gate triggered — fallback substituted', {
        userId,
        concern: safetyTrip,
        // Preview only (first 200 chars) so the audit log records
        // enough to investigate without dumping unbounded model output.
        rawPreview: rawResponseText.substring(0, 200),
      })
    }

    logger.debug('Generated AI chat response', {
      preview: responseText.substring(0, 100),
      safetyTripped: !!safetyTrip,
    })

    // Save assistant response (the safe one, not the raw model output).
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
