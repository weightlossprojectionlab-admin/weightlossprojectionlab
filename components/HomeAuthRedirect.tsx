/**
 * HomeAuthRedirect — an inline <head> script that forwards already-logged-in visitors
 * off the static marketing homepage and into the app, before the page paints.
 *
 * Why this exists: `/` is a force-static marketing page and ConditionalProviders
 * deliberately loads NO Firebase/AuthProvider there (performance/SEO). So the homepage
 * can't tell a returning, still-signed-in user apart from an anonymous visitor, and every
 * launch dumps them on marketing until they click through to /auth. This script runs
 * synchronously at parse time and, ON `/` ONLY, redirects when our auth flag is present.
 *
 * The flag (`wpl_logged_in`) is our own — written/cleared by contexts/AuthContext's
 * onAuthStateChange listener — NOT Firebase's internal `firebase:authUser:*` keys. That
 * decouples us from SDK internals and self-heals on sign-out / token expiry.
 *
 * We forward to /auth (not a hardcoded /dashboard) so its determineUserDestination handles
 * every case (onboarding, caregiver-only, expired subscription). /auth shows a spinner while
 * deciding, never a login form, for an authenticated user.
 *
 * Anonymous visitors and crawlers have no flag → no redirect → they get the full static
 * marketing HTML (SEO preserved). Gated to pathname === '/', so no other route is touched;
 * no redirect loop (/auth never routes back to /); try/catch falls through to marketing.
 * Allowed by CSP (script-src 'unsafe-inline'; see next.config.ts).
 */

const HOME_AUTH_REDIRECT = `(function(){
  try {
    if (location.pathname !== '/') return;
    if (localStorage.getItem('wpl_logged_in') === '1') location.replace('/auth');
  } catch (e) {}
})();`

export function HomeAuthRedirect() {
  return <script dangerouslySetInnerHTML={{ __html: HOME_AUTH_REDIRECT }} />
}

export default HomeAuthRedirect
