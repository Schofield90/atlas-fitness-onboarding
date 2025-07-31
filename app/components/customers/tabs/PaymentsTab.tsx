'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { CreditCard, Download, Receipt } from 'lucide-react'
import { formatBritishDateTime, formatBritishCurrency } from '@/app/lib/utils/british-format'

interface PaymentsTabProps {
  customerId: string
}

export default function PaymentsTab({ customerId }: PaymentsTabProps) {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400">Loading payment history...</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-6">Payment History</h3>
      
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
                      Method: {payment.payment_method || 'Card'}
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
                    {formatBritishCurrency(payment.amount)}
                  </div>
                  <span className={`text-sm ${payment.status === 'succeeded' ? 'text-green-400' : 'text-yellow-400'}`}>
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
    </div>
  )
}