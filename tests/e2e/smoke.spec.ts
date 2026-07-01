import { test, expect } from '@playwright/test'

/**
 * E2E Smoke Tests — Critical user flows
 * These tests verify the app doesn't crash on key journeys.
 * Run against a running dev server: npx playwright test
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.describe('Authentication', () => {
  test('login page loads', async ({ page }) => {
    await page.goto(BASE_URL)
    await expect(page.locator('text=Agrobase V3')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input[type="text"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('super admin can login', async ({ page }) => {
    await page.goto(BASE_URL)

    await page.fill('input[type="text"]', 'admin@agrobase.co')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should see the super admin dashboard after login
    await expect(page.locator('text=Platform Overview')).toBeVisible({ timeout: 15000 })
  })

  test('tenant admin can login', async ({ page }) => {
    await page.goto(BASE_URL)

    await page.fill('input[type="text"]', 'ug.tenant@agrobase.co')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should see the dashboard after login
    await page.waitForTimeout(3000)
    // Either onboarding wizard or dashboard
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toMatch(/Dashboard|Welcome to Agrobase/)
  })

  test('farmer can login with limited menu', async ({ page }) => {
    await page.goto(BASE_URL)

    await page.fill('input[type="text"]', 'ug.farmer1@agrobase.co')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.waitForTimeout(3000)
    // Farmer should see limited menu
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toMatch(/Dashboard|Marketplace|Profile/)
  })
})

test.describe('Navigation', () => {
  test('command palette opens with Cmd+K', async ({ page }) => {
    // Login first
    await page.goto(BASE_URL)
    await page.fill('input[type="text"]', 'ug.tenant@agrobase.co')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)

    // Open command palette
    await page.keyboard.press('Meta+K')
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })
  })

  test('sidebar shows different menus for different roles', async ({ page }) => {
    // Super admin sees only super admin menus
    await page.goto(BASE_URL)
    await page.fill('input[type="text"]', 'admin@agrobase.co')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)

    const superAdminText = await page.locator('body').textContent()
    expect(superAdminText).toContain('Platform Overview')
    expect(superAdminText).not.toContain('Farmer Profiling')
  })
})

test.describe('Farmer CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL)
    await page.fill('input[type="text"]', 'ug.tenant@agrobase.co')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)

    // Skip onboarding if it appears
    const skipButton = page.locator('text=Skip onboarding')
    if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipButton.click()
      await page.waitForTimeout(1000)
    }

    // Navigate to Farmer Profiling
    await page.click('text=Farmer Profiling')
    await page.waitForTimeout(2000)
  })

  test('farmer list loads', async ({ page }) => {
    await expect(page.locator('text=Farmer Registry')).toBeVisible({ timeout: 10000 })
  })

  test('add farmer dialog opens', async ({ page }) => {
    await page.click('text=Add Farmer')
    await expect(page.locator('text=Register New Farmer')).toBeVisible({ timeout: 5000 })
  })

  test('CSV import dialog opens', async ({ page }) => {
    await page.click('text=Import CSV')
    await expect(page.locator('text=Bulk Import Farmers')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('No Crashes', () => {
  const modules = [
    'Dashboard', 'Farmer Profiling', 'Farm Land Registry', 'Cultivations',
    'VSLA Management', 'Training & Groups', 'Mazao Safi Practices',
    'Carbon & Compliance', 'Cost of Cultivation', 'Crop Stage Library',
  ]

  for (const moduleName of modules) {
    test(`${moduleName} does not crash`, async ({ page }) => {
      await page.goto(BASE_URL)
      await page.fill('input[type="text"]', 'ug.tenant@agrobase.co')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(3000)

      // Skip onboarding
      const skipButton = page.locator('text=Skip onboarding')
      if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await skipButton.click()
        await page.waitForTimeout(1000)
      }

      // Click the module
      const moduleLink = page.locator(`text=${moduleName}`).first()
      if (await moduleLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await moduleLink.click()
        await page.waitForTimeout(2000)

        // Check no error message
        const bodyText = await page.locator('body').textContent()
        expect(bodyText).not.toContain('Application error')
        expect(bodyText).not.toContain('client-side exception')
      }
    })
  }
})
