import { test, expect } from '@playwright/test'

/**
 * Public blog smoke tests for the caregiver content clusters (E-E-A-T system).
 * These pages require no auth, so they run under the `chromium-public` project.
 * Covers: post render, Person-author byline, series interlinking, feature CTAs,
 * FAQ accordion, and the YMYL safety callout on the vitals Q&A.
 */

test.describe('Caregiver blog clusters', () => {
  test('Post 1 renders with byline, series nav, and a feature CTA', async ({ page }) => {
    await page.goto('/blog/caregiver-mental-clutter')

    // Headline
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Mental Clutter')

    // E-E-A-T byline (Person author)
    await expect(page.getByText('Percy Rice').first()).toBeVisible()
    await expect(page.getByText('Founder & Family Caregiver').first()).toBeVisible()

    // Series cluster marker
    await expect(page.getByText(/Part 1 of 3/i)).toBeVisible()

    // CTA points at the real feature route, not /pricing
    const cta = page.getByRole('link', { name: 'Open Your Command Center' })
    await expect(cta).toBeVisible()
    await expect(cta).toHaveAttribute('href', '/dashboard')
  })

  test('series interlinking navigates to the next post', async ({ page }) => {
    await page.goto('/blog/caregiver-mental-clutter')

    // The bottom series nav lists siblings + a "next" link
    const nextLink = page.getByRole('link', { name: /Beyond the Kitchen/i }).first()
    await expect(nextLink).toBeVisible()
    await nextLink.click()

    // Generous timeout: the target route may cold-compile via Turbopack on first hit.
    await expect(page).toHaveURL(/\/blog\/caregiver-supply-tracking$/, { timeout: 60_000 })
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Beyond the Kitchen')
    // On post 2, the series marker advances
    await expect(page.getByText(/Part 2 of 3/i)).toBeVisible()
  })

  test('FAQ accordion expands an answer', async ({ page }) => {
    await page.goto('/blog/organize-medical-documents')
    const question = page.getByText('What medical documents should I keep for an aging parent?')
    await expect(question).toBeVisible()
    // <details> answer is hidden until the summary is clicked
    const answer = page.getByText(/Keep insurance and Medicare cards/i)
    await expect(answer).toBeHidden()
    await question.click()
    await expect(answer).toBeVisible()
  })

  test('YMYL vitals post shows the emergency safety callout + disclaimer', async ({ page }) => {
    await page.goto('/blog/sudden-blood-pressure-change')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Blood Pressure')
    await expect(page.getByText(/Call 911/i).first()).toBeVisible()
    await expect(page.getByText(/not a substitute for professional medical advice/i)).toBeVisible()

    // Feature CTA
    const cta = page.getByRole('link', { name: 'Track Blood Pressure' })
    await expect(cta).toHaveAttribute('href', '/patients')
  })

  test('blog index lists the Guides category with the new posts', async ({ page }) => {
    await page.goto('/blog')
    // The Guides filter chip exists
    await expect(page.getByText('Guides').first()).toBeVisible()
    // A cluster post card is present
    await expect(page.getByText('Beat Caregiver Mental Clutter')).toBeVisible()
  })
})
