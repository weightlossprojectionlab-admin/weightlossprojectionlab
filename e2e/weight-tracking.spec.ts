import { test, expect } from '@playwright/test'

test('weight tracking: add log and see projection update', async ({ page }) => {
  await page.goto('/progress')
  await page.getByRole('button', { name: /add weight/i }).click()
  await page.getByLabel(/weight/i).fill('178')
  await page.getByRole('button', { name: /save/i }).click()
  await expect(page.getByText(/updated/i)).toBeVisible()
  await expect(page.getByTestId('projection-chart')).toBeVisible()
})
