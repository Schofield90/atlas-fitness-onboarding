'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import DashboardLayout from '@/app/components/DashboardLayout'
import { Plus, Search, Download, Filter, ChevronDown, User, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Customer {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  status: 'active' | 'inactive' | 'slipping_away'
  membership_status: string
  membership_name?: string
  tags?: string[]
  created_at: string
  last_visit?: string
  total_spent?: number
  is_lead?: boolean
  notes?: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('Active Customers')
  const [membershipFilter, setMembershipFilter] = useState<string>('')
  const [showOnlyNew, setShowOnlyNew] = useState(false)
  const [showOnlySlipping, setShowOnlySlipping] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    filterCustomers()
  }, [customers, searchTerm, statusFilter, membershipFilter, showOnlyNew, showOnlySlipping])

  const fetchCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get organization
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!orgMember) return

      // Fetch clients with memberships
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select(`
          *,
          memberships (
            id,
            membership_type,
            status,
            start_date,
            end_date
          )
        `)
        .eq('organization_id', orgMember.organization_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching customers:', error)
        return
      }

      // Transform to customer format
      const transformedCustomers = (clientsData || []).map(client => ({
        id: client.id,
        first_name: client.first_name || '',
        last_name: client.last_name || '',
        email: client.email || '',
        phone: client.phone || '',
        status: determineStatus(client),
        membership_status: client.memberships?.[0]?.status || 'No Membership',
        membership_name: client.memberships?.[0]?.membership_type,
        tags: client.tags || [],
        created_at: client.created_at,
        last_visit: client.last_visit,
        total_spent: client.total_spent || 0,
        is_lead: client.is_lead || false,
        notes: client.notes
      }))

      setCustomers(transformedCustomers)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const determineStatus = (client: any): 'active' | 'inactive' | 'slipping_away' => {
    if (!client.last_visit) return 'inactive'
    
    const lastVisit = new Date(client.last_visit)
    const daysSinceVisit = Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceVisit > 30) return 'slipping_away'
    if (daysSinceVisit > 60) return 'inactive'
    return 'active'
  }

  const filterCustomers = () => {
    let filtered = [...customers]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(customer => {
        const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase()
        const email = customer.email.toLowerCase()
        const search = searchTerm.toLowerCase()
        return fullName.includes(search) || email.includes(search)
      })
    }

    // Status filter
    if (statusFilter && statusFilter !== 'All') {
      if (statusFilter === 'Active Customers') {
        filtered = filtered.filter(c => c.status === 'active')
      } else if (statusFilter === 'Inactive Customers') {
        filtered = filtered.filter(c => c.status === 'inactive')
      } else if (statusFilter === 'Leads') {
        filtered = filtered.filter(c => c.is_lead)
      }
    }

    // Membership filter
    if (membershipFilter) {
      filtered = filtered.filter(c => c.membership_name === membershipFilter)
    }

    // Show only filters
    if (showOnlyNew) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      filtered = filtered.filter(c => new Date(c.created_at) > thirtyDaysAgo)
    }

    if (showOnlySlipping) {
      filtered = filtered.filter(c => c.status === 'slipping_away')
    }

    setFilteredCustomers(filtered)
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-yellow-200 text-yellow-800',
      'bg-green-200 text-green-800',
      'bg-blue-200 text-blue-800',
      'bg-purple-200 text-purple-800',
      'bg-pink-200 text-pink-800',
      'bg-indigo-200 text-indigo-800',
    ]
    const index = (name.charCodeAt(0) + name.charCodeAt(1)) % colors.length
    return colors[index]
  }

  const exportCustomers = () => {
    const csv = [
      ['Name', 'Email', 'Phone', 'Status', 'Membership', 'Created Date'].join(','),
      ...filteredCustomers.map(c => [
        `${c.first_name} ${c.last_name}`,
        c.email,
        c.phone,
        c.status,
        c.membership_name || 'None',
        new Date(c.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage)

  if (loading) {
    return (
      <DashboardLayout userData={null}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userData={null}>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Customer List</h1>
            <div className="bg-blue-100 text-blue-800 rounded-full p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <Link
            href="/customers/new"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add a Customer
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Enter customer's name or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-9 w-5 h-5 text-gray-400" />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option>Active Customers</option>
                <option>Inactive Customers</option>
                <option>Leads</option>
                <option>All</option>
              </select>
            </div>

            {/* Membership Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Membership</label>
              <select
                value={membershipFilter}
                onChange={(e) => setMembershipFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">All Memberships</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Annual">Annual</option>
              </select>
            </div>
          </div>

          {/* Show Only Options */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Show only:</span>
            <button
              onClick={() => setShowOnlyNew(!showOnlyNew)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                showOnlyNew 
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-500' 
                  : 'bg-gray-100 text-gray-700 border-2 border-gray-300'
              }`}
            >
              New
            </button>
            <button
              onClick={() => setShowOnlySlipping(!showOnlySlipping)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                showOnlySlipping
                  ? 'bg-orange-100 text-orange-700 border-2 border-orange-500'
                  : 'bg-gray-100 text-gray-700 border-2 border-gray-300'
              }`}
            >
              Slipping Away
            </button>
          </div>
        </div>

        {/* Export and Pagination */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={exportCustomers}
            className="text-gray-600 hover:text-gray-800 font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Filtered List ({filteredCustomers.length} customers)
          </button>

          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {[25, 50, 75, 100, 125, 150].map(num => (
                <button
                  key={num}
                  onClick={() => {
                    setItemsPerPage(num)
                    setCurrentPage(1)
                  }}
                  className={`px-3 py-1 rounded ${
                    itemsPerPage === num
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {num === 25 ? `1-${num}` : `${num - 24}-${num}`}
                </button>
              ))}
            </div>
            {totalPages > 1 && (
              <button className="p-2 rounded hover:bg-gray-100">
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Customer List */}
        <div className="bg-white rounded-lg shadow-sm">
          {paginatedCustomers.length === 0 ? (
            <div className="p-12 text-center">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No customers found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {paginatedCustomers.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/customers/${customer.id}`}
                  className="block hover:bg-gray-50 transition-colors"
                >
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold ${getAvatarColor(customer.first_name)}`}>
                        {getInitials(customer.first_name, customer.last_name)}
                      </div>

                      {/* Customer Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {customer.first_name} {customer.last_name}
                          </h3>
                          {customer.notes && (
                            <div className="flex items-center gap-1 text-red-600">
                              <span className="text-2xl">•</span>
                              <span className="text-sm">{customer.notes}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-gray-600">{customer.email}</p>
                        {customer.membership_name && (
                          <p className="text-sm text-blue-600 mt-1">{customer.membership_name}</p>
                        )}
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex items-center gap-2">
                      {customer.status === 'active' && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          ACTIVE
                        </span>
                      )}
                      {customer.status === 'slipping_away' && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          SLIPPING AWAY
                        </span>
                      )}
                      {customer.status === 'inactive' && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                          INACTIVE
                        </span>
                      )}
                      {showOnlyNew && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          NEW
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6 gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}