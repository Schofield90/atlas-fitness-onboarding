import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { jest } from '@jest/globals'
import FormsDocumentsPage from '@/app/forms/page'

// Mock DashboardLayout
jest.mock('@/app/components/DashboardLayout', () => {
  return function MockDashboardLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="dashboard-layout">{children}</div>
  }
})

// Mock supabase client
const mockSupabase = {
  from: jest.fn()
}

jest.mock('@/app/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

// Mock fetch globally
global.fetch = jest.fn()

// Mock window.location.href assignment
Object.defineProperty(window, 'location', {
  value: {
    href: ''
  },
  writable: true
})

// Mock alert
Object.defineProperty(window, 'alert', {
  value: jest.fn()
})

describe('Forms Accordions Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful forms API response
    const mockFetch = jest.mocked(fetch)
    mockFetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/forms/list')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            forms: [
              {
                id: '1',
                title: 'Test Waiver Form',
                description: 'A test waiver form',
                type: 'waiver',
                is_active: true,
                created_at: '2025-01-01',
                schema: { fields: [] }
              },
              {
                id: '2',
                title: 'Test Contract Form',
                description: 'A test contract form',
                type: 'contract',
                is_active: true,
                created_at: '2025-01-01',
                schema: { fields: [] }
              }
            ]
          })
        } as Response)
      }
      return Promise.reject(new Error('Unknown URL'))
    })
  })

  it('renders all accordion categories initially collapsed', async () => {
    render(<FormsDocumentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Website & Forms')).toBeInTheDocument()
    })

    // Check all accordion categories are present
    expect(screen.getByText('Waivers')).toBeInTheDocument()
    expect(screen.getByText('Contracts')).toBeInTheDocument()
    expect(screen.getByText('Health Forms')).toBeInTheDocument()
    expect(screen.getByText('Policies')).toBeInTheDocument()

    // Check chevron down icons are shown (collapsed state)
    const chevronDownIcons = screen.getAllByTestId('chevron-down') || 
      document.querySelectorAll('svg').length > 0 // Fallback check for lucide icons

    // Check that the expanded content is not visible
    expect(screen.queryByText('Waivers Documents')).not.toBeInTheDocument()
    expect(screen.queryByText('Contracts Documents')).not.toBeInTheDocument()
  })

  it('expands accordion when category is clicked', async () => {
    render(<FormsDocumentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Waivers')).toBeInTheDocument()
    })

    // Click on Waivers category
    const waiversCategory = screen.getByText('Waivers').closest('.cursor-pointer')
    expect(waiversCategory).toBeTruthy()
    
    fireEvent.click(waiversCategory!)

    // Check that the content expands
    await waitFor(() => {
      expect(screen.getByText('Waivers Documents')).toBeInTheDocument()
    })

    // Should show the form that matches the waiver type
    expect(screen.getByText('Test Waiver Form')).toBeInTheDocument()
  })

  it('collapses accordion when expanded category is clicked again', async () => {
    render(<FormsDocumentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Waivers')).toBeInTheDocument()
    })

    const waiversCategory = screen.getByText('Waivers').closest('.cursor-pointer')
    
    // Expand
    fireEvent.click(waiversCategory!)
    
    await waitFor(() => {
      expect(screen.getByText('Waivers Documents')).toBeInTheDocument()
    })

    // Collapse
    fireEvent.click(waiversCategory!)
    
    await waitFor(() => {
      expect(screen.queryByText('Waivers Documents')).not.toBeInTheDocument()
    })
  })

  it('shows correct form counts in accordion headers', async () => {
    render(<FormsDocumentsPage />)

    await waitFor(() => {
      expect(screen.getByText('1 forms')).toBeInTheDocument() // Waivers
    })

    // Check form counts for each category
    const waiversText = screen.getByText('Waivers').closest('.bg-gray-800')
    expect(waiversText).toHaveTextContent('1 forms') // 1 waiver form

    const contractsText = screen.getByText('Contracts').closest('.bg-gray-800')
    expect(contractsText).toHaveTextContent('1 forms') // 1 contract form

    const healthText = screen.getByText('Health Forms').closest('.bg-gray-800')
    expect(healthText).toHaveTextContent('0 forms') // No health forms

    const policiesText = screen.getByText('Policies').closest('.bg-gray-800')
    expect(policiesText).toHaveTextContent('0 forms') // No policy forms
  })

  it('shows empty state when accordion category has no forms', async () => {
    render(<FormsDocumentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Health Forms')).toBeInTheDocument()
    })

    // Click on Health Forms category (which has no forms)
    const healthCategory = screen.getByText('Health Forms').closest('.cursor-pointer')
    fireEvent.click(healthCategory!)

    await waitFor(() => {
      expect(screen.getByText('Health Documents')).toBeInTheDocument()
    })

    // Should show empty state
    expect(screen.getByText('No health forms created yet')).toBeInTheDocument()
    expect(screen.getByText('Create health Form with AI')).toBeInTheDocument()
  })

  it('shows empty state when no forms exist at all', async () => {
    // Mock empty forms response
    const mockFetch = jest.mocked(fetch)
    mockFetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: async () => ({ forms: [] })
      } as Response)
    )

    render(<FormsDocumentsPage />)

    await waitFor(() => {
      expect(screen.getByText('No forms created yet')).toBeInTheDocument()
    })

    expect(screen.getByText('Use the AI Form Builder to create forms for your gym')).toBeInTheDocument()
  })

  it('allows multiple accordions to be expanded simultaneously', async () => {
    render(<FormsDocumentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Waivers')).toBeInTheDocument()
    })

    // Expand Waivers
    const waiversCategory = screen.getByText('Waivers').closest('.cursor-pointer')
    fireEvent.click(waiversCategory!)

    await waitFor(() => {
      expect(screen.getByText('Waivers Documents')).toBeInTheDocument()
    })

    // Expand Contracts while Waivers is still expanded
    const contractsCategory = screen.getByText('Contracts').closest('.cursor-pointer')
    fireEvent.click(contractsCategory!)

    await waitFor(() => {
      expect(screen.getByText('Contracts Documents')).toBeInTheDocument()
    })

    // Both should be expanded
    expect(screen.getByText('Waivers Documents')).toBeInTheDocument()
    expect(screen.getByText('Contracts Documents')).toBeInTheDocument()
    expect(screen.getByText('Test Waiver Form')).toBeInTheDocument()
    expect(screen.getByText('Test Contract Form')).toBeInTheDocument()
  })

  it('provides action buttons for forms within expanded accordions', async () => {
    render(<FormsDocumentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Waivers')).toBeInTheDocument()
    })

    // Expand Waivers
    const waiversCategory = screen.getByText('Waivers').closest('.cursor-pointer')
    fireEvent.click(waiversCategory!)

    await waitFor(() => {
      expect(screen.getByText('Test Waiver Form')).toBeInTheDocument()
    })

    // Check action buttons
    const viewButton = screen.getByText('View')
    const editButton = screen.getByText('Edit')
    
    expect(viewButton).toBeInTheDocument()
    expect(editButton).toBeInTheDocument()
    expect(viewButton).toHaveClass('bg-blue-600')
    expect(editButton).toHaveClass('bg-gray-600')
  })

  it('creates new form from empty state accordion', async () => {
    render(<FormsDocumentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Policies')).toBeInTheDocument()
    })

    // Click on Policies category (which has no forms)
    const policiesCategory = screen.getByText('Policies').closest('.cursor-pointer')
    fireEvent.click(policiesCategory!)

    await waitFor(() => {
      expect(screen.getByText('Create policy Form with AI')).toBeInTheDocument()
    })

    // Click create form button
    const createButton = screen.getByText('Create policy Form with AI')
    fireEvent.click(createButton)

    // Should open AI form builder modal
    expect(screen.getByText('AI Form Builder')).toBeInTheDocument()
  })

  it('handles API errors gracefully during form loading', async () => {
    // Mock API failure
    const mockFetch = jest.mocked(fetch)
    mockFetch.mockRejectedValue(new Error('API Error'))

    render(<FormsDocumentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Website & Forms')).toBeInTheDocument()
    })

    // Should still show accordion categories with 0 counts
    expect(screen.getByText('Waivers')).toBeInTheDocument()
    expect(screen.getByText('0 forms')).toBeInTheDocument()

    // Expanding should show empty state
    const waiversCategory = screen.getByText('Waivers').closest('.cursor-pointer')
    fireEvent.click(waiversCategory!)

    await waitFor(() => {
      expect(screen.getByText('No waiver forms created yet')).toBeInTheDocument()
    })
  })

  it('shows loading spinner initially', () => {
    // Mock delayed response
    const mockFetch = jest.mocked(fetch)
    mockFetch.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ forms: [] })
      } as Response), 100))
    )

    render(<FormsDocumentsPage />)

    // Should show loading spinner
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('filters forms correctly by type in accordions', async () => {
    // Add more diverse forms to test filtering
    const mockFetch = jest.mocked(fetch)
    mockFetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: async () => ({
          forms: [
            { id: '1', title: 'Waiver 1', type: 'waiver', is_active: true, created_at: '2025-01-01', schema: { fields: [] } },
            { id: '2', title: 'Waiver 2', type: 'waiver', is_active: true, created_at: '2025-01-01', schema: { fields: [] } },
            { id: '3', title: 'Contract 1', type: 'contract', is_active: true, created_at: '2025-01-01', schema: { fields: [] } },
            { id: '4', title: 'Health Form 1', type: 'health', is_active: true, created_at: '2025-01-01', schema: { fields: [] } }
          ]
        })
      } as Response)
    )

    render(<FormsDocumentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Website & Forms')).toBeInTheDocument()
    })

    // Expand Waivers - should show only waiver forms
    const waiversCategory = screen.getByText('Waivers').closest('.cursor-pointer')
    fireEvent.click(waiversCategory!)

    await waitFor(() => {
      expect(screen.getByText('Waiver 1')).toBeInTheDocument()
      expect(screen.getByText('Waiver 2')).toBeInTheDocument()
    })

    // Should NOT show forms from other categories
    expect(screen.queryByText('Contract 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Health Form 1')).not.toBeInTheDocument()
  })
})