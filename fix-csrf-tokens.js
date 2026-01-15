const fs = require('fs');
const path = require('path');

// Files that need CSRF token added (from agent search)
const filesToFix = [
  'app/contact/page.tsx',
  'app/(dashboard)/admin/users/page.tsx',
  'app/(dashboard)/admin/settings/page.tsx',
  'app/(dashboard)/admin/recipes/page.tsx',
  'app/(dashboard)/admin/recipes/create/page.tsx',
  'app/(dashboard)/admin/perks/page.tsx',
  'app/(dashboard)/admin/ml-analytics/page.tsx',
  'app/(dashboard)/admin/careers/page.tsx',
  'app/(dashboard)/admin/products/page.tsx',
  'app/(dashboard)/admin/products/[barcode]/page.tsx',
  'app/(dashboard)/admin/barcodes/page.tsx',
  'app/(dashboard)/admin/barcodes/[barcode]/edit/page.tsx',
  'app/(dashboard)/admin/ai-decisions/page.tsx',
  'app/(dashboard)/admin/analytics/page.tsx',
  'app/(dashboard)/admin/api-usage/page.tsx',
  'app/profile/page.tsx',
  'app/progress/page.tsx',
  'app/fix-profile/page.tsx',
  'app/onboarding/page.tsx',
  'app/family/profile/edit/page.tsx',
  'app/family/[memberId]/page.tsx',
  'app/family/directory/page.tsx',
  'app/family-admin/invites/page.tsx',
  'app/family-admin/documents/components/DocumentPreviewModal.tsx',
  'app/family-admin/dashboard/page.tsx',
  'app/family-admin/inventory/page.tsx',
  'app/family-admin/shopping/page.tsx',
  'app/patients/[patientId]/page.tsx',
  'app/patients/[patientId]/duties/page.tsx',
  'app/press/page.tsx',
  'app/press/releases/page.tsx',
  'app/press/releases/[slug]/page.tsx',
  'app/accept-invitation/page.tsx',
  'app/careers/page.tsx',
  'app/careers/[slug]/page.tsx',
];

let totalFiles = 0;
let totalChanges = 0;
const changedFiles = [];

filesToFix.forEach(relPath => {
  const filePath = path.join(__dirname, relPath);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${relPath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  let fileChanges = 0;

  // Check if file already imports getCSRFToken
  const hasCSRFImport = content.includes("import { getCSRFToken }") || content.includes("import {getCSRFToken}");

  // Check if file has any fetch calls to /api/ with POST/PUT/PATCH/DELETE
  const hasFetchCalls = /fetch\(['"`]\/api\//.test(content);

  if (!hasFetchCalls) {
    console.log(`ℹ️  No API fetch calls found in ${relPath}`);
    return;
  }

  // Add import if not present
  if (!hasCSRFImport) {
    // Find the last import statement
    const importRegex = /^import\s+.*?from\s+['"].*?['"]\s*$/gm;
    const imports = content.match(importRegex);

    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.indexOf(lastImport) + lastImport.length;

      content = content.slice(0, lastImportIndex) +
                "\nimport { getCSRFToken } from '@/lib/csrf'" +
                content.slice(lastImportIndex);
      fileChanges++;
    }
  }

  // Pattern to find fetch calls with POST/PUT/PATCH/DELETE that DON'T have X-CSRF-Token
  // This is complex because we need to find the headers object and add to it

  // Strategy: Find method: 'POST'|'PUT'|'PATCH'|'DELETE' followed by headers object
  // that doesn't already have X-CSRF-Token

  // Replace pattern for headers without Authorization (simple case)
  content = content.replace(
    /(fetch\(['"`]\/api\/[^'"`]*['"`],\s*\{[^}]*method:\s*['"](?:POST|PUT|PATCH|DELETE)['"][^}]*headers:\s*\{\s*)('Content-Type':\s*['"][^'"]*['"])([\s\S]*?\}\s*,)/g,
    (match, before, contentType, after) => {
      if (match.includes('X-CSRF-Token')) {
        return match; // Already has CSRF token
      }
      fileChanges++;
      return `${before}${contentType},\n          'X-CSRF-Token': csrfToken,${after}`;
    }
  );

  // Replace pattern for headers with Authorization
  content = content.replace(
    /(fetch\(['"`]\/api\/[^'"`]*['"`],\s*\{[^}]*method:\s*['"](?:POST|PUT|PATCH|DELETE)['"][^}]*headers:\s*\{[^}]*'Authorization':\s*[^,\}]*)(,?\s*'Content-Type'[^}]*?)(\})/g,
    (match, before, contentType, after) => {
      if (match.includes('X-CSRF-Token')) {
        return match; // Already has CSRF token
      }
      fileChanges++;
      return `${before}${contentType},\n          'X-CSRF-Token': csrfToken,${after}`;
    }
  );

  // Add const csrfToken = getCSRFToken() before fetch calls if changes were made
  if (fileChanges > 0) {
    // Find fetch calls and add csrfToken declaration before them
    content = content.replace(
      /((?:const|let|var)\s+\w+\s*=\s*)?await\s+fetch\(['"`]\/api\/[^'"`]*['"`],\s*\{[^}]*method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/g,
      (match) => {
        if (match.includes('X-CSRF-Token')) {
          // Check if csrfToken is declared nearby (within 5 lines before)
          const beforeMatch = content.slice(Math.max(0, content.indexOf(match) - 500), content.indexOf(match));
          if (!beforeMatch.includes('csrfToken = getCSRFToken()')) {
            return `const csrfToken = getCSRFToken()\n      ${match}`;
          }
        }
        return match;
      }
    );
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    changedFiles.push(relPath);
    totalChanges += fileChanges;
    totalFiles++;
    console.log(`✅ Fixed ${relPath} (${fileChanges} changes)`);
  } else {
    console.log(`⏭️  No changes needed for ${relPath}`);
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Files processed: ${totalFiles}`);
console.log(`   Total changes: ${totalChanges}`);
console.log(`\n📝 Changed files:`);
changedFiles.forEach(f => console.log(`   - ${f}`));
