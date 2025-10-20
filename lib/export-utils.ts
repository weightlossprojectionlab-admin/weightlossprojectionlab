// Utility functions for exporting meal data

interface MealLogExport {
  id: string
  title?: string
  mealType: string
  totalCalories: number
  macros?: {
    protein: number
    carbs: number
    fat: number
  }
  loggedAt: string
  notes?: string
  aiAnalysis?: {
    foodItems: any[] // Can be string[] or FoodItem[]
    confidence?: number
  }
}

export const exportToCSV = (meals: MealLogExport[], filename: string = 'meal-logs.csv') => {
  // Create CSV header
  const headers = [
    'Title',
    'Date',
    'Time',
    'Meal Type',
    'Food Items',
    'Calories',
    'Protein (g)',
    'Carbs (g)',
    'Fat (g)',
    'Notes'
  ]

  // Create CSV rows
  const rows = meals.map(meal => {
    const date = new Date(meal.loggedAt)
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

    // Extract food item names (handle both string[] and FoodItem[] formats)
    const foodItemNames = meal.aiAnalysis?.foodItems?.map((item: any) =>
      typeof item === 'string' ? item : item.name
    ) || []
    const foodItems = foodItemNames.join('; ')

    return [
      `"${meal.title || ''}"`,
      dateStr,
      timeStr,
      meal.mealType,
      `"${foodItems}"`, // Wrap in quotes to handle commas in food names
      meal.totalCalories || 0,
      meal.macros?.protein || 0,
      meal.macros?.carbs || 0,
      meal.macros?.fat || 0,
      `"${meal.notes || ''}"` // Wrap in quotes to handle commas in notes
    ]
  })

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const generatePDFContent = (meals: MealLogExport[], userName?: string) => {
  // Calculate summary statistics
  const totalMeals = meals.length
  const totalCalories = meals.reduce((sum, meal) => sum + (meal.totalCalories || 0), 0)
  const avgCalories = totalMeals > 0 ? Math.round(totalCalories / totalMeals) : 0

  const totalProtein = meals.reduce((sum, meal) => sum + (meal.macros?.protein || 0), 0)
  const totalCarbs = meals.reduce((sum, meal) => sum + (meal.macros?.carbs || 0), 0)
  const totalFat = meals.reduce((sum, meal) => sum + (meal.macros?.fat || 0), 0)

  // Get date range
  const dates = meals.map(m => new Date(m.loggedAt).getTime()).sort((a, b) => a - b)
  const startDate = dates.length > 0 ? new Date(dates[0]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''
  const endDate = dates.length > 0 ? new Date(dates[dates.length - 1]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''

  return {
    totalMeals,
    totalCalories,
    avgCalories,
    totalProtein: Math.round(totalProtein),
    totalCarbs: Math.round(totalCarbs),
    totalFat: Math.round(totalFat),
    dateRange: startDate === endDate ? startDate : `${startDate} - ${endDate}`,
    userName: userName || 'User',
    generatedDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    meals: meals.map(meal => {
      // Extract food item names (handle both string[] and FoodItem[] formats)
      const foodItemNames = meal.aiAnalysis?.foodItems?.map((item: any) =>
        typeof item === 'string' ? item : item.name
      ) || []

      return {
        title: meal.title,
        date: new Date(meal.loggedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: new Date(meal.loggedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        mealType: meal.mealType,
        foodItems: foodItemNames,
        calories: meal.totalCalories || 0,
        protein: meal.macros?.protein || 0,
        carbs: meal.macros?.carbs || 0,
        fat: meal.macros?.fat || 0,
        notes: meal.notes
      }
    })
  }
}

export const exportToPDF = async (meals: MealLogExport[], userName?: string, filename: string = 'meal-logs.pdf') => {
  const pdfData = generatePDFContent(meals, userName)

  // Create HTML content for the PDF
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Meal Logs Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #4F46E5;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #4F46E5;
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    .header p {
      color: #6B7280;
      margin: 5px 0;
      font-size: 14px;
    }
    .summary {
      background: #F3F4F6;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .summary h2 {
      color: #1F2937;
      margin: 0 0 15px 0;
      font-size: 18px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }
    .summary-item {
      text-align: center;
      background: white;
      padding: 15px;
      border-radius: 6px;
    }
    .summary-label {
      font-size: 12px;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .summary-value {
      font-size: 24px;
      font-weight: bold;
      color: #4F46E5;
      margin-top: 5px;
    }
    .meal-list h2 {
      color: #1F2937;
      margin: 0 0 20px 0;
      font-size: 18px;
    }
    .meal-card {
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    .meal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #E5E7EB;
    }
    .meal-type {
      font-weight: bold;
      color: #1F2937;
      text-transform: capitalize;
      font-size: 16px;
    }
    .meal-datetime {
      color: #6B7280;
      font-size: 13px;
    }
    .meal-nutrition {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 10px;
    }
    .nutrition-item {
      text-align: center;
      padding: 8px;
      background: #F9FAFB;
      border-radius: 4px;
    }
    .nutrition-label {
      font-size: 11px;
      color: #6B7280;
    }
    .nutrition-value {
      font-size: 14px;
      font-weight: 600;
      color: #1F2937;
    }
    .food-items {
      margin-top: 10px;
      font-size: 14px;
      color: #4B5563;
    }
    .food-items strong {
      color: #1F2937;
    }
    .meal-notes {
      margin-top: 10px;
      font-size: 13px;
      color: #6B7280;
      font-style: italic;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #E5E7EB;
      text-align: center;
      color: #6B7280;
      font-size: 12px;
    }
    @media print {
      body {
        padding: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Meal Logs Report</h1>
    <p><strong>${pdfData.userName}</strong></p>
    <p>${pdfData.dateRange}</p>
  </div>

  <div class="summary">
    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-label">Total Meals</div>
        <div class="summary-value">${pdfData.totalMeals}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Total Calories</div>
        <div class="summary-value">${pdfData.totalCalories.toLocaleString()}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Avg Calories</div>
        <div class="summary-value">${pdfData.avgCalories}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Total Protein</div>
        <div class="summary-value">${pdfData.totalProtein}g</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Total Carbs</div>
        <div class="summary-value">${pdfData.totalCarbs}g</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Total Fat</div>
        <div class="summary-value">${pdfData.totalFat}g</div>
      </div>
    </div>
  </div>

  <div class="meal-list">
    <h2>Meal Details</h2>
    ${pdfData.meals.map(meal => `
      <div class="meal-card">
        ${meal.title ? `<h3 style="margin: 0 0 10px 0; color: #1F2937; font-size: 18px;">${meal.title}</h3>` : ''}
        <div class="meal-header">
          <div class="meal-type">${meal.mealType}</div>
          <div class="meal-datetime">${meal.date} at ${meal.time}</div>
        </div>
        <div class="meal-nutrition">
          <div class="nutrition-item">
            <div class="nutrition-label">Calories</div>
            <div class="nutrition-value">${meal.calories}</div>
          </div>
          <div class="nutrition-item">
            <div class="nutrition-label">Protein</div>
            <div class="nutrition-value">${meal.protein}g</div>
          </div>
          <div class="nutrition-item">
            <div class="nutrition-label">Carbs</div>
            <div class="nutrition-value">${meal.carbs}g</div>
          </div>
          <div class="nutrition-item">
            <div class="nutrition-label">Fat</div>
            <div class="nutrition-value">${meal.fat}g</div>
          </div>
        </div>
        ${meal.foodItems.length > 0 ? `
          <div class="food-items">
            <strong>Foods:</strong> ${meal.foodItems.join(', ')}
          </div>
        ` : ''}
        ${meal.notes ? `
          <div class="meal-notes">Note: ${meal.notes}</div>
        ` : ''}
      </div>
    `).join('')}
  </div>

  <div class="footer">
    <p>Generated on ${pdfData.generatedDate}</p>
    <p>Weight Loss Project Lab - Nutrition Tracking</p>
  </div>
</body>
</html>
  `.trim()

  // Open print dialog with the HTML content
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.focus()

    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }
}
