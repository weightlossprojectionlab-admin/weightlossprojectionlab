import { auth } from '@/lib/firebase'

/**
 * Returns the current user's Firebase ID token for admin API calls.
 * Throws if there is no authenticated user.
 */
export async function getAdminAuthToken(): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new Error('User not authenticated')
  return user.getIdToken()
}
