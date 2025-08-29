import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { jest } from '@jest/globals'
import BookingLinksPage from '@/app/booking-links/page'
import CreateBookingLinkPage from '@/app/booking-links/create/page'

// Mock next/navigation
const mockPush = jest.fn()
const mockRouter = {
  push: mockPush
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter
}))

// Mock BookingLinkEditor component
jest.mock('@/app/components/booking/BookingLinkEditor', () => {
  return function MockBookingLinkEditor({ onSave, onCancel }: any) {
    return (
      <div data-testid="booking-link-editor">
        <button onClick={() => onSave({ id: 'new-link', name: 'Test Link' })}>
          Save Link
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    )
  }
})

// Mock toast hook
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
}

jest.mock('@/app/lib/hooks/useToast', () => ({
  useToast: () => mockToast
}))

// Mock fetch globally
global.fetch = jest.fn()

describe('Booking Links Create Button Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockClear()
  })

  describe('BookingLinksPage', () => {
    beforeEach(() => {
      // Mock successful fetch response
      const mockFetch = jest.mocked(fetch)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          booking_links: [
            {
              id: 'test-1',
              name: 'Test Link',
              slug: 'test-link',
              is_active: true,
              is_public: true,
              type: 'individual',
              description: 'Test description',
              appointment_type_ids: [1],
              assigned_staff_ids: [1],
              timezone: 'Europe/London',
              confirmation_settings: { auto_confirm: true },
              notification_settings: { email_enabled: true },
              payment_settings: { enabled: false },
              cancellation_policy: { allowed: true }
            }
          ]
        })
      } as Response)
    })

    it('renders create button correctly', async () => {
      render(<BookingLinksPage />)

      await waitFor(() => {
        expect(screen.getByText('Create Booking Link')).toBeInTheDocument()
      })

      const createButton = screen.getByText('Create Booking Link')
      expect(createButton).toHaveClass('bg-orange-600', 'hover:bg-orange-700')
    })

    it('navigates to create page when create button is clicked', async () => {
      render(<BookingLinksPage />)

      await waitFor(() => {
        expect(screen.getByText('Create Booking Link')).toBeInTheDocument()
      })

      const createButton = screen.getByText('Create Booking Link')
      fireEvent.click(createButton)

      expect(mockPush).toHaveBeenCalledWith('/booking-links/create')
    })

    it('shows create button in empty state', async () => {
      // Mock empty response
      const mockFetch = jest.mocked(fetch)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ booking_links: [] })
      } as Response)

      render(<BookingLinksPage />)

      await waitFor(() => {
        expect(screen.getByText('No booking links created yet')).toBeInTheDocument()
      })

      const createButton = screen.getByText('Create Your First Link')
      expect(createButton).toBeInTheDocument()
      
      fireEvent.click(createButton)
      expect(mockPush).toHaveBeenCalledWith('/booking-links/create')
    })

    it('maintains create functionality when API fails', async () => {
      // Mock API failure
      const mockFetch = jest.mocked(fetch)
      mockFetch.mockRejectedValue(new Error('API Error'))

      render(<BookingLinksPage />)

      await waitFor(() => {
        expect(screen.getByText('Create Booking Link')).toBeInTheDocument()
      })

      const createButton = screen.getByText('Create Booking Link')
      fireEvent.click(createButton)

      expect(mockPush).toHaveBeenCalledWith('/booking-links/create')
    })
  })

  describe('CreateBookingLinkPage', () => {
    it('renders booking link editor', () => {
      render(<CreateBookingLinkPage />)

      expect(screen.getByTestId('booking-link-editor')).toBeInTheDocument()
    })

    it('handles successful save with correct routing', () => {
      render(<CreateBookingLinkPage />)

      const saveButton = screen.getByText('Save Link')
      fireEvent.click(saveButton)

      expect(mockToast.success).toHaveBeenCalledWith('Booking link created successfully!')
      expect(mockPush).toHaveBeenCalledWith('/booking-links')
    })

    it('handles cancel with correct routing', () => {
      render(<CreateBookingLinkPage />)

      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)

      expect(mockPush).toHaveBeenCalledWith('/booking-links')
    })

    it('applies correct styling to container', () => {
      render(<CreateBookingLinkPage />)

      const container = screen.getByText('Save Link').closest('.min-h-screen')
      expect(container).toHaveClass('bg-gray-900', 'text-white')
    })
  })

  describe('Integration between pages', () => {
    it('create button routes correctly end-to-end', async () => {
      // Test the full flow from list page to create page
      render(<BookingLinksPage />)

      await waitFor(() => {
        expect(screen.getByText('Create Booking Link')).toBeInTheDocument()
      })

      // Click create button
      const createButton = screen.getByText('Create Booking Link')
      fireEvent.click(createButton)

      // Verify routing was called
      expect(mockPush).toHaveBeenCalledWith('/booking-links/create')

      // Now simulate being on create page
      render(<CreateBookingLinkPage />)

      // Verify editor is rendered
      expect(screen.getByTestId('booking-link-editor')).toBeInTheDocument()
    })

    it('maintains state across navigation', async () => {
      render(<BookingLinksPage />)

      await waitFor(() => {
        expect(screen.getByText('Booking Links')).toBeInTheDocument()
      })

      // Verify page title and description
      expect(screen.getByText('Booking Links')).toBeInTheDocument()
      expect(screen.getByText('Create and manage shareable booking links for your services')).toBeInTheDocument()
    })
  })

  describe('Error handling', () => {
    it('shows loading state during fetch', () => {
      // Mock delayed response
      const mockFetch = jest.mocked(fetch)
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ booking_links: [] })
        } as Response), 100))
      )

      render(<BookingLinksPage />)

      expect(screen.getByText('Loading booking links...')).toBeInTheDocument()
    })

    it('handles network errors gracefully', async () => {
      const mockFetch = jest.mocked(fetch)
      mockFetch.mockRejectedValue(new Error('Network error'))

      render(<BookingLinksPage />)

      await waitFor(() => {
        // Should still show the create button even on error
        expect(screen.getByText('Create Booking Link')).toBeInTheDocument()
      })
    })
  })
})