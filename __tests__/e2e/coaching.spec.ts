// Coaching Dashboard E2E Tests
// PRD Reference: coaching_readiness_system (PRD v1.3.7)

import { test, expect } from '@playwright/test';

test.describe('Coaching Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Set up test user with auth
    // await loginAsTestUser(page);
  });

  test('should display not eligible message for new users', async ({ page }) => {
    await page.goto('/coaching');

    // Should see unlock message
    await expect(page.getByText('Coaching Unlocking Soon')).toBeVisible();

    // Should show progress indicators
    await expect(page.getByText('Current Streak:')).toBeVisible();
    await expect(page.getByText('Weight Logs:')).toBeVisible();
  });

  test('should display AI coach plan when eligible', async ({ page }) => {
    // TODO: Set up test user with eligible status and active AI coach plan
    await page.goto('/coaching');

    // Should see plan header
    await expect(page.getByText('Your AI Coach Plan')).toBeVisible();

    // Should see progress metrics
    await expect(page.getByText('Action Rate')).toBeVisible();
    await expect(page.getByText('Engagement')).toBeVisible();
    await expect(page.getByText('Days Remaining')).toBeVisible();

    // Should see daily actions
    await expect(page.getByText('Your Daily Actions')).toBeVisible();
  });

  test('should mark action as completed', async ({ page }) => {
    // TODO: Set up test user with active plan
    await page.goto('/coaching');

    // Click on first incomplete action
    const firstAction = page.locator('[data-testid="action-card"]').first();
    await firstAction.click();

    // Should see completion checkmark
    await expect(firstAction.locator('.text-green-600')).toBeVisible();
  });

  test('should display upcoming nudges', async ({ page }) => {
    // TODO: Set up test user with pending nudges
    await page.goto('/coaching');

    // Should see nudges section
    await expect(page.getByText('Upcoming Reminders')).toBeVisible();
  });
});

// TODO: Add more E2E tests for edge cases
// TODO: Add tests for loading states
// TODO: Add tests for error handling
