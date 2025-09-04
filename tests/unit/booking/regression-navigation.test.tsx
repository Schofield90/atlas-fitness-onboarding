import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import BookingPage from '@/app/booking/page'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => ({ get: jest.fn() }))
}))

// Basic fetch mock in case tests aren't loaded via global setup
if (!(global as any).fetch) {
  ;(global as any).fetch = jest.fn(async () => new (global as any).Response(JSON.stringify({ events: [] }), { status: 200 }))
}

describe('Booking Page - Navigation Regression', () => {
  let mockPush: jest.Mock

  beforeEach(() => {
    mockPush = jest.fn()
    ;(useRouter as unknown as jest.Mock).mockReturnValue({ push: mockPush, replace: jest.fn(), refresh: jest.fn() })
    jest.clearAllMocks()
  })

  it('shows Create Booking Link and Manage Links and navigates correctly', async () => {
    render(<BookingPage />)

    await waitFor(() => {
      expect(screen.getByText(/Create Booking Link/i)).toBeInTheDocument()
      expect(screen.getByText(/Manage Links/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Create Booking Link/i))
    expect(mockPush).toHaveBeenCalledWith('/booking-links/create')

    fireEvent.click(screen.getByText(/Manage Links/i))
    expect(mockPush).toHaveBeenCalledWith('/booking-links')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})