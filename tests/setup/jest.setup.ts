import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Polyfill for TextEncoder/TextDecoder
global.TextEncoder = TextEncoder as any
global.TextDecoder = TextDecoder as any

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/test-path',
}))

// Mock Next.js headers/cookies used in route handlers
jest.mock('next/headers', () => {
  const cookieStore: Record<string, string> = {}
  return {
    headers: () => new Map<string, string>(),
    cookies: () => ({
      get: (name: string) => (cookieStore[name] ? { name, value: cookieStore[name] } : undefined),
      set: (name: string, value: string) => { cookieStore[name] = value },
      delete: (name: string) => { delete cookieStore[name] },
      getAll: () => Object.entries(cookieStore).map(([name, value]) => ({ name, value }))
    })
  }
})

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

// Suppress console errors during tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('Error:'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Global test utilities
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// ---- Test environment defaults and external service mocks ----
// Provide safe default environment variables to avoid real network/service calls
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock'
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock'
process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'AC_test'
process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'test_token'
process.env.TWILIO_SMS_FROM = process.env.TWILIO_SMS_FROM || '+10000000000'
process.env.TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+10000000000'
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_test_mock'
process.env.RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'test@example.com'

// Mock Twilio SDK to prevent real API calls during tests
jest.mock('twilio', () => {
  const mockClient = {
    messages: {
      create: jest.fn().mockResolvedValue({ sid: 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' })
    },
    calls: {
      list: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ sid: 'CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' }),
      update: jest.fn().mockResolvedValue({ status: 'completed' })
    },
    api: {
      accounts: jest.fn().mockReturnThis(),
      fetch: jest.fn().mockResolvedValue({ friendlyName: 'Test Account' })
    },
    incomingPhoneNumbers: {
      list: jest.fn().mockResolvedValue([
        { phoneNumber: process.env.TWILIO_SMS_FROM }
      ])
    }
  }
  const factory = () => mockClient
  return factory
})

// Mock Stripe SDK to prevent real API calls during tests
jest.mock('stripe', () => {
  class MockStripe {
    customers = { create: jest.fn().mockResolvedValue({ id: 'cus_test_123' }) }
    checkout = { sessions: { create: jest.fn().mockResolvedValue({ id: 'cs_test_123' }) } }
    accountLinks = { create: jest.fn().mockResolvedValue({ url: 'https://example.com/onboard' }) }
    accounts = { create: jest.fn().mockResolvedValue({ id: 'acct_test_123' }) }
  }
  return { __esModule: true, default: MockStripe }
})

// Minimal Request polyfill for route handler unit tests
if (typeof (global as any).Request === 'undefined') {
  class SimpleRequest {
    url: string
    method: string
    headers: Map<string, string>
    private _body: any
    constructor(url: string, init?: { method?: string; headers?: Record<string, string>; body?: any }) {
      this.url = url
      this.method = init?.method ?? 'GET'
      this.headers = new Map(Object.entries(init?.headers || {}))
      this._body = init?.body
    }
    async json() {
      return typeof this._body === 'string' ? JSON.parse(this._body) : this._body
    }
    async text() {
      return typeof this._body === 'string' ? this._body : JSON.stringify(this._body)
    }
  }
  ;(global as any).Request = SimpleRequest as any
}

// Minimal Response polyfill for route handler unit tests
if (typeof (global as any).Response === 'undefined') {
  class SimpleResponse {
    private _bodyText: string
    status: number
    ok: boolean
    headers: Map<string, string>
    constructor(body?: any, init?: { status?: number; headers?: Record<string, string> }) {
      this._bodyText = typeof body === 'string' ? body : body ? JSON.stringify(body) : ''
      this.status = init?.status ?? 200
      this.ok = this.status >= 200 && this.status < 300
      this.headers = new Map(Object.entries(init?.headers || {}))
    }
    async json() {
      return this._bodyText ? JSON.parse(this._bodyText) : null
    }
    async text() {
      return this._bodyText
    }
    static json(data: any, init?: { status?: number; headers?: Record<string, string> }) {
      return new SimpleResponse(JSON.stringify(data), init)
    }
  }
  ;(global as any).Response = SimpleResponse as any
}

// Mock NextResponse for API route testing
jest.mock('next/server', () => {
  const originalModule = jest.requireActual('next/server')

  class MockNextResponse extends (global as any).Response {
    static json(data: any, init?: { status?: number; headers?: Record<string, string> }) {
      return new MockNextResponse(JSON.stringify(data), init)
    }
  }

  return {
    ...originalModule,
    NextResponse: MockNextResponse
  }
})

// Provide a minimal global fetch mock for client components that call fetch
if (typeof (global as any).fetch === 'undefined') {
  ;(global as any).fetch = jest.fn(async () => {
    return new (global as any).Response(JSON.stringify({ events: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
}