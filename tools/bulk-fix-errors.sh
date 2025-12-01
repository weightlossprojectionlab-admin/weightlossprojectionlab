#!/bin/bash

# SEC-008: Bulk fix error responses in API routes
# This script adds the errorResponse import to all affected files

cd "$(dirname "$0")/.."

echo "SEC-008: Adding errorResponse import to all affected files..."

files=(
"app/api/admin/ai-decisions/[id]/review/route.ts"
"app/api/admin/recipes/[id]/media/route.ts"
"app/api/admin/recipes/[id]/moderate/route.ts"
"app/api/admin/users/[uid]/ai-health-profile/route.ts"
"app/api/admin/users/[uid]/health-vitals/route.ts"
"app/api/ai/health-profile/generate/route.ts"
"app/api/ai/meal-safety/route.ts"
"app/api/appointments/[appointmentId]/route.ts"
"app/api/appointments/route.ts"
"app/api/caregiver/action-items/[itemId]/complete/route.ts"
"app/api/caregiver/action-items/route.ts"
"app/api/debug-profile/route.ts"
"app/api/fix-onboarding/route.ts"
"app/api/fix-start-weight/route.ts"
"app/api/invitations/route.ts"
"app/api/meal-logs/[id]/route.ts"
"app/api/meal-templates/[id]/route.ts"
"app/api/meal-templates/route.ts"
"app/api/ocr/medication/route.ts"
"app/api/patients/[patientId]/ai-health-report/route.ts"
"app/api/patients/[patientId]/documents/route.ts"
"app/api/patients/[patientId]/family/[memberId]/route.ts"
"app/api/patients/[patientId]/fix-start-weight/route.ts"
"app/api/patients/[patientId]/medications/[medicationId]/route.ts"
"app/api/patients/[patientId]/medications/route.ts"
"app/api/providers/[providerId]/patients/route.ts"
"app/api/providers/[providerId]/route.ts"
"app/api/providers/route.ts"
"app/api/recipes/import/route.ts"
"app/api/user-profile/reset/route.ts"
"app/api/user-profile/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Check if import already exists
    if ! grep -q "import { errorResponse } from '@/lib/api-response'" "$file"; then
      # Find the line number of the last import
      last_import=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)

      if [ -n "$last_import" ]; then
        # Add the import after the last import line
        sed -i "${last_import}a import { errorResponse } from '@/lib/api-response'" "$file"
        echo "✓ Added import to: $file"
      fi
    else
      echo "- Import already exists in: $file"
    fi
  else
    echo "✗ File not found: $file"
  fi
done

echo ""
echo "Import statements added to $(echo "${files[@]}" | wc -w) files"
echo ""
echo "NOTE: Catch blocks still need manual fixes to replace error response logic with:"
echo "  return errorResponse(error, { route: '/api/path', ...context })"
