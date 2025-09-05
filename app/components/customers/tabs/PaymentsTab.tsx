'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { CreditCard, Download, Receipt, Plus, X } from 'lucide-react'
import { formatBritishDateTime, formatBritishCurrency } from '@/app/lib/utils/british-format'

interface PaymentsTabProps {
  customerId: string
  organizationId: string
}

export default function PaymentsTab({ customerId, organizationId }: PaymentsTabProps) {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formAmount, setFormAmount] = useState('')
  const [formMethod, setFormMethod] = useState('card')
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [formNotes, setFormNotes] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchPayments()
  }, [customerId])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      // This would fetch from payment_transactions table
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error && error.code !== 'PGRST116') throw error // Ignore table not found
      setPayments(data || [])
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormAmount('')
    setFormMethod('card')
    setFormDate(new Date().toISOString().slice(0, 10))
    setFormNotes('')
  }

  const handleSavePayment = async () => {
    if (!formAmount) return
    const pounds = parseFloat(formAmount)
    if (Number.isNaN(pounds) || pounds <= 0) return

    try {
      setSaving(true)
      const amountPence = Math.round(pounds * 100)
      const createdAtIso = `${formDate}T00:00:00.000Z`

      const { error } = await supabase
        .from('payment_transactions')
        .insert({
          organization_id: organizationId,
          customer_id: customerId,
          amount_pennies: amountPence,
          currency: 'gbp',
          status: 'completed',
          description: 'Manual payment',
          metadata: {
            payment_method: formMethod,
            notes: formNotes,
            source: 'manual'
          },
          created_at: createdAtIso
        })

      if (error) throw error

      setShowAddModal(false)
      resetForm()
      await fetchPayments()
    } catch (err) {
      console.error('Failed to save payment:', err)
      alert('Failed to save payment')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400">Loading payment history...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Payment History</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Payment
        </button>
      </div>
      
      {payments.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <CreditCard className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No payment history found</p>
          <p className="text-sm text-gray-500 mt-2">
            Payments will appear here once processed
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div key={payment.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-white">
                    {payment.description || 'Payment'}
                  </h4>
                  <p className="text-sm text-gray-400 mt-1">
                    {formatBritishDateTime(payment.created_at)}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-gray-400">
                      Method: {payment?.metadata?.payment_method || payment.payment_method || 'Manual'}
                    </span>
                    {payment.stripe_payment_intent_id && (
                      <span className="text-gray-500">
                        ID: {payment.stripe_payment_intent_id.slice(-8)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-white">
                    {formatBritishCurrency(payment.amount_pennies ?? payment.amount ?? 0)}
                  </div>
                  <span className={`text-sm ${(payment.status === 'succeeded' || payment.status === 'completed') ? 'text-green-400' : 'text-yellow-400'}`}>
                    {payment.status}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <button className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600">
                  <Receipt className="h-4 w-4" />
                  View Receipt
                </button>
                <button className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600">
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Add Payment</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Amount (£)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="50.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Payment Method</label>
                <select
                  value={formMethod}
                  onChange={(e) => setFormMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="gocardless">GoCardless</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Optional notes"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePayment}
                disabled={saving || !formAmount}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}