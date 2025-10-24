#!/usr/bin/env python3
"""
Add Tailwind dark mode variants to all TSX files in app/ and components/ directories.
This script safely adds dark: prefixes to color classes that don't already have them.
"""

import os
import re
from pathlib import Path

# Dark mode transformation rules
DARK_MODE_RULES = {
    # Text colors
    r'\btext-gray-900\b': 'text-gray-900 dark:text-gray-100',
    r'\btext-gray-800\b': 'text-gray-800 dark:text-gray-200',
    r'\btext-gray-700\b': 'text-gray-700 dark:text-gray-300',
    r'\btext-gray-600\b': 'text-gray-600 dark:text-gray-400',
    r'\btext-black\b': 'text-black dark:text-white',

    # Background colors
    r'\bbg-white\b': 'bg-white dark:bg-gray-900',
    r'\bbg-gray-50\b': 'bg-gray-50 dark:bg-gray-950',
    r'\bbg-gray-100\b': 'bg-gray-100 dark:bg-gray-800',
    r'\bbg-gray-200\b': 'bg-gray-200 dark:bg-gray-700',
    r'\bbg-gray-300\b': 'bg-gray-300 dark:bg-gray-600',
    r'\bbg-purple-100\b': 'bg-purple-100 dark:bg-purple-900/20',
    r'\bbg-indigo-100\b': 'bg-indigo-100 dark:bg-indigo-900/20',

    # Border colors
    r'\bborder-gray-200\b': 'border-gray-200 dark:border-gray-700',
    r'\bborder-gray-300\b': 'border-gray-300 dark:border-gray-600',
    r'\bborder-white\b': 'border-white dark:border-gray-700',
}


def has_dark_variant_nearby(text, match_start, match_end):
    """Check if a dark: variant already exists near this match."""
    # Look ahead in the same className for dark: variants
    search_window = text[match_start:min(match_end + 100, len(text))]
    return 'dark:' in search_window


def process_file(file_path):
    """Process a single file and add dark mode variants."""
    print(f"Processing: {file_path}")

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        modifications = 0

        # Apply each transformation rule
        for pattern, replacement in DARK_MODE_RULES.items():
            # Only replace if the match doesn't already have a dark: variant nearby
            def replace_if_no_dark(match):
                nonlocal modifications
                start, end = match.span()

                # Check if dark: variant already exists in the className
                # Look for className boundaries (quotes)
                class_start = content.rfind('className', 0, start)
                if class_start == -1:
                    return match.group(0)

                # Find the closing quote of this className
                quote_start = content.find('"', class_start)
                if quote_start == -1:
                    quote_start = content.find("'", class_start)
                if quote_start == -1:
                    return match.group(0)

                quote_char = content[quote_start]
                quote_end = content.find(quote_char, quote_start + 1)
                if quote_end == -1:
                    return match.group(0)

                # Check if dark: exists in this className attribute
                classname_content = content[quote_start:quote_end]
                if 'dark:' in classname_content:
                    # Already has dark variants, skip
                    return match.group(0)

                modifications += 1
                return replacement

            content = re.sub(pattern, replace_if_no_dark, content)

        # Only write if changes were made
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  [OK] Added {modifications} dark mode variants")
            return modifications
        else:
            print("  - No changes needed")
            return 0

    except Exception as e:
        print(f"  [ERROR] Error processing file: {e}")
        return 0


def main():
    """Main execution function."""
    print("Adding Tailwind dark mode variants to TSX files...")
    print("=" * 60)
    print()

    # Get the project root (assuming script is in scripts/ directory)
    project_root = Path(__file__).parent.parent

    # Find all TSX files in app/ and components/
    tsx_files = []
    for directory in ['app', 'components']:
        dir_path = project_root / directory
        if dir_path.exists():
            tsx_files.extend(dir_path.rglob('*.tsx'))

    print(f"Found {len(tsx_files)} TSX files to process\n")

    total_files = 0
    total_modifications = 0

    for file_path in tsx_files:
        mods = process_file(file_path)
        if mods > 0:
            total_files += 1
            total_modifications += mods

    print()
    print("=" * 60)
    print("Summary:")
    print(f"  Files modified: {total_files}")
    print(f"  Total dark variants added: {total_modifications}")
    print("=" * 60)


if __name__ == '__main__':
    main()
