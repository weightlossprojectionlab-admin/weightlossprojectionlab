// Split the Firebase private key into chunks to stay under Netlify's 4KB limit
const fs = require('fs');

const jsonPath = 'c:\\Users\\percy\\Downloads\\weightlossprojectionlab-8b284-firebase-adminsdk-fbsvc-1df7d5a64d.json';
const serviceAccount = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Encode the private key as base64
const base64Key = Buffer.from(serviceAccount.private_key).toString('base64');

// Split into 3 parts (each will be ~600 chars instead of ~1800)
const chunkSize = Math.ceil(base64Key.length / 3);
const part1 = base64Key.substring(0, chunkSize);
const part2 = base64Key.substring(chunkSize, chunkSize * 2);
const part3 = base64Key.substring(chunkSize * 2);

console.log('='.repeat(80));
console.log('Split Firebase Private Key for Netlify');
console.log('='.repeat(80));
console.log('\nIn Netlify, DELETE the old FIREBASE_ADMIN_PRIVATE_KEY_BASE64 variable');
console.log('Then ADD these THREE new variables:\n');

console.log('1. Variable name: FIREBASE_ADMIN_PRIVATE_KEY_PART1');
console.log('   Value:');
console.log(part1);
console.log('\n' + '-'.repeat(80) + '\n');

console.log('2. Variable name: FIREBASE_ADMIN_PRIVATE_KEY_PART2');
console.log('   Value:');
console.log(part2);
console.log('\n' + '-'.repeat(80) + '\n');

console.log('3. Variable name: FIREBASE_ADMIN_PRIVATE_KEY_PART3');
console.log('   Value:');
console.log(part3);
console.log('\n' + '='.repeat(80));

console.log('\nEach part is much smaller and should work within Netlify limits.');
