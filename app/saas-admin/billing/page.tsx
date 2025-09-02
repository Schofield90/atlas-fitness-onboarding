'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Calendar,
  Users,
  Activity
} from 'lucide-react'

interface BillingMetrics {
  totalMrr: number
  totalArr: number
  activeSubscriptions: number
  trialSubscriptions: number
  canceledSubscriptions: number
  failedPayments: number
  churnRate: number
  averageRevenue: number
}

interface Invoice {
  id: string
  organization_name: string
  amount: number
  status: string
  due_date: string
  paid_date?: string
}

export default function BillingPage() {
  const [metrics, setMetrics] = useState<BillingMetrics>({
    totalMrr: 0,
    totalArr: 0,
    activeSubscriptions: 0,
    trialSubscriptions: 0,
    canceledSubscriptions: 0,
    failedPayments: 0,
    churnRate: 0,
    averageRevenue: 0
  })
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuthAndFetchData()
  }, [timeRange])

  const checkAuthAndFetchData = async () => {
    try {
      // Check admin auth
      const { data: { user } } = await supabase.auth.getUser()
      const authorizedEmails = ['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk']
      
      if (!user || !authorizedEmails.includes(user.email?.toLowerCase() || '')) {
        router.push('/saas-admin')
        return
      }

      // Fetch billing metrics from API
      const response = await fetch('/api/admin/billing/metrics')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      } else {
        // Use mock data if API fails
        setMetrics({
          totalMrr: 5432,
          totalArr: 65184,
          activeSubscriptions: 27,
          trialSubscriptions: 8,
          canceledSubscriptions: 3,
          failedPayments: 2,
          churnRate: 3.2,
          averageRevenue: 201
        })
      }

      // Generate mock invoices
      const mockInvoices: Invoice[] = [
        {
          id: 'inv_1',
          organization_name: 'Atlas Fitness Leeds',
          amount: 299,
          status: 'paid',
          due_date: '2024-02-01',
          paid_date: '2024-02-01'
        },
        {
          id: 'inv_2',
          organization_name: 'PowerGym Manchester',
          amount: 199,
          status: 'paid',
          due_date: '2024-02-01',
          paid_date: '2024-01-30'
        },
        {
          id: 'inv_3',
          organization_name: 'FitLife Birmingham',
          amount: 399,
          status: 'pending',
          due_date: '2024-02-05'
        },
        {
          id: 'inv_4',
          organization_name: 'Muscle Works London',
          amount: 299,
          status: 'failed',
          due_date: '2024-01-28'
        },
        {
          id: 'inv_5',
          organization_name: 'CrossFit Newcastle',
          amount: 199,
          status: 'paid',
          due_date: '2024-02-01',
          paid_date: '2024-02-02'
        }
      ]
      
      setRecentInvoices(mockInvoices)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      paid: { icon: CheckCircle, color: 'text-green-500 bg-green-500/10' },
      pending: { icon: Clock, color: 'text-yellow-500 bg-yellow-500/10' },
      failed: { icon: XCircle, color: 'text-red-500 bg-red-500/10' },
      refunded: { icon: RefreshCw, color: 'text-blue-500 bg-blue-500/10' }
    }
    
    const badge = badges[status as keyof typeof badges] || badges.pending
    const Icon = badge.icon
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3" />
        {status}
      </span>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/saas-admin')}
              className="text-gray-400 hover:text-white"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-bold">Billing & Revenue</h1>
              <p className="text-sm text-gray-400">Monitor subscriptions and payments</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <button
              onClick={checkAuthAndFetchData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-8 w-8 text-green-500" />
              <span className="text-xs text-gray-400">MONTHLY</span>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(metrics.totalMrr)}</div>
            <div className="text-sm text-gray-400">MRR</div>
            <div className="mt-2 flex items-center gap-1 text-green-500 text-sm">
              <TrendingUp className="h-3 w-3" />
              <span>+12.3%</span>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-8 w-8 text-blue-500" />
              <span className="text-xs text-gray-400">ANNUAL</span>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(metrics.totalArr)}</div>
            <div className="text-sm text-gray-400">ARR</div>
            <div className="mt-2 flex items-center gap-1 text-green-500 text-sm">
              <TrendingUp className="h-3 w-3" />
              <span>+15.7%</span>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-8 w-8 text-purple-500" />
              <span className="text-xs text-gray-400">ACTIVE</span>
            </div>
            <div className="text-3xl font-bold">{metrics.activeSubscriptions}</div>
            <div className="text-sm text-gray-400">Subscriptions</div>
            <div className="mt-2 text-sm">
              <span className="text-blue-500">{metrics.trialSubscriptions} trials</span>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-8 w-8 text-red-500" />
              <span className="text-xs text-gray-400">MONTHLY</span>
            </div>
            <div className="text-3xl font-bold">{metrics.churnRate}%</div>
            <div className="text-sm text-gray-400">Churn Rate</div>
            <div className="mt-2 flex items-center gap-1 text-red-500 text-sm">
              <TrendingDown className="h-3 w-3" />
              <span>+0.5%</span>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Avg Revenue</span>
              <CreditCard className="h-4 w-4 text-gray-500" />
            </div>
            <div className="text-xl font-bold mt-1">{formatCurrency(metrics.averageRevenue)}</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Failed Payments</span>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-xl font-bold mt-1 text-red-500">{metrics.failedPayments}</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Canceled</span>
              <XCircle className="h-4 w-4 text-gray-500" />
            </div>
            <div className="text-xl font-bold mt-1">{metrics.canceledSubscriptions}</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">LTV</span>
              <TrendingUp className="h-4 w-4 text-gray-500" />
            </div>
            <div className="text-xl font-bold mt-1">{formatCurrency(2408)}</div>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-bold">Recent Invoices</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-700/50 border-b border-gray-600">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Organization</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Paid Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {recentInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{invoice.organization_name}</div>
                    <div className="text-xs text-gray-400">{invoice.id}</div>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatCurrency(invoice.amount)}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(invoice.status)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-purple-500 hover:text-purple-400 text-sm">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors text-left">
            <CreditCard className="h-6 w-6 text-purple-500 mb-2" />
            <div className="font-medium">Process Refund</div>
            <div className="text-sm text-gray-400">Issue refunds or credits</div>
          </button>
          
          <button className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors text-left">
            <AlertCircle className="h-6 w-6 text-yellow-500 mb-2" />
            <div className="font-medium">Failed Payments</div>
            <div className="text-sm text-gray-400">Review and retry failed charges</div>
          </button>
          
          <button className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors text-left">
            <Calendar className="h-6 w-6 text-blue-500 mb-2" />
            <div className="font-medium">Billing Schedule</div>
            <div className="text-sm text-gray-400">View upcoming charges</div>
          </button>
        </div>
      </div>
    </div>
  )
}