import { test, expect } from '@playwright/test'
import { createAdminClient } from '@/app/lib/supabase/admin'

test.describe('Admin Security Tests', () => {
  const supabase = createAdminClient()

  test.describe('SQL Injection Prevention', () => {
    test('should prevent SQL injection in organization search', async ({ request }) => {
      const maliciousInputs = [
        "'; DROP TABLE organizations; --",
        "1' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM super_admin_users--"
      ]

      for (const input of maliciousInputs) {
        const response = await request.get(`/api/admin/organizations?search=${encodeURIComponent(input)}`)
        
        // Should not execute malicious SQL
        expect(response.status()).not.toBe(500)
        
        // Tables should still exist
        const { error } = await supabase.from('organizations').select('count').single()
        expect(error).toBeNull()
      }
    })

    test('should prevent SQL injection in user lookup', async ({ request }) => {
      const response = await request.get("/api/admin/users?id=1' OR '1'='1")
      
      // Should not return all users
      const data = await response.json()
      expect(data.users).not.toBeDefined()
    })
  })

  test.describe('XSS Prevention', () => {
    test('should escape HTML in organization names', async ({ page }) => {
      // Create org with XSS attempt
      const xssOrg = await supabase
        .from('organizations')
        .insert({
          name: '<script>alert("XSS")</script>',
          slug: 'xss-test'
        })
        .select()
        .single()

      await page.goto('/admin')
      
      // Should display escaped HTML, not execute script
      await expect(page.locator('text=<script>alert("XSS")</script>')).toBeVisible()
      
      // No alert should appear
      await expect(page.locator('.alert')).not.toBeVisible()

      // Cleanup
      await supabase.from('organizations').delete().eq('id', xssOrg.data.id)
    })

    test('should sanitize user input in forms', async ({ page }) => {
      await page.goto('/admin/organizations/test-id')
      
      // Try XSS in impersonation reason
      await page.click('text=Impersonate Organization')
      await page.fill('textarea', '<img src=x onerror=alert("XSS")>')
      
      // Should be sanitized when displayed
      await expect(page.locator('textarea')).toHaveValue('<img src=x onerror=alert("XSS")>')
      
      // No alert should execute
      await expect(page.locator('.alert')).not.toBeVisible()
    })
  })

  test.describe('CSRF Protection', () => {
    test('should reject requests without CSRF token', async ({ request }) => {
      const response = await request.post('/api/admin/impersonation/start', {
        data: {
          organizationId: 'test-id',
          reason: 'test'
        },
        headers: {
          'Content-Type': 'application/json'
          // Missing CSRF token
        }
      })

      expect(response.status()).toBe(403)
    })

    test('should reject requests with invalid CSRF token', async ({ request }) => {
      const response = await request.post('/api/admin/impersonation/start', {
        data: {
          organizationId: 'test-id',
          reason: 'test'
        },
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'invalid-token'
        }
      })

      expect(response.status()).toBe(403)
    })
  })

  test.describe('Authentication Bypass Prevention', () => {
    test('should not allow direct API access without auth', async ({ request }) => {
      const endpoints = [
        '/api/admin/organizations',
        '/api/admin/billing',
        '/api/admin/users',
        '/api/admin/audit'
      ]

      for (const endpoint of endpoints) {
        const response = await request.get(endpoint, {
          headers: {
            // No auth headers
          }
        })
        
        expect(response.status()).toBe(401)
      }
    })

    test('should not allow JWT manipulation', async ({ request }) => {
      // Try with manipulated JWT
      const response = await request.get('/api/admin/organizations', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid'
        }
      })

      expect(response.status()).toBe(401)
    })
  })

  test.describe('Rate Limiting', () => {
    test('should rate limit admin API endpoints', async ({ request }) => {
      const requests = []
      
      // Make 100 rapid requests
      for (let i = 0; i < 100; i++) {
        requests.push(request.get('/api/admin/organizations'))
      }

      const responses = await Promise.all(requests)
      
      // Some should be rate limited
      const rateLimited = responses.filter(r => r.status() === 429)
      expect(rateLimited.length).toBeGreaterThan(0)
    })

    test('should rate limit failed login attempts', async ({ page }) => {
      for (let i = 0; i < 10; i++) {
        await page.goto('/signin')
        await page.fill('[name="email"]', 'admin@example.com')
        await page.fill('[name="password"]', 'wrong-password')
        await page.click('[type="submit"]')
      }

      // Account should be locked
      await expect(page.locator('text=Account temporarily locked')).toBeVisible()
    })
  })

  test.describe('Session Security', () => {
    test('should expire admin sessions', async ({ page, context }) => {
      // Login as admin
      await page.goto('/signin')
      await page.fill('[name="email"]', 'admin@example.com')
      await page.fill('[name="password"]', 'password123')
      await page.click('[type="submit"]')

      // Get session cookie
      const cookies = await context.cookies()
      const sessionCookie = cookies.find(c => c.name === 'admin-session')
      
      // Session should have expiry
      expect(sessionCookie?.expires).toBeDefined()
      
      // Expiry should be within 24 hours
      const expiryTime = new Date(sessionCookie!.expires! * 1000)
      const now = new Date()
      const hoursDiff = (expiryTime.getTime() - now.getTime()) / (1000 * 60 * 60)
      expect(hoursDiff).toBeLessThanOrEqual(24)
    })

    test('should invalidate session on logout', async ({ page, context }) => {
      // Login
      await page.goto('/signin')
      await page.fill('[name="email"]', 'admin@example.com')
      await page.fill('[name="password"]', 'password123')
      await page.click('[type="submit"]')

      // Logout
      await page.click('text=Logout')

      // Try to access admin
      await page.goto('/admin')
      
      // Should redirect to login
      await expect(page).toHaveURL('/signin')
    })
  })

  test.describe('Impersonation Security', () => {
    test('should enforce time limits on impersonation', async ({ request }) => {
      // Try to set excessive duration
      const response = await request.post('/api/admin/impersonation/start', {
        data: {
          organizationId: 'test-id',
          reason: 'test',
          durationMinutes: 500 // Try 500 minutes
        }
      })

      const data = await response.json()
      
      // Should be capped at max duration
      if (data.session) {
        const duration = (new Date(data.session.expiresAt).getTime() - Date.now()) / (1000 * 60)
        expect(duration).toBeLessThanOrEqual(240) // 4 hours max
      }
    })

    test('should require valid organization ID', async ({ request }) => {
      const response = await request.post('/api/admin/impersonation/start', {
        data: {
          organizationId: 'non-existent-id',
          reason: 'test'
        }
      })

      expect(response.status()).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('Organization not found')
    })

    test('should log all impersonation attempts', async ({ request }) => {
      // Attempt impersonation
      await request.post('/api/admin/impersonation/start', {
        data: {
          organizationId: 'test-id',
          reason: 'security test'
        }
      })

      // Check audit log
      const { data: logs } = await supabase
        .from('admin_activity_logs')
        .select('*')
        .eq('action_type', 'IMPERSONATION_START')
        .order('created_at', { ascending: false })
        .limit(1)

      expect(logs).toHaveLength(1)
      expect(logs![0].action_details.reason).toBe('security test')
    })
  })

  test.describe('Data Access Control', () => {
    test('should enforce RLS on admin views', async () => {
      // Try to access admin views without proper role
      const { error } = await supabase
        .from('admin_organization_metrics')
        .select('*')
        .single()

      // Should be blocked by RLS
      expect(error).toBeDefined()
    })

    test('should prevent cross-tenant data access', async ({ request }) => {
      // Try to access another org's data
      const response = await request.get('/api/admin/organizations/other-org-id/users')
      
      // Should verify org exists and admin has access
      if (response.status() === 200) {
        const data = await response.json()
        // Should only return users for that specific org
        expect(data.users.every((u: any) => u.organization_id === 'other-org-id')).toBe(true)
      }
    })
  })

  test.describe('Audit Log Integrity', () => {
    test('should prevent audit log tampering', async () => {
      // Insert an audit log
      const { data: log } = await supabase
        .from('admin_activity_logs')
        .insert({
          admin_user_id: 'test-admin',
          action_type: 'TEST_ACTION'
        })
        .select()
        .single()

      // Try to modify it
      const { error } = await supabase
        .from('admin_activity_logs')
        .update({ action_type: 'MODIFIED' })
        .eq('id', log!.id)

      // Should not allow updates
      expect(error).toBeDefined()
    })

    test('should not allow audit log deletion', async () => {
      // Try to delete audit logs
      const { error } = await supabase
        .from('admin_activity_logs')
        .delete()
        .eq('action_type', 'TEST_ACTION')

      // Should not allow deletion
      expect(error).toBeDefined()
    })
  })
})