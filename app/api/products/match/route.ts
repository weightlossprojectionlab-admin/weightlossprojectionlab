import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

/**
 * POST /api/products/match
 * Match recipe ingredients to products in the global database
 *
 * Request body:
 * {
 *   ingredients: [{ name: string, quantity?: number, unit?: string }]
 *   userRegion?: string // User's region for regional filtering
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Get user's region from their profile
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const userRegion = userData?.profile?.region

    const body = await request.json()
    const { ingredients } = body

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: 'Invalid ingredients' }, { status: 400 })
    }

    // Match each ingredient to products
    const matches = await Promise.all(
      ingredients.map(async (ingredient: { name: string; quantity?: number; unit?: string }) => {
        const ingredientName = ingredient.name.toLowerCase().trim()

        // Search strategy:
        // 1. Try exact product name match
        // 2. Try brand match
        // 3. Try category-based suggestions

        // Get all products (with limit for performance)
        const productsSnapshot = await adminDb
          .collection('product_database')
          .orderBy('stats.totalScans', 'desc')
          .limit(1000)
          .get()

        const products = productsSnapshot.docs.map(doc => ({
          barcode: doc.id,
          ...doc.data()
        }))

        // Score and rank products based on ingredient match
        const scoredProducts = products
          .map((product: any) => {
            let score = 0
            const productName = (product.productName || '').toLowerCase()
            const brand = (product.brand || '').toLowerCase()

            // Exact name match
            if (productName.includes(ingredientName)) {
              score += 100
            }

            // Individual word matches
            const ingredientWords = ingredientName.split(/\s+/)
            const productWords = productName.split(/\s+/)

            ingredientWords.forEach(word => {
              if (word.length > 2 && productWords.some((pw: string) => pw.includes(word))) {
                score += 20
              }
            })

            // Brand match
            if (brand && ingredientWords.some(word => brand.includes(word))) {
              score += 15
            }

            // Boost by popularity
            score += Math.min((product.stats?.totalScans || 0) / 10, 20)

            // Boost if verified
            if (product.quality?.verified) {
              score += 10
            }

            // Boost if in user's region
            if (userRegion && product.regional?.regions?.includes(userRegion)) {
              score += 25
            }

            return {
              ...product,
              matchScore: score
            }
          })
          .filter(p => p.matchScore > 30) // Only return products with decent match
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 5) // Top 5 matches per ingredient

        return {
          ingredient: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          matches: scoredProducts.map(p => ({
            barcode: p.barcode,
            productName: p.productName,
            brand: p.brand,
            imageUrl: p.imageUrl,
            category: p.category,
            matchScore: p.matchScore,
            stats: {
              totalScans: p.stats?.totalScans || 0,
              totalPurchases: p.stats?.totalPurchases || 0
            },
            regional: {
              stores: p.regional?.stores || [],
              avgPriceCents: p.regional?.avgPriceCents || 0,
              priceMin: p.regional?.priceMin || 0,
              priceMax: p.regional?.priceMax || 0
            },
            quality: {
              verified: p.quality?.verified || false,
              confidence: p.quality?.confidence || 0
            },
            nutrition: p.nutrition
          }))
        }
      })
    )

    // Calculate overall recipe availability score
    const ingredientsWithMatches = matches.filter(m => m.matches.length > 0).length
    const availabilityScore = Math.round((ingredientsWithMatches / ingredients.length) * 100)

    // Calculate estimated price range (if price data available)
    let totalMinPrice = 0
    let totalMaxPrice = 0
    let priceDataAvailable = 0

    matches.forEach(match => {
      if (match.matches.length > 0) {
        const topMatch = match.matches[0]
        if (topMatch.regional.priceMin > 0 && topMatch.regional.priceMax > 0) {
          totalMinPrice += topMatch.regional.priceMin
          totalMaxPrice += topMatch.regional.priceMax
          priceDataAvailable++
        }
      }
    })

    const estimatedPriceRange = priceDataAvailable > 0
      ? {
          minCents: Math.round(totalMinPrice),
          maxCents: Math.round(totalMaxPrice),
          ingredientsWithPrice: priceDataAvailable
        }
      : null

    return NextResponse.json({
      matches,
      availabilityScore,
      estimatedPriceRange,
      userRegion
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/products/match',
      operation: 'create'
    })
  }
}
