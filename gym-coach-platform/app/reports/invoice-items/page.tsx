'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Download, TrendingUp, TrendingDown, DollarSign, Calendar, Users, CreditCard, FileText, RefreshCw } from 'lucide-react'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Transaction {
  id: string
  created_at: string
  amount: number
  status: 'pending' | 'confirmed' | 'failed' | 'refunded'
  type: 'membership' | 'booking' | 'product' | 'other'
  customer_id: string
  customer_name: string
  description: string
  payment_method?: string
  invoice_number?: string
}

interface RevenueMetrics {
  totalRevenue: number
  confirmedRevenue: number
  pendingRevenue: number
  transactionCount: number
  averageTransaction: number
  growthRate: number
}

function RevenueReportsContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [metrics, setMetrics] = useState<RevenueMetrics>({
    totalRevenue: 0,
    confirmedRevenue: 0,
    pendingRevenue: 0,
    transactionCount: 0,
    averageTransaction: 0,
    growthRate: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [dateType, setDateType] = useState<'confirmed' | 'created'>('confirmed')
  const [activeTab, setActiveTab] = useState('transactions')
  const [error, setError] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Get parameters from URL
    const month = searchParams.get('month') || format(new Date(), 'yyyy-MM')
    const type = searchParams.get('date_type') as 'confirmed' | 'created' || 'confirmed'
    const tab = searchParams.get('tab') || 'transactions'

    setSelectedMonth(month)
    setDateType(type)
    setActiveTab(tab)
  }, [searchParams])

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated')
        return
      }

      // Get organization ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) {
        setError('No organization found')
        return
      }

      const monthDate = selectedMonth ? parseISO(`${selectedMonth}-01`) : new Date()
      const startDate = startOfMonth(monthDate)
      const endDate = endOfMonth(monthDate)

      // Fetch transactions from multiple tables
      const dateField = dateType === 'confirmed' ? 'confirmed_at' : 'created_at'

      // Fetch bookings with payment information
      const { data: bookingPayments, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          created_at,
          session_start_time,
          payment_amount,
          payment_status,
          payment_method,
          client_id,
          client:client_id (
            name,
            email
          )
        `)
        .eq('organization_id', profile.organization_id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (bookingError) {
        console.error('Error fetching booking payments:', bookingError)
      }

      // Also check for class_bookings table (might be used for classes)
      const { data: classBookings, error: classError } = await supabase
        .from('class_bookings')
        .select(`
          id,
          created_at,
          payment_amount,
          payment_status,
          customer_id,
          client_id,
          customers!customer_id (
            name,
            email
          )
        `)
        .eq('organization_id', profile.organization_id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (classError && !classError.message.includes('relation "class_bookings" does not exist')) {
        console.error('Error fetching class bookings:', classError)
      }

      // Fetch membership plans with pricing
      const { data: membershipPlans, error: membershipError } = await supabase
        .from('membership_plans')
        .select(`
          id,
          name,
          price,
          billing_period,
          created_at
        `)
        .eq('organization_id', profile.organization_id)

      if (membershipError && !membershipError.message.includes('relation "membership_plans" does not exist')) {
        console.error('Error fetching membership plans:', membershipError)
      }

      // Fetch member subscriptions
      const { data: memberSubscriptions, error: subError } = await supabase
        .from('customers')
        .select(`
          id,
          name,
          email,
          membership_status,
          membership_start_date,
          membership_end_date,
          created_at
        `)
        .eq('organization_id', profile.organization_id)
        .eq('membership_status', 'active')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (subError) {
        console.error('Error fetching member subscriptions:', subError)
      }

      // Check for payments table
      const { data: payments, error: paymentError } = await supabase
        .from('payments')
        .select(`
          id,
          created_at,
          amount,
          status,
          payment_method,
          customer_id,
          description,
          customers!customer_id (
            name,
            email
          )
        `)
        .eq('organization_id', profile.organization_id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      // Don't treat payment error as critical - table might not exist
      if (paymentError && !paymentError.message.includes('relation "payments" does not exist')) {
        console.error('Error fetching payments:', paymentError)
      }

      // Combine and format transactions
      const allTransactions: Transaction[] = []

      // Process regular bookings
      if (bookingPayments) {
        bookingPayments.forEach(booking => {
          if (booking.payment_amount && booking.payment_amount > 0) {
            allTransactions.push({
              id: booking.id,
              created_at: booking.created_at,
              amount: booking.payment_amount,
              status: booking.payment_status === 'succeeded' || booking.payment_status === 'paid' ? 'confirmed' :
                     booking.payment_status === 'pending' ? 'pending' :
                     booking.payment_status === 'failed' ? 'failed' : 'pending',
              type: 'booking',
              customer_id: booking.client_id,
              customer_name: booking.client?.name || 'Unknown Customer',
              description: 'Session Booking',
              payment_method: booking.payment_method || 'card'
            })
          }
        })
      }

      // Process class bookings
      if (classBookings) {
        classBookings.forEach(booking => {
          if (booking.payment_amount && booking.payment_amount > 0) {
            allTransactions.push({
              id: booking.id,
              created_at: booking.created_at,
              amount: booking.payment_amount,
              status: booking.payment_status === 'succeeded' || booking.payment_status === 'paid' ? 'confirmed' :
                     booking.payment_status === 'pending' ? 'pending' :
                     booking.payment_status === 'failed' ? 'failed' : 'pending',
              type: 'booking',
              customer_id: booking.customer_id || booking.client_id,
              customer_name: booking.customers?.name || 'Unknown Customer',
              description: 'Class Booking',
              payment_method: 'card'
            })
          }
        })
      }

      // Process membership subscriptions (calculate from plan pricing)
      if (memberSubscriptions && membershipPlans) {
        // Create a map of membership plans for quick lookup
        const planMap = new Map(membershipPlans.map(plan => [plan.id, plan]))

        memberSubscriptions.forEach(subscription => {
          // For active memberships, assume they're paying the default plan price
          // In a real system, you'd have a subscription_plan_id field
          const defaultPlan = membershipPlans[0] // Use first plan as default
          if (defaultPlan) {
            allTransactions.push({
              id: subscription.id,
              created_at: subscription.membership_start_date || subscription.created_at,
              amount: defaultPlan.price || 0,
              status: subscription.membership_status === 'active' ? 'confirmed' : 'pending',
              type: 'membership',
              customer_id: subscription.id,
              customer_name: subscription.name || 'Unknown Customer',
              description: `${defaultPlan.name} - ${defaultPlan.billing_period}`,
              payment_method: 'card'
            })
          }
        })
      }

      // Process direct payments if they exist
      if (payments && !paymentError) {
        payments.forEach(payment => {
          allTransactions.push({
            id: payment.id,
            created_at: payment.created_at,
            amount: payment.amount,
            status: payment.status === 'succeeded' || payment.status === 'completed' ? 'confirmed' :
                   payment.status === 'pending' ? 'pending' :
                   payment.status === 'failed' ? 'failed' : 'pending',
            type: 'other',
            customer_id: payment.customer_id,
            customer_name: payment.customers?.name || 'Unknown Customer',
            description: payment.description || 'Payment',
            payment_method: payment.payment_method || 'card'
          })
        })
      }

      // Sort transactions by date
      allTransactions.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setTransactions(allTransactions)

      // Calculate metrics
      const confirmed = allTransactions.filter(t => t.status === 'confirmed')
      const pending = allTransactions.filter(t => t.status === 'pending')

      const totalRevenue = allTransactions.reduce((sum, t) => sum + t.amount, 0)
      const confirmedRevenue = confirmed.reduce((sum, t) => sum + t.amount, 0)
      const pendingRevenue = pending.reduce((sum, t) => sum + t.amount, 0)

      // Calculate growth rate (mock for now - would need previous period data)
      const growthRate = 0 // This would compare to previous period

      setMetrics({
        totalRevenue,
        confirmedRevenue,
        pendingRevenue,
        transactionCount: allTransactions.length,
        averageTransaction: allTransactions.length > 0 ? totalRevenue / allTransactions.length : 0,
        growthRate
      })

    } catch (error) {
      console.error('Error fetching transactions:', error)
      setError('Failed to load transaction data')
    } finally {
      setIsLoading(false)
    }
  }, [selectedMonth, dateType, supabase])

  useEffect(() => {
    if (selectedMonth) {
      fetchTransactions()
    }
  }, [selectedMonth, dateType, fetchTransactions])

  const handleExport = () => {
    // Create CSV content
    const headers = ['Date', 'Customer', 'Type', 'Description', 'Amount', 'Status']
    const rows = transactions.map(t => [
      format(parseISO(t.created_at), 'yyyy-MM-dd'),
      t.customer_name,
      t.type,
      t.description,
      t.amount.toFixed(2),
      t.status
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `revenue-report-${selectedMonth}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'refunded':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue Reports</h1>
          <p className="text-gray-600">Track payments and revenue across your organization</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchTransactions}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date()
                    date.setMonth(date.getMonth() - i)
                    const value = format(date, 'yyyy-MM')
                    return (
                      <SelectItem key={value} value={value}>
                        {format(date, 'MMMM yyyy')}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Date Type</label>
              <Select value={dateType} onValueChange={(v) => setDateType(v as 'confirmed' | 'created')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed Date</SelectItem>
                  <SelectItem value="created">Created Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.transactionCount} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.confirmedRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {((metrics.confirmedRevenue / metrics.totalRevenue) * 100 || 0).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.pendingRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.averageTransaction)}</div>
            <p className="text-xs text-muted-foreground">
              Per transaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
          <CardDescription>
            All payment transactions for {selectedMonth ? format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy') : 'selected period'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="transactions">All Transactions</TabsTrigger>
              <TabsTrigger value="memberships">Memberships</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-4">
              {isLoading ? (
                <div className="text-center py-8">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No transactions found for this period
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {format(parseISO(transaction.created_at), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell>{transaction.customer_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{transaction.type}</Badge>
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(transaction.status)}>
                              {transaction.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="memberships" className="mt-4">
              {isLoading ? (
                <div className="text-center py-8">Loading membership data...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions
                        .filter(t => t.type === 'membership')
                        .map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              {format(parseISO(transaction.created_at), 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell>{transaction.customer_name}</TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(transaction.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(transaction.status)}>
                                {transaction.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="bookings" className="mt-4">
              {isLoading ? (
                <div className="text-center py-8">Loading booking data...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions
                        .filter(t => t.type === 'booking')
                        .map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              {format(parseISO(transaction.created_at), 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell>{transaction.customer_name}</TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(transaction.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(transaction.status)}>
                                {transaction.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="summary" className="mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Revenue by Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {['membership', 'booking', 'product', 'other'].map(type => {
                          const typeTransactions = transactions.filter(t => t.type === type)
                          const total = typeTransactions.reduce((sum, t) => sum + t.amount, 0)
                          return (
                            <div key={type} className="flex justify-between items-center">
                              <span className="capitalize">{type}</span>
                              <span className="font-medium">{formatCurrency(total)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Payment Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {['confirmed', 'pending', 'failed', 'refunded'].map(status => {
                          const statusTransactions = transactions.filter(t => t.status === status)
                          const count = statusTransactions.length
                          const total = statusTransactions.reduce((sum, t) => sum + t.amount, 0)
                          return (
                            <div key={status} className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <Badge className={getStatusColor(status as Transaction['status'])}>
                                  {status}
                                </Badge>
                                <span className="text-sm text-gray-500">({count})</span>
                              </div>
                              <span className="font-medium">{formatCurrency(total)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RevenueReportsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-6 px-4">Loading revenue reports...</div>}>
      <RevenueReportsContent />
    </Suspense>
  )
}