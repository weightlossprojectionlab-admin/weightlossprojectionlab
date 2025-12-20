/**
 * Analyze subscription coverage across all users
 * READ-ONLY - Does not modify any data
 */

const admin = require('firebase-admin')
const serviceAccount = require('../service_account_key.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

async function analyzeSubscriptions() {
  try {
    console.log('\n' + '='.repeat(70))
    console.log('SUBSCRIPTION COVERAGE ANALYSIS')
    console.log('='.repeat(70))

    // Get all users
    const usersSnapshot = await db.collection('users').get()
    const totalUsers = usersSnapshot.size

    console.log(`\n📊 Total Users: ${totalUsers}`)

    // Categorize users
    const withSubscription = []
    const withoutSubscription = []
    const planBreakdown = {}
    const statusBreakdown = {}

    usersSnapshot.forEach(doc => {
      const data = doc.data()
      const userId = doc.id
      const email = data.email || 'no-email'

      if (data.subscription) {
        withSubscription.push({
          id: userId,
          email: email,
          plan: data.subscription.plan,
          status: data.subscription.status,
          maxSeats: data.subscription.maxSeats,
          currentSeats: data.subscription.currentSeats || 0
        })

        // Count by plan
        const plan = data.subscription.plan || 'unknown'
        planBreakdown[plan] = (planBreakdown[plan] || 0) + 1

        // Count by status
        const status = data.subscription.status || 'unknown'
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1
      } else {
        withoutSubscription.push({
          id: userId,
          email: email,
          onboardingCompleted: data.profile?.onboardingCompleted || false,
          createdAt: data.createdAt?.toDate?.() || 'unknown'
        })
      }
    })

    // Calculate percentages
    const withSubPercent = ((withSubscription.length / totalUsers) * 100).toFixed(1)
    const withoutSubPercent = ((withoutSubscription.length / totalUsers) * 100).toFixed(1)

    console.log('\n' + '─'.repeat(70))
    console.log('SUBSCRIPTION STATUS')
    console.log('─'.repeat(70))
    console.log(`✅ Users WITH subscription:    ${withSubscription.length} (${withSubPercent}%)`)
    console.log(`❌ Users WITHOUT subscription: ${withoutSubscription.length} (${withoutSubPercent}%)`)

    // Plan breakdown
    if (Object.keys(planBreakdown).length > 0) {
      console.log('\n' + '─'.repeat(70))
      console.log('PLAN BREAKDOWN (Users with subscriptions)')
      console.log('─'.repeat(70))
      Object.entries(planBreakdown).sort((a, b) => b[1] - a[1]).forEach(([plan, count]) => {
        const percent = ((count / withSubscription.length) * 100).toFixed(1)
        console.log(`  ${plan.padEnd(20)} ${count} users (${percent}%)`)
      })
    }

    // Status breakdown
    if (Object.keys(statusBreakdown).length > 0) {
      console.log('\n' + '─'.repeat(70))
      console.log('STATUS BREAKDOWN (Users with subscriptions)')
      console.log('─'.repeat(70))
      Object.entries(statusBreakdown).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
        const percent = ((count / withSubscription.length) * 100).toFixed(1)
        console.log(`  ${status.padEnd(20)} ${count} users (${percent}%)`)
      })
    }

    // Sample users WITH subscriptions
    if (withSubscription.length > 0) {
      console.log('\n' + '─'.repeat(70))
      console.log('SAMPLE USERS WITH SUBSCRIPTIONS (First 5)')
      console.log('─'.repeat(70))
      withSubscription.slice(0, 5).forEach(user => {
        console.log(`\n  Email: ${user.email}`)
        console.log(`  Plan: ${user.plan}`)
        console.log(`  Status: ${user.status}`)
        console.log(`  Seats: ${user.currentSeats}/${user.maxSeats}`)
      })
    }

    // Sample users WITHOUT subscriptions
    if (withoutSubscription.length > 0) {
      console.log('\n' + '─'.repeat(70))
      console.log('SAMPLE USERS WITHOUT SUBSCRIPTIONS (First 5)')
      console.log('─'.repeat(70))
      withoutSubscription.slice(0, 5).forEach(user => {
        console.log(`\n  Email: ${user.email}`)
        console.log(`  Onboarding: ${user.onboardingCompleted ? 'Completed ✓' : 'Not completed'}`)
        console.log(`  Created: ${user.createdAt}`)
      })
    }

    // Check if percyricemusic@gmail.com is in the list
    console.log('\n' + '─'.repeat(70))
    console.log('PERCYRICEMUSIC@GMAIL.COM STATUS')
    console.log('─'.repeat(70))
    const percyUser = withoutSubscription.find(u => u.email === 'percyricemusic@gmail.com')
    if (percyUser) {
      console.log('  ❌ NO SUBSCRIPTION (confirmed)')
      console.log(`  Onboarding: ${percyUser.onboardingCompleted ? 'Completed ✓' : 'Not completed'}`)
      console.log(`  Created: ${percyUser.createdAt}`)
      console.log(`  This user is in the ${withoutSubPercent}% of users without subscriptions`)
    } else {
      const percyWithSub = withSubscription.find(u => u.email === 'percyricemusic@gmail.com')
      if (percyWithSub) {
        console.log('  ✅ HAS SUBSCRIPTION')
        console.log(`  Plan: ${percyWithSub.plan}`)
        console.log(`  Status: ${percyWithSub.status}`)
      } else {
        console.log('  ⚠️  User not found in database')
      }
    }

    // Analysis conclusion
    console.log('\n' + '='.repeat(70))
    console.log('ANALYSIS CONCLUSION')
    console.log('='.repeat(70))

    if (withoutSubscription.length === totalUsers) {
      console.log('\n🔍 FINDING: 100% of users have NO subscriptions')
      console.log('📌 INTERPRETATION: This is an INTENTIONAL FREEMIUM model')
      console.log('   - Subscription system exists but is not initialized')
      console.log('   - All users can access the app without payment')
      console.log('   - Feature gates are "soft" (advisory, not enforced)')
    } else if (withSubscription.length === totalUsers) {
      console.log('\n🔍 FINDING: 100% of users HAVE subscriptions')
      console.log('📌 INTERPRETATION: Subscription initialization is working')
      console.log('   - percyricemusic@gmail.com is an anomaly (bug)')
      console.log('   - This specific user\'s subscription failed to initialize')
    } else {
      console.log(`\n🔍 FINDING: ${withSubPercent}% have subscriptions, ${withoutSubPercent}% do not`)
      console.log('📌 INTERPRETATION: MIXED STATE - likely transition period')
      console.log('   - Some users were created before subscription system')
      console.log('   - Or subscription initialization is inconsistent')
      console.log('   - Recommend backfill migration for users without subscriptions')
    }

    console.log('\n' + '='.repeat(70) + '\n')

    process.exit(0)

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Set timeout
setTimeout(() => {
  console.error('\n❌ Script timed out after 30 seconds')
  process.exit(1)
}, 30000)

analyzeSubscriptions()
