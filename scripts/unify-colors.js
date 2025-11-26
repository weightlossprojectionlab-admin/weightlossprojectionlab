/**
 * Color Unification Script
 *
 * Systematically replaces hardcoded Tailwind colors with semantic CSS variable tokens
 * across the entire codebase.
 */

const fs = require('fs');
const path = require('path');

// Color replacement mappings
const replacements = [
  // BACKGROUNDS - Most common patterns first
  { pattern: /bg-card/g, replacement: 'bg-card' },
  { pattern: /bg-background/g, replacement: 'bg-background' },
  { pattern: /bg-background/g, replacement: 'bg-background' },
  { pattern: /bg-background(?!-)/g, replacement: 'bg-background' },  // Negative lookahead to avoid bg-background0
  { pattern: /bg-muted/g, replacement: 'bg-muted' },
  { pattern: /bg-muted(?!-)/g, replacement: 'bg-muted' },

  // TEXT COLORS
  { pattern: /text-foreground/g, replacement: 'text-foreground' },
  { pattern: /text-foreground(?!-)/g, replacement: 'text-foreground' },
  { pattern: /text-foreground(?!-)/g, replacement: 'text-foreground' },
  { pattern: /text-muted-foreground/g, replacement: 'text-muted-foreground' },
  { pattern: /text-muted-foreground(?!-)/g, replacement: 'text-muted-foreground' },
  { pattern: /text-foreground/g, replacement: 'text-foreground' },
  { pattern: /text-foreground(?!-)/g, replacement: 'text-foreground' },
  { pattern: /text-muted-foreground(?!-)/g, replacement: 'text-muted-foreground' },
  { pattern: /text-muted-foreground(?!-)/g, replacement: 'text-muted-foreground' },

  // BORDERS
  { pattern: /border-border/g, replacement: 'border-border' },
  { pattern: /border-border/g, replacement: 'border-border' },
  { pattern: /border-border(?!-)/g, replacement: 'border-border' },
  { pattern: /border-border(?!-)/g, replacement: 'border-border' },
  { pattern: /border-border(?!-)/g, replacement: 'border-border' },

  // Remove redundant dark mode classes that are now handled by semantic tokens
  { pattern: //g, replacement: '' },
  { pattern: //g, replacement: '' },
  { pattern: //g, replacement: '' },
  { pattern: //g, replacement: '' },
  { pattern: / dark:text-muted-foreground/g, replacement: '' },
  { pattern: //g, replacement: '' },
  { pattern: //g, replacement: '' },
  { pattern: //g, replacement: '' },

  // SEMANTIC COLORS - PRIMARY (Purple)
  { pattern: /bg-primary hover:bg-primary-hover/g, replacement: 'bg-primary hover:bg-primary-hover' },
  { pattern: /bg-primary(?!-)/g, replacement: 'bg-primary' },
  { pattern: /hover:bg-primary-hover/g, replacement: 'hover:bg-primary-hover' },
  { pattern: /bg-primary-light dark:bg-purple-900\/30/g, replacement: 'bg-primary-light' },
  { pattern: /bg-primary-light(?!-)/g, replacement: 'bg-primary-light' },
  { pattern: /bg-purple-50 dark:bg-purple-900\/20/g, replacement: 'bg-primary-light' },
  { pattern: /text-primary/g, replacement: 'text-primary' },
  { pattern: /text-primary(?!-)/g, replacement: 'text-primary' },
  { pattern: /text-primary-dark/g, replacement: 'text-primary-dark' },
  { pattern: /text-primary-dark(?!-)/g, replacement: 'text-primary-dark' },
  { pattern: /text-primary-dark/g, replacement: 'text-primary-dark' },
  { pattern: /border-primary-light/g, replacement: 'border-primary-light' },
  { pattern: /border-primary(?!-)/g, replacement: 'border-primary' },
  { pattern: //g, replacement: '' },
  { pattern: / dark:bg-purple-900\/30/g, replacement: '' },
  { pattern: / dark:hover:bg-purple-900\/50/g, replacement: '' },

  // SEMANTIC COLORS - SUCCESS (Green)
  { pattern: /bg-success(?!-)/g, replacement: 'bg-success' },
  { pattern: /bg-success-light(?!-)/g, replacement: 'bg-success-light' },
  { pattern: /text-success(?!-)/g, replacement: 'text-success' },
  { pattern: /text-success-dark(?!-)/g, replacement: 'text-success-dark' },
  { pattern: /border-success(?!-)/g, replacement: 'border-success' },

  // SEMANTIC COLORS - WARNING (Yellow/Amber)
  { pattern: /bg-warning(?!-)/g, replacement: 'bg-warning' },
  { pattern: /hover:bg-warning-dark/g, replacement: 'hover:bg-warning-dark' },
  { pattern: /bg-warning-light dark:bg-yellow-900\/20/g, replacement: 'bg-warning-light' },
  { pattern: /bg-warning-light(?!-)/g, replacement: 'bg-warning-light' },
  { pattern: /text-warning/g, replacement: 'text-warning' },
  { pattern: /text-warning(?!-)/g, replacement: 'text-warning' },
  { pattern: /text-warning-dark/g, replacement: 'text-warning-dark' },
  { pattern: /text-warning-dark(?!-)/g, replacement: 'text-warning-dark' },
  { pattern: /text-warning-dark/g, replacement: 'text-warning-dark' },
  { pattern: /border-warning-light/g, replacement: 'border-warning-light' },
  { pattern: /border-warning-light(?!-)/g, replacement: 'border-warning-light' },
  { pattern: / dark:bg-yellow-900\/20/g, replacement: '' },
  { pattern: //g, replacement: '' },
  { pattern: //g, replacement: '' },
  { pattern: //g, replacement: '' },

  // SEMANTIC COLORS - ERROR (Red)
  { pattern: /bg-error(?!-)/g, replacement: 'bg-error' },
  { pattern: /bg-error-light(?!-)/g, replacement: 'bg-error-light' },
  { pattern: /text-error/g, replacement: 'text-error' },
  { pattern: /text-error(?!-)/g, replacement: 'text-error' },
  { pattern: /text-error-dark(?!-)/g, replacement: 'text-error-dark' },
  { pattern: /border-error(?!-)/g, replacement: 'border-error' },
  { pattern: //g, replacement: '' },

  // SEMANTIC COLORS - SECONDARY (Blue)
  { pattern: /bg-secondary hover:bg-secondary-hover/g, replacement: 'bg-secondary hover:bg-secondary-hover' },
  { pattern: /bg-secondary(?!-)/g, replacement: 'bg-secondary' },
  { pattern: /hover:bg-secondary-hover/g, replacement: 'hover:bg-secondary-hover' },
  { pattern: /bg-secondary-light dark:bg-blue-900\/20/g, replacement: 'bg-secondary-light' },
  { pattern: /bg-secondary-light(?!-)/g, replacement: 'bg-secondary-light' },
  { pattern: /text-secondary/g, replacement: 'text-secondary' },
  { pattern: /text-secondary(?!-)/g, replacement: 'text-secondary' },
  { pattern: /text-secondary-dark/g, replacement: 'text-secondary-dark' },
  { pattern: /text-secondary-dark/g, replacement: 'text-secondary-dark' },
  { pattern: /border-secondary-light/g, replacement: 'border-secondary-light' },
  { pattern: /border-secondary(?!-)/g, replacement: 'border-secondary' },
  { pattern: / dark:bg-blue-900\/20/g, replacement: '' },
  { pattern: //g, replacement: '' },
  { pattern: //g, replacement: '' },
  { pattern: //g, replacement: '' },

  // SEMANTIC COLORS - ACCENT (Indigo)
  { pattern: /bg-accent(?!-)/g, replacement: 'bg-accent' },
  { pattern: /bg-accent-light(?!-)/g, replacement: 'bg-accent-light' },
  { pattern: /text-accent(?!-)/g, replacement: 'text-accent' },
  { pattern: /border-accent(?!-)/g, replacement: 'border-accent' },

  // SEMANTIC COLORS - Orange (map to warning)
  { pattern: /text-warning/g, replacement: 'text-warning' },
  { pattern: /text-warning(?!-)/g, replacement: 'text-warning' },
  { pattern: /text-warning(?!-)/g, replacement: 'text-warning' },
];

// Additional cleanup patterns for hover states
const hoverCleanup = [
  { pattern: /hover:text-foreground/g, replacement: 'hover:text-foreground' },
  { pattern: /hover:bg-background/g, replacement: 'hover:bg-muted' },
  { pattern: /hover:bg-background/g, replacement: 'hover:bg-muted' },
  { pattern: //g, replacement: '' },
  { pattern: //g, replacement: '' },
  { pattern: //g, replacement: '' },
];

// Combine all replacements
const allReplacements = [...replacements, ...hoverCleanup];

async function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let changeCount = 0;

    // Apply all replacements
    for (const { pattern, replacement } of allReplacements) {
      const beforeLength = content.length;
      content = content.replace(pattern, replacement);
      if (content.length !== beforeLength) {
        changeCount++;
      }
    }

    // Only write if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ ${filePath} (${changeCount} patterns replaced)`);
      return changeCount;
    }

    return 0;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

// Recursive function to find all files
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip excluded directories
      if (!['node_modules', '.next', 'dist', 'build', '.git', 'coverage'].includes(file)) {
        findFiles(filePath, fileList);
      }
    } else if (/\.(tsx|jsx|ts|js)$/.test(file) && !file.includes('.test.') && !file.includes('.spec.')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

async function main() {
  console.log('🎨 Starting CSS Color Unification...\n');

  // Find all TSX/JSX/TS/JS files
  const files = findFiles(process.cwd());

  console.log(`Found ${files.length} files to process\n`);

  let totalChanges = 0;
  let filesChanged = 0;

  for (const file of files) {
    const changes = await processFile(file);
    if (changes > 0) {
      totalChanges += changes;
      filesChanged++;
    }
  }

  console.log(`\n✨ Complete!`);
  console.log(`   Files changed: ${filesChanged}`);
  console.log(`   Total pattern replacements: ${totalChanges}`);
}

main().catch(console.error);
