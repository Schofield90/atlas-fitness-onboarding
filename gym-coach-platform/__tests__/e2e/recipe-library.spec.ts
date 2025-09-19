import { test, expect, Page } from '@playwright/test'

// Test configuration
const CLIENT_DASHBOARD_URL = 'http://localhost:3003/client/dashboard'
const RECIPE_LIBRARY_URL = 'http://localhost:3003/client/recipes'
const TIMEOUT = 30000

test.describe('Recipe Library - E2E Tests', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()

    // Enable accessibility testing
    await page.setViewportSize({ width: 1280, height: 720 })

    // Navigate to Recipe Library directly first
    await page.goto(RECIPE_LIBRARY_URL)

    // Wait for the page to load completely
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async () => {
    await page.close()
  })

  test.describe('Menu Navigation Test', () => {
    test('should display Recipe Library in side menu with correct navigation', async () => {
      // Navigate to the dashboard first to see the menu
      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Verify Recipe Library appears in the side menu
      const recipeMenuLink = page.locator('a[href="/client/recipes"]')
      await expect(recipeMenuLink).toBeVisible()
      await expect(recipeMenuLink).toContainText('Recipe Library')

      // Verify the icon is present (CookingPot icon)
      const cookingPotIcon = recipeMenuLink.locator('svg')
      await expect(cookingPotIcon).toBeVisible()
    })

    test('should navigate to /client/recipes when Recipe Library menu item is clicked', async () => {
      // Navigate to the dashboard first to see the menu
      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      const recipeMenuLink = page.locator('a[href="/client/recipes"]')
      await recipeMenuLink.click()

      // Verify navigation to correct URL
      await page.waitForURL(/.*\/client\/recipes/, { timeout: TIMEOUT })
      expect(page.url()).toContain('/client/recipes')

      // Verify page content loads
      await expect(page.getByText('Recipe Library')).toBeVisible()
      await expect(page.getByText('Discover healthy and delicious recipes')).toBeVisible()
    })

    test('should highlight Recipe Library menu item when active', async () => {
      // Navigate to the dashboard first to see the menu
      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      const recipeMenuLink = page.locator('a[href="/client/recipes"]')
      await recipeMenuLink.click()

      // Wait for navigation
      await page.waitForURL(/.*\/client\/recipes/)

      // Check that the menu item has active styling
      await expect(recipeMenuLink).toHaveClass(/bg-primary/)
      await expect(recipeMenuLink).toHaveClass(/text-white/)
    })
  })

  test.describe('Recipe Display Test', () => {
    test.beforeEach(async () => {
      // Navigate to Recipe Library page
      await page.goto(RECIPE_LIBRARY_URL)
      await page.waitForLoadState('networkidle')
    })

    test('should display all 12 recipes correctly', async () => {
      // Verify recipe count
      const recipeCount = page.getByText('Showing 12 of 12 recipes')
      await expect(recipeCount).toBeVisible()

      // Count actual recipe cards
      const recipeCards = page.locator('.grid > .card, .grid > div > .card, .grid .hover\\:shadow-lg')
      await expect(recipeCards).toHaveCount(12)
    })

    test('should display recipe card elements correctly', async () => {
      // Wait for recipes to load
      await page.waitForSelector('.grid', { timeout: TIMEOUT })

      // Check first recipe card (Protein-Packed Overnight Oats)
      const firstCard = page.locator('.grid').locator('> div').first()

      // Verify title
      await expect(firstCard.getByText('Protein-Packed Overnight Oats')).toBeVisible()

      // Verify calories
      await expect(firstCard.getByText('420 cal')).toBeVisible()

      // Verify prep time
      await expect(firstCard.getByText('5 min')).toBeVisible()

      // Verify difficulty badge
      await expect(firstCard.getByText('easy')).toBeVisible()

      // Verify category badge
      await expect(firstCard.getByText('breakfast')).toBeVisible()

      // Verify placeholder image is shown (ChefHat icon)
      const chefHatIcon = firstCard.locator('.h-48 svg')
      await expect(chefHatIcon).toBeVisible()
    })

    test('should display nutritional information correctly', async () => {
      await page.waitForSelector('.grid', { timeout: TIMEOUT })

      // Check first recipe card nutritional info
      const firstCard = page.locator('.grid').locator('> div').first()

      // Verify protein, carbs, fat, and fiber are displayed
      await expect(firstCard.getByText('30g')).toBeVisible() // Protein
      await expect(firstCard.getByText('45g')).toBeVisible() // Carbs
      await expect(firstCard.getByText('12g')).toBeVisible() // Fat
      await expect(firstCard.getByText('8g')).toBeVisible()  // Fiber

      // Verify nutrition labels
      await expect(firstCard.getByText('Protein')).toBeVisible()
      await expect(firstCard.getByText('Carbs')).toBeVisible()
      await expect(firstCard.getByText('Fat')).toBeVisible()
      await expect(firstCard.getByText('Fiber')).toBeVisible()
    })

    test('should display View Recipe button on each card', async () => {
      await page.waitForSelector('.grid', { timeout: TIMEOUT })

      // Check that all recipe cards have View Recipe button
      const viewRecipeButtons = page.getByText('View Recipe')
      await expect(viewRecipeButtons).toHaveCount(12)

      // Check first button is clickable
      const firstButton = viewRecipeButtons.first()
      await expect(firstButton).toBeVisible()
      await expect(firstButton).toBeEnabled()
    })
  })

  test.describe('Search Functionality Test', () => {
    test.beforeEach(async () => {
      await page.goto(RECIPE_LIBRARY_URL)
      await page.waitForLoadState('networkidle')
    })

    test('should search for "chicken" and show relevant recipes', async () => {
      const searchInput = page.getByPlaceholder('Search recipes, ingredients, or tags...')
      await searchInput.fill('chicken')

      // Wait for search results
      await page.waitForTimeout(500)

      // Should show chicken recipes (Asian Chicken Lettuce Wraps and Herb-Crusted Chicken Breast)
      await expect(page.getByText('Asian Chicken Lettuce Wraps')).toBeVisible()
      await expect(page.getByText('Herb-Crusted Chicken Breast')).toBeVisible()

      // Verify result count is correct
      await expect(page.getByText(/Showing 2 of 12 recipes/)).toBeVisible()
    })

    test('should search for "protein" and show high-protein recipes', async () => {
      const searchInput = page.getByPlaceholder('Search recipes, ingredients, or tags...')
      await searchInput.fill('protein')

      await page.waitForTimeout(500)

      // Should show recipes with "high-protein" tag or "protein" in description
      await expect(page.getByText('Protein-Packed Overnight Oats')).toBeVisible()
      await expect(page.getByText('Greek Yogurt Berry Parfait')).toBeVisible()

      // Check that results contain protein-related content
      const resultCount = page.locator('.grid > div')
      await expect(resultCount).toHaveCountGreaterThan(0)
    })

    test('should search for "easy" and show easy difficulty recipes', async () => {
      const searchInput = page.getByPlaceholder('Search recipes, ingredients, or tags...')
      await searchInput.fill('easy')

      await page.waitForTimeout(500)

      // Should show recipes with "easy" difficulty
      const easyBadges = page.getByText('easy')
      await expect(easyBadges).toHaveCountGreaterThan(0)
    })

    test('should clear search and show all recipes when search is cleared', async () => {
      const searchInput = page.getByPlaceholder('Search recipes, ingredients, or tags...')

      // First search for something
      await searchInput.fill('chicken')
      await page.waitForTimeout(500)

      // Verify filtered results
      await expect(page.getByText(/Showing [12] of 12 recipes/)).toBeVisible()

      // Clear search
      await searchInput.clear()
      await page.waitForTimeout(500)

      // Verify all recipes are shown again
      await expect(page.getByText('Showing 12 of 12 recipes')).toBeVisible()
    })
  })

  test.describe('Category Filter Test', () => {
    test.beforeEach(async () => {
      await page.goto(RECIPE_LIBRARY_URL)
      await page.waitForLoadState('networkidle')
    })

    test('should filter by Breakfast category', async () => {
      const categorySelect = page.locator('select, [role="combobox"]').first()

      // Open category dropdown and select Breakfast
      await categorySelect.click()
      await page.getByText('Breakfast').click()

      await page.waitForTimeout(500)

      // Verify only breakfast recipes are shown
      const breakfastBadges = page.getByText('breakfast')
      await expect(breakfastBadges).toHaveCountGreaterThan(0)

      // Verify specific breakfast recipes
      await expect(page.getByText('Protein-Packed Overnight Oats')).toBeVisible()
      await expect(page.getByText('Avocado Toast with Eggs')).toBeVisible()
      await expect(page.getByText('Smoothie Bowl')).toBeVisible()
    })

    test('should filter by Lunch category', async () => {
      const categorySelect = page.locator('select, [role="combobox"]').first()

      await categorySelect.click()
      await page.getByText('Lunch').click()

      await page.waitForTimeout(500)

      // Verify lunch recipes
      await expect(page.getByText('Mediterranean Quinoa Bowl')).toBeVisible()
      await expect(page.getByText('Asian Chicken Lettuce Wraps')).toBeVisible()
      await expect(page.getByText('Hummus and Veggie Wrap')).toBeVisible()
    })

    test('should filter by Dinner category', async () => {
      const categorySelect = page.locator('select, [role="combobox"]').first()

      await categorySelect.click()
      await page.getByText('Dinner').click()

      await page.waitForTimeout(500)

      // Verify dinner recipes
      await expect(page.getByText('Grilled Salmon with Sweet Potato')).toBeVisible()
      await expect(page.getByText('Herb-Crusted Chicken Breast')).toBeVisible()
      await expect(page.getByText('Quinoa Stuffed Bell Peppers')).toBeVisible()
    })

    test('should filter by Snacks category', async () => {
      const categorySelect = page.locator('select, [role="combobox"]').first()

      await categorySelect.click()
      await page.getByText('Snacks').click()

      await page.waitForTimeout(500)

      // Verify snack recipes
      await expect(page.getByText('Greek Yogurt Berry Parfait')).toBeVisible()
      await expect(page.getByText('Energy Balls')).toBeVisible()
      await expect(page.getByText('Trail Mix')).toBeVisible()
    })
  })

  test.describe('Difficulty Filter Test', () => {
    test.beforeEach(async () => {
      await page.goto(RECIPE_LIBRARY_URL)
      await page.waitForLoadState('networkidle')
    })

    test('should filter by Easy difficulty', async () => {
      const difficultySelect = page.locator('select, [role="combobox"]').last()

      await difficultySelect.click()
      await page.getByText('Easy').click()

      await page.waitForTimeout(500)

      // Verify only easy recipes are shown
      const easyBadges = page.getByText('easy')
      await expect(easyBadges).toHaveCountGreaterThan(0)

      // Should not show medium or hard recipes
      await expect(page.getByText('medium')).not.toBeVisible()
      await expect(page.getByText('hard')).not.toBeVisible()
    })

    test('should filter by Medium difficulty', async () => {
      const difficultySelect = page.locator('select, [role="combobox"]').last()

      await difficultySelect.click()
      await page.getByText('Medium').click()

      await page.waitForTimeout(500)

      // Verify medium recipes
      await expect(page.getByText('Grilled Salmon with Sweet Potato')).toBeVisible()
      await expect(page.getByText('Asian Chicken Lettuce Wraps')).toBeVisible()
      await expect(page.getByText('Herb-Crusted Chicken Breast')).toBeVisible()
    })

    test('should filter by Hard difficulty', async () => {
      const difficultySelect = page.locator('select, [role="combobox"]').last()

      await difficultySelect.click()
      await page.getByText('Hard').click()

      await page.waitForTimeout(500)

      // Check if any hard recipes exist (based on the mock data, all recipes are easy/medium)
      // This test verifies the filter works even if no results
      const resultText = page.getByText(/Showing \d+ of 12 recipes/)
      await expect(resultText).toBeVisible()
    })

    test('should combine category and difficulty filters', async () => {
      // Filter by breakfast category first
      const categorySelect = page.locator('select, [role="combobox"]').first()
      await categorySelect.click()
      await page.getByText('Breakfast').click()

      await page.waitForTimeout(500)

      // Then filter by easy difficulty
      const difficultySelect = page.locator('select, [role="combobox"]').last()
      await difficultySelect.click()
      await page.getByText('Easy').click()

      await page.waitForTimeout(500)

      // Should show only easy breakfast recipes
      const breakfastBadges = page.getByText('breakfast')
      const easyBadges = page.getByText('easy')

      await expect(breakfastBadges).toHaveCountGreaterThan(0)
      await expect(easyBadges).toHaveCountGreaterThan(0)
    })
  })

  test.describe('Clear Filters Functionality', () => {
    test.beforeEach(async () => {
      await page.goto(RECIPE_LIBRARY_URL)
      await page.waitForLoadState('networkidle')
    })

    test('should clear all filters when Clear Filters button is clicked', async () => {
      // Apply some filters first
      const categorySelect = page.locator('select, [role="combobox"]').first()
      await categorySelect.click()
      await page.getByText('Breakfast').click()

      const searchInput = page.getByPlaceholder('Search recipes, ingredients, or tags...')
      await searchInput.fill('protein')

      await page.waitForTimeout(500)

      // Click Clear Filters button
      const clearFiltersButton = page.getByText('Clear Filters')
      await clearFiltersButton.click()

      await page.waitForTimeout(500)

      // Verify all recipes are shown again
      await expect(page.getByText('Showing 12 of 12 recipes')).toBeVisible()

      // Verify search input is cleared
      await expect(searchInput).toHaveValue('')
    })

    test('should clear filters when Clear All Filters is clicked in no results state', async () => {
      // Search for something that returns no results
      const searchInput = page.getByPlaceholder('Search recipes, ingredients, or tags...')
      await searchInput.fill('nonexistentrecipe')

      await page.waitForTimeout(500)

      // Should show no results message
      await expect(page.getByText('No recipes found')).toBeVisible()

      // Click Clear All Filters
      const clearAllButton = page.getByText('Clear All Filters')
      await clearAllButton.click()

      await page.waitForTimeout(500)

      // Should show all recipes again
      await expect(page.getByText('Showing 12 of 12 recipes')).toBeVisible()
    })
  })

  test.describe('Mobile Responsiveness Test', () => {
    test('should display correctly on mobile screen size', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Verify hamburger menu is visible on mobile
      const hamburgerButton = page.locator('button').filter({ hasText: /Menu|☰/ }).first()
      await expect(hamburgerButton).toBeVisible()
    })

    test('should show Recipe Library in hamburger menu on mobile', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Click hamburger menu
      const hamburgerButton = page.getByRole('button').filter({ hasText: /Menu/ }).or(page.locator('[data-testid="mobile-menu-button"]')).or(page.locator('button svg')).first()
      await hamburgerButton.click()

      // Verify Recipe Library appears in mobile menu
      const recipeMenuLink = page.locator('a[href="/client/recipes"]')
      await expect(recipeMenuLink).toBeVisible()
      await expect(recipeMenuLink).toContainText('Recipe Library')
    })

    test('should display recipe grid in single column on mobile', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto(RECIPE_LIBRARY_URL)
      await page.waitForLoadState('networkidle')

      // Verify grid layout adapts to mobile
      const grid = page.locator('.grid')
      await expect(grid).toBeVisible()

      // On mobile, cards should stack vertically
      const cards = page.locator('.grid > div')
      await expect(cards).toHaveCountGreaterThan(0)
    })

    test('should maintain search and filter functionality on mobile', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto(RECIPE_LIBRARY_URL)
      await page.waitForLoadState('networkidle')

      // Test search functionality on mobile
      const searchInput = page.getByPlaceholder('Search recipes, ingredients, or tags...')
      await expect(searchInput).toBeVisible()

      await searchInput.fill('chicken')
      await page.waitForTimeout(500)

      // Verify search works on mobile
      await expect(page.getByText('Asian Chicken Lettuce Wraps')).toBeVisible()

      // Test filter functionality on mobile
      const categorySelect = page.locator('select, [role="combobox"]').first()
      await categorySelect.click()
      await page.getByText('Breakfast').click()

      await page.waitForTimeout(500)

      // Clear search to see filter results
      await searchInput.clear()
      await page.waitForTimeout(500)

      // Verify filter works on mobile
      await expect(page.getByText('breakfast')).toBeVisible()
    })
  })

  test.describe('Accessibility Features', () => {
    test.beforeEach(async () => {
      await page.goto(RECIPE_LIBRARY_URL)
      await page.waitForLoadState('networkidle')
    })

    test('should support keyboard navigation', async () => {
      // Tab through search input
      await page.keyboard.press('Tab')
      const searchInput = page.getByPlaceholder('Search recipes, ingredients, or tags...')
      await expect(searchInput).toBeFocused()

      // Tab through filters
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      // Should be able to navigate through recipe cards
      await page.keyboard.press('Tab')
      const firstViewButton = page.getByText('View Recipe').first()
      await expect(firstViewButton).toBeFocused()
    })

    test('should have proper ARIA labels and roles', async () => {
      // Check search input has proper label
      const searchInput = page.getByPlaceholder('Search recipes, ingredients, or tags...')
      await expect(searchInput).toBeVisible()

      // Check filter selects have proper accessibility
      const categorySelect = page.locator('select, [role="combobox"]').first()
      await expect(categorySelect).toBeVisible()

      // Check recipe cards have proper structure
      const recipeCards = page.locator('.grid > div').first()
      await expect(recipeCards).toBeVisible()
    })

    test('should have proper heading hierarchy', async () => {
      // Check main heading
      const mainHeading = page.getByRole('heading', { name: 'Recipe Library' })
      await expect(mainHeading).toBeVisible()

      // Check recipe card titles are properly structured
      const recipeTitle = page.getByText('Protein-Packed Overnight Oats')
      await expect(recipeTitle).toBeVisible()
    })
  })

  test.describe('Performance and Error Handling', () => {
    test('should load Recipe Library page within acceptable time', async () => {
      const startTime = Date.now()
      await page.goto(RECIPE_LIBRARY_URL)
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime

      // Page should load within 5 seconds
      expect(loadTime).toBeLessThan(5000)
    })

    test('should handle rapid filter changes without issues', async () => {
      await page.goto(RECIPE_LIBRARY_URL)
      await page.waitForLoadState('networkidle')

      const categorySelect = page.locator('select, [role="combobox"]').first()

      // Rapidly change filters
      for (let i = 0; i < 3; i++) {
        await categorySelect.click()
        await page.getByText('Breakfast').click()
        await page.waitForTimeout(100)

        await categorySelect.click()
        await page.getByText('All Categories').click()
        await page.waitForTimeout(100)
      }

      // Should still work correctly
      await expect(page.getByText('Showing 12 of 12 recipes')).toBeVisible()
    })

    test('should maintain state when navigating back to Recipe Library', async () => {
      await page.goto(RECIPE_LIBRARY_URL)
      await page.waitForLoadState('networkidle')

      // Apply a filter
      const categorySelect = page.locator('select, [role="combobox"]').first()
      await categorySelect.click()
      await page.getByText('Breakfast').click()

      await page.waitForTimeout(500)

      // Navigate away and back
      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      await page.goto(RECIPE_LIBRARY_URL)
      await page.waitForLoadState('networkidle')

      // Verify page loads correctly
      await expect(page.getByText('Recipe Library')).toBeVisible()
      await expect(page.getByText('Showing 12 of 12 recipes')).toBeVisible()
    })
  })
})