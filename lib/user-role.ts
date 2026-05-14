/**
 * User role helpers — single source of truth for "is this user a caregiver-only user?"
 *
 * Semantic intent:
 *   - A CAREGIVER is doing tasks on someone else's household. No subscription. No plan caps.
 *   - An OWNER runs their own household. Has a subscription. Has plan caps.
 *   - The same person can be BOTH (owner who also caregives for someone else).
 *
 * "Caregiver-only" means: this user does NOT run their own household. They are here
 * because they accepted an invite. They should never see subscription UI on /patients,
 * upgrade CTAs, or family-admin banners.
 *
 * Strong signal: preferences.userMode === 'caregiver' (set at signup when user came in
 * through an invite link). Backward-compat weak signal: no onboarding + caregiverOf
 * relationships (used for users created before the strong signal existed).
 *
 * Define this predicate ONCE here, read it from every consumer (auth router, /patients,
 * subscription-UI gates). Re-computing inline invites drift.
 */

import { db } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { DEFAULT_PREFERENCES } from './default-profile'

interface UserDocLike {
  preferences?: { userMode?: string } | null
  profile?: { onboardingCompleted?: boolean } | null
  caregiverOf?: unknown[] | null
}

export function isCaregiverOnly(user: UserDocLike | null | undefined): boolean {
  if (!user) return false
  // Must have at least one caregiver relationship for this predicate to mean anything.
  // A user with userMode='caregiver' but empty caregiverOf is mid-signup (they wrote
  // their user doc but haven't accepted the invite yet) — don't try to route them as
  // a caregiver until the invite is accepted, or the router blows up on caregiverOf[0].
  if ((user.caregiverOf?.length ?? 0) === 0) return false
  // Strong signal — userMode was set explicitly at invite-flow signup.
  if (user.preferences?.userMode === 'caregiver') return true
  // Weak/legacy signal — caregivers from before userMode was wired at signup.
  if (!user.profile?.onboardingCompleted) return true
  return false
}

/**
 * Create the Firestore user doc for someone who signed up via a caregiver invite.
 *
 * Differs from the owner signup path in three ways:
 *   1. preferences.userMode = 'caregiver'  (strong-signal flag for isCaregiverOnly)
 *   2. isAccountOwner = false              (they are not running their own household)
 *   3. No subscription written             (caregivers do not have plans)
 *
 * onboardingCompleted is left UNSET so the legacy router branch still routes them
 * to the caregiver dashboard if userMode is somehow missed. Strong + weak signal
 * both fire — safer than relying on one.
 */
export async function createCaregiverOnlyUserDoc(
  uid: string,
  email: string,
  name: string,
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      email,
      name,
      preferences: {
        ...DEFAULT_PREFERENCES,
        userMode: 'caregiver',
      },
      isAccountOwner: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}
