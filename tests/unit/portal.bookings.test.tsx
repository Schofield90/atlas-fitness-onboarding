import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() })
}))

// Mock Supabase client used in portal
const mockGetUser = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/app/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom
  })
}))

describe('Member Portal Bookings consistency', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('shows a pending booking on both Home and Bookings tabs', async () => {
    const { default: MemberPortal } = await import('@/app/portal/page')

    // Arrange mocks
    mockGetUser.mockResolvedValue({ data: { user: { email: 'sam@example.com' } } })

    // Mock chained from().select().eq().single for clients
    const clientsSelect = jest.fn().mockReturnThis()
    const clientsEq = jest.fn().mockReturnThis()
    const clientsSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'c1',
        email: 'sam@example.com',
        first_name: 'Sam',
        organization_id: 'org1',
        organization: { name: 'Atlas', logo_url: '' },
        membership: null
      }
    })

    // For bookings query chain
    const bookingsSelect = jest.fn().mockReturnThis()
    const bookingsEq = jest.fn().mockReturnThis()
    const bookingsIn = jest.fn().mockReturnThis()
    const bookingsGte = jest.fn().mockReturnThis()
    const bookingsOrder = jest.fn().mockResolvedValue({
      data: [{
        id: 'b1',
        title: 'HIIT Training',
        start_time: new Date(Date.now() + 24*60*60*1000).toISOString(),
        end_time: new Date(Date.now() + 25*60*60*1000).toISOString(),
        booking_status: 'pending',
        attendee_email: 'sam@example.com'
      }]
    })

    // For class_sessions query chain
    const classesSelect = jest.fn().mockReturnThis()
    const classesGte = jest.fn().mockReturnThis()
    const classesOrder = jest.fn().mockReturnThis()
    const classesLimit = jest.fn().mockResolvedValue({ data: [] })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'clients') {
        return {
          select: clientsSelect,
          eq: clientsEq,
          single: clientsSingle
        } as any
      }
      if (table === 'bookings') {
        return {
          select: bookingsSelect,
          eq: bookingsEq,
          in: bookingsIn,
          gte: bookingsGte,
          order: bookingsOrder
        } as any
      }
      if (table === 'class_sessions') {
        return {
          select: classesSelect,
          gte: classesGte,
          order: classesOrder,
          limit: classesLimit
        } as any
      }
      return {} as any
    })

    // Act
    render(React.createElement(MemberPortal))

    // Assert Home tab shows upcoming class
    await waitFor(() => {
      expect(screen.getByText('Upcoming Classes')).toBeInTheDocument()
    })
    expect(screen.getByText('HIIT Training')).toBeInTheDocument()

    // Switch to Bookings tab by simulating click
    screen.getByText('Bookings').click()

    await waitFor(() => {
      expect(screen.getByText('Your Bookings')).toBeInTheDocument()
    })
    expect(screen.getByText('HIIT Training')).toBeInTheDocument()
  })
})

