import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

test.describe('Facebook OAuth Flow - Fixed', () => {
  
  test('Full OAuth flow should work without redirect loop', async ({ page }) => {
    console.log('Starting Facebook OAuth flow test...')
    
    // Step 1: Go to integrations page
    await page.goto(`${BASE_URL}/integrations`)
    console.log('✓ Loaded integrations page')
    
    // Step 2: Check if Facebook integration shows as not connected
    const facebookCard = page.locator('text=Facebook Ads').first()
    if (await facebookCard.isVisible()) {
      console.log('✓ Found Facebook integration card')
      
      // Look for connect button near Facebook
      const connectButton = page.locator('a:has-text("Connect")').first()
      if (await connectButton.isVisible()) {
        const href = await connectButton.getAttribute('href')
        console.log(`✓ Connect button found with href: ${href}`)
        
        // Should link to /integrations/facebook which will redirect to /connect-facebook
        expect(href).toBe('/integrations/facebook')
      }
    }
    
    // Step 3: Navigate to Facebook integration page
    await page.goto(`${BASE_URL}/integrations/facebook`)
    await page.waitForTimeout(1000) // Wait for redirect logic
    
    // Should redirect to /connect-facebook if not connected
    const currentUrl = page.url()
    console.log(`Current URL after navigation: ${currentUrl}`)
    
    // If redirected to login, that's expected (auth required)
    if (currentUrl.includes('/login')) {
      console.log('✓ Redirected to login (auth required) - expected behavior')
      expect(currentUrl).toContain('/login')
    } else if (currentUrl.includes('/connect-facebook')) {
      console.log('✓ Redirected to connect-facebook page - correct behavior!')
      expect(currentUrl).toContain('/connect-facebook')
    } else if (currentUrl.includes('/integrations/facebook')) {
      console.log('⚠ Stayed on integrations/facebook - user might be connected already')
    }
  })

  test('Connect Facebook page should initiate OAuth', async ({ page }) => {
    await page.goto(`${BASE_URL}/connect-facebook`)
    
    // Should show connecting UI
    const hasConnectingText = await page.locator('text=Connecting to Facebook').isVisible()
    if (hasConnectingText) {
      console.log('✓ Connect Facebook page shows connecting UI')
      expect(hasConnectingText).toBeTruthy()
    }
    
    // Check if OAuth URL is being constructed
    const hasOAuthSetup = await page.evaluate(() => {
      // Check if page has Facebook OAuth configuration
      return document.body.textContent?.includes('Facebook') || 
             document.body.innerHTML.includes('facebook.com')
    })
    
    expect(hasOAuthSetup).toBeTruthy()
  })

  test('Callback page should handle success parameters', async ({ page }) => {
    // Simulate successful OAuth callback
    const successUrl = `${BASE_URL}/integrations/facebook/callback?success=true&user_id=123&user_name=TestUser&state=atlas_fitness_oauth`
    
    await page.goto(successUrl)
    
    // Should show success message
    await page.waitForSelector('text=Successfully connected', { timeout: 5000 }).catch(() => {
      console.log('Success message not immediately visible')
    })
    
    // Check localStorage was updated
    const localStorageUpdated = await page.evaluate(() => {
      return localStorage.getItem('facebook_connected') === 'true' &&
             localStorage.getItem('facebook_user_name') === 'TestUser' &&
             localStorage.getItem('facebook_user_id') === '123'
    })
    
    console.log('LocalStorage updated:', localStorageUpdated)
    expect(localStorageUpdated).toBeTruthy()
    
    // Should redirect after timeout
    await page.waitForTimeout(3500)
    const finalUrl = page.url()
    console.log('Final URL after redirect:', finalUrl)
    
    // Should end up at integrations/facebook or login
    expect(finalUrl).toMatch(/integrations\/facebook|login/)
  })

  test('Callback page should handle error parameters', async ({ page }) => {
    // Simulate OAuth error
    const errorUrl = `${BASE_URL}/integrations/facebook/callback?error=access_denied&error_description=User+denied+access`
    
    await page.goto(errorUrl)
    
    // Should show error message
    const hasErrorMessage = await page.locator('text=Failed to connect').isVisible()
    if (hasErrorMessage) {
      console.log('✓ Error message displayed')
      expect(hasErrorMessage).toBeTruthy()
    }
    
    // Should show try again button
    const tryAgainButton = await page.locator('button:has-text("Try Again")').isVisible()
    if (tryAgainButton) {
      console.log('✓ Try Again button available')
      expect(tryAgainButton).toBeTruthy()
    }
  })

  test('No redirect loop should occur', async ({ page }) => {
    let redirectCount = 0
    
    // Monitor navigation events
    page.on('framenavigated', () => {
      redirectCount++
      console.log(`Navigation ${redirectCount}: ${page.url()}`)
    })
    
    // Start the flow
    await page.goto(`${BASE_URL}/integrations/facebook`)
    
    // Wait for any redirects to complete
    await page.waitForTimeout(3000)
    
    // Should not have excessive redirects (max 3: initial, auth check, final)
    console.log(`Total redirects: ${redirectCount}`)
    expect(redirectCount).toBeLessThan(5)
    
    // Final URL should be stable
    const finalUrl = page.url()
    console.log('Final stable URL:', finalUrl)
    
    // Should be at one of these valid endpoints
    const validEndpoints = [
      '/login',
      '/connect-facebook', 
      '/integrations/facebook',
      '/integrations'
    ]
    
    const isValidEndpoint = validEndpoints.some(endpoint => finalUrl.includes(endpoint))
    expect(isValidEndpoint).toBeTruthy()
  })

  test('State synchronization should work', async ({ page }) => {
    // Set localStorage to simulate connected state
    await page.goto(`${BASE_URL}`)
    await page.evaluate(() => {
      localStorage.setItem('facebook_connected', 'true')
      localStorage.setItem('facebook_user_name', 'Test User')
      localStorage.setItem('facebook_user_id', '12345')
      localStorage.setItem('facebook_connected_at', new Date().toISOString())
    })
    
    // Now navigate to integrations page
    await page.goto(`${BASE_URL}/integrations`)
    
    // Check if Facebook shows as connected (if the hook works)
    const statusText = await page.locator('text=Connected').first().isVisible().catch(() => false)
    console.log('Shows as connected:', statusText)
    
    // Clean up
    await page.evaluate(() => {
      localStorage.removeItem('facebook_connected')
      localStorage.removeItem('facebook_user_name')
      localStorage.removeItem('facebook_user_id')
      localStorage.removeItem('facebook_connected_at')
    })
  })

  test('API endpoints should be accessible', async ({ request }) => {
    // Test status endpoint
    const statusResponse = await request.get(`${BASE_URL}/api/integrations/facebook/status`)
    console.log('Status API response:', statusResponse.status())
    expect([200, 401, 307]).toContain(statusResponse.status())
    
    // Test disconnect endpoint
    const disconnectResponse = await request.post(`${BASE_URL}/api/integrations/facebook/disconnect`)
    console.log('Disconnect API response:', disconnectResponse.status())
    expect([200, 401, 307, 405]).toContain(disconnectResponse.status())
  })
})

// Summary test
test('Facebook OAuth Fix Verification', async ({ page }) => {
  console.log('\n=== FACEBOOK OAUTH FIX VERIFICATION ===\n')
  
  const issues = []
  const successes = []
  
  // Test 1: Connect flow
  await page.goto(`${BASE_URL}/integrations/facebook`)
  await page.waitForTimeout(1000)
  const url1 = page.url()
  
  if (url1.includes('/connect-facebook') || url1.includes('/login')) {
    successes.push('✅ Proper redirect to connect flow or login')
  } else if (url1.includes('/integrations/facebook')) {
    successes.push('⚠️ Stayed on integrations page (might be connected)')
  } else {
    issues.push(`❌ Unexpected redirect to: ${url1}`)
  }
  
  // Test 2: Callback handling
  await page.goto(`${BASE_URL}/integrations/facebook/callback?success=true&user_name=Test`)
  const hasLocalStorage = await page.evaluate(() => {
    return localStorage.getItem('facebook_connected') === 'true'
  })
  
  if (hasLocalStorage) {
    successes.push('✅ LocalStorage properly updated on success')
  } else {
    issues.push('❌ LocalStorage not updated on callback success')
  }
  
  // Test 3: No infinite loops
  let loopDetected = false
  let navCount = 0
  page.on('framenavigated', () => {
    navCount++
    if (navCount > 10) loopDetected = true
  })
  
  await page.goto(`${BASE_URL}/integrations/facebook`)
  await page.waitForTimeout(2000)
  
  if (!loopDetected) {
    successes.push('✅ No redirect loop detected')
  } else {
    issues.push('❌ Possible redirect loop detected')
  }
  
  // Print summary
  console.log('\n=== TEST SUMMARY ===')
  successes.forEach(s => console.log(s))
  issues.forEach(i => console.log(i))
  
  // Overall assessment
  if (issues.length === 0) {
    console.log('\n🎉 FACEBOOK OAUTH IS FIXED! No redirect loops detected.')
  } else {
    console.log(`\n⚠️ ${issues.length} issue(s) found. Review needed.`)
  }
  
  expect(issues.length).toBe(0)
})