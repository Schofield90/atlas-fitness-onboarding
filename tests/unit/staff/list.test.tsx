import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { jest } from '@jest/globals'
import StaffPage from '@/app/staff/page'

// Mock DashboardLayout
jest.mock('@/app/components/DashboardLayout', () => {
  return function MockDashboardLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="dashboard-layout">{children}</div>
  }
})

// Mock modals
jest.mock('@/app/staff/StaffLocationModal', () => {
  return function MockStaffLocationModal({ onClose, onSave }: any) {
    return (
      <div data-testid="staff-location-modal">
        <button onClick={() => onSave()}>Save Location</button>
        <button onClick={onClose}>Close</button>
      </div>
    )
  }
})

jest.mock('@/app/staff/InviteStaffModal', () => {
  return function MockInviteStaffModal({ isOpen, onClose, onSuccess }: any) {
    if (!isOpen) return null
    return (
      <div data-testid="invite-staff-modal">
        <button onClick={() => onSuccess()}>Invite Success</button>
        <button onClick={onClose}>Close Invite</button>
      </div>
    )
  }
})

// Mock supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          // Return mock data
        }))
      }))
    }))
  }))
}

jest.mock('@/app/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

// Mock toast hook
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
}

jest.mock('@/app/lib/hooks/useToast', () => ({
  useToast: () => mockToast
}))

// Mock feature flags
jest.mock('@/app/lib/feature-flags', () => ({
  isFeatureEnabled: jest.fn((flag: string) => {
    if (flag === 'staffFallback') return true
    return false
  })
}))

// Mock fetch for API calls
global.fetch = jest.fn()

describe('Staff List Add Functionality Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock organization API call
    const mockFetch = jest.mocked(fetch)
    mockFetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/organization/get-info')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ organizationId: 'test-org-id' })
        } as Response)
      }
      if (typeof url === 'string' && url.includes('/api/organization/add-staff')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, staffId: 'new-staff-id' })
        } as Response)
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    // Mock supabase response
    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'staff-1',
                user_id: 'user-1',
                phone_number: '+44 7123 456789',
                email: 'john@example.com',
                is_available: true,
                receives_calls: true,
                receives_sms: true,
                receives_whatsapp: false,
                receives_emails: true,
                routing_priority: 1,
                role: 'manager',
                location_access: { all_locations: true }
              }
            ],
            error: null
          })
        }))
      }))
    })
  })

  it('renders staff list correctly', async () => {
    render(<StaffPage />)

    await waitFor(() => {
      expect(screen.getByText('Staff Management')).toBeInTheDocument()
    })

    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('manager')).toBeInTheDocument()
    expect(screen.getByText('+44 7123 456789')).toBeInTheDocument()
  })

  it('opens add staff modal when add manually button is clicked', async () => {
    render(<StaffPage />)

    await waitFor(() => {
      expect(screen.getByText('Add Manually')).toBeInTheDocument()
    })

    const addButton = screen.getByText('Add Manually')
    fireEvent.click(addButton)

    expect(screen.getByText('Add Staff Member')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('john@example.com')).toBeInTheDocument()
  })

  it('adds staff member successfully through form', async () => {
    render(<StaffPage />)

    await waitFor(() => {
      expect(screen.getByText('Add Manually')).toBeInTheDocument()
    })

    // Open modal
    const addButton = screen.getByText('Add Manually')
    fireEvent.click(addButton)

    // Fill form
    const nameInput = screen.getByPlaceholderText('John Doe')
    const emailInput = screen.getByPlaceholderText('john@example.com')
    const phoneInput = screen.getByPlaceholderText('+44 7123 456789')
    const roleSelect = screen.getByDisplayValue('')

    fireEvent.change(nameInput, { target: { value: 'Jane Smith' } })
    fireEvent.change(emailInput, { target: { value: 'jane@example.com' } })
    fireEvent.change(phoneInput, { target: { value: '+44 7987 654321' } })
    fireEvent.change(roleSelect, { target: { value: 'staff' } })

    // Submit form
    const submitButton = screen.getByText('Add Staff Member')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/organization/add-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'jane@example.com',
          phone_number: '+44 7987 654321',
          role: 'staff'
        })
      })
    })

    // Check success alert
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Staff member added successfully!')
    })
  })

  it('opens invite staff modal when invite staff button is clicked', async () => {
    render(<StaffPage />)

    await waitFor(() => {
      expect(screen.getByText('Invite Staff')).toBeInTheDocument()
    })

    const inviteButton = screen.getByText('Invite Staff')
    fireEvent.click(inviteButton)

    expect(screen.getByTestId('invite-staff-modal')).toBeInTheDocument()
  })

  it('refreshes staff list after successful invite', async () => {
    render(<StaffPage />)

    await waitFor(() => {
      expect(screen.getByText('Invite Staff')).toBeInTheDocument()
    })

    // Open invite modal
    const inviteButton = screen.getByText('Invite Staff')
    fireEvent.click(inviteButton)

    // Simulate successful invite
    const inviteSuccessButton = screen.getByText('Invite Success')
    fireEvent.click(inviteSuccessButton)

    // Should refetch staff data
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('organization_staff')
    })
  })

  it('shows fallback data when API fails', async () => {
    // Mock API failure
    const mockFetch = jest.mocked(fetch)
    mockFetch.mockImplementation(() => Promise.reject(new Error('API Error')))

    // Mock supabase error
    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn().mockRejectedValue(new Error('Database error'))
        }))
      }))
    })

    render(<StaffPage />)

    await waitFor(() => {
      expect(screen.getByText('demo@example.com')).toBeInTheDocument()
    })

    expect(mockToast.error).toHaveBeenCalledWith('Unable to load staff - showing demo data')
  })

  it('shows error state with retry button when fallback is disabled', async () => {
    // Disable fallback
    const isFeatureEnabledMock = jest.mocked(
      require('@/app/lib/feature-flags').isFeatureEnabled
    )
    isFeatureEnabledMock.mockReturnValue(false)

    // Mock API failure
    const mockFetch = jest.mocked(fetch)
    mockFetch.mockImplementation(() => Promise.reject(new Error('API Error')))

    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn().mockRejectedValue(new Error('Database error'))
        }))
      }))
    })

    render(<StaffPage />)

    await waitFor(() => {
      expect(screen.getByText('Unable to load staff')).toBeInTheDocument()
    })

    const retryButton = screen.getByText('Try Again')
    expect(retryButton).toBeInTheDocument()

    // Test retry functionality
    fireEvent.click(retryButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/organization/get-info')
    })
  })

  it('handles form validation errors', async () => {
    render(<StaffPage />)

    await waitFor(() => {
      expect(screen.getByText('Add Manually')).toBeInTheDocument()
    })

    // Open modal
    const addButton = screen.getByText('Add Manually')
    fireEvent.click(addButton)

    // Try to submit without required fields
    const submitButton = screen.getByText('Add Staff Member')
    fireEvent.click(submitButton)

    // Form should prevent submission (HTML5 validation)
    expect(fetch).not.toHaveBeenCalledWith('/api/organization/add-staff', expect.any(Object))
  })

  it('closes modal when cancel is clicked', async () => {
    render(<StaffPage />)

    await waitFor(() => {
      expect(screen.getByText('Add Manually')).toBeInTheDocument()
    })

    // Open modal
    const addButton = screen.getByText('Add Manually')
    fireEvent.click(addButton)

    expect(screen.getByText('Add Staff Member')).toBeInTheDocument()

    // Click cancel
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    // Modal should be closed
    expect(screen.queryByText('Add Staff Member')).not.toBeInTheDocument()
  })

  it('opens location management modal for staff members', async () => {
    render(<StaffPage />)

    await waitFor(() => {
      expect(screen.getByText('All Locations')).toBeInTheDocument()
    })

    const locationButton = screen.getByText('All Locations')
    fireEvent.click(locationButton)

    expect(screen.getByTestId('staff-location-modal')).toBeInTheDocument()
  })

  it('updates staff list after location change', async () => {
    render(<StaffPage />)

    await waitFor(() => {
      expect(screen.getByText('All Locations')).toBeInTheDocument()
    })

    const locationButton = screen.getByText('All Locations')
    fireEvent.click(locationButton)

    // Save location change
    const saveButton = screen.getByText('Save Location')
    fireEvent.click(saveButton)

    // Should refetch staff
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('organization_staff')
    })
  })
})

// Add missing global alert mock
beforeAll(() => {
  Object.defineProperty(window, 'alert', {
    value: jest.fn()
  })
  Object.defineProperty(window, 'confirm', {
    value: jest.fn(() => true)
  })
})