/**
 * SendGrid Configuration Test Script
 *
 * Usage: npx tsx scripts/test-sendgrid.ts
 *
 * This script helps diagnose SendGrid email issues in production
 */

import * as dotenv from 'dotenv'
import sgMail from '@sendgrid/mail'

// Load environment variables
dotenv.config({ path: '.env.local' })

console.log('=== SendGrid Configuration Test ===\n')

// Check environment variables
console.log('1. Checking environment variables...')
const apiKey = process.env.SENDGRID_API_KEY
const fromEmail = process.env.SENDGRID_FROM_EMAIL
const fromName = process.env.SENDGRID_FROM_NAME
const replyToEmail = process.env.SENDGRID_REPLY_TO_EMAIL

if (!apiKey) {
  console.error('❌ SENDGRID_API_KEY is not set')
  console.error('   Please add it to your .env.local file')
  process.exit(1)
}

if (apiKey.startsWith('SG.')) {
  console.log('✅ SENDGRID_API_KEY is set (starts with SG.)')
} else {
  console.error('⚠️  SENDGRID_API_KEY format looks incorrect (should start with SG.)')
}

if (!fromEmail) {
  console.error('❌ SENDGRID_FROM_EMAIL is not set')
  console.error('   Please add it to your .env.local file')
  process.exit(1)
}

if (fromEmail.includes('@gmail.com')) {
  console.error('❌ SENDGRID_FROM_EMAIL uses @gmail.com')
  console.error('   Gmail addresses cannot be used due to DMARC policies')
  console.error('   See docs/SENDGRID_SETUP.md for solutions')
  process.exit(1)
}

console.log(`✅ SENDGRID_FROM_EMAIL: ${fromEmail}`)
console.log(`✅ SENDGRID_FROM_NAME: ${fromName || 'WLPL Family Health'}`)
if (replyToEmail) {
  console.log(`✅ SENDGRID_REPLY_TO_EMAIL: ${replyToEmail}`)
}

// Initialize SendGrid
console.log('\n2. Initializing SendGrid client...')
try {
  sgMail.setApiKey(apiKey)
  console.log('✅ SendGrid client initialized')
} catch (error: any) {
  console.error('❌ Failed to initialize SendGrid:', error.message)
  process.exit(1)
}

// Test email sending (optional - prompts user first)
console.log('\n3. Ready to send test email')
console.log('   Would you like to send a test email? (y/n)')
console.log('   This will use your SendGrid quota')

// Read from stdin
const readline = require('readline')
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

rl.question('Send test email? (y/n): ', async (answer: string) => {
  if (answer.toLowerCase() !== 'y') {
    console.log('\nTest cancelled. Configuration looks good!')
    rl.close()
    process.exit(0)
  }

  rl.question('Enter recipient email address: ', async (recipientEmail: string) => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      console.error('Invalid email address')
      rl.close()
      process.exit(1)
    }

    console.log(`\n4. Sending test email to ${recipientEmail}...`)

    try {
      const msg = {
        to: recipientEmail,
        from: {
          email: fromEmail,
          name: fromName || 'WLPL Family Health'
        },
        subject: 'SendGrid Test Email - WLPL',
        html: `
          <h1>SendGrid Test Successful!</h1>
          <p>This is a test email from your WLPL application.</p>
          <p><strong>Configuration Details:</strong></p>
          <ul>
            <li>From Email: ${fromEmail}</li>
            <li>From Name: ${fromName || 'WLPL Family Health'}</li>
            <li>Sent at: ${new Date().toISOString()}</li>
          </ul>
          <p>If you received this email, your SendGrid configuration is working correctly!</p>
        `,
        text: `SendGrid Test Successful! This is a test email from your WLPL application. From: ${fromEmail}. Sent at: ${new Date().toISOString()}`
      }

      if (replyToEmail) {
        msg.replyTo = replyToEmail as any
      }

      await sgMail.send(msg)

      console.log('✅ Test email sent successfully!')
      console.log(`   Check ${recipientEmail} for the test email`)
      console.log('   Note: It may take a few seconds to arrive')
    } catch (error: any) {
      console.error('❌ Failed to send test email:', error.message)

      if (error.response?.body?.errors) {
        console.error('\nSendGrid API Errors:')
        console.error(JSON.stringify(error.response.body.errors, null, 2))

        const errorStr = JSON.stringify(error.response.body.errors)
        if (errorStr.includes('DMARC') || errorStr.includes('authentication')) {
          console.error('\n🚨 DMARC/Authentication Issue Detected!')
          console.error('   This usually means:')
          console.error('   1. The FROM_EMAIL is not verified in SendGrid')
          console.error('   2. Domain authentication is not set up')
          console.error('   3. You need to verify the sender in SendGrid dashboard')
          console.error('\n   See docs/SENDGRID_SETUP.md for step-by-step instructions')
        }
      }
    }

    rl.close()
  })
})
