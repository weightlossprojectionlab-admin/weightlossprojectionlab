#!/bin/bash

# SEC-008: Bulk Error Response Migration Script
#
# This script adds errorResponse imports and modifies simple catch blocks
# More complex catch blocks will need manual review

set -e

echo "🔍 SEC-008: Bulk Error Response Migration"
echo "=========================================="
echo ""

# Counter for statistics
files_modified=0
imports_added=0

# Find all route files
route_files=$(find app/api -name "route.ts" -type f)

for file in $route_files; do
  echo "Processing: $file"

  # Check if file already has errorResponse import
  if ! grep -q "errorResponse" "$file"; then
    # Add import after the last import line
    # Find line number of last import
    last_import_line=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)

    if [ -n "$last_import_line" ]; then
      # Insert new import after last import
      sed -i "${last_import_line}a import { errorResponse } from '@/lib/api-response'" "$file"
      echo "  ✓ Added errorResponse import"
      ((imports_added++))
    fi
  fi

  ((files_modified++))
done

echo ""
echo "=========================================="
echo "📊 Summary"
echo "=========================================="
echo "Files processed: $files_modified"
echo "Imports added: $imports_added"
echo ""
echo "⚠️  NOTE: Catch blocks must be migrated manually or with"
echo "   the TypeScript migration script for accuracy."
echo ""
