#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Dark mode transformation rules
 * Maps light mode classes to their dark mode variants
 */
const DARK_MODE_RULES = {
  // Text colors
  'text-gray-900': 'text-gray-900 dark:text-gray-100',
  'text-gray-800': 'text-gray-800 dark:text-gray-200',
  'text-gray-700': 'text-gray-700 dark:text-gray-300',
  'text-gray-600': 'text-gray-600 dark:text-gray-400',
  'text-gray-500': 'text-gray-500 dark:text-gray-500', // middle gray, no change
  'text-black': 'text-black dark:text-white',

  // Background colors
  'bg-white': 'bg-white dark:bg-gray-900',
  'bg-gray-50': 'bg-gray-50 dark:bg-gray-950',
  'bg-gray-100': 'bg-gray-100 dark:bg-gray-800',
  'bg-gray-200': 'bg-gray-200 dark:bg-gray-700',
  'bg-gray-300': 'bg-gray-300 dark:bg-gray-600',
  'bg-purple-100': 'bg-purple-100 dark:bg-purple-900/20',
  'bg-indigo-100': 'bg-indigo-100 dark:bg-indigo-900/20',

  // Border colors
  'border-gray-200': 'border-gray-200 dark:border-gray-700',
  'border-gray-300': 'border-gray-300 dark:border-gray-600',
  'border-white': 'border-white dark:border-gray-700',
};

/**
 * Check if a class already has a dark: variant
 */
function hasDarkVariant(classString, baseClass) {
  const darkClass = `dark:${baseClass.replace(/^(text|bg|border)-/, '$1-')}`;
  return classString.includes('dark:');
}

/**
 * Process a single className attribute
 */
function processClassName(match, prefix, quote, content, suffix) {
  let modified = false;
  let newContent = content;

  // Split by spaces to get individual classes
  const classes = content.split(/\s+/).filter(Boolean);
  const processedClasses = new Set();
  const result = [];

  for (const cls of classes) {
    // Skip if already processed or if it's already a dark: variant
    if (processedClasses.has(cls) || cls.startsWith('dark:')) {
      result.push(cls);
      continue;
    }

    // Check if this class has a dark mode rule
    if (DARK_MODE_RULES[cls]) {
      // Check if dark variant doesn't already exist in the string
      const darkPattern = `dark:${cls.split('-').slice(0, 2).join('-')}`;
      const hasDark = classes.some(c => c.startsWith(darkPattern));

      if (!hasDark) {
        result.push(DARK_MODE_RULES[cls]);
        modified = true;
      } else {
        result.push(cls);
      }
      processedClasses.add(cls);
    } else {
      result.push(cls);
    }
  }

  if (modified) {
    newContent = result.join(' ');
    return `${prefix}${quote}${newContent}${quote}${suffix}`;
  }

  return match;
}

/**
 * Process a file and add dark mode variants
 */
function processFile(filePath) {
  console.log(`Processing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let modifications = 0;

  // Match className attributes with various quote styles
  // Handles: className="...", className='...', className={`...`}
  const classNameRegex = /(className\s*=\s*)(['"`])([^'"`]*?)\2/g;

  const newContent = content.replace(classNameRegex, (match, prefix, quote, classContent) => {
    const result = processClassName(match, prefix, quote, classContent, '');
    if (result !== match) {
      modifications++;
    }
    return result;
  });

  if (modifications > 0) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`  ✓ Added ${modifications} dark mode variants`);
    return modifications;
  } else {
    console.log(`  - No changes needed`);
    return 0;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('Adding Tailwind dark mode variants to TSX files...\n');

  // Find all TSX files in app/ and components/ directories
  const appFiles = glob.sync('app/**/*.tsx', { absolute: true });
  const componentFiles = glob.sync('components/**/*.tsx', { absolute: true });

  const allFiles = [...appFiles, ...componentFiles];
  console.log(`Found ${allFiles.length} TSX files to process\n`);

  let totalFiles = 0;
  let totalModifications = 0;

  allFiles.forEach(file => {
    const mods = processFile(file);
    if (mods > 0) {
      totalFiles++;
      totalModifications += mods;
    }
  });

  console.log(`\n==================================`);
  console.log(`Summary:`);
  console.log(`  Files modified: ${totalFiles}`);
  console.log(`  Total dark variants added: ${totalModifications}`);
  console.log(`==================================`);
}

// Run the script
main();
