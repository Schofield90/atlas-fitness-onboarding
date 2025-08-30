import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for Dashboard QA Tests')
  
  // Launch browser for setup
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    // Wait for development server to be ready
    console.log('⏳ Waiting for development server...')
    const baseURL = config.webServer?.url || 'http://localhost:3003'
    
    let retries = 0
    const maxRetries = 30
    
    while (retries < maxRetries) {
      try {
        await page.goto(baseURL, { timeout: 5000 })
        console.log('✅ Development server is ready')
        break
      } catch (error) {
        retries++
        if (retries === maxRetries) {
          throw new Error(`Development server not ready after ${maxRetries} attempts`)
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    // Pre-warm the application
    console.log('🔥 Pre-warming application...')
    await page.goto(`${baseURL}/dashboard`)
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    
    // Check if essential elements are present
    await page.waitForSelector('[data-testid="plus-button"]', { timeout: 10000 })
    await page.waitForSelector('[data-testid="notifications-bell"]', { timeout: 10000 })
    
    console.log('✅ Application pre-warming complete')
    
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
  
  console.log('🎯 Global setup complete - Ready for QA testing!')
}

export default globalSetup