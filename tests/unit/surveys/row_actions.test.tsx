import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { jest } from '@jest/globals'
import SurveyPage from '@/app/surveys/page'

// Mock DashboardLayout
jest.mock('@/app/components/DashboardLayout', () => {
  return function MockDashboardLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="dashboard-layout">{children}</div>
  }
})

// Mock ComingSoon component
jest.mock('@/app/components/ComingSoon', () => {
  return function MockComingSoon({ variant, feature, description }: any) {
    return (
      <div data-testid="coming-soon-banner">
        <span>{feature}</span>
        <span>{description}</span>
      </div>
    )
  }
})

// Mock SurveyAnalytics component
jest.mock('@/app/components/surveys/SurveyAnalytics', () => {
  return function MockSurveyAnalytics({ surveyId, surveyData }: any) {
    return (
      <div data-testid="survey-analytics">
        <div className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-medium">
          Demo Data
        </div>
        <p>Analytics for survey: {surveyData?.title}</p>
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

// Mock feature flags
jest.mock('@/app/lib/feature-flags', () => ({
  isFeatureEnabled: jest.fn((flag: string) => {
    if (flag === 'surveysActions') return false // Edit is disabled by default
    if (flag === 'surveysCreate') return false // Create disabled for waitlist test
    return false
  })
}))

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: jest.fn(() => true)
})

describe('Survey Row Actions Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders survey table with action buttons', async () => {
    render(<SurveyPage />)

    // Wait for component to mount
    await waitFor(() => {
      expect(screen.getByText('Surveys & Feedback')).toBeInTheDocument()
    })

    // Check that survey rows are rendered
    expect(screen.getByText('Fitness Goals Assessment')).toBeInTheDocument()
    expect(screen.getByText('Class Feedback Survey')).toBeInTheDocument()

    // Check action buttons are present
    const viewButtons = screen.getAllByTitle('View Survey (Read-only)')
    expect(viewButtons).toHaveLength(4) // 4 surveys in mock data

    const editButtons = screen.getAllByTitle('Coming soon')
    expect(editButtons).toHaveLength(4)

    const deleteButtons = screen.getAllByTitle('Delete Survey')
    expect(deleteButtons).toHaveLength(4)
  })

  it('opens view modal when view button is clicked', async () => {
    render(<SurveyPage />)

    await waitFor(() => {
      expect(screen.getByText('Fitness Goals Assessment')).toBeInTheDocument()
    })

    // Click the first view button
    const viewButtons = screen.getAllByTitle('View Survey (Read-only)')
    fireEvent.click(viewButtons[0])

    // Modal should be visible
    expect(screen.getByText('Fitness Goals Assessment')).toBeInTheDocument()
    expect(screen.getByText('Read-only Preview')).toBeInTheDocument()
    expect(screen.getByText('Understanding member fitness objectives and preferences')).toBeInTheDocument()
  })

  it('shows edit disabled state with correct tooltip', async () => {
    render(<SurveyPage />)

    await waitFor(() => {
      expect(screen.getByText('Fitness Goals Assessment')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByTitle('Coming soon')
    expect(editButtons[0]).toBeDisabled()
    expect(editButtons[0]).toHaveClass('disabled:opacity-50')
  })

  it('shows info message when edit button is clicked', async () => {
    render(<SurveyPage />)

    await waitFor(() => {
      expect(screen.getByText('Fitness Goals Assessment')).toBeInTheDocument()
    })

    // Even though button is disabled, test the onclick handler
    const editButtons = screen.getAllByTitle('Coming soon')
    fireEvent.click(editButtons[0])

    expect(mockToast.info).toHaveBeenCalledWith('Survey editing coming soon!')
  })

  it('shows edit enabled when feature flag is on', async () => {
    // Enable the feature flag
    const isFeatureEnabledMock = jest.mocked(
      require('@/app/lib/feature-flags').isFeatureEnabled
    )
    isFeatureEnabledMock.mockImplementation((flag: string) => {
      if (flag === 'surveysActions') return true
      return false
    })

    render(<SurveyPage />)

    await waitFor(() => {
      expect(screen.getByText('Fitness Goals Assessment')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByTitle('Edit Survey')
    expect(editButtons).toHaveLength(4)
    expect(editButtons[0]).not.toBeDisabled()

    // Click edit button
    fireEvent.click(editButtons[0])
    expect(mockToast.info).toHaveBeenCalledWith('Edit survey: Fitness Goals Assessment')
  })

  it('handles delete confirmation dialog', async () => {
    render(<SurveyPage />)

    await waitFor(() => {
      expect(screen.getByText('Fitness Goals Assessment')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByTitle('Delete Survey')
    fireEvent.click(deleteButtons[0])

    expect(window.confirm).toHaveBeenCalledWith('Delete survey: Fitness Goals Assessment?')
  })

  it('handles send button with disabled state', async () => {
    render(<SurveyPage />)

    await waitFor(() => {
      expect(screen.getByText('Fitness Goals Assessment')).toBeInTheDocument()
    })

    // Find send buttons (they should be disabled)
    const sendButtons = screen.getAllByRole('button').filter(
      button => button.querySelector('svg') && button.disabled
    )

    expect(sendButtons.length).toBeGreaterThan(0)

    // Click disabled send button
    fireEvent.click(sendButtons[0])
    expect(mockToast.error).toHaveBeenCalledWith('Survey sending coming soon!')
  })

  it('shows status badges correctly', async () => {
    render(<SurveyPage />)

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    // Check different status badges
    expect(screen.getByText('Active')).toHaveClass('bg-green-500')
    expect(screen.getByText('Completed')).toHaveClass('bg-blue-500')
    expect(screen.getByText('Draft')).toHaveClass('bg-gray-500')
  })

  it('shows survey details in view modal', async () => {
    render(<SurveyPage />)

    await waitFor(() => {
      expect(screen.getByText('Fitness Goals Assessment')).toBeInTheDocument()
    })

    // Click view button
    const viewButtons = screen.getAllByTitle('View Survey (Read-only)')
    fireEvent.click(viewButtons[0])

    // Check modal content
    expect(screen.getByText('Understanding member fitness objectives and preferences')).toBeInTheDocument()
    expect(screen.getByText('47')).toBeInTheDocument() // responses
    expect(screen.getByText('8')).toBeInTheDocument() // questions
    expect(screen.getByText('73.4%')).toBeInTheDocument() // completion rate
  })

  it('closes modal when close button is clicked', async () => {
    render(<SurveyPage />)

    await waitFor(() => {
      expect(screen.getByText('Fitness Goals Assessment')).toBeInTheDocument()
    })

    // Open modal
    const viewButtons = screen.getAllByTitle('View Survey (Read-only)')
    fireEvent.click(viewButtons[0])

    // Close modal
    const closeButton = screen.getByText('Close')
    fireEvent.click(closeButton)

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByText('Read-only Preview')).not.toBeInTheDocument()
    })
  })

  it('navigates to responses tab from modal', async () => {
    render(<SurveyPage />)

    await waitFor(() => {
      expect(screen.getByText('Fitness Goals Assessment')).toBeInTheDocument()
    })

    // Open modal
    const viewButtons = screen.getAllByTitle('View Survey (Read-only)')
    fireEvent.click(viewButtons[0])

    // Click View Responses
    const viewResponsesButton = screen.getByText('View Responses')
    fireEvent.click(viewResponsesButton)

    // Should navigate to responses tab
    expect(screen.getByText('Response Analysis Coming Soon')).toBeInTheDocument()
  })

  it('shows type icons correctly', async () => {
    render(<SurveyPage />)

    await waitFor(() => {
      expect(screen.getByText('Fitness assessment')).toBeInTheDocument()
    })

    // Check type labels
    expect(screen.getByText('Fitness assessment')).toBeInTheDocument()
    expect(screen.getByText('Feedback')).toBeInTheDocument()
    expect(screen.getByText('Satisfaction')).toBeInTheDocument()
    expect(screen.getByText('Onboarding')).toBeInTheDocument()
  })

  it('shows analytics with demo data badge', async () => {
    render(<SurveyPage />)

    await waitFor(() => {
      expect(screen.getByText('Analytics')).toBeInTheDocument()
    })

    // Click Analytics tab
    const analyticsTab = screen.getByText('Analytics')
    fireEvent.click(analyticsTab)

    // Should show demo data badge
    expect(screen.getByText('Demo Data')).toBeInTheDocument()
    expect(screen.getByTestId('survey-analytics')).toBeInTheDocument()
  })

  it('shows waitlist CTA when create feature is disabled', async () => {
    render(<SurveyPage />)

    await waitFor(() => {
      expect(screen.getByText('Create Survey')).toBeInTheDocument()
    })

    // Click Create Survey tab
    const createTab = screen.getByText('Create Survey')
    fireEvent.click(createTab)

    // Should show waitlist CTA
    expect(screen.getByText('Join Early Access Waitlist')).toBeInTheDocument()
    
    // Click waitlist button
    const waitlistButton = screen.getByText('Join Early Access Waitlist')
    fireEvent.click(waitlistButton)

    // Should open waitlist modal
    expect(screen.getByText('Join Early Access')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument()
  })

  it('handles waitlist form submission', async () => {
    render(<SurveyPage />)

    await waitFor(() => {
      expect(screen.getByText('Create Survey')).toBeInTheDocument()
    })

    // Navigate to create tab and open waitlist modal
    const createTab = screen.getByText('Create Survey')
    fireEvent.click(createTab)

    const waitlistButton = screen.getByText('Join Early Access Waitlist')
    fireEvent.click(waitlistButton)

    // Fill form
    const emailInput = screen.getByPlaceholderText('your@email.com')
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

    // Submit
    const joinButton = screen.getByText('Join Waitlist')
    fireEvent.click(joinButton)

    expect(mockToast.success).toHaveBeenCalledWith('Thanks for your interest! We\'ll notify you when survey creation is available.')
  })
})