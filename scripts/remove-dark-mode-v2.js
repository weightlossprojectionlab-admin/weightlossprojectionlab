const fs = require('fs');
const path = require('path');

// Statistics
let filesProcessed = 0;
let filesModified = 0;
let darkClassesRemoved = 0;
let errors = [];

// Files to skip
const skipPatterns = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /dist/,
  /build/,
  /remove-dark-mode/,
  /add-dark-mode\./,
];

// Function to check if file should be skipped
function shouldSkip(filePath) {
  return skipPatterns.some(pattern => pattern.test(filePath));
}

// Function to remove dark: classes from a string
function removeDarkClasses(content) {
  let modified = content;
  let removedCount = 0;
  let previousContent;

  // Keep iterating until no more changes
  do {
    previousContent = modified;

    // Count matches before removal
    const matches = modified.match(/dark:[a-zA-Z0-9\-:]+/g);
    if (matches) {
      removedCount += matches.length;
    }

    // Remove all dark: classes with various separators
    // Pattern handles: dark:class followed by space, quote, backtick, or end of string
    modified = modified.replace(/\s*dark:[a-zA-Z0-9\-:]+\s*/g, ' ');

    // Clean up multiple spaces
    modified = modified.replace(/  +/g, ' ');

    // Clean up space before quotes/brackets
    modified = modified.replace(/\s+(["'`})\]])/g, '$1');

    // Clean up space after opening brackets/braces
    modified = modified.replace(/([({["])\s+/g, '$1');

    // Clean up empty className attributes
    modified = modified.replace(/className=["'`]\s*["'`]/g, '');
    modified = modified.replace(/className=\{\s*["'`]\s*["'`]\s*\}/g, '');

    // Clean up trailing spaces in template literals
    modified = modified.replace(/\s+`/g, '`');
    modified = modified.replace(/`\s+/g, '`');

  } while (modified !== previousContent);

  return { modified, removedCount };
}

// Function to process a single file
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Skip if no dark: classes
    if (!content.includes('dark:')) {
      return;
    }

    const { modified, removedCount } = removeDarkClasses(content);

    if (removedCount > 0) {
      fs.writeFileSync(filePath, modified, 'utf8');
      filesModified++;
      darkClassesRemoved += removedCount;
      console.log(`✓ ${path.relative(process.cwd(), filePath)}: ${removedCount} classes removed`);
    }

    filesProcessed++;
  } catch (error) {
    errors.push({ file: filePath, error: error.message });
    console.error(`✗ ${path.relative(process.cwd(), filePath)}: ${error.message}`);
  }
}

// Function to recursively process directory
function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (shouldSkip(fullPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (['.tsx', '.ts', '.jsx', '.js', '.css', '.md'].includes(ext)) {
        processFile(fullPath);
      }
    }
  }
}

// Main execution
console.log('Starting dark mode removal (v2)...\n');

const startTime = Date.now();
processDirectory(process.cwd());
const endTime = Date.now();

// Print summary
console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`Files processed: ${filesProcessed}`);
console.log(`Files modified: ${filesModified}`);
console.log(`Dark classes removed: ${darkClassesRemoved}`);
console.log(`Time taken: ${((endTime - startTime) / 1000).toFixed(2)}s`);

if (errors.length > 0) {
  console.log('\n' + '='.repeat(60));
  console.log('ERRORS');
  console.log('='.repeat(60));
  errors.forEach(({ file, error }) => {
    console.log(`${path.relative(process.cwd(), file)}: ${error}`);
  });
}

console.log('\n✓ Dark mode removal complete!');
