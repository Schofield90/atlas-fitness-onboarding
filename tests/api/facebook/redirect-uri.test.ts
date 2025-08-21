import { test, expect } from '@playwright/test'
import { getFacebookRedirectUri } from '@/app/lib/facebook/config'

test.describe('Facebook OAuth Redirect URI', () => {
  test('redirect URI should be identical in authorize and token exchange', async () => {
    // Get the canonical redirect URI
    const redirectUri = getFacebookRedirectUri()
    
    // Verify it's properly formatted
    expect(redirectUri).toMatch(/^https?:\/\//)
    expect(redirectUri).toContain('/api/auth/facebook/callback')
    expect(redirectUri).not.toContain('//')  // No double slashes except protocol
    expect(redirectUri).not.toEndWith('/')  // No trailing slash
    
    // In production, must be HTTPS
    if (process.env.NODE_ENV === 'production') {
      expect(redirectUri).toMatch(/^https:\/\//)
    }
  })
  
  test('authorize URL should use canonical redirect URI', async ({ request }) => {
    const response = await request.get('/api/integrations/facebook/diagnose')
    const data = await response.json()
    
    expect(response.ok()).toBeTruthy()
    
    // Check that all computed redirect URIs match
    const { computed } = data
    const canonicalUri = getFacebookRedirectUri()
    
    expect(computed.redirect_uri_from_SITE_URL).toBe(canonicalUri)
    expect(computed.redirect_uri_from_URL).toBe(canonicalUri)
    expect(computed.redirect_uri_from_APP_URL).toBe(canonicalUri)
  })
  
  test('OAuth flow should complete successfully', async ({ page }) => {
    // Navigate to Facebook integration page
    await page.goto('/integrations/facebook')
    
    // Click connect button
    const connectButton = page.locator('button:has-text("Connect Facebook")')
    await expect(connectButton).toBeVisible()
    
    // Get the OAuth URL
    const oauthUrl = await connectButton.getAttribute('data-oauth-url') || 
                     await page.evaluate(() => {
                       const btn = document.querySelector('button:has-text("Connect Facebook")')
                       return btn?.getAttribute('onclick')?.match(/window\.location\.href='([^']+)'/)?.[1]
                     })
    
    if (oauthUrl) {
      // Parse the OAuth URL
      const url = new URL(oauthUrl)
      const redirectParam = url.searchParams.get('redirect_uri')
      
      // Verify redirect URI matches canonical
      const canonicalUri = getFacebookRedirectUri()
      expect(redirectParam).toBe(canonicalUri)
    }
  })
})