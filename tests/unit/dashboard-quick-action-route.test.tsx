import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const pushMock = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: jest.fn(),
  }),
}))

// Mock layout wrapper
jest.mock('@/app/components/DashboardLayout', () => ({ __esModule: true, default: ({ children }: any) => <div>{children}</div> }))

// Mock icons used in the page to avoid SVG issues in JSDOM
jest.mock('lucide-react', () => new Proxy({}, {
  get: () => (props: any) => <span data-icon />
}))

import RealDashboard from '@/app/real-dashboard/page'

describe('Dashboard Quick Action: Add New Lead', () => {
  beforeEach(() => {
    pushMock.mockReset()
  })

  it('routes to /leads?action=new when Add new lead quick action is clicked', () => {
    render(<RealDashboard />)
    const btn = screen.getByTitle('Add new lead')
    fireEvent.click(btn)
    expect(pushMock).toHaveBeenCalledWith('/leads?action=new')
  })
})

