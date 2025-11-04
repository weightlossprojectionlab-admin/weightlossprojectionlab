import { test, expect } from '@playwright/test'

test('shopping flow: happy path', async ({ page }) => {
  await page.goto('/shopping')
  await page.getByRole('button', { name: /scan/i }).click()
  // Assume mock scanner or bypass to review step in CI env
  await page.getByRole('button', { name: /confirm nutrition/i }).click()
  await page.getByRole('button', { name: /confirm category/i }).click()
  await page.getByRole('button', { name: /confirm quantity/i }).click()
  await page.getByRole('button', { name: /confirm expiration/i }).click()
  await expect(page.getByText(/added to inventory/i)).toBeVisible()
})
