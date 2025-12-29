/**
 * Simple test script for Flagstaff Support Service
 * Run with: npx tsx scripts/test-flagstaff-support.ts
 */

import { sanitizePHI, searchKnowledgeBase } from '../lib/ai/flagstaff-support';

console.log('=== Testing Flagstaff Support Service ===\n');

// Test 1: PHI Sanitization
console.log('Test 1: PHI Sanitization');
console.log('-------------------------');

const testCases = [
  'I weigh 185 lbs and want to lose weight',
  'Taking metformin 500mg daily',
  'I have diabetes type 2',
  'My BP: 120/80 this morning',
  'Last checkup was on 12/15/2024',
  'How do I log my meals?', // No PHI
  'I weigh 185 lbs, take metformin, and have diabetes', // Multiple PHI types
];

testCases.forEach((testCase, i) => {
  const result = sanitizePHI(testCase);
  console.log(`\n${i + 1}. Original: "${testCase}"`);
  console.log(`   Sanitized: "${result.sanitized}"`);
  console.log(`   Had PHI: ${result.hadPHI}`);
  if (result.hadPHI) {
    console.log(`   Detected types: ${result.detectedTypes.join(', ')}`);
  }
});

// Test 2: Knowledge Base Search
console.log('\n\nTest 2: Knowledge Base Search');
console.log('-------------------------------');

async function testSearch() {
  const queries = [
    'subscription pricing',
    'how to track weight',
    'HIPAA compliance',
  ];

  for (const query of queries) {
    console.log(`\nQuery: "${query}"`);
    const results = await searchKnowledgeBase(query);
    console.log(`Results: ${results.length}`);

    results.forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.title} (${result.path})`);
      console.log(`     Relevance: ${result.relevanceScore.toFixed(2)}, Type: ${result.type}`);
    });
  }
}

testSearch()
  .then(() => {
    console.log('\n=== All tests completed successfully ===');
  })
  .catch((error) => {
    console.error('\n=== Tests failed ===');
    console.error(error);
    process.exit(1);
  });
