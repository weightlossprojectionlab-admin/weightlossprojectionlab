const fs = require('fs');
const path = require('path');
const glob = require('glob');

async function removeDarkClasses() {
  // Find all TSX and JSX files in components directory
  const files = glob.sync('components/**/*.{tsx,jsx}', {
    cwd: process.cwd(),
    absolute: true
  });

  console.log(`Found ${files.length} component files`);

  let totalRemoved = 0;
  const modifiedFiles = [];

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    // Remove all dark: Tailwind classes
    // Pattern matches: dark:class-name including variants like dark:bg-red-500/30
    content = content.replace(/\s*dark:[a-zA-Z0-9_\-:\/\[\]\.%#]+/g, '');

    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      const matches = originalContent.match(/\s*dark:[a-zA-Z0-9_\-:\/\[\]\.%#]+/g);
      const count = matches ? matches.length : 0;
      totalRemoved += count;
      modifiedFiles.push(path.relative(process.cwd(), file));
      console.log(`✓ ${path.relative(process.cwd(), file)} - removed ${count} dark: classes`);
    }
  }

  console.log(`\nTotal: Removed ${totalRemoved} dark: classes from ${modifiedFiles.length} files`);

  if (modifiedFiles.length > 0) {
    console.log('\nModified files:');
    modifiedFiles.forEach(f => console.log(`  - ${f}`));
  }
}

removeDarkClasses().catch(console.error);
