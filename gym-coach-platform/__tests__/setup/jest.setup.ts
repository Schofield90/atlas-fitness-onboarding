import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/dashboard',
    query: {},
  }),
}))

// Mock react-hot-toast
jest.mock('react-hot-toast', () => {
  const mockToast = jest.fn()
  mockToast.success = jest.fn()
  mockToast.error = jest.fn()
  mockToast.loading = jest.fn()
  
  return {
    toast: mockToast,
    Toaster: () => null,
  }
})

// Mock sonner (used by WebhookTriggerConfig)
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
  Toaster: () => null,
}))

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: jest.fn(() => true),
})

// Mock web APIs for Next.js
global.Request = class MockRequest {
  constructor(public url: string, public init: any = {}) {}
  headers = new Map()
} as any

global.Response = class MockResponse {
  constructor(public body: any, public init: any = {}) {}
  status = 200
  json = () => Promise.resolve(this.body)
} as any

global.Headers = Map as any

// Mock console to reduce noise in tests
const originalConsoleError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalConsoleError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalConsoleError
})

// Messaging system test utilities
global.createMockConversation = (overrides = {}) => ({
  id: 'conv-test-123',
  organization_id: 'org-123',
  client_id: 'client-123',
  coach_id: 'coach-123',
  title: 'Test Conversation',
  status: 'active',
  last_message_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

global.createMockMessage = (overrides = {}) => ({
  id: 'msg-test-123',
  conversation_id: 'conv-test-123',
  sender_id: 'user-123',
  sender_type: 'coach',
  content: 'Test message',
  message_type: 'text',
  read_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

global.createMockSupabaseError = (code = '23503', message = 'Foreign key constraint violation') => ({
  code,
  message,
  details: `Key constraint violation in messaging system: ${message}`,
  hint: 'Ensure all referenced entities exist before creating relationships'
})

// Mock console methods for capturing foreign key errors in tests
global.captureConsoleErrors = () => {
  const errors: string[] = []
  const originalError = console.error
  
  console.error = (...args: any[]) => {
    const errorMsg = args.join(' ')
    if (errorMsg.includes('foreign key') || errorMsg.includes('constraint')) {
      errors.push(errorMsg)
    }
    originalError.apply(console, args)
  }
  
  return {
    errors,
    restore: () => {
      console.error = originalError
    }
  }
}