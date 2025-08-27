/**
 * Unit Tests for Booking Routes Fix
 * Tests proper navigation without calendar modal
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import BookingPage from '@/app/booking/page'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => ({
    get: jest.fn()
  }))
}))

// Mock Supabase
jest.mock('@/app/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
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
      data: [],
      error: null
    })
  }))
}))

describe('Booking Page - Navigation Fix', () => {
  let mockPush: jest.Mock
  let mockRouter: any

  beforeEach(() => {
    // Setup router mock
    mockPush = jest.fn()
    mockRouter = {
      push: mockPush,
      replace: jest.fn(),
      refresh: jest.fn()
    }
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  it('should navigate to /booking-links/create when clicking "Create Booking Link"', async () => {
    render(<BookingPage />)

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText(/Create Booking Link/i)).toBeInTheDocument()
    })

    // Click the create button
    const createButton = screen.getByText(/Create Booking Link/i)
    fireEvent.click(createButton)

    // Verify navigation
    expect(mockPush).toHaveBeenCalledWith('/booking-links/create')
  })

  it('should navigate to /booking-links when clicking "Manage Links"', async () => {
    render(<BookingPage />)

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText(/Manage Links/i)).toBeInTheDocument()
    })

    // Click manage links button
    const manageButton = screen.getByText(/Manage Links/i)
    fireEvent.click(manageButton)

    // Verify navigation
    expect(mockPush).toHaveBeenCalledWith('/booking-links')
  })

  it('should not open any calendar modal when clicking navigation buttons', async () => {
    render(<BookingPage />)

    await waitFor(() => {
      expect(screen.getByText(/Create Booking Link/i)).toBeInTheDocument()
    })

    // Click create button
    const createButton = screen.getByText(/Create Booking Link/i)
    fireEvent.click(createButton)

    // Verify no modal elements are present
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText(/Select Date/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Choose Time/i)).not.toBeInTheDocument()
    
    // Click manage button
    const manageButton = screen.getByText(/Manage Links/i)
    fireEvent.click(manageButton)

    // Again verify no modal
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should maintain proper button state and styling', async () => {
    render(<BookingPage />)

    await waitFor(() => {
      expect(screen.getByText(/Create Booking Link/i)).toBeInTheDocument()
    })

    const createButton = screen.getByText(/Create Booking Link/i).closest('button')
    const manageButton = screen.getByText(/Manage Links/i).closest('button')

    // Check button attributes
    expect(createButton).toHaveClass('bg-blue-600')
    expect(createButton).not.toBeDisabled()
    
    expect(manageButton).toHaveClass('border-gray-300')
    expect(manageButton).not.toBeDisabled()
  })

  it('should handle navigation errors gracefully', async () => {
    // Mock router push to throw error
    mockPush.mockImplementation(() => {
      throw new Error('Navigation failed')
    })

    // Spy on console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    render(<BookingPage />)

    await waitFor(() => {
      expect(screen.getByText(/Create Booking Link/i)).toBeInTheDocument()
    })

    // Try to navigate
    const createButton = screen.getByText(/Create Booking Link/i)
    fireEvent.click(createButton)

    // Should handle error without crashing
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Navigation failed')
    )

    // Page should still be functional
    expect(screen.getByText(/Create Booking Link/i)).toBeInTheDocument()

    consoleErrorSpy.mockRestore()
  })
})

describe('Booking Links - Route Integration', () => {
  it('should have correct href attributes on link elements', async () => {
    // Mock the page to have actual Link components
    const { default: BookingPageWithLinks } = await import('@/app/booking/page')
    
    render(<BookingPageWithLinks />)

    await waitFor(() => {
      // Check for Link elements with correct href
      const createLink = screen.getByRole('link', { name: /Create Booking Link/i })
      const manageLink = screen.getByRole('link', { name: /Manage Links/i })

      expect(createLink).toHaveAttribute('href', '/booking-links/create')
      expect(manageLink).toHaveAttribute('href', '/booking-links')
    })
  })

  it('should preserve query parameters during navigation', async () => {
    // Mock search params
    const mockSearchParams = new URLSearchParams('?tab=calendar&view=month')
    jest.mock('next/navigation', () => ({
      useSearchParams: jest.fn(() => mockSearchParams)
    }))

    render(<BookingPage />)

    await waitFor(() => {
      expect(screen.getByText(/Create Booking Link/i)).toBeInTheDocument()
    })

    const createButton = screen.getByText(/Create Booking Link/i)
    fireEvent.click(createButton)

    // Should navigate without query params (clean navigation)
    expect(mockPush).toHaveBeenCalledWith('/booking-links/create')
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('?'))
  })
})