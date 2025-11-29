import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { COLLECTIONS } from '@/constants/firestore'
import type { ShoppingItem } from '@/types/shopping'

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
    logger.error('[HouseholdOps] Error getting household inventory', error as Error, {
      householdId
    })
    throw error
  }
}

/**
 * POST /api/recipes/generate-from-inventory
 * Generate a custom recipe using available household inventory
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Generate Recipe] API route called')

    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Generate Recipe] No auth header')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    console.log('[Generate Recipe] Verifying token...')
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid
    console.log('[Generate Recipe] User authenticated:', userId)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { mealType = 'dinner', patientId, dietaryRestrictions = [], allergies = [] } = body
    console.log('[Generate Recipe] Request body:', { mealType, patientId, dietaryRestrictions, allergies })

    // Fetch household inventory
    const householdId = userId
    console.log('[Generate Recipe] Fetching inventory for household:', householdId)
    const inventory = await getHouseholdInventoryServer(householdId)
    console.log('[Generate Recipe] Inventory fetched, count:', inventory.length)

    if (!inventory || inventory.length === 0) {
      return NextResponse.json(
        { error: 'No inventory items found' },
        { status: 400 }
      )
    }

    // Filter to in-stock items only
    const availableItems = inventory.filter(item => item.inStock)

    if (availableItems.length === 0) {
      return NextResponse.json(
        { error: 'No items in stock' },
        { status: 400 }
      )
    }

    // Group items by category for better AI context
    const itemsByCategory: Record<string, string[]> = {}
    availableItems.forEach(item => {
      const category = item.category || 'other'
      if (!itemsByCategory[category]) {
        itemsByCategory[category] = []
      }
      itemsByCategory[category].push(item.productName)
    })

    // Check for expiring items (within 3 days)
    const expiringItems = availableItems.filter(item => {
      if (!item.expiresAt) return false
      const expiryDate = new Date(item.expiresAt)
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      return expiryDate <= threeDaysFromNow
    }).map(item => item.productName)

    logger.info('[Generate Recipe] Generating AI recipe from inventory', {
      userId,
      mealType,
      totalItems: availableItems.length,
      expiringItems: expiringItems.length
    })

    // Build AI prompt
    const prompt = `You are a creative chef. Generate a delicious, realistic ${mealType} recipe using ONLY the ingredients available in the user's household inventory.

**Available Inventory:**
${Object.entries(itemsByCategory).map(([category, items]) =>
  `${category.toUpperCase()}: ${items.join(', ')}`
).join('\n')}

${expiringItems.length > 0 ? `\n**PRIORITY: These items are expiring soon and should be used if possible:**\n${expiringItems.join(', ')}\n` : ''}

${dietaryRestrictions.length > 0 ? `\n**Dietary Restrictions:** ${dietaryRestrictions.join(', ')}\n` : ''}
${allergies.length > 0 ? `\n**ALLERGIES (DO NOT USE):** ${allergies.join(', ')}\n` : ''}

Generate a recipe in the following JSON format:
{
  "name": "Creative recipe name",
  "description": "Brief appetizing description (1-2 sentences)",
  "mealType": "${mealType}",
  "prepTime": 25,
  "cookTime": 30,
  "servings": 4,
  "difficulty": "easy|medium|hard",
  "ingredients": [
    "1 cup rice",
    "2 chicken breasts, diced",
    "1 onion, chopped"
  ],
  "instructions": [
    "Step 1 instructions",
    "Step 2 instructions"
  ],
  "calories": 450,
  "macros": {
    "protein": 35,
    "carbs": 45,
    "fat": 12,
    "fiber": 5
  },
  "dietaryTags": ["high-protein", "gluten-free"],
  "chefNotes": "Why this recipe works well with these ingredients"
}

IMPORTANT RULES:
1. Use ONLY ingredients from the available inventory
2. Prioritize expiring items when possible
3. Be creative but realistic - the recipe should actually taste good
4. Provide accurate nutritional estimates
5. Keep prep + cook time reasonable for a home cook
6. Return ONLY valid JSON, no other text`

    // Call Gemini API
    logger.info('[Generate Recipe] Calling Gemini API', {
      userId,
      promptLength: prompt.length
    })

    let text
    try {
      text = await callGeminiAPI(prompt)

      logger.info('[Generate Recipe] Received Gemini response', {
        userId,
        responseLength: text?.length || 0
      })
    } catch (geminiError: any) {
      console.error('[Generate Recipe] Gemini API Error:', geminiError)
      logger.error('[Generate Recipe] Gemini API failed', geminiError)
      throw new Error(`Gemini API error: ${geminiError.message || 'Unknown error'}`)
    }

    if (!text) {
      throw new Error('No response from Gemini AI')
    }

    // Parse the JSON recipe
    let recipe
    try {
      // Extract JSON from response (in case there's any extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response')
      }
      recipe = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      logger.error('[Generate Recipe] Failed to parse AI response', parseError as Error, {
        response: text
      })
      throw new Error('Failed to parse recipe from AI response')
    }

    // Add metadata
    recipe.id = `ai-generated-${Date.now()}`
    recipe.source = 'AI Generated from Inventory'
    recipe.generatedAt = new Date().toISOString()
    recipe.usedExpiringItems = expiringItems.length > 0

    logger.info('[Generate Recipe] Successfully generated recipe', {
      userId,
      recipeName: recipe.name,
      ingredients: recipe.ingredients?.length
    })

    return NextResponse.json({
      success: true,
      recipe
    })

  } catch (error: any) {
    console.error('[Generate Recipe] Full server error:', error)
    logger.error('[Generate Recipe] Error generating recipe', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate recipe',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
