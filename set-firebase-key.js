// Script to extract and display the Firebase private key in the correct format for Netlify
const fs = require('fs');
const path = require('path');

// Read the Firebase service account JSON file
const jsonPath = 'c:\\Users\\percy\\Downloads\\weightlossprojectionlab-8b284-firebase-adminsdk-fbsvc-1df7d5a64d.json';
const serviceAccount = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('='.repeat(80));
console.log('Firebase Admin SDK Configuration for Netlify');
console.log('='.repeat(80));
console.log('\n1. FIREBASE_ADMIN_PROJECT_ID:');
console.log(serviceAccount.project_id);
console.log('\n' + '-'.repeat(80));

console.log('\n2. FIREBASE_ADMIN_CLIENT_EMAIL:');
console.log(serviceAccount.client_email);
console.log('\n' + '-'.repeat(80));

console.log('\n3. FIREBASE_ADMIN_PRIVATE_KEY:');
console.log('Copy the value below EXACTLY (it should be ONE line with \\n characters):');
console.log('\n' + '='.repeat(80));
// Convert actual newlines to literal \n for Netlify
const formattedKey = JSON.stringify(serviceAccount.private_key).slice(1, -1);
console.log(formattedKey);
console.log('='.repeat(80));

console.log('\n\nIMPORTANT:');
console.log('- Go to: https://app.netlify.com/sites/weightlossprojectionlab/configuration/env');
console.log('- Click on each variable and paste the value EXACTLY as shown above');
console.log('- The private key should be ONE LONG LINE with literal \\n characters');
console.log('- Do NOT add any extra quotes or formatting');
