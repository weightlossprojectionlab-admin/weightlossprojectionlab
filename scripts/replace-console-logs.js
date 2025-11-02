#!/usr/bin/env node

/**
 * Script to replace all console statements with production-safe logger
 * Usage: node scripts/replace-console-logs.js
 */

const fs = require('fs');
const path = require('path');

// Directories to process
const DIRECTORIES = ['app', 'hooks', 'components'];

// Statistics
const stats = {
  filesProcessed: 0,
  filesModified: 0,
  consoleStatementsReplaced: 0,
  byDirectory: {}
};

/**
 * Check if file already has logger import
 */
function hasLoggerImport(content) {
  return /import\s+{\s*logger\s*}\s+from\s+['"]@\/lib\/logger['"]/.test(content);
}

/**
 * Add logger import to file
 */
function addLoggerImport(content) {
  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('} from ')) {
      lastImportIndex = i;
    }
    // Stop at first non-import, non-comment, non-empty line
    if (lines[i].trim() &&
        !lines[i].trim().startsWith('import ') &&
        !lines[i].trim().startsWith('//') &&
        !lines[i].trim().startsWith('/*') &&
        !lines[i].trim().startsWith('*') &&
        !lines[i].trim().startsWith('*/') &&
        !lines[i].trim().startsWith('} from ') &&
        lastImportIndex !== -1) {
      break;
    }
  }

  if (lastImportIndex === -1) {
    // No imports found, add at top after 'use client' or 'use server' if present
    const useClientIndex = lines.findIndex(l => l.trim() === "'use client'" || l.trim() === '"use client"' || l.trim() === "'use server'" || l.trim() === '"use server"');
    if (useClientIndex !== -1) {
      lines.splice(useClientIndex + 1, 0, '', "import { logger } from '@/lib/logger'");
    } else {
      lines.unshift("import { logger } from '@/lib/logger'", '');
    }
  } else {
    // Add after last import
    lines.splice(lastImportIndex + 1, 0, "import { logger } from '@/lib/logger'");
  }

  return lines.join('\n');
}

/**
 * Replace console statements with logger
 */
function replaceConsoleStatements(content) {
  let replacements = 0;

  // console.log → logger.debug() or logger.info() based on content
  content = content.replace(/console\.log\(/g, (match, offset) => {
    replacements++;
    return 'logger.debug(';
  });

  // console.debug → logger.debug()
  content = content.replace(/console\.debug\(/g, () => {
    replacements++;
    return 'logger.debug(';
  });

  // console.info → logger.info()
  content = content.replace(/console\.info\(/g, () => {
    replacements++;
    return 'logger.info(';
  });

  // console.warn → logger.warn()
  content = content.replace(/console\.warn\(/g, () => {
    replacements++;
    return 'logger.warn(';
  });

  // console.error → logger.error() - handle both patterns
  // Pattern 1: console.error('message:', error) or console.error('message', error)
  content = content.replace(/console\.error\((['"`][^'"`]*['"`])\s*[:,]\s*([^)]+)\)/g, (match, message, error) => {
    replacements++;
    // Remove colon/comma from message and trim
    const cleanMessage = message.replace(/[,:]$/, '').trim();
    return `logger.error(${cleanMessage}, ${error.trim()})`;
  });

  // Pattern 2: console.error('message') - no error object
  content = content.replace(/console\.error\((['"`][^'"`]*['"`])\)/g, (match, message) => {
    replacements++;
    return `logger.error(${message})`;
  });

  // Pattern 3: console.error(variable) or console.error(expression)
  content = content.replace(/console\.error\(([^)]+)\)/g, (match, arg) => {
    // Skip if already replaced (contains logger)
    if (match.includes('logger')) return match;
    replacements++;
    return `logger.error('Error', ${arg})`;
  });

  return { content, replacements };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Check if file has console statements
    const hasConsole = /console\.(log|warn|error|debug|info)\(/.test(content);

    if (!hasConsole) {
      return 0;
    }

    // Add logger import if not present
    if (!hasLoggerImport(content)) {
      content = addLoggerImport(content);
    }

    // Replace console statements
    const { content: newContent, replacements } = replaceConsoleStatements(content);

    // Only write if content changed
    if (newContent !== originalContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      return replacements;
    }

    return 0;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return 0;
  }
}

/**
 * Process all files in a directory recursively
 */
function processDirectory(dir, baseDir) {
  const dirName = path.basename(dir);

  if (!stats.byDirectory[dirName]) {
    stats.byDirectory[dirName] = {
      filesProcessed: 0,
      filesModified: 0,
      consoleStatementsReplaced: 0,
      files: []
    };
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath, baseDir);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      stats.filesProcessed++;
      stats.byDirectory[dirName].filesProcessed++;

      const replacements = processFile(filePath);

      if (replacements > 0) {
        stats.filesModified++;
        stats.consoleStatementsReplaced += replacements;
        stats.byDirectory[dirName].filesModified++;
        stats.byDirectory[dirName].consoleStatementsReplaced += replacements;
        stats.byDirectory[dirName].files.push({
          path: path.relative(baseDir, filePath),
          replacements
        });
      }
    }
  }
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Starting console.log cleanup...\n');

  const projectRoot = path.resolve(__dirname, '..');

  for (const dir of DIRECTORIES) {
    const dirPath = path.join(projectRoot, dir);

    if (!fs.existsSync(dirPath)) {
      console.warn(`⚠️  Directory not found: ${dir}`);
      continue;
    }

    console.log(`📁 Processing ${dir}/...`);
    processDirectory(dirPath, projectRoot);
  }

  // Print summary
  console.log('\n✅ Console.log cleanup complete!\n');
  console.log('📊 Summary:');
  console.log(`   Total files scanned: ${stats.filesProcessed}`);
  console.log(`   Files modified: ${stats.filesModified}`);
  console.log(`   Console statements replaced: ${stats.consoleStatementsReplaced}`);

  console.log('\n📁 By Directory:');
  for (const [dir, dirStats] of Object.entries(stats.byDirectory)) {
    console.log(`\n   ${dir}/:`);
    console.log(`      Files processed: ${dirStats.filesProcessed}`);
    console.log(`      Files modified: ${dirStats.filesModified}`);
    console.log(`      Statements replaced: ${dirStats.consoleStatementsReplaced}`);

    if (dirStats.files.length > 0) {
      console.log(`      Modified files:`);
      dirStats.files.forEach(({ path, replacements }) => {
        console.log(`         - ${path} (${replacements} statements)`);
      });
    }
  }

  console.log('\n✨ All done!');
}

// Run the script
main();
