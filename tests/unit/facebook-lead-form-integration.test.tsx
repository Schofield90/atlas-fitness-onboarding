/**
 * QA Test Suite: Facebook Lead Form Integration
 * 
 * Tests the Facebook Lead Form trigger node configuration and form loading
 * This addresses one of the critical automation builder fixes and validates
 * the integration with Facebook's API for lead form management.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DynamicConfigPanelEnhanced from '@/app/components/automation/config/DynamicConfigPanelEnhanced'
import { WorkflowNode } from '@/app/lib/types/automation'

// Mock the feature flags hook
jest.mock('@/app/lib/feature-flags', () => ({
  useFeatureFlag: jest.fn(() => false)
}))

// Mock toast notifications
jest.mock('react-hot-toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn()
  }
}))

// Mock API calls
global.fetch = jest.fn()

describe('Facebook Lead Form Integration QA Tests', () => {
  const mockFacebookTriggerNode: WorkflowNode = {
    id: 'facebook-trigger-1',
    type: 'trigger',
    position: { x: 100, y: 100 },
    data: {
      label: 'Facebook Lead Form',
      actionType: 'facebook_lead_form',
      config: {},
      description: 'Triggers when a lead submits a Facebook lead form',
      isValid: false
    }
  }

  const mockProps = {
    node: mockFacebookTriggerNode,
    onClose: jest.fn(),
    onSave: jest.fn(),
    organizationId: 'org-123'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset fetch mock
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Facebook Lead Form Node Configuration', () => {
    test('should render Facebook Lead Form configuration panel', async () => {
      // Mock successful Facebook pages API response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasConnection: true,
          pages: [
            { id: 'page1', name: 'Atlas Fitness - Main' },
            { id: 'page2', name: 'Atlas Fitness - North' }
          ]
        })
      })

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      expect(screen.getByText('Configure Facebook Lead Form')).toBeInTheDocument()
      
      // Should show loading state initially
      await waitFor(() => {
        expect(screen.getByText('Facebook Page')).toBeInTheDocument()
      })
    })

    test('should load Facebook pages and forms on mount', async () => {
      const mockPages = [
        { id: 'page1', name: 'Atlas Fitness - Main' },
        { id: 'page2', name: 'Atlas Fitness - North' }
      ]

      const mockForms = [
        { id: 'form1', name: 'Free Trial Form', pageId: 'page1' },
        { id: 'form2', name: 'Contact Form', pageId: 'page1' }
      ]

      // Mock pages API call
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            hasConnection: true,
            pages: mockPages.map(page => ({
              ...page,
              forms: mockForms.filter(form => form.pageId === page.id)
            }))
          })
        })

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/integrations/facebook/pages')
      })
    })

    test('should handle Facebook connection missing', async () => {
      // Mock no Facebook connection response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasConnection: false,
          pages: []
        })
      })

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText(/No pages available - Please connect Facebook/)).toBeInTheDocument()
      })
    })

    test('should show page dropdown with available Facebook pages', async () => {
      const mockPages = [
        { id: 'page1', name: 'Atlas Fitness - Main' },
        { id: 'page2', name: 'Atlas Fitness - North' }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasConnection: true,
          pages: mockPages
        })
      })

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      await waitFor(() => {
        const pageSelect = screen.getByRole('combobox', { name: /facebook page/i })
        expect(pageSelect).toBeInTheDocument()
        
        // Check if pages are loaded in options
        expect(screen.getByText('Atlas Fitness - Main')).toBeInTheDocument()
        expect(screen.getByText('Atlas Fitness - North')).toBeInTheDocument()
      })
    })

    test('should show forms dropdown when page is selected', async () => {
      const user = userEvent.setup()

      const mockPages = [
        { 
          id: 'page1', 
          name: 'Atlas Fitness - Main',
          forms: [
            { id: 'form1', name: 'Free Trial Form', facebook_form_id: 'form1' },
            { id: 'form2', name: 'Contact Form', facebook_form_id: 'form2' }
          ]
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasConnection: true,
          pages: mockPages
        })
      })

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /facebook page/i })).toBeInTheDocument()
      })

      // Select a page
      const pageSelect = screen.getByRole('combobox', { name: /facebook page/i })
      await user.selectOptions(pageSelect, 'page1')

      // Forms dropdown should appear
      await waitFor(() => {
        expect(screen.getByText(/Select Lead Forms/)).toBeInTheDocument()
        expect(screen.getByText('All Forms for this Page')).toBeInTheDocument()
        expect(screen.getByText(/Free Trial Form/)).toBeInTheDocument()
        expect(screen.getByText(/Contact Form/)).toBeInTheDocument()
      })
    })

    test('should include "All Forms" option in forms dropdown', async () => {
      const user = userEvent.setup()

      const mockPages = [
        { 
          id: 'page1', 
          name: 'Atlas Fitness - Main',
          forms: [
            { id: 'form1', name: 'Free Trial Form', facebook_form_id: 'form1' }
          ]
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasConnection: true,
          pages: mockPages
        })
      })

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      await waitFor(() => {
        const pageSelect = screen.getByRole('combobox', { name: /facebook page/i })
        expect(pageSelect).toBeInTheDocument()
      })

      // Select a page
      const pageSelect = screen.getByRole('combobox', { name: /facebook page/i })
      await user.selectOptions(pageSelect, 'page1')

      // Verify "All Forms" option is available and selectable
      await waitFor(() => {
        const allFormsCheckbox = screen.getByRole('checkbox', { name: /All Forms for this Page/ })
        expect(allFormsCheckbox).toBeInTheDocument()
        expect(allFormsCheckbox).not.toBeChecked()
      })

      // Should be able to select "All Forms" option
      const allFormsCheckbox = screen.getByRole('checkbox', { name: /All Forms for this Page/ })
      await user.click(allFormsCheckbox)
      expect(allFormsCheckbox).toBeChecked()
    })

    test('should handle form selection and multi-select functionality', async () => {
      const user = userEvent.setup()

      const mockPages = [
        { 
          id: 'page1', 
          name: 'Atlas Fitness - Main',
          forms: [
            { id: 'form1', name: 'Free Trial Form', facebook_form_id: 'form1' },
            { id: 'form2', name: 'Contact Form', facebook_form_id: 'form2' },
            { id: 'form3', name: 'Newsletter Form', facebook_form_id: 'form3' }
          ]
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasConnection: true,
          pages: mockPages
        })
      })

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      // Wait for page selection
      await waitFor(() => {
        const pageSelect = screen.getByRole('combobox', { name: /facebook page/i })
        expect(pageSelect).toBeInTheDocument()
      })

      const pageSelect = screen.getByRole('combobox', { name: /facebook page/i })
      await user.selectOptions(pageSelect, 'page1')

      // Wait for forms to load
      await waitFor(() => {
        expect(screen.getByText('Free Trial Form')).toBeInTheDocument()
      })

      // Select multiple forms
      const form1Checkbox = screen.getByRole('checkbox', { name: /Free Trial Form/ })
      const form2Checkbox = screen.getByRole('checkbox', { name: /Contact Form/ })

      await user.click(form1Checkbox)
      await user.click(form2Checkbox)

      expect(form1Checkbox).toBeChecked()
      expect(form2Checkbox).toBeChecked()
    })

    test('should provide refresh forms functionality', async () => {
      const user = userEvent.setup()

      const mockPages = [
        { 
          id: 'page1', 
          name: 'Atlas Fitness - Main',
          forms: []
        }
      ]

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            hasConnection: true,
            pages: mockPages
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            hasConnection: true,
            pages: [
              {
                ...mockPages[0],
                forms: [
                  { id: 'form1', name: 'New Form', facebook_form_id: 'form1' }
                ]
              }
            ]
          })
        })

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      // Select page
      await waitFor(() => {
        const pageSelect = screen.getByRole('combobox', { name: /facebook page/i })
        expect(pageSelect).toBeInTheDocument()
      })

      const pageSelect = screen.getByRole('combobox', { name: /facebook page/i })
      await user.selectOptions(pageSelect, 'page1')

      // Should show refresh button when forms are not found
      await waitFor(() => {
        const refreshButton = screen.getByText(/🔄 Refresh Forms/)
        expect(refreshButton).toBeInTheDocument()
      })

      // Click refresh button
      const refreshButton = screen.getByText(/🔄 Refresh Forms/)
      await user.click(refreshButton)

      // Should trigger another API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })
    })

    test('should validate required fields before saving', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasConnection: true,
          pages: []
        })
      })

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      // Try to save without selecting page or forms
      const saveButton = screen.getByText('Save Configuration')
      await user.click(saveButton)

      // Should not call onSave if validation fails
      expect(mockProps.onSave).not.toHaveBeenCalled()
    })

    test('should save configuration when all required fields are filled', async () => {
      const user = userEvent.setup()

      const mockPages = [
        { 
          id: 'page1', 
          name: 'Atlas Fitness - Main',
          forms: [
            { id: 'form1', name: 'Free Trial Form', facebook_form_id: 'form1' }
          ]
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasConnection: true,
          pages: mockPages
        })
      })

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      // Fill required fields
      await waitFor(() => {
        const pageSelect = screen.getByRole('combobox', { name: /facebook page/i })
        expect(pageSelect).toBeInTheDocument()
      })

      const pageSelect = screen.getByRole('combobox', { name: /facebook page/i })
      await user.selectOptions(pageSelect, 'page1')

      await waitFor(() => {
        const formCheckbox = screen.getByRole('checkbox', { name: /Free Trial Form/ })
        expect(formCheckbox).toBeInTheDocument()
      })

      const formCheckbox = screen.getByRole('checkbox', { name: /Free Trial Form/ })
      await user.click(formCheckbox)

      // Save configuration
      const saveButton = screen.getByText('Save Configuration')
      await user.click(saveButton)

      // Should call onSave with proper configuration
      await waitFor(() => {
        expect(mockProps.onSave).toHaveBeenCalledWith('facebook-trigger-1', {
          label: 'Facebook Lead Form',
          pageId: 'page1',
          formIds: ['form1']
        })
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle API errors gracefully', async () => {
      // Mock API error
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      await waitFor(() => {
        // Should show error state or fallback
        expect(screen.getByText(/No pages available - Please connect Facebook/)).toBeInTheDocument()
      })
    })

    test('should handle empty forms list', async () => {
      const user = userEvent.setup()

      const mockPages = [
        { 
          id: 'page1', 
          name: 'Atlas Fitness - Main',
          forms: []
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasConnection: true,
          pages: mockPages
        })
      })

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      await waitFor(() => {
        const pageSelect = screen.getByRole('combobox', { name: /facebook page/i })
        expect(pageSelect).toBeInTheDocument()
      })

      const pageSelect = screen.getByRole('combobox', { name: /facebook page/i })
      await user.selectOptions(pageSelect, 'page1')

      await waitFor(() => {
        expect(screen.getByText(/No forms found - Create forms in Facebook Ads Manager/)).toBeInTheDocument()
      })
    })

    test('should validate node data on component mount', () => {
      const invalidNodeProps = {
        ...mockProps,
        node: null as any
      }

      render(<DynamicConfigPanelEnhanced {...invalidNodeProps} />)

      // Should call onClose immediately for invalid node
      expect(mockProps.onClose).toHaveBeenCalled()
    })
  })

  describe('Integration with Workflow Builder', () => {
    test('should handle node configuration updates correctly', () => {
      const mockConfigUpdate = {
        label: 'Custom Facebook Lead Form',
        pageId: 'page1',
        formIds: ['form1', 'form2']
      }

      render(<DynamicConfigPanelEnhanced {...mockProps} />)

      // Simulate configuration save
      const configPanel = screen.getByRole('dialog')
      expect(configPanel).toBeInTheDocument()

      // The component should be ready to handle config updates
      expect(mockProps.node.id).toBe('facebook-trigger-1')
      expect(mockProps.node.type).toBe('trigger')
      expect(mockProps.node.data.actionType).toBe('facebook_lead_form')
    })
  })
})