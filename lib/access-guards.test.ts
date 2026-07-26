/**
 * Unit tests for isSubscriptionExemptWrite — the predicate that keeps
 * account-relationship writes (accepting/declining a family invitation) out of
 * the client-side subscription write-gate. See lib/access-guards.ts.
 */
import { isSubscriptionExemptWrite } from './access-guards'

describe('isSubscriptionExemptWrite', () => {
  it('exempts invitation accept/decline (relationship joins, no server sub-check)', () => {
    expect(isSubscriptionExemptWrite('/invitations/abc123/accept')).toBe(true)
    expect(isSubscriptionExemptWrite('/invitations/abc123/decline')).toBe(true)
  })

  it('matches full request URLs and query strings too', () => {
    expect(isSubscriptionExemptWrite('https://x.test/api/invitations/XYZ/accept')).toBe(true)
    expect(isSubscriptionExemptWrite('/invitations/XYZ/accept?foo=1')).toBe(true)
  })

  it('does NOT exempt real subscription-gated data writes', () => {
    expect(isSubscriptionExemptWrite('/patients/p1/vitals')).toBe(false)
    expect(isSubscriptionExemptWrite('/meal-logs')).toBe(false)
    expect(isSubscriptionExemptWrite('/weight-logs')).toBe(false)
    // Related-but-not-exempt invitation routes stay gated.
    expect(isSubscriptionExemptWrite('/invitations')).toBe(false)
    expect(isSubscriptionExemptWrite('/invitations/abc123/revoke')).toBe(false)
    expect(isSubscriptionExemptWrite('/invitations/abc123')).toBe(false)
  })
})
