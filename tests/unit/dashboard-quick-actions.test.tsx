/**
 * Unit Tests for Dashboard Quick Actions Fix
 * Tests that "Add New Lead" quick action opens modal instead of routing to broken /leads/new
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import DirectDashboardPage from '@/app/dashboard-direct/page'
import QuickDashboard from '@/app/quick-dashboard/page'
import { createClient } from '@/app/lib/supabase/client'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

// Mock Supabase client
jest.mock('@/app/lib/supabase/client', () => ({
  createClient: jest.fn()
}))

// Mock DashboardLayout
jest.mock('@/app/components/DashboardLayout', () => {
  return function MockDashboardLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="dashboard-layout">{children}</div>
  }
})

// Mock AddLeadModal
jest.mock('@/app/components/leads/AddLeadModal', () => ({
  AddLeadModal: ({ isOpen, onClose, onLeadAdded }: any) => (
    <div data-testid="add-lead-modal" style={{ display: isOpen ? 'block' : 'none' }}>
      <div data-testid="modal-content">Add New Lead Modal</div>
      <button data-testid="modal-close" onClick={onClose}>Close</button>
      <button data-testid="modal-submit" onClick={onLeadAdded}>Add Lead</button>
    </div>
  )
}))

describe('Dashboard Quick Actions - Add New Lead Fix', () => {
  let mockRouter: any
  let mockSupabase: any

  beforeEach(() => {
    // Setup mock router
    mockRouter = {
      push: jest.fn()
    }
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user', email: 'test@example.com' } },
          error: null
        })
      }
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn()
      },
      writable: true
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('DirectDashboardPage', () => {
    it('should render "Add New Lead" quick action button', async () => {
      render(<DirectDashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Add New Lead')).toBeInTheDocument()
      })
    })

    it('should open AddLeadModal when "Add New Lead" is clicked (not route to /leads/new)', async () => {
      render(<DirectDashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Add New Lead')).toBeInTheDocument()
      })

      // Click the "Add New Lead" button
      const addLeadButton = screen.getByText('Add New Lead')
      fireEvent.click(addLeadButton)

      // Should open modal, not navigate
      await waitFor(() => {
        expect(screen.getByTestId('add-lead-modal')).toBeVisible()
        expect(screen.getByTestId('modal-content')).toBeInTheDocument()
      })

      // Should NOT call router.push to /leads/new
      expect(mockRouter.push).not.toHaveBeenCalledWith('/leads/new')
    })

    it('should close modal when modal close is clicked', async () => {
      render(<DirectDashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Add New Lead')).toBeInTheDocument()
      })

      // Open modal
      const addLeadButton = screen.getByText('Add New Lead')
      fireEvent.click(addLeadButton)

      await waitFor(() => {
        expect(screen.getByTestId('add-lead-modal')).toBeVisible()
      })

      // Close modal
      const closeButton = screen.getByTestId('modal-close')
      fireEvent.click(closeButton)

      await waitFor(() => {
        expect(screen.getByTestId('add-lead-modal')).not.toBeVisible()
      })
    })

    it('should close modal when lead is added successfully', async () => {
      render(<DirectDashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Add New Lead')).toBeInTheDocument()
      })

      // Open modal
      const addLeadButton = screen.getByText('Add New Lead')
      fireEvent.click(addLeadButton)

      await waitFor(() => {
        expect(screen.getByTestId('add-lead-modal')).toBeVisible()
      })

      // Submit lead
      const submitButton = screen.getByTestId('modal-submit')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('add-lead-modal')).not.toBeVisible()
      })
    })
  })

  describe('QuickDashboard', () => {
    it('should render "+ Add New Lead" quick action button', () => {
      render(<QuickDashboard />)

      expect(screen.getByText('+ Add New Lead')).toBeInTheDocument()
    })

    it('should open AddLeadModal when "+ Add New Lead" is clicked (not route to /leads/new)', async () => {
      render(<QuickDashboard />)

      // Click the "+ Add New Lead" button
      const addLeadButton = screen.getByText('+ Add New Lead')
      fireEvent.click(addLeadButton)

      // Should open modal, not navigate
      await waitFor(() => {
        expect(screen.getByTestId('add-lead-modal')).toBeVisible()
        expect(screen.getByTestId('modal-content')).toBeInTheDocument()
      })

      // Should NOT call router.push to /leads/new
      expect(mockRouter.push).not.toHaveBeenCalledWith('/leads/new')
    })
  })

  describe('Integration with working leads page pattern', () => {
    it('should use the same modal component as the working leads page', async () => {
      render(<DirectDashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Add New Lead')).toBeInTheDocument()
      })

      // Click button to open modal
      const addLeadButton = screen.getByText('Add New Lead')
      fireEvent.click(addLeadButton)

      // Verify it's using the same AddLeadModal component with same props structure
      await waitFor(() => {
        const modal = screen.getByTestId('add-lead-modal')
        expect(modal).toBeInTheDocument()
        
        // Check that modal has the expected content (indicating correct component is used)
        expect(screen.getByTestId('modal-content')).toHaveTextContent('Add New Lead Modal')
      })
    })

    it('should provide the same callback structure as the working leads page', async () => {
      render(<QuickDashboard />)

      // Open modal
      const addLeadButton = screen.getByText('+ Add New Lead')
      fireEvent.click(addLeadButton)

      await waitFor(() => {
        expect(screen.getByTestId('add-lead-modal')).toBeVisible()
      })

      // Test onLeadAdded callback (should close modal)
      const submitButton = screen.getByTestId('modal-submit')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('add-lead-modal')).not.toBeVisible()
      })

      // Test onClose callback
      fireEvent.click(addLeadButton) // Reopen
      await waitFor(() => {
        expect(screen.getByTestId('add-lead-modal')).toBeVisible()
      })

      const closeButton = screen.getByTestId('modal-close')
      fireEvent.click(closeButton)

      await waitFor(() => {
        expect(screen.getByTestId('add-lead-modal')).not.toBeVisible()
      })
    })
  })

  describe('Regression test - should not route to /leads/new', () => {
    it('should never call router.push with /leads/new for any dashboard', async () => {
      const dashboards = [
        { component: DirectDashboardPage, buttonText: 'Add New Lead' },
        { component: QuickDashboard, buttonText: '+ Add New Lead' }
      ]

      for (const { component: Component, buttonText } of dashboards) {
        // Clear mocks between tests
        jest.clearAllMocks()
        
        const { unmount } = render(<Component />)

        if (buttonText === 'Add New Lead') {
          // DirectDashboardPage needs to wait for auth
          await waitFor(() => {
            expect(screen.getByText(buttonText)).toBeInTheDocument()
          })
        } else {
          // QuickDashboard renders immediately
          expect(screen.getByText(buttonText)).toBeInTheDocument()
        }

        // Click the button
        const addLeadButton = screen.getByText(buttonText)
        fireEvent.click(addLeadButton)

        // Verify router.push was never called with /leads/new
        expect(mockRouter.push).not.toHaveBeenCalledWith('/leads/new')

        // Verify modal opened instead
        await waitFor(() => {
          expect(screen.getByTestId('add-lead-modal')).toBeVisible()
        })

        unmount()
      }
    })
  })
})