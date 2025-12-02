#!/bin/bash

# Script to fix error.message and details: error patterns in API routes
# SEC-008: Remove stack traces from production errors

cd "$(dirname "$0")/.."

# List of files to fix (found via grep)
FILES=(
  "app/api/fix-onboarding/route.ts"
  "app/api/debug-profile/route.ts"
  "app/api/caregiver/action-items/route.ts"
  "app/api/caregiver/action-items/[itemId]/complete/route.ts"
  "app/api/patients/[patientId]/ai-health-report/route.ts"
  "app/api/patients/[patientId]/documents/route.ts"
  "app/api/patients/[patientId]/fix-start-weight/route.ts"
  "app/api/patients/[patientId]/family/[memberId]/route.ts"
  "app/api/user-profile/route.ts"
  "app/api/user-profile/reset/route.ts"
  "app/api/ai/meal-safety/route.ts"
  "app/api/ai/health-profile/generate/route.ts"
  "app/api/admin/users/[uid]/health-vitals/route.ts"
  "app/api/admin/users/[uid]/ai-health-profile/route.ts"
  "app/api/ocr/medication/route.ts"
  "app/api/meal-templates/route.ts"
  "app/api/meal-templates/[id]/route.ts"
  "app/api/meal-logs/[id]/route.ts"
  "app/api/recipes/import/route.ts"
  "app/api/admin/recipes/[id]/moderate/route.ts"
  "app/api/admin/recipes/[id]/media/route.ts"
  "app/api/admin/ai-decisions/[id]/review/route.ts"
  "app/api/appointments/[appointmentId]/route.ts"
  "app/api/appointments/route.ts"
  "app/api/providers/route.ts"
  "app/api/providers/[providerId]/route.ts"
  "app/api/providers/[providerId]/patients/route.ts"
  "app/api/invitations/route.ts"
)

echo "Fixing ${#FILES[@]} files..."

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    # Add import if not present
    if ! grep -q "import { errorResponse } from '@/lib/api-response'" "$file"; then
      # Find the last import line and add after it
      sed -i "/^import/a import { errorResponse } from '@/lib/api-response'" "$file" 2>/dev/null || true
    fi
  fi
done

echo "Import statements added. Manual fixes still required for catch blocks."
echo "Please review the files and update catch blocks to use errorResponse()."
