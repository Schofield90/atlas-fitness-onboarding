import { describe, it, expect, vi, beforeEach } from '@jest/globals'

// Clear module cache between tests
beforeEach(() => {
	jest.resetModules()
})

describe('app/api/cron/weekly-brief/route', () => {
	it('exports runtime and dynamic, defers SUPABASE_* to handler, returns 503 if missing', async () => {
		// Ensure env vars are not set
		delete process.env.NEXT_PUBLIC_SUPABASE_URL
		delete process.env.SUPABASE_SERVICE_ROLE_KEY
		process.env.CRON_SECRET = 'test-secret'

		// Import the route after clearing modules
		const mod = await import('@/app/api/cron/weekly-brief/route')

		// Validate exports
		expect(mod.runtime).toBe('nodejs')
		expect(mod.dynamic).toBe('force-dynamic')
		expect(typeof mod.POST).toBe('function')

		// Build a mock NextRequest
		const req = {
			headers: new Headers({ authorization: 'Bearer test-secret' })
		} as any

		const res = await mod.POST(req)
		expect(res?.status).toBe(503)
		const json = await res.json()
		expect(json).toEqual({ error: 'Service unavailable' })
	})
})