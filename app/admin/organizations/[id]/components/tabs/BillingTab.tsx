'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface BillingTabProps {
  organizationId: string
}

export default function BillingTab({ organizationId }: BillingTabProps) {
  const [subscription, setSubscription] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBillingData()
  }, [organizationId])

  const fetchBillingData = async () => {
    try {
      const res = await fetch(`/api/admin/organizations/${organizationId}/billing`)
      if (res.ok) {
        const data = await res.json()
        setSubscription(data.subscription)
        setCustomer(data.customer)
        setInvoices(data.invoices || [])
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return

    try {
      const res = await fetch(`/api/admin/organizations/${organizationId}/billing/cancel`, {
        method: 'POST'
      })
      if (res.ok) {
        fetchBillingData()
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-20 bg-gray-200 rounded"></div>
      <div className="h-40 bg-gray-200 rounded"></div>
    </div>
  }

  return (
    <div className="space-y-6">
      {/* Subscription Status */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription Details</h3>
        
        {subscription ? (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full
                ${subscription.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                ${subscription.status === 'trialing' ? 'bg-blue-100 text-blue-800' : ''}
                ${subscription.status === 'past_due' ? 'bg-red-100 text-red-800' : ''}
                ${subscription.status === 'canceled' ? 'bg-gray-100 text-gray-800' : ''}
              `}>
                {subscription.status}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Plan</span>
              <span className="text-sm font-medium">{subscription.plan_key || 'Unknown'}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Current Period</span>
              <span className="text-sm">
                {new Date(subscription.current_period_start).toLocaleDateString()} - 
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </span>
            </div>

            {subscription.cancel_at && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Cancels At</span>
                <span className="text-sm text-red-600">
                  {new Date(subscription.cancel_at).toLocaleDateString()}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Stripe Subscription ID</span>
              <a 
                href={`https://dashboard.stripe.com/subscriptions/${subscription.stripe_subscription_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {subscription.stripe_subscription_id}
              </a>
            </div>

            <div className="pt-3 border-t flex gap-3">
              <button
                onClick={handleCancelSubscription}
                className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50"
                disabled={subscription.status === 'canceled'}
              >
                Cancel Subscription
              </button>
              <button
                className="px-3 py-1 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
              >
                Change Plan
              </button>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg p-4 text-center text-gray-500">
            No active subscription
          </div>
        )}
      </div>

      {/* Customer Details */}
      {customer && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm">{customer.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Currency</span>
              <span className="text-sm uppercase">{customer.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Stripe Customer ID</span>
              <a 
                href={`https://dashboard.stripe.com/customers/${customer.stripe_customer_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {customer.stripe_customer_id}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Recent Invoices */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Invoices</h3>
        {invoices.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-4 py-2 text-sm">{new Date(invoice.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-sm">£{(invoice.amount / 100).toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full
                        ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : ''}
                        ${invoice.status === 'open' ? 'bg-blue-100 text-blue-800' : ''}
                        ${invoice.status === 'void' ? 'bg-gray-100 text-gray-800' : ''}
                      `}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <a 
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border rounded-lg p-4 text-center text-gray-500">
            No invoices found
          </div>
        )}
      </div>
    </div>
  )
}