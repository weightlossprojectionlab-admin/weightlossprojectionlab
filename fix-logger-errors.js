const fs = require('fs');
const path = require('path');

// Recursively find all .ts files in app/api directory
function findTypeScriptFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findTypeScriptFiles(filePath, fileList);
    } else if (file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

const apiDir = path.join(__dirname, 'app', 'api');
const files = findTypeScriptFiles(apiDir);

console.log(`Found ${files.length} TypeScript files in app/api`);

let totalChanges = 0;
const changedFiles = [];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Fix logger.error(message, error) -> logger.error(message, error as Error)
  // Handles: error, err, e, verifyError, updateError, deleteError, etc.
  content = content.replace(
    /logger\.(error|warn)\(([^,]+),\s*(\w+Error|\w+err|\berr\b|\berror\b|\be\b)(\s*\))/g,
    (match, method, message, errorVar, closing) => {
      // Check if it already has 'as Error' cast
      if (match.includes(' as Error')) {
        return match;
      }
      return `logger.${method}(${message}, ${errorVar} as Error${closing}`;
    }
  );

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles.push(file.replace(__dirname + path.sep, ''));
    totalChanges++;
  }
});

console.log(`\nFixed ${totalChanges} files:\n`);
changedFiles.forEach(file => console.log(`  - ${file}`));
console.log(`\nDone!`);
