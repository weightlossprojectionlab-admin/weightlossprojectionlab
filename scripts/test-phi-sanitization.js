/**
 * Standalone test for PHI sanitization (no Firebase dependencies)
 * Run with: node scripts/test-phi-sanitization.js
 */

// PHI patterns (copied from flagstaff-support.ts)
const PHI_PATTERNS = {
  weight: /\b\d{2,3}\s*(lbs?|pounds?|kg|kilograms?)\b/gi,
  medications: /\b(metformin|insulin|ozempic|wegovy|mounjaro|semaglutide|tirzepatide)\b/gi,
  medicalConditions: /\b(diabetes|hypertension|obesity|t2d|type\s*2\s*diabetes)\b/gi,
  vitalNumbers: /\b(bp|blood\s*pressure):\s*\d{2,3}\/\d{2,3}\b/gi,
  dates: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
};

function sanitizePHI(text) {
  let sanitized = text;
  let hadPHI = false;
  const detectedTypes = [];

  for (const [type, pattern] of Object.entries(PHI_PATTERNS)) {
    if (pattern.test(sanitized)) {
      hadPHI = true;
      detectedTypes.push(type);
      sanitized = sanitized.replace(pattern, `[${type.toUpperCase()}_REDACTED]`);
    }
  }

  return { sanitized, hadPHI, detectedTypes };
}

console.log('=== PHI Sanitization Tests ===\n');

const testCases = [
  {
    name: 'Weight information',
    input: 'I weigh 185 lbs and want to lose weight',
    expectedPHI: true,
  },
  {
    name: 'Medication',
    input: 'Taking metformin 500mg daily',
    expectedPHI: true,
  },
  {
    name: 'Medical condition',
    input: 'I have diabetes type 2',
    expectedPHI: true,
  },
  {
    name: 'Vital signs',
    input: 'My BP: 120/80 this morning',
    expectedPHI: true,
  },
  {
    name: 'Date',
    input: 'Last checkup was on 12/15/2024',
    expectedPHI: true,
  },
  {
    name: 'No PHI',
    input: 'How do I log my meals?',
    expectedPHI: false,
  },
  {
    name: 'Multiple PHI types',
    input: 'I weigh 185 lbs, take metformin, and have diabetes',
    expectedPHI: true,
  },
  {
    name: 'Different weight formats',
    input: 'I weigh 75 kg and my goal is 200 pounds',
    expectedPHI: true,
  },
];

let passed = 0;
let failed = 0;

testCases.forEach((testCase, i) => {
  const result = sanitizePHI(testCase.input);

  console.log(`Test ${i + 1}: ${testCase.name}`);
  console.log(`  Original:  "${testCase.input}"`);
  console.log(`  Sanitized: "${result.sanitized}"`);
  console.log(`  Had PHI: ${result.hadPHI} (expected: ${testCase.expectedPHI})`);

  if (result.hadPHI) {
    console.log(`  Detected types: ${result.detectedTypes.join(', ')}`);
  }

  // Verify test passed
  if (result.hadPHI === testCase.expectedPHI) {
    console.log('  ✅ PASSED\n');
    passed++;
  } else {
    console.log('  ❌ FAILED\n');
    failed++;
  }
});

console.log(`=== Test Results ===`);
console.log(`Passed: ${passed}/${testCases.length}`);
console.log(`Failed: ${failed}/${testCases.length}`);

if (failed === 0) {
  console.log('\n✅ All tests passed!');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed');
  process.exit(1);
}
