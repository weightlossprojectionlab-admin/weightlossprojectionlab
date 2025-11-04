import { test, expect } from '@playwright/test'

test('meal logging: template one-tap', async ({ page }) => {
  await page.goto('/templates')
  await page.getByRole('button', { name: /use template/i }).first().click()
  await expect(page.getByText(/meal logged successfully/i)).toBeVisible()
})

test('meal logging: photo flow (mocked)', async ({ page }) => {
  await page.goto('/log')
  // You can stub the upload/input for CI; assert success toast appears
  await page.setInputFiles('input[type=file]', 'tests/fixtures/meal.jpg')
  await page.getByRole('button', { name: /analyze/i }).click()
  await expect(page.getByText(/meal logged successfully/i)).toBeVisible()
})
