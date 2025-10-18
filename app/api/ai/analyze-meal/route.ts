import { NextRequest, NextResponse } from 'next/server'

// Fallback mock data if OpenAI fails
const getMockAnalysis = () => {
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
    estimatedCalories: randomFood.calories + Math.floor(Math.random() * 100) - 50,
    macros: {
      protein: randomFood.protein + Math.floor(Math.random() * 10) - 5,
      carbs: randomFood.carbs + Math.floor(Math.random() * 10) - 5,
      fat: randomFood.fat + Math.floor(Math.random() * 5) - 2,
      fiber: randomFood.fiber + Math.floor(Math.random() * 3) - 1
    },
    confidence: Math.floor(Math.random() * 25) + 75,
    suggestions: [
      'Great balanced meal!',
      'Consider adding more vegetables for extra nutrients',
      'Good protein source for muscle maintenance',
      'Try to include healthy fats like avocado or nuts'
    ].slice(0, Math.floor(Math.random() * 3) + 1),
    isMockData: true
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

    // Use OpenAI Vision API for real analysis
    let analysis

    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️ OPENAI_API_KEY not set, using mock data')
        analysis = getMockAnalysis()
      } else {
        console.log('🤖 Calling OpenAI Vision API...')

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Analyze this ${mealType || 'meal'} photo and provide a detailed nutritional analysis.

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "foodItems": ["item1", "item2", ...],
  "estimatedCalories": number,
  "macros": {
    "protein": number,
    "carbs": number,
    "fat": number,
    "fiber": number
  },
  "confidence": number (0-100),
  "suggestions": ["suggestion1", "suggestion2", ...]
}

Guidelines:
- List all visible food items with approximate portions
- Be conservative with calorie estimates (better to underestimate)
- Use standard portion sizes from nutrition databases
- Confidence should reflect image quality and food visibility
- Provide 1-3 actionable, positive suggestions
- All macro values in grams`
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
            max_tokens: 800,
            temperature: 0.3
          })
        })

        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text()
          console.error('OpenAI API error:', errorText)
          throw new Error(`OpenAI API failed: ${openaiResponse.status}`)
        }

        const result = await openaiResponse.json()
        console.log('✅ OpenAI response received')

        const content = result.choices[0].message.content.trim()

        // Remove markdown code blocks if present
        const jsonContent = content
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim()

        analysis = JSON.parse(jsonContent)
        console.log('✅ Analysis parsed successfully:', analysis)
      }
    } catch (error) {
      console.error('❌ OpenAI analysis failed, using mock data:', error)
      analysis = getMockAnalysis()
    }

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