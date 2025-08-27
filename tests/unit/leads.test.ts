/**
 * Unit Tests for Leads Page Fixes
 * Tests multi-tenancy fix and export feedback implementation
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import LeadsContent from '@/app/leads/leads-content'
import { createClient } from '@/app/lib/supabase/client'

// Mock Supabase client
jest.mock('@/app/lib/supabase/client', () => ({
  createClient: jest.fn()
}))

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

describe('Leads Page - Multi-tenancy Fix', () => {
  let mockSupabase: any
  let mockUser: any
  let mockOrganization: any

  beforeEach(() => {
    // Setup mock user and organization
    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com'
    }
    
    mockOrganization = {
      id: 'dynamic-org-id-123',
      name: 'Test Organization'
    }

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { organization_id: mockOrganization.id },
        error: null
      }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [],
        error: null
      })
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should dynamically fetch organization ID from user context', async () => {
    // Render component
    render(<LeadsContent />)

    // Wait for organization fetch
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('user_organizations')
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id)
      expect(mockSupabase.select).toHaveBeenCalledWith('organization_id')
    })
  })

  it('should not use hard-coded organization IDs', async () => {
    // Render component
    render(<LeadsContent />)

    // Wait for data fetch
    await waitFor(() => {
      // Check that no hard-coded ID is used
      const calls = mockSupabase.eq.mock.calls
      calls.forEach((call: any[]) => {
        if (call[0] === 'organization_id') {
          // Should not be the old hard-coded ID
          expect(call[1]).not.toBe('63589490-8f55-4157-bd3a-e141594b748e')
          // Should be the dynamic ID
          expect(call[1]).toBe(mockOrganization.id)
        }
      })
    })
  })

  it('should ensure data isolation between organizations', async () => {
    // Setup different organization
    const differentOrgId = 'different-org-456'
    mockSupabase.single.mockResolvedValueOnce({
      data: { organization_id: differentOrgId },
      error: null
    })

    // Render component
    render(<LeadsContent />)

    // Wait for data fetch
    await waitFor(() => {
      // Verify queries are scoped to the correct organization
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', differentOrgId)
    })

    // Change organization
    const newOrgId = 'new-org-789'
    mockSupabase.single.mockResolvedValueOnce({
      data: { organization_id: newOrgId },
      error: null
    })

    // Re-render
    render(<LeadsContent />)

    await waitFor(() => {
      // Verify new queries use new organization
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', newOrgId)
    })
  })
})

describe('Leads Page - Export Feedback', () => {
  let mockSupabase: any
  let mockToast: any

  beforeEach(() => {
    // Import toast mock
    mockToast = require('sonner').toast

    // Setup mock data
    const mockLeads = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        status: 'new',
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: '2', 
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+0987654321',
        status: 'contacted',
        created_at: '2024-01-02T00:00:00Z'
      }
    ]

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
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: mockLeads,
        error: null
      }),
      single: jest.fn().mockResolvedValue({
        data: { organization_id: 'test-org' },
        error: null
      })
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    // Mock CSV download
    global.URL.createObjectURL = jest.fn()
    global.URL.revokeObjectURL = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should show success toast when export completes', async () => {
    render(<LeadsContent />)

    // Wait for leads to load
    await waitFor(() => {
      expect(screen.getByText(/Export CSV/i)).toBeInTheDocument()
    })

    // Click export button
    const exportButton = screen.getByText(/Export CSV/i)
    fireEvent.click(exportButton)

    // Wait for export to complete
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith(
        expect.stringContaining('exported successfully'),
        expect.objectContaining({
          description: expect.stringContaining('2 leads')
        })
      )
    })
  })

  it('should show error toast when export fails', async () => {
    // Setup error scenario
    mockSupabase.limit.mockResolvedValueOnce({
      data: null,
      error: new Error('Export failed')
    })

    render(<LeadsContent />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/Export CSV/i)).toBeInTheDocument()
    })

    // Try to export
    const exportButton = screen.getByText(/Export CSV/i)
    fireEvent.click(exportButton)

    // Wait for error
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        'Export Failed',
        expect.objectContaining({
          description: expect.stringContaining('error')
        })
      )
    })
  })

  it('should trigger CSV download with correct filename', async () => {
    // Mock date for consistent filename
    const mockDate = new Date('2024-01-15T12:00:00Z')
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any)

    // Mock document.createElement and appendChild
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn()
    }
    jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any)
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any)
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any)

    render(<LeadsContent />)

    await waitFor(() => {
      expect(screen.getByText(/Export CSV/i)).toBeInTheDocument()
    })

    const exportButton = screen.getByText(/Export CSV/i)
    fireEvent.click(exportButton)

    await waitFor(() => {
      // Check download was triggered with correct filename format
      expect(mockLink.download).toMatch(/leads-export-\d{8}-\d{6}\.csv/)
      expect(mockLink.click).toHaveBeenCalled()
    })
  })

  it('should include all lead data in CSV export', async () => {
    let csvContent = ''
    
    // Capture the blob content
    global.Blob = jest.fn().mockImplementation((content) => {
      csvContent = content[0]
      return { size: content[0].length, type: 'text/csv' }
    }) as any

    render(<LeadsContent />)

    await waitFor(() => {
      expect(screen.getByText(/Export CSV/i)).toBeInTheDocument()
    })

    const exportButton = screen.getByText(/Export CSV/i)
    fireEvent.click(exportButton)

    await waitFor(() => {
      // Verify CSV headers
      expect(csvContent).toContain('Name')
      expect(csvContent).toContain('Email')
      expect(csvContent).toContain('Phone')
      expect(csvContent).toContain('Status')
      
      // Verify lead data
      expect(csvContent).toContain('John Doe')
      expect(csvContent).toContain('john@example.com')
      expect(csvContent).toContain('Jane Smith')
      expect(csvContent).toContain('jane@example.com')
    })
  })
})