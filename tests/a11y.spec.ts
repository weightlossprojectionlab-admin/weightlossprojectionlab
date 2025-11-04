import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const pages = ['/dashboard', '/shopping', '/recipes', '/log']

for (const path of pages) {
  test(`a11y: ${path} has no critical violations`, async ({ page }) => {
    await page.goto(path)
    const results = await new AxeBuilder({ page }).analyze()
    const critical = results.violations.filter(v => v.impact === 'critical')
    expect(critical, JSON.stringify(critical, null, 2)).toHaveLength(0)
  })
}
