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

// Provide minimal NextRequest compatibility for tests that import NextRequest
// Ensure Response exists for NextResponse
if (typeof global.Response === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(global as any).Response = class {}
}

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

// Mock react-dnd and react-dnd-html5-backend to avoid ESM transform issues in Jest
jest.mock('react-dnd', () => {
  const React = require('react')
  // Provide a minimal CommonJS-friendly mock without importing actual ESM
  return {
    DndProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children)
  }
})

jest.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {}
}))

// Node 20+ provides global fetch/Request/Response. No additional polyfills needed.