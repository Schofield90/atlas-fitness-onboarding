import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'

import StripeConnect from '@/app/components/billing/StripeConnect'

describe('StripeConnect - Empty State', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    jest.resetAllMocks()
    global.fetch = originalFetch as any
  })

  it('shows connect prompt when no Stripe account is connected', async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/billing/stripe-connect/status')) {
        return {
          ok: true,
          json: async () => ({
            account: null,
            settings: { platform_commission_rate: 0.03, payment_methods_enabled: {} }
          })
        } as any
      }
      return { ok: true, json: async () => ({}) } as any
    }) as any

    render(<StripeConnect organizationId="org_test_123" />)

    await waitFor(() => {
      expect(screen.getByText('Connect Stripe Account')).toBeInTheDocument()
    })
  })
})

