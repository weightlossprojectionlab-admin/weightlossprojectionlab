#!/usr/bin/env python3
"""
SEC-008: Error Response Migration Script

Migrates catch blocks in API route files to use errorResponse()
instead of directly exposing error messages/stack traces.
"""

import os
import re
import sys
from pathlib import Path
from typing import Tuple, List

# Statistics
stats = {
    'files_processed': 0,
    'files_modified': 0,
    'imports_added': 0,
    'catches_migrated': 0
}

def extract_route_path(file_path: str) -> str:
    """Extract API route path from file path"""
    # Convert Windows paths to forward slashes
    file_path = file_path.replace('\\', '/')
    # Extract route portion
    match = re.search(r'/api/(.+)/route\.ts$', file_path)
    if match:
        return f"/api/{match.group(1)}"
    return "/api/unknown"

def has_error_response_import(content: str) -> bool:
    """Check if errorResponse is already imported"""
    return 'errorResponse' in content and '@/lib/api-response' in content

def add_error_response_import(content: str) -> Tuple[str, bool]:
    """Add errorResponse import if not present"""
    if has_error_response_import(content):
        return content, False

    # Find last import statement
    import_pattern = r"^import .+ from ['\"][@./].+['\"]"
    lines = content.split('\n')

    last_import_idx = -1
    for i, line in enumerate(lines):
        if re.match(import_pattern, line.strip()):
            last_import_idx = i

    if last_import_idx >= 0:
        # Insert after last import
        lines.insert(last_import_idx + 1, "import { errorResponse } from '@/lib/api-response'")
        return '\n'.join(lines), True
    else:
        # No imports found, add at top
        lines.insert(0, "import { errorResponse } from '@/lib/api-response'")
        return '\n'.join(lines), True

def determine_operation(content: str, catch_pos: int) -> str:
    """Determine HTTP operation from function context"""
    # Look backward from catch to find export function
    before_catch = content[:catch_pos]
    function_matches = re.findall(r'export async function (GET|POST|PUT|PATCH|DELETE)', before_catch)

    if function_matches:
        method = function_matches[-1]
        operation_map = {
            'GET': 'fetch',
            'POST': 'create',
            'PUT': 'update',
            'PATCH': 'patch',
            'DELETE': 'delete'
        }
        return operation_map.get(method, 'operation')
    return 'operation'

def migrate_catch_blocks(content: str, route_path: str) -> Tuple[str, int]:
    """Migrate catch blocks to use errorResponse"""
    count = 0
    modified = content

    # Pattern for catch blocks with old-style error handling
    # Matches: } catch (error...) { ... logger.error(...) ... return NextResponse.json({ error: ... }, { status: 500 }) }

    # Simple pattern: Find catch blocks that return NextResponse.json with status 500
    catch_pattern = r'\} catch \(([^)]+)\) \{([^}]|\}(?!\}))*?return NextResponse\.json\([^)]*\{[^}]*error:[^}]*\}[^)]*\{[^}]*status:\s*500[^}]*\}[^)]*\)[^}]*\}'

    def replace_catch(match):
        nonlocal count
        error_param = match.group(1).strip()

        # Determine operation
        operation = determine_operation(content, match.start())

        # Create replacement
        replacement = f'''}} catch ({error_param}) {{
    return errorResponse({error_param}, {{
      route: '{route_path}',
      operation: '{operation}'
    }})
  }}'''

        count += 1
        return replacement

    # Use re.sub with function to replace
    modified = re.sub(catch_pattern, replace_catch, modified, flags=re.DOTALL)

    return modified, count

def process_file(file_path: str, dry_run: bool = False) -> None:
    """Process a single route file"""
    try:
        stats['files_processed'] += 1

        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        route_path = extract_route_path(file_path)

        # Step 1: Add import
        content, import_added = add_error_response_import(content)
        if import_added:
            stats['imports_added'] += 1

        # Step 2: Migrate catch blocks
        content, catch_count = migrate_catch_blocks(content, route_path)
        if catch_count > 0:
            stats['catches_migrated'] += catch_count

        # Check if modified
        if content != original_content:
            stats['files_modified'] += 1

            if not dry_run:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)

            rel_path = os.path.relpath(file_path)
            print(f"+ {rel_path}")
            if import_added:
                print(f"  - Import added")
            if catch_count > 0:
                print(f"  - Catch blocks migrated: {catch_count}")
        else:
            rel_path = os.path.relpath(file_path)
            print(f"  {rel_path} (no changes)")

    except Exception as e:
        print(f"ERROR processing {file_path}: {e}", file=sys.stderr)

def main():
    dry_run = '--dry-run' in sys.argv

    print("SEC-008: Error Response Migration")
    print("=" * 50)
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print()

    # Find all route files
    api_dir = Path('app/api')
    route_files = list(api_dir.glob('**/route.ts'))

    print(f"Found {len(route_files)} route files\n")

    # Process each file
    for file_path in sorted(route_files):
        process_file(str(file_path), dry_run)

    # Print summary
    print("\n" + "=" * 50)
    print("Migration Summary")
    print("=" * 50)
    print(f"Files processed: {stats['files_processed']}")
    print(f"Files modified: {stats['files_modified']}")
    print(f"Imports added: {stats['imports_added']}")
    print(f"Catch blocks migrated: {stats['catches_migrated']}")

    if dry_run:
        print("\nDRY RUN: No files were modified")
        print("   Run without --dry-run to apply changes")
    else:
        print("\nMigration complete!")

if __name__ == '__main__':
    main()
