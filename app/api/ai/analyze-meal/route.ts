import { NextRequest, NextResponse } from 'next/server'

// Mock OpenAI response for now - replace with actual OpenAI integration
const mockAnalyzeMeal = async (imageData: string) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500))

  // Return mock analysis based on common foods
  const mockFoods = [
    { foods: ['Grilled chicken breast', 'Brown rice', 'Steamed broccoli'], calories: 420, protein: 35, carbs: 45, fat: 8, fiber: 6 },
    { foods: ['Salmon fillet', 'Quinoa', 'Roasted vegetables'], calories: 485, protein: 38, carbs: 42, fat: 18, fiber: 8 },
    { foods: ['Turkey sandwich', 'Whole wheat bread', 'Lettuce', 'Tomato'], calories: 340, protein: 24, carbs: 38, fat: 12, fiber: 5 },
    { foods: ['Greek yogurt', 'Mixed berries', 'Granola'], calories: 220, protein: 15, carbs: 28, fat: 6, fiber: 4 },
    { foods: ['Avocado toast', 'Poached egg', 'Cherry tomatoes'], calories: 380, protein: 14, carbs: 32, fat: 22, fiber: 8 }
  ]

  const randomFood = mockFoods[Math.floor(Math.random() * mockFoods.length)]

  return {
    foodItems: randomFood.foods,
    estimatedCalories: randomFood.calories + Math.floor(Math.random() * 100) - 50, // Add some variance
    macros: {
      protein: randomFood.protein + Math.floor(Math.random() * 10) - 5,
      carbs: randomFood.carbs + Math.floor(Math.random() * 10) - 5,
      fat: randomFood.fat + Math.floor(Math.random() * 5) - 2,
      fiber: randomFood.fiber + Math.floor(Math.random() * 3) - 1
    },
    confidence: Math.floor(Math.random() * 25) + 75, // 75-100%
    suggestions: [
      'Great balanced meal!',
      'Consider adding more vegetables for extra nutrients',
      'Good protein source for muscle maintenance',
      'Try to include healthy fats like avocado or nuts'
    ].slice(0, Math.floor(Math.random() * 3) + 1)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageData, mealType } = body

    console.log('Received request:', {
      hasImageData: !!imageData,
      imageDataType: typeof imageData,
      imageDataLength: imageData?.length,
      mealType
    })

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      )
    }

    // Validate image data is a string
    if (typeof imageData !== 'string') {
      return NextResponse.json(
        { error: 'Image data must be a string' },
        { status: 400 }
      )
    }

    // Validate image data format
    if (!imageData.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image format. Please provide a valid base64 image.' },
        { status: 400 }
      )
    }

    // TODO: Replace with actual OpenAI Vision API call
    /*
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this ${mealType || 'meal'} photo and provide:
                1. List of visible food items
                2. Estimated portion sizes
                3. Calorie estimate (be conservative)
                4. Macro breakdown (protein/carbs/fat/fiber in grams)
                5. Confidence level (0-100%)
                6. Healthy suggestions

                Focus on accuracy over creativity. Use standard portion sizes.
                Return as JSON with keys: foodItems, estimatedCalories, macros, confidence, suggestions`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    })

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API request failed')
    }

    const result = await openaiResponse.json()
    const analysis = JSON.parse(result.choices[0].message.content)
    */

    // Use mock analysis for now
    const analysis = await mockAnalyzeMeal(imageData)

    return NextResponse.json({
      success: true,
      data: analysis
    })

  } catch (error) {
    console.error('Meal analysis error:', error)

    return NextResponse.json(
      {
        error: 'Failed to analyze meal. Please try again or enter manually.',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}