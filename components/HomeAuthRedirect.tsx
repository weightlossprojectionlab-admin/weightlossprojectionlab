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
 * Detection uses two signals, both in localStorage (no Firebase loaded on `/`):
 *   1. `wpl_logged_in` — our own flag, written/cleared by contexts/AuthContext's
 *      onAuthStateChange listener. Robust to Firebase SDK changes and self-heals on
 *      sign-out / token expiry. BUT it's only written on pages that mount AuthProvider —
 *      never on `/` itself — so it can miss a pre-existing session that hasn't passed
 *      through an authed page since the flag shipped.
 *   2. `firebase:authUser:*` — Firebase's own persisted-session key (browserLocalPersistence
 *      writes it to localStorage). Present immediately for ANY logged-in user, so it covers
 *      the bootstrapping gap above. Used only as a fallback; Firebase also removes it on
 *      sign-out / invalid refresh token, so it self-heals too.
 * Redirect if EITHER is present.
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
    if (localStorage.getItem('wpl_logged_in') === '1') { location.replace('/auth'); return; }
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('firebase:authUser:') === 0 && localStorage.getItem(k)) { location.replace('/auth'); return; }
    }
  } catch (e) {}
})();`

export function HomeAuthRedirect() {
  return <script dangerouslySetInnerHTML={{ __html: HOME_AUTH_REDIRECT }} />
}

export default HomeAuthRedirect
