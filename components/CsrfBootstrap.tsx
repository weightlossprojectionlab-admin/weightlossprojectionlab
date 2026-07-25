/**
 * CsrfBootstrap — an inline <head> script that guarantees CSRF requests succeed.
 *
 * Why inline-at-parse-time and not a React component: the server (proxy.ts) rejects any
 * POST/PUT/PATCH/DELETE lacking BOTH a csrf_token cookie AND a matching X-CSRF-Token
 * header, and does NOT exempt Bearer auth. The app has ~75 raw `fetch('/api/...')` call
 * sites that never send the header, and the previous React-based initializer's client
 * code was not reliably executing — so nothing installed the header. This script runs
 * synchronously while the document is parsing, before any app code or fetch, with no
 * dependency on hydration.
 *
 * It does two things, together, so the two halves the server compares can never disagree:
 *   1. ensures a csrf_token cookie exists (generates one if missing),
 *   2. patches window.fetch to add X-CSRF-Token to SAME-ORIGIN /api/ mutating requests.
 *
 * SECURITY: the token is only ever attached to same-origin /api/ requests. Cross-origin
 * calls (Stripe, Google, OpenFoodFacts, …) are never touched, so the token can't leak to
 * a third party. An existing X-CSRF-Token is never overwritten. Cookie/format match
 * lib/csrf.ts so getCSRFToken() and the codemod'd call sites stay consistent.
 *
 * Allowed by CSP (script-src includes 'unsafe-inline'; see next.config.ts).
 */

const CSRF_BOOTSTRAP = `(function(){
  if (window.__csrfPatched) return;
  function read(){ var m = document.cookie.match(/(?:^|;\\s*)csrf_token=([^;]+)/); return m ? m[1] : ''; }
  function ensure(){
    var t = read();
    if (!t) {
      try {
        var a = new Uint8Array(32); (window.crypto||window.msCrypto).getRandomValues(a);
        t = btoa(String.fromCharCode.apply(null, a)).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=/g,'');
        document.cookie = 'csrf_token=' + t + '; path=/; SameSite=Lax' + (location.protocol==='https:' ? '; Secure' : '');
      } catch (e) { return ''; }
    }
    return t;
  }
  ensure();
  var UNSAFE = { POST:1, PUT:1, PATCH:1, DELETE:1 };
  var orig = window.fetch;
  if (typeof orig !== 'function') return;
  window.fetch = function(input, init){
    try {
      var isReq = typeof Request !== 'undefined' && input instanceof Request;
      var url = isReq ? input.url : String(input);
      var method = ((init && init.method) || (isReq ? input.method : 'GET') || 'GET').toUpperCase();
      if (UNSAFE[method]) {
        var u = new URL(url, location.origin);
        if (u.origin === location.origin && u.pathname.indexOf('/api/') === 0) {
          var token = ensure();
          if (token) {
            if (isReq) {
              var hr = new Headers((init && init.headers) ? init.headers : input.headers);
              if (!hr.has('x-csrf-token')) {
                hr.set('X-CSRF-Token', token);
                return orig(new Request(input, init ? Object.assign({}, init, { headers: hr }) : { headers: hr }));
              }
            } else {
              var h = new Headers(init && init.headers);
              if (!h.has('x-csrf-token')) { h.set('X-CSRF-Token', token); init = Object.assign({}, init, { headers: h }); }
            }
          }
        }
      }
    } catch (e) {}
    return orig(input, init);
  };
  window.__csrfPatched = true;
})();`

export function CsrfBootstrap() {
  return <script dangerouslySetInnerHTML={{ __html: CSRF_BOOTSTRAP }} />
}

export default CsrfBootstrap
