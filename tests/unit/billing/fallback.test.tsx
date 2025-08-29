import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { jest } from '@jest/globals'
import BillingPage from '@/app/billing/page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: jest.fn(() => null)
  })
}))

// Mock supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }))
}

jest.mock('@/app/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

// Mock components that might cause issues in tests
jest.mock('@/app/components/DashboardLayout', () => {
  return function MockDashboardLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="dashboard-layout">{children}</div>
  }
})

jest.mock('@/app/components/saas/SaasBillingDashboard', () => {
  return function MockSaasBillingDashboard() {
    return <div data-testid="saas-billing-dashboard">Billing Dashboard</div>
  }
})

jest.mock('@/app/components/billing/StripeConnect', () => {
  return function MockStripeConnect() {
    return <div data-testid="stripe-connect">Stripe Connect</div>
  }
})

// Mock toast hook
const mockToast = {
  info: jest.fn(),
  error: jest.fn(),
  success: jest.fn()
}

jest.mock('@/app/lib/hooks/useToast', () => ({
  useToast: () => mockToast
}))

// Mock feature flags
jest.mock('@/app/lib/feature-flags', () => ({
  isFeatureEnabled: jest.fn((flag: string) => {
    if (flag === 'billingMswStub') return true
    if (flag === 'billingRetryButton') return true
    return false
  })
}))

describe('Billing Fallback Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set NODE_ENV to development for fallback tests
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    delete process.env.NODE_ENV
  })

  it('renders fallback UI when supabase returns 500 error', async () => {
    // Mock a 500-like error from supabase
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } }
    })
    
    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: jest.fn().mockRejectedValue(new Error('Internal server error'))
          })
        })
      })
    })

    render(<BillingPage />)

    // Wait for the component to handle the error and show fallback
    await waitFor(() => {
      expect(screen.getByText('Demo Data')).toBeInTheDocument()
    })

    // Verify mock data is shown instead of error state
    expect(screen.getByText('Billing & Subscription')).toBeInTheDocument()
    expect(screen.getByText('Demo Data')).toBeInTheDocument()
    expect(mockToast.error).toHaveBeenCalledWith('Live API failed, using demo data')
  })

  it('shows retry button when billing data fails to load', async () => {
    // Mock auth failure scenario
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null }
    })

    // Disable mock data fallback for this test
    const isFeatureEnabledMock = jest.mocked(
      require('@/app/lib/feature-flags').isFeatureEnabled
    )
    isFeatureEnabledMock.mockImplementation((flag: string) => {
      if (flag === 'billingMswStub') return false
      if (flag === 'billingRetryButton') return true
      return false
    })

    render(<BillingPage />)

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Unable to Load Billing Information')).toBeInTheDocument()
    })

    // Check retry button is present
    const retryButton = screen.getByText('Try Again')
    expect(retryButton).toBeInTheDocument()

    // Test retry functionality
    fireEvent.click(retryButton)
    
    // Should attempt to refetch
    expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(2)
  })

  it('uses demo data when live API fails in development', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user' } }
    })
    
    // Mock database error
    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: jest.fn().mockRejectedValue(new Error('Database connection failed'))
          })
        })
      })
    })

    render(<BillingPage />)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Live API failed, using demo data')
    })

    // Should show demo data badge
    expect(screen.getByText('Demo Data')).toBeInTheDocument()
    
    // Should show mock organization name
    expect(screen.getByText('Billing & Subscription')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    // Mock pending auth request
    mockSupabase.auth.getUser.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: { user: null } }), 100))
    )

    render(<BillingPage />)

    expect(screen.getByText('Loading billing information...')).toBeInTheDocument()
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument() // spinner
  })

  it('handles network errors gracefully', async () => {
    mockSupabase.auth.getUser.mockRejectedValue(new Error('Network Error'))

    render(<BillingPage />)

    await waitFor(() => {
      expect(screen.getByText('Demo Data')).toBeInTheDocument()
    })

    expect(mockToast.error).toHaveBeenCalledWith('Live API failed, using demo data')
  })

  it('provides contact support option in error state', async () => {
    // Disable fallback to show actual error state
    const isFeatureEnabledMock = jest.mocked(
      require('@/app/lib/feature-flags').isFeatureEnabled
    )
    isFeatureEnabledMock.mockReturnValue(false)

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null }
    })

    render(<BillingPage />)

    await waitFor(() => {
      expect(screen.getByText('Contact Support')).toBeInTheDocument()
    })

    const supportLink = screen.getByText('Contact Support')
    expect(supportLink).toHaveAttribute('href', 'mailto:support@atlasfitness.com')
  })
})