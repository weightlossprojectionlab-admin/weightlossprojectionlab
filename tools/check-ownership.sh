#!/bin/bash
# Enforce file ownership per SEC issue
# This prevents agents from accidentally touching files outside their scope

set -e

SEC_ID=$(git branch --show-current | grep -oP 'sec-\d+(-\d+)?' || echo "unknown")

if [ "$SEC_ID" = "unknown" ]; then
  echo "⚠️  Not on a SEC branch - skipping ownership check"
  exit 0
fi

echo "🔍 Checking file ownership for $SEC_ID..."

# Get list of changed files vs main
CHANGED_FILES=$(git diff --name-only origin/main 2>/dev/null || git diff --name-only main 2>/dev/null || echo "")

if [ -z "$CHANGED_FILES" ]; then
  echo "✅ No files changed - ownership check passed"
  exit 0
fi

case $SEC_ID in
  sec-000-010)
    # Can touch debug endpoints and tests
    if echo "$CHANGED_FILES" | grep -qvE '^(app/api/(fetch-url|debug-profile|fix-onboarding|fix-start-weight)/route\.ts|__tests__/api/debug-endpoints\.test\.ts|package\.json|package-lock\.json)$'; then
      echo "❌ SEC-000/010 can only touch debug/fix endpoints and their tests"
      echo "Changed files:"
      echo "$CHANGED_FILES"
      exit 1
    fi
    ;;

  sec-001)
    # Can touch fetch-url route, url-validation lib, and tests
    if echo "$CHANGED_FILES" | grep -qvE '^(app/api/fetch-url/route\.ts|lib/url-validation\.ts|__tests__/api/fetch-url\.test\.ts|package\.json|package-lock\.json)$'; then
      echo "❌ SEC-001 can only touch /api/fetch-url, lib/url-validation.ts, and tests"
      echo "Changed files:"
      echo "$CHANGED_FILES"
      exit 1
    fi
    ;;

  sec-002)
    # Can touch admin permissions, firestore.rules (admin section), migration script
    if echo "$CHANGED_FILES" | grep -qvE '^(lib/admin/permissions\.ts|firestore\.rules|\.env\.local\.example|scripts/migrate-super-admins\.ts|package\.json|package-lock\.json)$'; then
      echo "❌ SEC-002 can only touch admin permissions, firestore.rules (admin section), and migration script"
      echo "Changed files:"
      echo "$CHANGED_FILES"
      exit 1
    fi
    # Check if firestore.rules changes are in admin section only
    if echo "$CHANGED_FILES" | grep -q "firestore.rules"; then
      if git diff firestore.rules | grep -qvE '(isSuperAdmin|SUPER_ADMIN|^\+\+\+|^---|^@@|^$)'; then
        echo "⚠️  SEC-002 modified firestore.rules outside admin section - review carefully"
      fi
    fi
    ;;

  sec-003)
    # Can touch storage.rules, upload helpers, migration script, README
    if echo "$CHANGED_FILES" | grep -q "firestore.rules"; then
      echo "❌ SEC-003 should not touch firestore.rules (that's SEC-002/007)"
      exit 1
    fi
    if echo "$CHANGED_FILES" | grep -qvE '^(storage\.rules|lib/storage-upload\.ts|scripts/migrate-document-paths\.ts|README\.md|package\.json|package-lock\.json)$'; then
      echo "❌ SEC-003 can only touch storage.rules, upload helpers, and migration script"
      echo "Changed files:"
      echo "$CHANGED_FILES"
      exit 1
    fi
    ;;

  sec-004-005)
    # Can touch proxy-image, middleware, api-client, env example, tests
    if echo "$CHANGED_FILES" | grep -q "next.config.ts"; then
      echo "❌ SEC-004/005 should not touch next.config.ts (that's SEC-009)"
      exit 1
    fi
    if echo "$CHANGED_FILES" | grep -qvE '^(app/api/proxy-image/route\.ts|middleware\.ts|lib/api-client\.ts|\.env\.local\.example|__tests__/middleware/csrf\.test\.ts|package\.json|package-lock\.json)$'; then
      echo "❌ SEC-004/005 can only touch proxy-image, middleware, api-client, and tests"
      echo "Changed files:"
      echo "$CHANGED_FILES"
      exit 1
    fi
    ;;

  sec-006)
    # Can touch rate-limit lib and apply to multiple endpoints
    if echo "$CHANGED_FILES" | grep -qvE '^(lib/rate-limit\.ts|app/api/.*/route\.ts|__tests__/lib/rate-limit\.test\.ts|\.env\.local\.example|package\.json|package-lock\.json)$'; then
      echo "❌ SEC-006 can only touch lib/rate-limit.ts, API routes, and tests"
      echo "Changed files:"
      echo "$CHANGED_FILES"
      exit 1
    fi
    ;;

  sec-007)
    # Can touch firestore.rules (recipes section) and recipe-related query code
    if echo "$CHANGED_FILES" | grep -qvE '^(firestore\.rules|hooks/use(Recipes|RecipeNames)\.ts|lib/firestore-recipes\.ts|package\.json|package-lock\.json)$'; then
      echo "❌ SEC-007 can only touch firestore.rules (recipes section) and recipe-related query code"
      echo "Changed files:"
      echo "$CHANGED_FILES"
      exit 1
    fi
    ;;

  sec-008)
    # Can touch api-response lib and many API routes
    if echo "$CHANGED_FILES" | grep -qvE '^(lib/api-response\.ts|app/api/.*/route\.ts|package\.json|package-lock\.json)$'; then
      echo "❌ SEC-008 can only touch lib/api-response.ts and API routes"
      echo "Changed files:"
      echo "$CHANGED_FILES"
      exit 1
    fi
    ;;

  sec-009)
    # ONLY can touch next.config.ts
    if echo "$CHANGED_FILES" | grep -qvE '^(next\.config\.ts|package\.json|package-lock\.json)$'; then
      echo "❌ SEC-009 can ONLY touch next.config.ts"
      echo "Changed files:"
      echo "$CHANGED_FILES"
      exit 1
    fi
    ;;

  sec-010)
    # Can touch debug endpoint tests and remaining debug routes
    if echo "$CHANGED_FILES" | grep -qvE '^(__tests__/api/debug.*\.test\.ts|app/api/(debug|fix)-.*/route\.ts|package\.json|package-lock\.json)$'; then
      echo "❌ SEC-010 can only touch debug endpoint tests and routes"
      echo "Changed files:"
      echo "$CHANGED_FILES"
      exit 1
    fi
    ;;

  *)
    echo "⚠️  Unknown SEC ID: $SEC_ID - skipping strict ownership check"
    exit 0
    ;;
esac

echo "✅ File ownership check passed for $SEC_ID"
exit 0
