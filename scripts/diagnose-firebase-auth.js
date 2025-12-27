/**
 * Firebase Auth Token Diagnostic Script
 *
 * This script helps debug Firebase authentication and Firestore permissions issues
 * by inspecting the current user's ID token and custom claims.
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin SDK
const serviceAccount = require('../service_account_key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'weightlossprojectionlab-8b284'
});

const auth = admin.auth();
const db = admin.firestore();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function diagnoseUser(email) {
  console.log('\n🔍 FIREBASE AUTH DIAGNOSTICS');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // 1. Get user by email
    console.log(`📧 Looking up user: ${email}`);
    const userRecord = await auth.getUserByEmail(email);

    console.log('\n✅ User Found:');
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Email: ${userRecord.email}`);
    console.log(`   Email Verified: ${userRecord.emailVerified}`);
    console.log(`   Created: ${userRecord.metadata.creationTime}`);
    console.log(`   Last Sign In: ${userRecord.metadata.lastSignInTime}`);

    // 2. Check custom claims
    console.log('\n🏷️  Custom Claims:');
    if (userRecord.customClaims && Object.keys(userRecord.customClaims).length > 0) {
      console.log(JSON.stringify(userRecord.customClaims, null, 2));
    } else {
      console.log('   ⚠️  NO CUSTOM CLAIMS SET');
      console.log('   This is likely the root cause of the permissions error!');
    }

    // 3. Check Firestore user document
    console.log('\n📄 Firestore User Document:');
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log(`   Document exists: ✅`);
      console.log(`   Role field: ${userData.role || 'NOT SET'}`);
      console.log(`   Admin field: ${userData.admin || 'NOT SET'}`);
      console.log(`   Profile.isAdmin: ${userData.profile?.isAdmin || 'NOT SET'}`);
    } else {
      console.log('   ⚠️  User document does NOT exist in Firestore');
    }

    // 4. Test Firestore rules
    console.log('\n🔐 Firestore Rules Check:');
    console.log('   Super Admin Emails in Rules:');
    console.log('     - perriceconsulting@gmail.com');
    console.log('     - weightlossprojectionlab@gmail.com');
    console.log(`   Your email: ${email}`);

    const isSuperAdminEmail = ['perriceconsulting@gmail.com', 'weightlossprojectionlab@gmail.com']
      .includes(email.toLowerCase());

    if (isSuperAdminEmail) {
      console.log('   ✅ Email IS in super admin whitelist');
    } else {
      console.log('   ❌ Email is NOT in super admin whitelist');
    }

    // 5. Generate ID token and decode it
    console.log('\n🎫 ID Token Analysis:');
    const customToken = await auth.createCustomToken(userRecord.uid, userRecord.customClaims || {});
    console.log('   Custom token created (for testing)');

    // 6. Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('═══════════════════════════════════════════════\n');

    if (!userRecord.customClaims?.admin && !userRecord.customClaims?.role) {
      console.log('🔧 ISSUE FOUND: No admin custom claims set\n');
      console.log('   To fix this, run:');
      console.log(`   firebase auth:update-custom-claims ${userRecord.uid} --claims '{"admin":true,"role":"admin"}'\n`);
      console.log('   OR run the set-admin-claims.js script\n');

      // Optionally set claims now
      rl.question('Would you like to set admin claims now? (y/n): ', async (answer) => {
        if (answer.toLowerCase() === 'y') {
          try {
            await auth.setCustomUserClaims(userRecord.uid, {
              admin: true,
              role: 'admin',
              moderator: true
            });
            console.log('\n✅ Admin claims set successfully!');
            console.log('   The user must sign out and sign back in for claims to take effect.');
          } catch (error) {
            console.error('\n❌ Error setting claims:', error.message);
          }
        }
        rl.close();
      });
    } else {
      console.log('✅ Custom claims are set correctly');
      console.log('\n🔄 If you\'re still seeing errors:');
      console.log('   1. Sign out and sign back in (to refresh ID token)');
      console.log('   2. Clear browser cache and cookies');
      console.log('   3. Verify Firestore rules are deployed:');
      console.log('      firebase deploy --only firestore:rules');
      console.log('   4. Check browser console for token errors');
      rl.close();
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    rl.close();
  }
}

// Get email from command line or prompt
const email = process.argv[2];

if (email) {
  diagnoseUser(email).catch(console.error);
} else {
  rl.question('Enter email to diagnose: ', (inputEmail) => {
    diagnoseUser(inputEmail).catch(console.error);
  });
}
