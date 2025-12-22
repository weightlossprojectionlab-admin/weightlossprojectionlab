/**
 * Check all users with subscriptions
 */

const admin = require('firebase-admin');
const serviceAccount = require('../service_account_key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkAllSubscriptions() {
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    console.log(`\n=== Checking ${snapshot.size} users ===\n`);

    const usersWithSubscriptions = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.subscription) {
        usersWithSubscriptions.push({
          uid: doc.id,
          email: data.email,
          subscription: data.subscription
        });
      }
    });

    if (usersWithSubscriptions.length === 0) {
      console.log('❌ NO USERS HAVE SUBSCRIPTIONS');
    } else {
      console.log(`✅ Found ${usersWithSubscriptions.length} users with subscriptions:\n`);
      usersWithSubscriptions.forEach(user => {
        console.log(`User ID: ${user.uid}`);
        console.log(`Email: ${user.email}`);
        console.log(`\nFull subscription object:`);
        console.log(JSON.stringify(user.subscription, null, 2));
        console.log('---\n');
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkAllSubscriptions();
