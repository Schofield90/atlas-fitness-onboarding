/**
 * Unit Tests for Staff Error Handling
 * Tests friendly error messages and retry functionality
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import StaffPage from '@/app/staff/page'
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

describe('Staff Page - Error Handling', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn()
    }

    const { createClient } = require('@/app/lib/supabase/client')
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('should display friendly error message on authentication failure', async () => {
    // Mock auth error
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Authentication failed')
    })

    render(<StaffPage />)

    await waitFor(() => {
      expect(screen.getByText(/Unable to load staff information/i)).toBeInTheDocument()
      expect(screen.getByText(/Please check your connection/i)).toBeInTheDocument()
    })

    // Should not show technical error details
    expect(screen.queryByText(/Authentication failed/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/401/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Unauthorized/i)).not.toBeInTheDocument()
  })

  it('should display friendly error message on database error', async () => {
    // Mock successful auth but database error
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user' } },
      error: null
    })

    mockSupabase.single.mockResolvedValue({
      data: { organization_id: 'test-org' },
      error: null
    })

    mockSupabase.limit.mockResolvedValue({
      data: null,
      error: new Error('Database connection failed')
    })

    render(<StaffPage />)

    await waitFor(() => {
      expect(screen.getByText(/Unable to load staff members/i)).toBeInTheDocument()
      expect(screen.getByText(/experiencing some issues/i)).toBeInTheDocument()
    })

    // Should not show raw database errors
    expect(screen.queryByText(/Database connection failed/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/PGRST/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/PostgreSQL/i)).not.toBeInTheDocument()
  })

  it('should show retry button on error', async () => {
    // Mock error scenario
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user' } },
      error: null
    })

    mockSupabase.single.mockResolvedValue({
      data: null,
      error: new Error('Network error')
    })

    render(<StaffPage />)

    await waitFor(() => {
      expect(screen.getByText(/Try Again/i)).toBeInTheDocument()
    })

    const retryButton = screen.getByText(/Try Again/i)
    expect(retryButton).toBeInTheDocument()
    expect(retryButton.closest('button')).not.toBeDisabled()
  })

  it('should retry data fetching when retry button is clicked', async () => {
    // Initial error
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'test-user' } },
      error: null
    })

    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: new Error('Temporary error')
    })

    render(<StaffPage />)

    await waitFor(() => {
      expect(screen.getByText(/Try Again/i)).toBeInTheDocument()
    })

    // Setup successful retry
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'test-user' } },
      error: null
    })

    mockSupabase.single.mockResolvedValueOnce({
      data: { organization_id: 'test-org' },
      error: null
    })

    mockSupabase.limit.mockResolvedValueOnce({
      data: [
        { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' }
      ],
      error: null
    })

    // Click retry
    const retryButton = screen.getByText(/Try Again/i)
    fireEvent.click(retryButton)

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/Loading staff/i)).toBeInTheDocument()
    })

    // Should show data after successful retry
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText(/Try Again/i)).not.toBeInTheDocument()
    })
  })

  it('should handle permission errors gracefully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user' } },
      error: null
    })

    mockSupabase.single.mockResolvedValue({
      data: { organization_id: 'test-org' },
      error: null
    })

    // Mock permission error
    mockSupabase.limit.mockResolvedValue({
      data: null,
      error: {
        message: 'Permission denied',
        code: '42501'
      }
    })

    render(<StaffPage />)

    await waitFor(() => {
      expect(screen.getByText(/don't have permission/i)).toBeInTheDocument()
      expect(screen.getByText(/contact.*administrator/i)).toBeInTheDocument()
    })

    // Should not show technical permission codes
    expect(screen.queryByText(/42501/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/RLS/i)).not.toBeInTheDocument()
  })

  it('should handle network timeouts with appropriate message', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user' } },
      error: null
    })

    // Mock timeout error
    const timeoutError = new Error('Network timeout')
    timeoutError.name = 'TimeoutError'

    mockSupabase.single.mockResolvedValue({
      data: null,
      error: timeoutError
    })

    render(<StaffPage />)

    await waitFor(() => {
      expect(screen.getByText(/taking longer than expected/i)).toBeInTheDocument()
      expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument()
    })
  })

  it('should show different messages for different error types', async () => {
    const testCases = [
      {
        error: { code: 'NETWORK_ERROR' },
        expectedMessage: /connection issue/i
      },
      {
        error: { code: '500' },
        expectedMessage: /server issue/i
      },
      {
        error: { code: '404' },
        expectedMessage: /not found/i
      },
      {
        error: new Error('Unknown error'),
        expectedMessage: /something went wrong/i
      }
    ]

    for (const testCase of testCases) {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user' } },
        error: null
      })

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: testCase.error
      })

      const { rerender } = render(<StaffPage />)

      await waitFor(() => {
        expect(screen.getByText(testCase.expectedMessage)).toBeInTheDocument()
      })

      // Clean up for next test
      rerender(<></>)
    }
  })

  it('should not expose sensitive information in error messages', async () => {
    const sensitiveError = new Error('Database connection string: postgres://user:password@host/db')
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user' } },
      error: null
    })

    mockSupabase.single.mockResolvedValue({
      data: null,
      error: sensitiveError
    })

    render(<StaffPage />)

    await waitFor(() => {
      expect(screen.getByText(/Unable to load/i)).toBeInTheDocument()
    })

    // Should not show sensitive data
    expect(screen.queryByText(/postgres:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/password/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/connection string/i)).not.toBeInTheDocument()
  })

  it('should log errors for debugging without exposing them to users', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    
    const technicalError = new Error('RLS policy violation on table staff')
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user' } },
      error: null
    })

    mockSupabase.single.mockResolvedValue({
      data: { organization_id: 'test-org' },
      error: null
    })

    mockSupabase.limit.mockResolvedValue({
      data: null,
      error: technicalError
    })

    render(<StaffPage />)

    await waitFor(() => {
      expect(screen.getByText(/Unable to load staff/i)).toBeInTheDocument()
    })

    // Technical error should be logged for debugging
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Staff fetch error'),
      expect.objectContaining({
        message: 'RLS policy violation on table staff'
      })
    )

    // But not shown to user
    expect(screen.queryByText(/RLS policy/i)).not.toBeInTheDocument()

    consoleErrorSpy.mockRestore()
  })
})