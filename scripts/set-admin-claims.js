/**
 * Set Admin Custom Claims Script
 *
 * This script sets Firebase custom claims for admin users.
 * Custom claims are required for Firestore security rules to recognize admin status.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../service_account_key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'weightlossprojectionlab-8b284'
});

const auth = admin.auth();

// Super admin emails (must match firestore.rules)
const SUPER_ADMIN_EMAILS = [
  'perriceconsulting@gmail.com',
  'weightlossprojectionlab@gmail.com'
];

async function setAdminClaims() {
  console.log('🔧 Setting admin custom claims...\n');

  for (const email of SUPER_ADMIN_EMAILS) {
    try {
      // Get user by email
      const userRecord = await auth.getUserByEmail(email);

      // Set custom claims
      await auth.setCustomUserClaims(userRecord.uid, {
        admin: true,
        role: 'admin',
        moderator: true,
        support: true
      });

      console.log(`✅ Admin claims set for: ${email}`);
      console.log(`   UID: ${userRecord.uid}`);
      console.log(`   Claims: admin, moderator, support\n`);

    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`⚠️  User not found: ${email}`);
        console.log(`   This user needs to sign up first.\n`);
      } else {
        console.error(`❌ Error setting claims for ${email}:`, error.message);
      }
    }
  }

  console.log('═══════════════════════════════════════════════');
  console.log('✅ DONE! Admin claims have been set.');
  console.log('\n⚠️  IMPORTANT: Users must sign out and sign back in');
  console.log('   for the new claims to take effect in their ID token.\n');
}

setAdminClaims()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
