#!/bin/bash

# Script to add Tailwind dark mode variants to all TSX files
# This script safely adds dark: prefixes to color classes that don't already have them

set -e

# Color definitions for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "Adding Tailwind dark mode variants to TSX files..."
echo "=================================================="
echo ""

# Counter for tracking changes
total_files=0
total_modifications=0

# Function to process a single file
process_file() {
    local file="$1"
    local temp_file="${file}.tmp"
    local modifications=0

    echo -e "${BLUE}Processing:${NC} $file"

    # Create a copy to work with
    cp "$file" "$temp_file"

    # Apply transformations (only if dark: variant doesn't already exist nearby)

    # Text colors
    sed -i 's/\btext-gray-900\b\(\s\|"\|'\''[^d]\)/text-gray-900 dark:text-gray-100\1/g' "$temp_file" && ((modifications++)) || true
    sed -i 's/\btext-gray-800\b\(\s\|"\|'\''[^d]\)/text-gray-800 dark:text-gray-200\1/g' "$temp_file" && ((modifications++)) || true
    sed -i 's/\btext-gray-700\b\(\s\|"\|'\''[^d]\)/text-gray-700 dark:text-gray-300\1/g' "$temp_file" && ((modifications++)) || true
    sed -i 's/\btext-gray-600\b\(\s\|"\|'\''[^d]\)/text-gray-600 dark:text-gray-400\1/g' "$temp_file" && ((modifications++)) || true
    sed -i 's/\btext-black\b\(\s\|"\|'\''[^d]\)/text-black dark:text-white\1/g' "$temp_file" && ((modifications++)) || true

    # Background colors
    sed -i 's/\bbg-white\b\(\s\|"\|'\''[^d]\)/bg-white dark:bg-gray-900\1/g' "$temp_file" && ((modifications++)) || true
    sed -i 's/\bbg-gray-50\b\(\s\|"\|'\''[^d]\)/bg-gray-50 dark:bg-gray-950\1/g' "$temp_file" && ((modifications++)) || true
    sed -i 's/\bbg-gray-100\b\(\s\|"\|'\''[^d]\)/bg-gray-100 dark:bg-gray-800\1/g' "$temp_file" && ((modifications++)) || true
    sed -i 's/\bbg-gray-200\b\(\s\|"\|'\''[^d]\)/bg-gray-200 dark:bg-gray-700\1/g' "$temp_file" && ((modifications++)) || true
    sed -i 's/\bbg-purple-100\b\(\s\|"\|'\''[^d]\)/bg-purple-100 dark:bg-purple-900\/20\1/g' "$temp_file" && ((modifications++)) || true
    sed -i 's/\bbg-indigo-100\b\(\s\|"\|'\''[^d]\)/bg-indigo-100 dark:bg-indigo-900\/20\1/g' "$temp_file" && ((modifications++)) || true

    # Border colors
    sed -i 's/\bborder-gray-200\b\(\s\|"\|'\''[^d]\)/border-gray-200 dark:border-gray-700\1/g' "$temp_file" && ((modifications++)) || true
    sed -i 's/\bborder-gray-300\b\(\s\|"\|'\''[^d]\)/border-gray-300 dark:border-gray-600\1/g' "$temp_file" && ((modifications++)) || true
    sed -i 's/\bborder-white\b\(\s\|"\|'\''[^d]\)/border-white dark:border-gray-700\1/g' "$temp_file" && ((modifications++)) || true

    # Check if any modifications were made
    if ! cmp -s "$file" "$temp_file"; then
        mv "$temp_file" "$file"
        echo -e "${GREEN}  ✓ File modified${NC}"
        ((total_files++))
        total_modifications=$((total_modifications + modifications))
    else
        rm "$temp_file"
        echo "  - No changes needed"
    fi
}

# Find and process all TSX files in app/ and components/
for file in $(find app components -name "*.tsx" -type f 2>/dev/null); do
    process_file "$file"
done

echo ""
echo "=================================================="
echo -e "${GREEN}Summary:${NC}"
echo "  Files modified: $total_files"
echo "  Estimated modifications: $total_modifications"
echo "=================================================="
