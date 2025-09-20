/**
 * Simple script to verify the timezone fix
 * Creates a test date at 6am UTC and verifies it displays as 06:00
 */

const { formatTimeDisplay, formatDateDisplay } = require('../app/lib/utils/time-display');

console.log('Testing timezone display fix...\n');

// Test cases
const testCases = [
  { time: '2025-09-20T06:00:00.000Z', expected: '06:00', description: '6am UTC' },
  { time: '2025-09-20T07:00:00.000Z', expected: '07:00', description: '7am UTC' },
  { time: '2025-09-20T12:30:00.000Z', expected: '12:30', description: '12:30pm UTC' },
  { time: '2025-09-20T18:45:00.000Z', expected: '18:45', description: '6:45pm UTC' },
  { time: '2025-09-20T00:00:00.000Z', expected: '00:00', description: 'Midnight UTC' },
];

let passed = 0;
let failed = 0;

testCases.forEach(test => {
  const result = formatTimeDisplay(test.time);
  const status = result === test.expected ? '✅ PASS' : '❌ FAIL';
  
  console.log(`${status}: ${test.description}`);
  console.log(`  Input: ${test.time}`);
  console.log(`  Expected: ${test.expected}`);
  console.log(`  Got: ${result}`);
  console.log();
  
  if (result === test.expected) {
    passed++;
  } else {
    failed++;
  }
});

console.log('=====================================');
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error('\n❌ Timezone fix verification FAILED');
  process.exit(1);
} else {
  console.log('\n✅ Timezone fix verified successfully!');
  console.log('6am sessions will now display as 06:00, not 07:00');
}