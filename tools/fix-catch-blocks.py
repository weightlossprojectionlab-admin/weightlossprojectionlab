#!/usr/bin/env python3
"""
SEC-008: Fix catch blocks to use errorResponse()
"""
import re
import sys

# Files to fix with their route paths
FILES = {
    'app/api/fix-start-weight/route.ts': '/api/fix-start-weight',
    'app/api/fix-onboarding/route.ts': '/api/fix-onboarding',
    'app/api/debug-profile/route.ts': '/api/debug-profile',
    'app/api/recipes/generate-from-inventory/route.ts': '/api/recipes/generate-from-inventory',
    'app/api/patients/[patientId]/route.ts': '/api/patients/[patientId]',
    'app/api/appointments/recommendations/route.ts': '/api/appointments/recommendations',
    'app/api/ai/analyze-meal/route.ts': '/api/ai/analyze-meal',
    'app/api/admin/recipes/[id]/media/route.ts': '/api/admin/recipes/[id]/media',
    'app/api/patients/[patientId]/medications/route.ts': '/api/patients/[patientId]/medications',
    'app/api/patients/[patientId]/medications/[medicationId]/route.ts': '/api/patients/[patientId]/medications/[medicationId]',
    'app/api/caregiver/action-items/route.ts': '/api/caregiver/action-items',
    'app/api/caregiver/action-items/[itemId]/complete/route.ts': '/api/caregiver/action-items/[itemId]/complete',
}

def fix_file(filepath, route):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Pattern for simple error responses with details: error.message
        pattern1 = r'} catch \((error[:\s\w]*)\) \{[^}]*?return NextResponse\.json\(\s*\{[^}]*?error:[^,}]*?,\s*details: error\.message[^}]*?\},\s*\{\s*status:\s*\d+\s*\}\s*\)\s*\}'

        # Replace with errorResponse call
        replacement = f'''}} catch (error) {{
    return errorResponse(error, {{
      route: '{route}'
    }})
  }}'''

        new_content = re.sub(pattern1, replacement, content, flags=re.DOTALL)

        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"✓ Fixed: {filepath}")
            return True
        else:
            print(f"- No simple patterns in: {filepath}")
            return False

    except Exception as e:
        print(f"✗ Error in {filepath}: {e}")
        return False

def main():
    print("SEC-008: Fixing catch blocks...")
    fixed_count = 0

    for filepath, route in FILES.items():
        if fix_file(filepath, route):
            fixed_count += 1

    print(f"\nFixed {fixed_count}/{len(FILES)} files automatically")
    print("Remaining files may need manual review")

if __name__ == '__main__':
    main()
