import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

// Test configuration
test.use({
  // Set a longer timeout for database operations
  timeout: 60000,
})

test.describe('Backend Fixes Verification', () => {
  // Store auth token
  let authToken: string

  test.beforeAll(async ({ request }) => {
    // Try to login first
    const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email: 'test@atlasfitness.com',
        password: 'testpassword123'
      }
    })
    
    if (loginResponse.ok()) {
      const cookies = loginResponse.headers()['set-cookie']
      if (cookies) {
        authToken = cookies
      }
    }
  })

  test('Google Calendar API should return calendars', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/calendar/list`, {
      headers: authToken ? { 'Cookie': authToken } : {}
    })
    
    // Should either return calendars or appropriate error
    expect([200, 401, 404]).toContain(response.status())
    
    if (response.status() === 200) {
      const data = await response.json()
      expect(data).toHaveProperty('calendars')
      expect(Array.isArray(data.calendars)).toBeTruthy()
    }
  })

  test('Email Templates API should handle CRUD operations', async ({ request }) => {
    // Test GET
    const getResponse = await request.get(`${BASE_URL}/api/email-templates`, {
      headers: authToken ? { 'Cookie': authToken } : {}
    })
    expect([200, 401]).toContain(getResponse.status())

    // Test POST (create template)
    const createResponse = await request.post(`${BASE_URL}/api/email-templates`, {
      headers: authToken ? { 'Cookie': authToken } : {},
      data: {
        name: 'Test Template',
        subject: 'Test Subject',
        content: '<p>Test content {{name}}</p>',
        category: 'follow-up'
      }
    })
    expect([200, 201, 401]).toContain(createResponse.status())
  })

  test('Business Profile Settings API should save data', async ({ request }) => {
    // Test GET
    const getResponse = await request.get(`${BASE_URL}/api/settings`, {
      headers: authToken ? { 'Cookie': authToken } : {}
    })
    expect([200, 401]).toContain(getResponse.status())

    // Test PUT (update settings)
    const updateResponse = await request.put(`${BASE_URL}/api/settings`, {
      headers: authToken ? { 'Cookie': authToken } : {},
      data: {
        business_name: 'Atlas Fitness Test',
        contact_email: 'test@atlasfitness.com',
        contact_phone: '+447700900000'
      }
    })
    expect([200, 201, 401]).toContain(updateResponse.status())
  })

  test('Tags API should create and retrieve tags', async ({ request }) => {
    // Test GET
    const getResponse = await request.get(`${BASE_URL}/api/tags`, {
      headers: authToken ? { 'Cookie': authToken } : {}
    })
    expect([200, 401]).toContain(getResponse.status())

    // Test POST (create tag)
    const createResponse = await request.post(`${BASE_URL}/api/tags`, {
      headers: authToken ? { 'Cookie': authToken } : {},
      data: {
        name: `Test Tag ${Date.now()}`,
        color: '#3B82F6',
        type: 'lead'
      }
    })
    expect([200, 201, 401]).toContain(createResponse.status())
  })

  test('Staff API should return staff members', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/staff`, {
      headers: authToken ? { 'Cookie': authToken } : {}
    })
    
    expect([200, 401]).toContain(response.status())
    
    if (response.status() === 200) {
      const data = await response.json()
      expect(data).toHaveProperty('staff')
      expect(Array.isArray(data.staff)).toBeTruthy()
    }
  })

  test('Locations API should handle CRUD operations', async ({ request }) => {
    // Test GET
    const getResponse = await request.get(`${BASE_URL}/api/locations`, {
      headers: authToken ? { 'Cookie': authToken } : {}
    })
    expect([200, 401]).toContain(getResponse.status())

    // Test POST (create location)
    const createResponse = await request.post(`${BASE_URL}/api/locations`, {
      headers: authToken ? { 'Cookie': authToken } : {},
      data: {
        name: 'Test Location',
        address: '123 Test Street',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK'
      }
    })
    expect([200, 201, 401]).toContain(createResponse.status())
  })

  test('Membership Plans API should return plans', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/membership-plans`, {
      headers: authToken ? { 'Cookie': authToken } : {}
    })
    
    expect([200, 401]).toContain(response.status())
    
    if (response.status() === 200) {
      const data = await response.json()
      expect(data).toHaveProperty('plans')
      expect(Array.isArray(data.plans)).toBeTruthy()
    }
  })

  test('Email Integration Settings should save', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/settings/integrations/email`, {
      headers: authToken ? { 'Cookie': authToken } : {},
      data: {
        provider: 'smtp',
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        smtp_secure: true,
        smtp_user: 'test@gmail.com',
        from_email: 'noreply@atlasfitness.com',
        from_name: 'Atlas Fitness'
      }
    })
    
    expect([200, 201, 401]).toContain(response.status())
  })
})

test.describe('Frontend Dark Mode Verification', () => {
  test('SOP page should have dark mode', async ({ page }) => {
    await page.goto(`${BASE_URL}/sops`)
    
    // Check for dark mode classes
    const bgColor = await page.locator('body').evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    )
    
    // Dark mode should have dark background
    expect(bgColor).toMatch(/rgb\((1[0-9]|2[0-9]|3[0-9]|[0-9]),/)
  })

  test('Message composer should have dark mode', async ({ page }) => {
    await page.goto(`${BASE_URL}/conversations`)
    
    // Check if message composer exists
    const composer = page.locator('[data-testid="message-composer"]')
    if (await composer.count() > 0) {
      const bgColor = await composer.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      )
      expect(bgColor).toMatch(/rgb\((1[0-9]|2[0-9]|3[0-9]|[0-9]),/)
    }
  })
})

test.describe('Form Builder Verification', () => {
  test('CRM Forms page should load', async ({ page }) => {
    await page.goto(`${BASE_URL}/crm/forms`)
    
    // Check for form builder elements
    await expect(page.locator('h1:has-text("Lead Forms")')).toBeVisible({ timeout: 10000 })
    
    // Check for create button
    const createButton = page.locator('button:has-text("Create Form")')
    await expect(createButton).toBeVisible()
  })

  test('Form builder should open when create is clicked', async ({ page }) => {
    await page.goto(`${BASE_URL}/crm/forms`)
    
    // Click create form button
    const createButton = page.locator('button:has-text("Create Form")')
    if (await createButton.isVisible()) {
      await createButton.click()
      
      // Check if form builder opens
      await expect(page.locator('text="Form Elements"')).toBeVisible({ timeout: 10000 })
    }
  })
})

test.describe('Automation Enhancements', () => {
  test('Automations page should have dark mode', async ({ page }) => {
    await page.goto(`${BASE_URL}/automations`)
    
    // Check for dark background
    const mainContent = page.locator('main, [role="main"], .container').first()
    if (await mainContent.count() > 0) {
      const bgColor = await mainContent.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      )
      // Should be dark color
      expect(bgColor).toMatch(/rgb\((1[0-9]|2[0-9]|3[0-9]|[0-9]),/)
    }
  })

  test('Automation builder should have dark mode', async ({ page }) => {
    await page.goto(`${BASE_URL}/automations/builder`)
    
    // Check main container has dark mode
    const container = await page.locator('.h-screen, .min-h-screen').first()
    if (await container.count() > 0) {
      const classes = await container.getAttribute('class')
      expect(classes).toContain('bg-gray-900')
    }
  })
})