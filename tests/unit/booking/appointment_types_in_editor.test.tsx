import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { jest } from '@jest/globals'
import BookingLinkEditor from '@/app/components/booking/BookingLinkEditor'

// Mock next/navigation router used inside the editor
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), refresh: jest.fn(), replace: jest.fn() })
}))

// Provide a minimal Button mock to avoid unrelated issues
jest.mock('@/app/components/ui/Button', () => ({ __esModule: true, default: (props: any) => (
  <button {...props}>{props.children}</button>
) }))

describe('BookingLinkEditor - Appointment Types rendering', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('renders fetched appointment types as checkbox options', async () => {
    const mockAppointmentTypes = {
      appointment_types: [
        { id: 'at-1', name: 'Consultation', duration_minutes: 30, session_type: 'consultation', max_capacity: 1 },
        { id: 'at-2', name: 'Group Training', duration_minutes: 60, session_type: 'group_class', max_capacity: 10 },
        { id: 'at-3', name: 'Nutrition Coaching', duration_minutes: 45, session_type: 'nutrition_consult', max_capacity: 1 }
      ]
    }

    global.fetch = jest.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes('/api/appointment-types')) {
        return new Response(JSON.stringify(mockAppointmentTypes), { status: 200 }) as unknown as Response
      }
      if (String(url).includes('/api/staff')) {
        return new Response(JSON.stringify({ staff: [] }), { status: 200 }) as unknown as Response
      }
      return new Response(JSON.stringify({}), { status: 200 }) as unknown as Response
    }) as unknown as typeof fetch

    render(<BookingLinkEditor />)

    // Wait for the appointment types list to render
    await waitFor(() => {
      expect(screen.getByText('Available Appointment Types *')).toBeInTheDocument()
    })

    // Should list all returned types
    expect(screen.getByText('Consultation')).toBeInTheDocument()
    expect(screen.getByText('Group Training')).toBeInTheDocument()
    expect(screen.getByText('Nutrition Coaching')).toBeInTheDocument()

    // Verify the empty state message is not shown
    expect(screen.queryByText('No appointment types found.')).not.toBeInTheDocument()
  })
})

