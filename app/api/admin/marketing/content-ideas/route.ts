/**
 * POST /api/admin/marketing/content-ideas
 * Generate stage-aware content ideas using Gemini AI
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { getCurrentStage, buildContentPrompt } from '@/lib/content-strategy'
import { logger } from '@/lib/logger'
import { errorResponse, forbiddenResponse, unauthorizedResponse } from '@/lib/api-response'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '')
    if (!idToken) return unauthorizedResponse()

    const decoded = await adminAuth.verifyIdToken(idToken)
    const adminDoc = await adminDb.collection('users').doc(decoded.uid).get()
    const adminData = adminDoc.data()
    if (!isSuperAdmin(decoded.email || '') && adminData?.role !== 'admin') {
      return forbiddenResponse('Admin access required')
    }

    const body = await request.json()
    const userCount = body.userCount ?? 0

    const stage = getCurrentStage(userCount)
    const prompt = buildContentPrompt(stage)

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 3000,
        responseMimeType: 'application/json',
      },
    })

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    let ideas: any
    try {
      ideas = JSON.parse(text)
    } catch {
      // Try extracting JSON from markdown code block
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      ideas = match ? JSON.parse(match[1]) : { error: 'Failed to parse AI response' }
    }

    return NextResponse.json({
      success: true,
      stage: stage.id,
      stageName: stage.name,
      ideas,
    })
  } catch (error) {
    logger.error('[ContentIdeas] Generation failed', error as Error)
    return errorResponse(error, { route: '/api/admin/marketing/content-ideas', operation: 'generate' })
  }
}
