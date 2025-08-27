/**
 * Unit Tests for Billing Error States
 * Tests loading states, error handling, and retry functionality
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import BillingPage from '@/app/billing/page'
import { toast } from 'sonner'

// Mock Supabase
jest.mock('@/app/lib/supabase/client', () => ({
  createClient: jest.fn()
}))

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn()
  }
}))

// Mock Stripe
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve({
    redirectToCheckout: jest.fn(),
    createPaymentMethod: jest.fn()
  }))
}))

describe('Billing Page - Loading States', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user' } },
          error: null
        })
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { organization_id: 'test-org' },
        error: null
      }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn()
    }

    const { createClient } = require('@/app/lib/supabase/client')
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should show loading spinner while fetching billing data', async () => {
    // Delay the response to see loading state
    mockSupabase.limit.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        data: { subscription: { status: 'active' } },
        error: null
      }), 1000))
    )

    render(<BillingPage />)

    // Should show loading spinner immediately
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(screen.getByText(/Loading billing information/i)).toBeInTheDocument()

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('should display billing data after successful load', async () => {
    const mockBillingData = {
      subscription: {
        status: 'active',
        plan: 'Professional',
        amount: 99.99,
        currency: 'GBP',
        nextBillingDate: '2024-02-01T00:00:00Z',
        cancelAtPeriodEnd: false
      },
      invoices: [
        {
          id: 'inv_1',
          amount: 99.99,
          status: 'paid',
          date: '2024-01-01T00:00:00Z'
        }
      ]
    }

    mockSupabase.limit.mockResolvedValue({
      data: mockBillingData,
      error: null
    })

    render(<BillingPage />)

    await waitFor(() => {
      expect(screen.getByText('Professional')).toBeInTheDocument()
      expect(screen.getByText(/£99.99/)).toBeInTheDocument()
      expect(screen.getByText(/Next billing.*February 1, 2024/i)).toBeInTheDocument()
    })
  })
})

describe('Billing Page - Error States', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user' } },
          error: null
        })
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { organization_id: 'test-org' },
        error: null
      }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn()
    }

    const { createClient } = require('@/app/lib/supabase/client')
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('should show error message when billing data fails to load', async () => {
    mockSupabase.limit.mockResolvedValue({
      data: null,
      error: new Error('Failed to fetch billing data')
    })

    render(<BillingPage />)

    await waitFor(() => {
      expect(screen.getByText(/Unable to load billing information/i)).toBeInTheDocument()
      expect(screen.getByText(/Please try again later/i)).toBeInTheDocument()
    })
  })

  it('should show retry button on error', async () => {
    mockSupabase.limit.mockResolvedValue({
      data: null,
      error: new Error('Network error')
    })

    render(<BillingPage />)

    await waitFor(() => {
      const retryButton = screen.getByRole('button', { name: /Try Again/i })
      expect(retryButton).toBeInTheDocument()
      expect(retryButton).not.toBeDisabled()
    })
  })

  it('should retry loading when retry button is clicked', async () => {
    // First attempt fails
    mockSupabase.limit.mockResolvedValueOnce({
      data: null,
      error: new Error('Temporary error')
    })

    render(<BillingPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument()
    })

    // Second attempt succeeds
    mockSupabase.limit.mockResolvedValueOnce({
      data: {
        subscription: {
          status: 'active',
          plan: 'Basic',
          amount: 49.99
        }
      },
      error: null
    })

    // Click retry
    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }))

    // Should show loading state
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()

    // Should show data after successful retry
    await waitFor(() => {
      expect(screen.getByText('Basic')).toBeInTheDocument()
      expect(screen.getByText(/£49.99/)).toBeInTheDocument()
    })
  })

  it('should handle payment method errors gracefully', async () => {
    mockSupabase.limit.mockResolvedValue({
      data: {
        subscription: {
          status: 'active',
          plan: 'Professional'
        },
        paymentMethod: null,
        paymentMethodError: 'No payment method on file'
      },
      error: null
    })

    render(<BillingPage />)

    await waitFor(() => {
      expect(screen.getByText(/No payment method/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Add Payment Method/i })).toBeInTheDocument()
    })
  })

  it('should handle subscription cancellation errors', async () => {
    mockSupabase.limit.mockResolvedValue({
      data: {
        subscription: {
          status: 'active',
          plan: 'Professional',
          cancelAtPeriodEnd: true,
          currentPeriodEnd: '2024-02-01T00:00:00Z'
        }
      },
      error: null
    })

    render(<BillingPage />)

    await waitFor(() => {
      expect(screen.getByText(/Subscription will end/i)).toBeInTheDocument()
      expect(screen.getByText(/February 1, 2024/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Reactivate/i })).toBeInTheDocument()
    })
  })
})

describe('Billing Page - Retry Mechanism', () => {
  let mockSupabase: any
  let attemptCount: number

  beforeEach(() => {
    attemptCount = 0
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user' } },
          error: null
        })
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { organization_id: 'test-org' },
        error: null
      }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn()
    }

    const { createClient } = require('@/app/lib/supabase/client')
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('should show different error messages for different error types', async () => {
    const errorScenarios = [
      {
        error: { code: 'NETWORK_ERROR' },
        expectedMessage: /connection issue/i
      },
      {
        error: { code: '403' },
        expectedMessage: /don't have access/i
      },
      {
        error: { code: 'STRIPE_ERROR' },
        expectedMessage: /payment provider/i
      },
      {
        error: new Error('Generic error'),
        expectedMessage: /something went wrong/i
      }
    ]

    for (const scenario of errorScenarios) {
      mockSupabase.limit.mockResolvedValueOnce({
        data: null,
        error: scenario.error
      })

      const { rerender } = render(<BillingPage />)

      await waitFor(() => {
        expect(screen.getByText(scenario.expectedMessage)).toBeInTheDocument()
      })

      // Clean up for next iteration
      rerender(<></>)
    }
  })

  it('should limit retry attempts', async () => {
    // Always fail
    mockSupabase.limit.mockResolvedValue({
      data: null,
      error: new Error('Persistent error')
    })

    render(<BillingPage />)

    // Try multiple times
    for (let i = 0; i < 5; i++) {
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByRole('button', { name: /Try Again/i }))
    }

    // After max retries, should show permanent error
    await waitFor(() => {
      expect(screen.getByText(/Please contact support/i)).toBeInTheDocument()
    })
  })

  it('should reset retry count after successful load', async () => {
    // First load fails
    mockSupabase.limit.mockResolvedValueOnce({
      data: null,
      error: new Error('Initial error')
    })

    render(<BillingPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument()
    })

    // Retry succeeds
    mockSupabase.limit.mockResolvedValueOnce({
      data: { subscription: { status: 'active' } },
      error: null
    })

    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Try Again/i })).not.toBeInTheDocument()
    })

    // Trigger refresh (simulating navigation back)
    mockSupabase.limit.mockResolvedValueOnce({
      data: null,
      error: new Error('New error')
    })

    const { rerender } = render(<BillingPage />)
    rerender(<BillingPage />)

    // Should allow retries again (count reset)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument()
    })
  })
})

describe('Billing Page - Success Feedback', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user' } },
          error: null
        })
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { organization_id: 'test-org' },
        error: null
      }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: { subscription: { status: 'active' } },
        error: null
      })
    }

    const { createClient } = require('@/app/lib/supabase/client')
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('should show success message after subscription update', async () => {
    render(<BillingPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Upgrade/i })).toBeInTheDocument()
    })

    // Mock successful upgrade
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    ) as jest.Mock

    fireEvent.click(screen.getByRole('button', { name: /Upgrade/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('upgraded successfully')
      )
    })
  })

  it('should refresh data after successful payment method update', async () => {
    render(<BillingPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Update Payment/i })).toBeInTheDocument()
    })

    // Mock successful payment update
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    ) as jest.Mock

    // Update mock to return new data
    mockSupabase.limit.mockResolvedValue({
      data: {
        subscription: { status: 'active' },
        paymentMethod: {
          last4: '4242',
          brand: 'Visa'
        }
      },
      error: null
    })

    fireEvent.click(screen.getByRole('button', { name: /Update Payment/i }))

    await waitFor(() => {
      expect(screen.getByText(/Visa.*4242/)).toBeInTheDocument()
    })
  })
})