import { test, expect } from '@playwright/test'

test('onboarding: complete 6 steps then redirect to dashboard', async ({ page }) => {
  await page.goto('/onboarding')
  // Step 1: name
  await page.getByLabel(/name/i).fill('Alex')
  await page.getByRole('button', { name: /next/i }).click()
  // Step 2: basic info
  await page.getByLabel(/birthdate/i).fill('1990-01-01')
  await page.getByLabel(/height/i).fill('175')
  await page.getByRole('button', { name: /next/i }).click()
  // Step 3: weight
  await page.getByLabel(/current weight/i).fill('180')
  await page.getByRole('button', { name: /next/i }).click()
  // Step 4: activity
  await page.getByLabel(/activity level/i).selectOption('moderately-active')
  await page.getByRole('button', { name: /next/i }).click()
  // Step 5: goals
  await page.getByLabel(/goal weight/i).fill('165')
  await page.getByRole('button', { name: /next/i }).click()
  // Step 6: preferences
  await page.getByRole('button', { name: /complete setup/i }).click()
  await expect(page).toHaveURL(/\/dashboard/)
})
