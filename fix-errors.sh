#!/bin/bash

# Fix all logger.error() calls that pass 'unknown' instead of 'Error | undefined'
# Pattern: logger.error('message', error) where error is unknown
# Fix: logger.error('message', error instanceof Error ? error : undefined)

cd /c/Users/percy/wlpl/weightlossprojectlab

# Create a backup function
fix_error_param() {
  local file=$1
  # Use perl for more sophisticated regex replacement
  perl -i -pe 's/logger\.error\((.*?),\s*error\s*\)/logger.error($1, error instanceof Error ? error : undefined)/g' "$file"
}

# Fix logger.error calls in all affected files
echo "Fixing error handling..."
fix_error_param "app/patients/[patientId]/page.tsx"
fix_error_param "app/patients/page.tsx"
fix_error_param "lib/vital-schedule-service.ts"

# Fix theme comparison errors in chart files
echo "Fixing theme comparison errors..."
for file in components/charts/CalorieIntakeChart.tsx \
            components/charts/MacroDistributionChart.tsx \
            components/charts/MacroPieChart.tsx \
            components/charts/StepCountChart.tsx \
            components/charts/WeightTrendChart.tsx; do
  sed -i "s/theme === 'light'/theme === 'light' || theme === 'dark'/g" "$file"
done

echo "Done!"
