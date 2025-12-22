/**
 * Check subscription status for percyricemusic@gmail.com after checkout
 */

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Initialize Firebase Admin using environment variables
if (!admin.apps.length) {
  const serviceAccountBase64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64;
  const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf-8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'weightlossprojectionlab-8b284.firebasestorage.app'
  });
}

const db = admin.firestore();

async function checkSubscription() {
  try {
    const email = 'percyricemusic@gmail.com';

    // Find user by email
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      console.log('⚠️  User not found with email:', email);
      console.log('\nLet me check all users with "percy" in their email...\n');

      // Get all users
      const allUsersSnapshot = await usersRef.get();
      const percyUsers = allUsersSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.email && data.email.toLowerCase().includes('percy');
      });

      if (percyUsers.length > 0) {
        console.log('Found users with "percy" in email:');
        percyUsers.forEach(doc => {
          const data = doc.data();
          console.log(`- ${data.email} (UID: ${doc.id})`);
          if (data.subscription) {
            console.log(`  Subscription: ${data.subscription.plan} (${data.subscription.status})`);
          } else {
            console.log(`  Subscription: NONE`);
          }
        });
      } else {
        console.log('No users found with "percy" in email');
      }
      return;
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    console.log('\n=== USER SUBSCRIPTION DATA ===');
    console.log('User ID:', userDoc.id);
    console.log('Email:', userData.email);
    console.log('\nSubscription object:');
    console.log(JSON.stringify(userData.subscription, null, 2));

    if (userData.subscription) {
      console.log('\n=== SUBSCRIPTION DETAILS ===');
      console.log('Plan:', userData.subscription.plan);
      console.log('Status:', userData.subscription.status);
      console.log('Billing Interval:', userData.subscription.billingInterval);
      console.log('Stripe Customer ID:', userData.subscription.stripeCustomerId);
      console.log('Stripe Subscription ID:', userData.subscription.stripeSubscriptionId);
      console.log('Max Seats:', userData.subscription.maxSeats);
      console.log('Max Caregivers:', userData.subscription.maxExternalCaregivers);
      console.log('Current Period Start:', userData.subscription.currentPeriodStart);
      console.log('Current Period End:', userData.subscription.currentPeriodEnd);
      console.log('Trial Ends At:', userData.subscription.trialEndsAt);
    } else {
      console.log('\n⚠️  NO SUBSCRIPTION OBJECT FOUND');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkSubscription();
