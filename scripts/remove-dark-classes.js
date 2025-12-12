const fs = require('fs');
const path = require('path');
const glob = require('glob');

let totalFilesProcessed = 0;
let totalClassesRemoved = 0;
let filesModified = 0;

function removeDarkClasses(content) {
  let classesRemoved = 0;
  let modified = content;

  const darkClassPattern = /\s*dark:[a-zA-Z0-9_\-:\/\[\]\.%#]+/g;

  const matches = modified.match(darkClassPattern);
  if (matches) {
    classesRemoved = matches.length;
    modified = modified.replace(darkClassPattern, '');
  }

  modified = modified.replace(/\s{2,}/g, ' ');
  modified = modified.replace(/\s+"/g, '"');
  modified = modified.replace(/\s+'/g, "'");
  modified = modified.replace(/\s+`/g, '`');

  return {
    modified,
    classesRemoved,
    wasModified: classesRemoved > 0
  };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const result = removeDarkClasses(content);

    if (result.wasModified) {
      fs.writeFileSync(filePath, result.modified, 'utf8');
      filesModified++;
      totalClassesRemoved += result.classesRemoved;
      console.log(`✓ ${path.relative(process.cwd(), filePath)} - Removed ${result.classesRemoved} dark: classes`);
    }

    totalFilesProcessed++;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

function processDirectory(pattern) {
  const files = glob.sync(pattern, {
    ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**']
  });

  files.forEach(processFile);
}

console.log('Removing all dark: classes from the codebase...\n');

processDirectory('components/**/*.{tsx,jsx}');
processDirectory('app/**/*.{tsx,jsx}');

console.log('\nSummary:');
console.log(`   Files processed: ${totalFilesProcessed}`);
console.log(`   Files modified: ${filesModified}`);
console.log(`   dark: classes removed: ${totalClassesRemoved}`);
console.log('\nLight mode conversion complete!');
