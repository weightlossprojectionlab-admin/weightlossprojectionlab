import { getUIConfig, isRouteVisible } from './user-mode-config'

const cfg = (mode: 'single' | 'household' | 'caregiver') => getUIConfig(mode, [])

// The legacy weight-loss surfaces belong to the self-logger (userMode 'single')
// only. Household + caregiver are care users and must not see them.
const LEGACY = [
  '/progress', '/log-weight', '/log-steps', '/weight-history',
  '/coaching', '/missions', '/gallery', '/meal-gallery',
]

describe('legacy weight-loss routes gate on the self-logger (single)', () => {
  it('single (self-logger) still sees its weight-loss surfaces', () => {
    const c = cfg('single')
    expect(isRouteVisible(c, '/progress')).toBe(true)
    expect(isRouteVisible(c, '/log-weight')).toBe(true)
    expect(isRouteVisible(c, '/weight-history')).toBe(true)
    expect(isRouteVisible(c, '/missions')).toBe(true)
  })

  it('household hides every legacy weight-loss route', () => {
    const c = cfg('household')
    for (const r of LEGACY) expect([r, isRouteVisible(c, r)]).toEqual([r, false])
  })

  it('caregiver hides every legacy weight-loss route', () => {
    const c = cfg('caregiver')
    for (const r of LEGACY) expect([r, isRouteVisible(c, r)]).toEqual([r, false])
  })

  it('household keeps the dual-use / care surfaces (do NOT delete these)', () => {
    const c = cfg('household')
    for (const r of ['/log-meal', '/shopping', '/inventory', '/recipes', '/patients', '/medical'])
      expect([r, isRouteVisible(c, r)]).toEqual([r, true])
  })
})
