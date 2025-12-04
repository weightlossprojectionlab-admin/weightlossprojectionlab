import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { COLLECTIONS } from '@/constants/firestore'
import type { ShoppingItem } from '@/types/shopping'
import { rateLimit } from '@/lib/rate-limit'
import { errorResponse } from '@/lib/api-response'

/**
 * Call Gemini API directly using REST instead of SDK to avoid model name issues
 */
async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set')
  }

  // Use the v1 API with gemini-pro model
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error (${response.status}): ${errorText}`)
  }

  const data = await response.json()

  // Extract text from response
  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    const parts = data.candidates[0].content.parts
    if (parts && parts[0] && parts[0].text) {
      return parts[0].text
    }
  }

  throw new Error('Unexpected response format from Gemini API')
}

/**
 * Server-safe function to fetch household inventory using Firebase Admin SDK
 */
async function getHouseholdInventoryServer(
  householdId: string,
  filters?: {
    inStock?: boolean
    needed?: boolean
  }
): Promise<ShoppingItem[]> {
  try {
    // Query items where either householdId matches OR userId matches
    const queries: Promise<FirebaseFirestore.QuerySnapshot>[] = []

    // Query 1: Items with householdId
    let q1 = adminDb.collection(COLLECTIONS.SHOPPING_ITEMS).where('householdId', '==', householdId)
    if (filters?.inStock !== undefined) {
      q1 = q1.where('inStock', '==', filters.inStock)
    }
    if (filters?.needed !== undefined) {
      q1 = q1.where('needed', '==', filters.needed)
    }

    // Query 2: Items with userId (for backwards compatibility)
    let q2 = adminDb.collection(COLLECTIONS.SHOPPING_ITEMS).where('userId', '==', householdId)
    if (filters?.inStock !== undefined) {
      q2 = q2.where('inStock', '==', filters.inStock)
    }
    if (filters?.needed !== undefined) {
      q2 = q2.where('needed', '==', filters.needed)
    }

    // Execute both queries in parallel
    const [snapshot1, snapshot2] = await Promise.all([
      q1.get(),
      q2.get()
    ])

    // Combine results and deduplicate by ID
    const itemsMap = new Map<string, ShoppingItem>()

    snapshot1.docs.forEach(doc => {
      itemsMap.set(doc.id, { id: doc.id, ...doc.data() } as ShoppingItem)
    })

    snapshot2.docs.forEach(doc => {
      if (!itemsMap.has(doc.id)) {
        itemsMap.set(doc.id, { id: doc.id, ...doc.data() } as ShoppingItem)
      }
    })

    return Array.from(itemsMap.values())
  } catch (error) {
    logger.error('[getHouseholdInventoryServer] Error fetching inventory', error as Error)
    throw error
  }
}
