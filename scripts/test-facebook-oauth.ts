import { chromium } from 'playwright'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

async function testFacebookOAuth() {
  console.log('🎭 Starting Facebook OAuth flow test with Playwright\n')
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  })
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  })
  
  const page = await context.newPage()
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Console Error:', msg.text())
    } else if (msg.text().includes('Facebook') || msg.text().includes('OAuth')) {
      console.log('📝 Console:', msg.text())
    }
  })
  
  // Monitor network requests
  page.on('request', request => {
    if (request.url().includes('facebook') || request.url().includes('/api/')) {
      console.log('→ Request:', request.method(), request.url())
    }
  })
  
  page.on('response', response => {
    if (response.url().includes('facebook') || response.url().includes('/api/')) {
      console.log('← Response:', response.status(), response.url())
      if (response.status() >= 400) {
        response.text().then(text => {
          console.log('   Error body:', text.substring(0, 200))
        }).catch(() => {})
      }
    }
  })
  
  try {
    console.log('1️⃣  Navigating to integration page...')
    await page.goto('https://atlas-fitness-onboarding.vercel.app/integrations/facebook', {
      waitUntil: 'networkidle'
    })
    
    // Check if redirected to sign in
    if (page.url().includes('/signin') || page.url().includes('/sign-in')) {
      console.log('   ↳ Redirected to sign in page')
      
      // Sign in first
      await page.fill('input[type="email"]', 'sam@gymleadhub.co.uk')
      await page.fill('input[type="password"]', 'your_password_here') // You'll need to provide
      await page.click('button[type="submit"]')
      
      await page.waitForNavigation()
      console.log('   ✓ Signed in')
    }
    
    // Wait for page to load
    await page.waitForTimeout(3000)
    
    // Check current URL
    console.log('   Current URL:', page.url())
    
    // Check for redirect loop
    const urlHistory: string[] = []
    let loopDetected = false
    
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        const url = frame.url()
        console.log('   📍 Navigated to:', url)
        
        if (urlHistory.includes(url)) {
          console.log('   ⚠️  REDIRECT LOOP DETECTED!')
          console.log('   Loop pattern:', urlHistory.slice(-3).join(' → '), '→', url)
          loopDetected = true
        }
        urlHistory.push(url)
      }
    })
    
    // Check if we're on connect-facebook page
    if (page.url().includes('/connect-facebook')) {
      console.log('2️⃣  On connect-facebook page')
      
      // Wait to see if it auto-redirects to Facebook
      await page.waitForTimeout(3000)
      
      if (page.url().includes('facebook.com')) {
        console.log('   ✓ Redirected to Facebook OAuth')
        
        // Would need Facebook credentials to continue
        console.log('   ⚠️  Cannot proceed without Facebook credentials')
      }
    }
    
    // Check if we're on the integration page
    if (page.url().includes('/integrations/facebook')) {
      console.log('2️⃣  On integration page')
      
      // Check connection status
      const statusElement = await page.locator('text=/Connection Status/i').first()
      if (statusElement) {
        const statusSection = await statusElement.locator('..').first()
        const statusText = await statusSection.textContent()
        console.log('   Connection status:', statusText?.includes('Connected') ? '✅ Connected' : '❌ Not Connected')
        
        // Check for debug info
        const debugInfo = await page.locator('text=/Debug Info/i').first()
        if (debugInfo) {
          const debugText = await debugInfo.locator('..').textContent()
          console.log('   Debug info:', debugText)
        }
      }
      
      // Try to click Connect button if visible
      const connectButton = await page.locator('button:has-text("Connect Facebook")').first()
      if (await connectButton.isVisible()) {
        console.log('3️⃣  Clicking Connect Facebook button...')
        await connectButton.click()
        
        // Wait for navigation
        await page.waitForTimeout(3000)
        console.log('   Current URL after click:', page.url())
      }
    }
    
    // Check API status endpoint
    console.log('\n4️⃣  Checking API status endpoint...')
    const apiResponse = await page.evaluate(async () => {
      const response = await fetch('/api/integrations/facebook/status')
      const data = await response.json()
      return { status: response.status, data }
    })
    console.log('   API Response:', JSON.stringify(apiResponse, null, 2))
    
    // Check localStorage
    console.log('\n5️⃣  Checking localStorage...')
    const localStorageData = await page.evaluate(() => {
      return {
        facebook_connected: localStorage.getItem('facebook_connected'),
        facebook_connected_at: localStorage.getItem('facebook_connected_at'),
        facebook_user_id: localStorage.getItem('facebook_user_id'),
        facebook_user_name: localStorage.getItem('facebook_user_name')
      }
    })
    console.log('   localStorage:', JSON.stringify(localStorageData, null, 2))
    
    // Check for errors in page
    const errors = await page.locator('.text-red-500, .text-red-400, .bg-red-900').all()
    if (errors.length > 0) {
      console.log('\n⚠️  Found error elements on page:')
      for (const error of errors) {
        const text = await error.textContent()
        if (text?.trim()) {
          console.log('   -', text.trim())
        }
      }
    }
    
    if (loopDetected) {
      console.log('\n❌ REDIRECT LOOP DETECTED - This is the main issue!')
      console.log('URL History:', urlHistory)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
  
  console.log('\n📊 Test Summary:')
  console.log('- URL visited:', page.url())
  console.log('- Press Ctrl+C to close browser and exit')
  
  // Keep browser open for manual inspection
  await page.waitForTimeout(300000)
  await browser.close()
}

testFacebookOAuth().catch(console.error)