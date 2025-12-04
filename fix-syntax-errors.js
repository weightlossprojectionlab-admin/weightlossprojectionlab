const fs = require('fs');
const path = require('path');

// Recursively find all .ts files in app/api
function findTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findTsFiles(filePath, fileList);
    } else if (file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Fix the syntax errors in a file
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix pattern: errorResponse(variableName: any, -> errorResponse(variableName,
  const pattern = /errorResponse\(([a-zA-Z_][a-zA-Z0-9_]*): any,/g;
  if (pattern.test(content)) {
    content = content.replace(/errorResponse\(([a-zA-Z_][a-zA-Z0-9_]*): any,/g, 'errorResponse($1,');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
    return 1;
  }

  return 0;
}

// Main
const apiDir = path.join(__dirname, 'app', 'api');
const tsFiles = findTsFiles(apiDir);

console.log(`Found ${tsFiles.length} TypeScript files in app/api`);

let fixedCount = 0;
tsFiles.forEach(file => {
  fixedCount += fixFile(file);
});

console.log(`\nFixed ${fixedCount} files`);
