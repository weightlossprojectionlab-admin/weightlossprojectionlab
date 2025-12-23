// Generate base64-encoded Firebase private key for Netlify
const fs = require('fs');

const jsonPath = 'c:\\Users\\percy\\Downloads\\weightlossprojectionlab-8b284-firebase-adminsdk-fbsvc-1df7d5a64d.json';
const serviceAccount = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Encode the private key as base64
const base64Key = Buffer.from(serviceAccount.private_key).toString('base64');

console.log('='.repeat(80));
console.log('Base64-Encoded Firebase Private Key for Netlify');
console.log('='.repeat(80));
console.log('\nIn Netlify, create a NEW environment variable:');
console.log('Variable name: FIREBASE_ADMIN_PRIVATE_KEY_BASE64');
console.log('\nValue (copy this entire string):');
console.log('='.repeat(80));
console.log(base64Key);
console.log('='.repeat(80));
console.log('\nThis is a simple base64 string with NO special characters.');
console.log('It should paste cleanly without any corruption.');
console.log('\nAfter setting this variable, you can DELETE the old FIREBASE_ADMIN_PRIVATE_KEY variable.');
