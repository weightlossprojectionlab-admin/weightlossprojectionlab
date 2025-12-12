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
  /remove-dark-mode\.js/,
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

  // Pattern 1: Remove dark:class followed by space or quote
  // Handles: dark:text-white dark:bg-gray-800 etc.
  const pattern1 = /dark:[a-zA-Z0-9\-:]+\s+/g;
  const matches1 = modified.match(pattern1) || [];
  removedCount += matches1.length;
  modified = modified.replace(pattern1, '');

  // Pattern 2: Remove dark:class at end of string or before quote
  const pattern2 = /\s+dark:[a-zA-Z0-9\-:]+(?=["'])/g;
  const matches2 = modified.match(pattern2) || [];
  removedCount += matches2.length;
  modified = modified.replace(pattern2, '');

  // Pattern 3: Remove dark:class followed by closing quote (edge case)
  const pattern3 = /dark:[a-zA-Z0-9\-:]+(?=["'])/g;
  const matches3 = modified.match(pattern3) || [];
  removedCount += matches3.length;
  modified = modified.replace(pattern3, '');

  // Pattern 4: Clean up multiple spaces left behind
  modified = modified.replace(/\s{2,}/g, ' ');

  // Pattern 5: Clean up space before closing quotes
  modified = modified.replace(/\s+"/g, '"');
  modified = modified.replace(/\s+'/g, "'");
  modified = modified.replace(/\s+`/g, "`");

  // Pattern 6: Clean up className="" or className='' (empty classes)
  modified = modified.replace(/className=""\s*/g, '');
  modified = modified.replace(/className=''\s*/g, '');

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
      if (['.tsx', '.ts', '.jsx', '.js', '.css'].includes(ext)) {
        processFile(fullPath);
      }
    }
  }
}

// Main execution
console.log('Starting dark mode removal...\n');

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
