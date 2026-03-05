/**
 * Login redirect page - redirects to /auth
 * This maintains compatibility with older links
 */

import { redirect } from 'next/navigation'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string }
}) {
  // Redirect to /auth with the same redirect parameter if present
  const redirectParam = searchParams.redirect ? `?redirect=${encodeURIComponent(searchParams.redirect)}` : ''
  redirect(`/auth${redirectParam}`)
}
