import { test, expect } from '@playwright/test'

test('cooking mode: step progression + completion', async ({ page }) => {
  await page.goto('/recipes')
  await page.getByRole('link', { name: /start cooking/i }).first().click()
  await expect(page).toHaveURL(/\/cooking\//)
  await page.getByRole('button', { name: /start timer/i }).click()
  await page.getByRole('button', { name: /next step/i }).click()
  await page.getByRole('button', { name: /finish/i }).click()
  await expect(page.getByText(/meal logged/i)).toBeVisible()
})
