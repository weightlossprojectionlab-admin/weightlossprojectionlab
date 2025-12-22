/**
 * Get complete user details
 */

const admin = require('firebase-admin')
const serviceAccount = require('../service_account_key.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

async function getDetails() {
  try {
    const uid = 'AVmoBIFY0TeZsPbjc1mHHztfI5z2'
    const userDoc = await db.collection('users').doc(uid).get()

    if (!userDoc.exists) {
      console.log('User not found')
      process.exit(0)
    }

    const data = userDoc.data()
    console.log('\n========================================')
    console.log('COMPLETE USER DATA FOR: percyricemusic@gmail.com')
    console.log('========================================\n')
    console.log(JSON.stringify(data, null, 2))
    console.log('\n========================================\n')

    process.exit(0)

  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

setTimeout(() => process.exit(1), 10000)
getDetails()
