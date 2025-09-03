import { GET as bookingAvailabilityGET } from '@/app/api/booking-by-slug/availability/route'

function makeRequest(url: string) {
  return new Request(url) as any
}

describe('API routes handle missing SUPABASE_SERVICE_ROLE_KEY gracefully', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  test('booking availability returns 503 when service key is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'

    const url = 'http://localhost/api/booking-by-slug/availability?slug=test'
    const res = await bookingAvailabilityGET(makeRequest(url))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('Service unavailable')
  })
})