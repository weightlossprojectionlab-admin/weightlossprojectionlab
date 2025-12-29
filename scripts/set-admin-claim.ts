/**
 * Set Admin Custom Claim
 *
 * Sets the admin custom claim on a user's Firebase Auth token
 * This allows them to bypass Firestore security rules
 *
 * Usage: npx tsx scripts/set-admin-claim.ts <email>
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// Email to set as admin
const adminEmail = process.argv[2] || 'weightlossprojectionlab@gmail.com'

async function setAdminClaim() {
  try {
    // Initialize Firebase Admin SDK with project ID
    initializeApp({
      projectId: 'weightlossprojectionlab-8b284'
    })

    const auth = getAuth()

    // Get user by email
    console.log(`Looking up user: ${adminEmail}`)
    const user = await auth.getUserByEmail(adminEmail)
    console.log(`Found user: ${user.uid}`)

    // Set custom claim
    console.log('Setting admin custom claim...')
    await auth.setCustomUserClaims(user.uid, {
      admin: true,
      moderator: true
    })

    console.log('✅ Admin custom claim set successfully!')
    console.log('User must sign out and sign back in for changes to take effect.')

    // Verify the claim was set
    const updatedUser = await auth.getUser(user.uid)
    console.log('Custom claims:', updatedUser.customClaims)

    process.exit(0)
  } catch (error) {
    console.error('❌ Error setting admin claim:', error)
    process.exit(1)
  }
}

setAdminClaim()
