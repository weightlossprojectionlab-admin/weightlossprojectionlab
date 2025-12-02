#!/usr/bin/env python3
"""
SEC-008: Fix error responses in API routes
Replaces details: error.message patterns with errorResponse() helper
"""

import re
import os
import glob

# Base directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API_DIR = os.path.join(BASE_DIR, 'app', 'api')

def add_import_if_missing(content):
    """Add errorResponse import if not present"""
    if "import { errorResponse } from '@/lib/api-response'" in content:
        return content

    # Find the last import statement
    import_pattern = r'^import .* from .*$'
    imports = list(re.finditer(import_pattern, content, re.MULTILINE))

    if imports:
        last_import = imports[-1]
        insert_pos = last_import.end()
        new_import = "\nimport { errorResponse } from '@/lib/api-response'"
        content = content[:insert_pos] + new_import + content[insert_pos:]

    return content

def fix_error_response(content, filepath):
    """Fix error response patterns"""
    # Pattern 1: details: error.message
    pattern1 = r'details: error\.message'
    if re.search(pattern1, content):
        # This needs manual review - just flag it
        print(f"MANUAL FIX NEEDED: {filepath} - contains 'details: error.message'")

    # Pattern 2: details: error instanceof Error ? error.message : 'Unknown error'
    pattern2 = r'details: error instanceof Error \? error\.message : [\'"]Unknown error[\'"]'
    if re.search(pattern2, content):
        print(f"MANUAL FIX NEEDED: {filepath} - contains details pattern")

    # Pattern 3: details: error instanceof Error ? error.message : String(error)
    pattern3 = r'details: error instanceof Error \? error\.message : String\(error\)'
    if re.search(pattern3, content):
        print(f"MANUAL FIX NEEDED: {filepath} - contains details pattern")

    return content

def process_file(filepath):
    """Process a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Add import if missing
        new_content = add_import_if_missing(content)

        # Fix error responses (mostly flagging for now)
        new_content = fix_error_response(new_content, filepath)

        # Write back if changed
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"✓ Updated imports: {filepath}")

    except Exception as e:
        print(f"✗ Error processing {filepath}: {e}")

def main():
    """Main function"""
    print("SEC-008: Fixing API error responses...")
    print(f"Scanning: {API_DIR}")

    # Find all route.ts files
    pattern = os.path.join(API_DIR, '**', 'route.ts')
    files = glob.glob(pattern, recursive=True)

    print(f"Found {len(files)} route files")

    for filepath in files:
        # Check if file contains error patterns
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            if 'details: error' in content:
                process_file(filepath)
        except Exception as e:
            print(f"✗ Error reading {filepath}: {e}")

    print("\nDone! Please review files marked for MANUAL FIX NEEDED")

if __name__ == '__main__':
    main()
