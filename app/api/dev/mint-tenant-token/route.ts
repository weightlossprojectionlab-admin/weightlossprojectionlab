/**
 * GET /api/dev/mint-tenant-token?tenant={slug}
 *
 * Dev-only helper. Mints a Firebase Auth custom token for the franchise
 * owner of the given tenant, with `tenantId` and `tenantRole` claims baked
 * in. The client uses this to sign in locally without needing the magic
 * link / activation email flow, which is bound to production URLs.
 *
 * HARD-GATED on NODE_ENV === 'development'. Vercel sets NODE_ENV=production
 * automatically, so this route returns 404 in any deployed environment.
 *
 * Why this exists: see app/dev/sign-in/page.tsx. Local devs need a way to
 * see the franchise owner dashboard without round-tripping a magic link
 * through Firebase Authorized Domains and the production tenant subdomain.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  try {
    const slug = req.nextUrl.searchParams.get('tenant')
    if (!slug) {
      return NextResponse.json(
        { error: 'tenant slug is required (?tenant=<slug>)' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const snap = await db.collection('tenants').where('slug', '==', slug).limit(1).get()
    if (snap.empty) {
      return NextResponse.json({ error: `tenant '${slug}' not found` }, { status: 404 })
    }

    const tenantDoc = snap.docs[0]
    const tenantId = tenantDoc.id
    const tenantData = tenantDoc.data() as any
    const ownerEmail: string | undefined = tenantData?.contact?.adminEmail
    if (!ownerEmail) {
      return NextResponse.json(
        { error: `tenant '${slug}' has no contact.adminEmail` },
        { status: 400 }
      )
    }

    const auth = getAdminAuth()

    // Get-or-create the owner user. Mirrors handleFranchiseSetupPaid in the
    // Stripe webhook so dev sign-in works even for tenants that were created
    // manually via Firestore without going through the webhook.
    let userRecord
    try {
      userRecord = await auth.getUserByEmail(ownerEmail)
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({
          email: ownerEmail,
          emailVerified: true,
          displayName: tenantData?.contact?.adminName || tenantData?.name || ownerEmail,
        })
        logger.info('[dev mint-tenant-token] created auth user for tenant owner', {
          uid: userRecord.uid,
          email: ownerEmail,
          tenantId,
        })
      } else {
        throw err
      }
    }

    // Set persistent custom claims on the user (so future sessions also work).
    await auth.setCustomUserClaims(userRecord.uid, {
      tenantId,
      tenantRole: 'franchise_admin',
    })

    // Ensure a Firestore user doc exists with onboardingCompleted: true.
    // Without this, the consumer auth router (lib/auth-router.ts) sees a
    // user with no profile and redirects to /onboarding, which 404s on
    // the tenant subdomain.
    const userDocRef = db.collection('users').doc(userRecord.uid)
    const userDocSnap = await userDocRef.get()
    if (!userDocSnap.exists) {
      await userDocRef.set({
        email: ownerEmail,
        name: tenantData?.contact?.adminName || tenantData?.name || ownerEmail,
        preferences: { units: 'imperial', notifications: true, biometricEnabled: false, themePreference: 'system' },
        profile: { onboardingCompleted: true },
        tenantId,
        tenantRole: 'franchise_admin',
        createdAt: new Date(),
        lastActiveAt: new Date(),
      })
    } else {
      // If doc exists but onboarding isn't marked complete, fix it
      const existingData = userDocSnap.data() as any
      if (!existingData?.profile?.onboardingCompleted) {
        await userDocRef.update({ 'profile.onboardingCompleted': true })
      }
    }

    // Mint a custom token. Claims passed here become part of the auth.token
    // immediately on signInWithCustomToken — no token refresh needed.
    const customToken = await auth.createCustomToken(userRecord.uid, {
      tenantId,
      tenantRole: 'franchise_admin',
    })

    return NextResponse.json({
      token: customToken,
      uid: userRecord.uid,
      tenantId,
      tenantSlug: slug,
      ownerEmail,
    })
  } catch (err) {
    logger.error('[dev mint-tenant-token] failed', err as Error)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
