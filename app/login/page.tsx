/**
 * Login redirect page - redirects to /auth
 * This maintains compatibility with older links
 */

import { redirect } from 'next/navigation'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const params = await searchParams
  const redirectParam = params.redirect ? `?redirect=${encodeURIComponent(params.redirect)}` : ''
  redirect(`/auth${redirectParam}`)
}
