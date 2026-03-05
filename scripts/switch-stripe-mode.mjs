#!/usr/bin/env node
/**
 * Stripe Mode Switcher
 * Switches between test and live Stripe keys in .env.local
 *
 * Usage: npm run stripe:test  OR  npm run stripe:live
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ENV_PATH = path.join(__dirname, '..', '.env.local')

const mode = process.argv[2]

if (!mode || !['test', 'live'].includes(mode)) {
  console.log('Usage: node switch-stripe-mode.mjs [test|live]')
  console.log('\nCurrent mode:')
  checkCurrentMode()
  process.exit(1)
}

function checkCurrentMode() {
  try {
    const content = fs.readFileSync(ENV_PATH, 'utf8')
    const isLive = content.includes('STRIPE_SECRET_KEY=sk_live')
    console.log(isLive ? '  [LIVE MODE] ⚠️  Real charges will occur!' : '  [TEST MODE] ✓ Safe for development')
  } catch (err) {
    console.error('Error reading .env.local:', err.message)
  }
}

function switchToTestMode() {
  console.log('\n🔧 Switching to TEST mode...\n')

  try {
    let content = fs.readFileSync(ENV_PATH, 'utf8')

    // Check if test keys exist
    const hasTestKeys = content.includes('sk_test_') || content.includes('pk_test_')

    if (!hasTestKeys) {
      console.log('❌ ERROR: No test keys found in .env.local\n')
      console.log('Please add your Stripe test keys:')
      console.log('1. Go to: https://dashboard.stripe.com/test/apikeys')
      console.log('2. Copy your test keys')
      console.log('3. Add them to .env.local:\n')
      console.log('# TEST MODE KEYS (uncomment to use)')
      console.log('#STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY')
      console.log('#NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY')
      console.log('#STRIPE_WEBHOOK_SECRET=whsec_YOUR_TEST_WEBHOOK_SECRET\n')
      process.exit(1)
    }

    // Comment out live keys and uncomment test keys
    content = content
      .replace(/^STRIPE_SECRET_KEY=sk_live/gm, '#STRIPE_SECRET_KEY=sk_live')
      .replace(/^NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live/gm, '#NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live')
      .replace(/^#STRIPE_SECRET_KEY=sk_test/gm, 'STRIPE_SECRET_KEY=sk_test')
      .replace(/^#NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test/gm, 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test')

    // Update price IDs to test prices if they exist
    if (content.includes('NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_MONTHLY_TEST')) {
      content = content
        .replace(/^NEXT_PUBLIC_STRIPE_PRICE_ID_(\w+)=price_/gm, '#NEXT_PUBLIC_STRIPE_PRICE_ID_$1=price_')
        .replace(/^#NEXT_PUBLIC_STRIPE_PRICE_ID_(\w+)_TEST=/gm, 'NEXT_PUBLIC_STRIPE_PRICE_ID_$1=')
    }

    fs.writeFileSync(ENV_PATH, content, 'utf8')
    console.log('✅ Switched to TEST mode')
    console.log('⚠️  You must restart your dev server for changes to take effect\n')
  } catch (err) {
    console.error('❌ Error switching modes:', err.message)
    process.exit(1)
  }
}

function switchToLiveMode() {
  console.log('\n⚠️  SWITCHING TO LIVE MODE\n')
  console.log('╔═══════════════════════════════════════╗')
  console.log('║  WARNING: REAL CHARGES WILL OCCUR!   ║')
  console.log('╚═══════════════════════════════════════╝\n')

  // Require confirmation for live mode
  if (!process.argv.includes('--confirm')) {
    console.log('To confirm, run:')
    console.log('  node scripts/switch-stripe-mode.mjs live --confirm\n')
    process.exit(1)
  }

  try {
    let content = fs.readFileSync(ENV_PATH, 'utf8')

    // Comment out test keys and uncomment live keys
    content = content
      .replace(/^STRIPE_SECRET_KEY=sk_test/gm, '#STRIPE_SECRET_KEY=sk_test')
      .replace(/^NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test/gm, '#NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test')
      .replace(/^#STRIPE_SECRET_KEY=sk_live/gm, 'STRIPE_SECRET_KEY=sk_live')
      .replace(/^#NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live/gm, 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live')

    // Update price IDs to live prices
    content = content
      .replace(/^NEXT_PUBLIC_STRIPE_PRICE_ID_(\w+)=price_/gm, 'NEXT_PUBLIC_STRIPE_PRICE_ID_$1_TEST=price_')
      .replace(/^#NEXT_PUBLIC_STRIPE_PRICE_ID_(\w+)_LIVE=/gm, 'NEXT_PUBLIC_STRIPE_PRICE_ID_$1=')

    fs.writeFileSync(ENV_PATH, content, 'utf8')
    console.log('✅ Switched to LIVE mode')
    console.log('⚠️  You must restart your dev server for changes to take effect\n')
  } catch (err) {
    console.error('❌ Error switching modes:', err.message)
    process.exit(1)
  }
}

// Execute switch
if (mode === 'test') {
  switchToTestMode()
} else if (mode === 'live') {
  switchToLiveMode()
}
