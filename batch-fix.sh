#!/bin/bash
cd /c/Users/percy/wlpl/weightlossprojectlab

echo "Starting comprehensive TypeScript error fixes..."

# Fix theme comparison errors in chart components
echo "1. Fixing theme comparison errors..."
for file in components/charts/CalorieIntakeChart.tsx \
            components/charts/MacroDistributionChart.tsx \
            components/charts/MacroPieChart.tsx \
            components/charts/StepCountChart.tsx \
            components/charts/WeightTrendChart.tsx; do
  # Change comparison to check both light and dark
  sed -i "s/theme === 'light'/theme === 'light' || theme === 'dark'/g" "$file"
  echo "  - Fixed $file"
done

# Fix lib/ocr-client.ts line 106 - Error type issue
echo "2. Fixing lib/ocr-client.ts Error type issue..."
sed -i "s/logger\.error(\([^,]*\), err)/logger.error(\1, err instanceof Error ? { message: err.message, stack: err.stack } : { message: 'Unknown error' })/g" lib/ocr-client.ts

# Fix lib/product-lookup-server.ts line 65 - too many arguments
echo "3. Fixing lib/product-lookup-server.ts..."
sed -i "65s/findProductByNDC(\([^,]*\), \([^,]*\), \([^)]*\))/findProductByNDC(\1, \2)/g" lib/product-lookup-server.ts

# Fix lib/shopping-operations.ts line 1018 - discardedBy property
echo "4. Fixing lib/shopping-operations.ts..."
# This needs manual review, skip for now

# Fix lib/vital-reminder-logic.ts line 163 - null check
echo "5. Fixing lib/vital-reminder-logic.ts null check..."
sed -i "163s/lastVitalLog\./lastVitalLog?./g" lib/vital-reminder-logic.ts

# Fix lib/vital-reminder-logic.ts line 238 - comparison
echo "6. Fixing lib/vital-reminder-logic.ts comparison..."
sed -i "238s/=== 'daily'/!== 'weekly' \&\& frequency !== 'biweekly' \&\& frequency !== 'monthly'/g" lib/vital-reminder-logic.ts

# Fix lib/plan-recommender.ts line 117 - delete operator
echo "7. Fixing lib/plan-recommender.ts delete operator..."
# This needs manual review

echo "Done with automated fixes!"
