/**
 * Unit Tests for Forms Categories - Expand/Collapse
 * Tests category accordion functionality
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import FormsPage from '@/app/forms/page'

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
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: { organization_id: 'test-org' },
      error: null
    }),
    limit: jest.fn().mockResolvedValue({
      data: [
        {
          id: '1',
          name: 'Contact Form',
          category: 'Lead Generation',
          created_at: '2024-01-01'
        },
        {
          id: '2',
          name: 'Feedback Form',
          category: 'Customer Service',
          created_at: '2024-01-02'
        },
        {
          id: '3',
          name: 'Registration Form',
          category: 'Lead Generation',
          created_at: '2024-01-03'
        }
      ],
      error: null
    })
  }))
}))

describe('Forms Page - Category Expand/Collapse', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render categories as collapsed by default', async () => {
    render(<FormsPage />)

    await waitFor(() => {
      const leadGenCategory = screen.getByText('Lead Generation')
      expect(leadGenCategory).toBeInTheDocument()
    })

    // Content should be hidden initially
    const formItems = screen.queryAllByText(/Contact Form|Registration Form/)
    expect(formItems).toHaveLength(0)
  })

  it('should expand category when clicked', async () => {
    render(<FormsPage />)

    await waitFor(() => {
      expect(screen.getByText('Lead Generation')).toBeInTheDocument()
    })

    // Click category header
    const categoryHeader = screen.getByText('Lead Generation').closest('.category-header')
    fireEvent.click(categoryHeader!)

    // Forms should now be visible
    await waitFor(() => {
      expect(screen.getByText('Contact Form')).toBeVisible()
      expect(screen.getByText('Registration Form')).toBeVisible()
    })
  })

  it('should collapse category when clicked again', async () => {
    render(<FormsPage />)

    await waitFor(() => {
      expect(screen.getByText('Lead Generation')).toBeInTheDocument()
    })

    const categoryHeader = screen.getByText('Lead Generation').closest('.category-header')
    
    // Expand
    fireEvent.click(categoryHeader!)
    await waitFor(() => {
      expect(screen.getByText('Contact Form')).toBeVisible()
    })

    // Collapse
    fireEvent.click(categoryHeader!)
    await waitFor(() => {
      expect(screen.queryByText('Contact Form')).not.toBeInTheDocument()
    })
  })

  it('should rotate chevron icon when expanding/collapsing', async () => {
    render(<FormsPage />)

    await waitFor(() => {
      expect(screen.getByText('Lead Generation')).toBeInTheDocument()
    })

    const categoryHeader = screen.getByText('Lead Generation').closest('.category-header')
    const chevron = categoryHeader?.querySelector('[data-testid="chevron-icon"], svg')

    // Initial state (collapsed)
    expect(chevron).toHaveStyle({ transform: 'rotate(0deg)' })

    // Expand
    fireEvent.click(categoryHeader!)
    await waitFor(() => {
      expect(chevron).toHaveStyle({ transform: 'rotate(90deg)' })
    })

    // Collapse
    fireEvent.click(categoryHeader!)
    await waitFor(() => {
      expect(chevron).toHaveStyle({ transform: 'rotate(0deg)' })
    })
  })

  it('should handle multiple categories independently', async () => {
    render(<FormsPage />)

    await waitFor(() => {
      expect(screen.getByText('Lead Generation')).toBeInTheDocument()
      expect(screen.getByText('Customer Service')).toBeInTheDocument()
    })

    const leadGenHeader = screen.getByText('Lead Generation').closest('.category-header')
    const customerServiceHeader = screen.getByText('Customer Service').closest('.category-header')

    // Expand Lead Generation
    fireEvent.click(leadGenHeader!)
    await waitFor(() => {
      expect(screen.getByText('Contact Form')).toBeVisible()
    })

    // Customer Service should still be collapsed
    expect(screen.queryByText('Feedback Form')).not.toBeInTheDocument()

    // Expand Customer Service
    fireEvent.click(customerServiceHeader!)
    await waitFor(() => {
      expect(screen.getByText('Feedback Form')).toBeVisible()
    })

    // Both should be expanded
    expect(screen.getByText('Contact Form')).toBeVisible()
    expect(screen.getByText('Feedback Form')).toBeVisible()
  })

  it('should show form count in category header', async () => {
    render(<FormsPage />)

    await waitFor(() => {
      const leadGenCategory = screen.getByText('Lead Generation')
      const categoryHeader = leadGenCategory.closest('.category-header')
      
      // Should show count (2 forms in Lead Generation)
      expect(categoryHeader?.textContent).toContain('2')
    })
  })

  it('should apply smooth transition animation', async () => {
    render(<FormsPage />)

    await waitFor(() => {
      expect(screen.getByText('Lead Generation')).toBeInTheDocument()
    })

    const categoryHeader = screen.getByText('Lead Generation').closest('.category-header')
    const contentWrapper = categoryHeader?.nextElementSibling

    // Check for transition styles
    expect(contentWrapper).toHaveStyle({
      transition: expect.stringContaining('height'),
      overflow: 'hidden'
    })
  })

  it('should maintain expanded state when forms are updated', async () => {
    const { rerender } = render(<FormsPage />)

    await waitFor(() => {
      expect(screen.getByText('Lead Generation')).toBeInTheDocument()
    })

    // Expand category
    const categoryHeader = screen.getByText('Lead Generation').closest('.category-header')
    fireEvent.click(categoryHeader!)

    await waitFor(() => {
      expect(screen.getByText('Contact Form')).toBeVisible()
    })

    // Trigger re-render (simulating data update)
    rerender(<FormsPage />)

    // Should still be expanded
    expect(screen.getByText('Contact Form')).toBeVisible()
  })

  it('should handle empty categories gracefully', async () => {
    // Mock empty category
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user' } },
          error: null
        })
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { organization_id: 'test-org' },
        error: null
      }),
      limit: jest.fn().mockResolvedValue({
        data: [],
        error: null
      })
    }

    const { createClient } = require('@/app/lib/supabase/client')
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    render(<FormsPage />)

    await waitFor(() => {
      // Should show empty state message
      expect(screen.getByText(/No forms.*created/i)).toBeInTheDocument()
    })
  })

  it('should allow interaction with form items when expanded', async () => {
    render(<FormsPage />)

    await waitFor(() => {
      expect(screen.getByText('Lead Generation')).toBeInTheDocument()
    })

    // Expand category
    const categoryHeader = screen.getByText('Lead Generation').closest('.category-header')
    fireEvent.click(categoryHeader!)

    await waitFor(() => {
      expect(screen.getByText('Contact Form')).toBeVisible()
    })

    // Should have action buttons for forms
    const editButtons = screen.getAllByText(/Edit/i)
    const previewButtons = screen.getAllByText(/Preview/i)
    
    expect(editButtons.length).toBeGreaterThan(0)
    expect(previewButtons.length).toBeGreaterThan(0)
    
    // Buttons should be clickable
    editButtons.forEach(button => {
      expect(button.closest('button')).not.toBeDisabled()
    })
  })
})