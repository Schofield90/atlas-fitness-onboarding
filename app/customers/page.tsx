'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import DashboardLayout from '@/app/components/DashboardLayout'
import { Plus, Search, Download, Filter, ChevronDown, User, AlertCircle, Upload } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/app/lib/hooks/useToast'
import { isFeatureEnabled } from '@/app/lib/feature-flags'

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
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()

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

      // Try to get organization from user_organizations first (newer table)
      let organizationId: string | null = null
      
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()
      
      if (userOrg?.organization_id) {
        organizationId = userOrg.organization_id
      } else {
        // Fallback to organization_members (older table)
        const { data: orgMember } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .single()
        
        if (orgMember?.organization_id) {
          organizationId = orgMember.organization_id
        }
      }

      if (!organizationId) {
        // Use default organization if no org found
        organizationId = '63589490-8f55-4157-bd3a-e141594b748e'
      }

      // Fetch only clients (actual customers, not leads)
      // Try with organization_id first, fall back to org_id
      let clientsResult = await supabase
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
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
      
      // If no results or error, try with org_id
      if (clientsResult.error || !clientsResult.data?.length) {
        clientsResult = await supabase
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
          .eq('org_id', organizationId)
          .order('created_at', { ascending: false })
      }

      if (clientsResult.error) {
        console.error('Error fetching clients:', clientsResult.error)
      }

      // Transform clients to customer format (ONLY actual customers, not leads)
      const clientCustomers = (clientsResult.data || []).map(client => ({
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
        is_lead: false,
        notes: client.notes
      }))

      setCustomers(clientCustomers)
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
      } else if (statusFilter === 'Slipping Away') {
        filtered = filtered.filter(c => c.status === 'slipping_away')
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

  const exportCustomers = async () => {
    if (!isFeatureEnabled('contactsExportFeedback')) {
      // Fallback behavior without feature flag
      alert('Export not available yet - please contact support')
      return
    }

    try {
      toast.info('Preparing export...')
      
      // Fetch comprehensive customer data for export
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please log in to export customers')
        return
      }

      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!orgMember) {
        toast.error('Organization not found')
        return
      }

      // Get detailed client data with related information
      const { data: detailedClients } = await supabase
        .from('clients')
        .select(`
          *,
          memberships (
            membership_type,
            status,
            start_date,
            end_date
          ),
          emergency_contacts (
            first_name,
            last_name,
            relationship,
            phone_primary,
            email
          ),
          customer_medical_info (
            medical_conditions,
            medications,
            allergies
          )
        `)
        .eq('organization_id', orgMember.organization_id)

      // Only export customer data, not leads

      // Format customer data for export
      const allDetailedCustomers = (detailedClients || []).map(client => ({
          name: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
          email: client.email,
          phone: client.phone,
          status: client.status,
          date_of_birth: client.date_of_birth,
          address: `${client.address_line_1 || ''} ${client.city || ''}`.trim(),
          membership: client.memberships?.[0]?.membership_type || 'None',
          membership_status: client.memberships?.[0]?.status || 'None',
          emergency_contact: client.emergency_contacts?.[0] ? 
            `${client.emergency_contacts[0].first_name} ${client.emergency_contacts[0].last_name} (${client.emergency_contacts[0].phone_primary})` : '',
          medical_conditions: client.customer_medical_info?.medical_conditions ? 
            JSON.stringify(client.customer_medical_info.medical_conditions) : '',
          created_date: new Date(client.created_at).toLocaleDateString(),
          type: 'Customer'
        }))

      // Filter by current filters
      const exportData = allDetailedCustomers.filter(customer => {
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase()
          if (!customer.name.toLowerCase().includes(searchLower) && 
              !customer.email.toLowerCase().includes(searchLower)) {
            return false
          }
        }

        if (statusFilter && statusFilter !== 'All') {
          if (statusFilter === 'Active Customers' && customer.status !== 'active') return false
          if (statusFilter === 'Inactive Customers' && customer.status !== 'inactive') return false
          if (statusFilter === 'Slipping Away' && customer.status !== 'slipping_away') return false
        }

        return true
      })

      // Create comprehensive CSV
      const headers = [
        'Name', 'Email', 'Phone', 'Status', 'Type', 'Date of Birth', 
        'Address', 'Membership', 'Membership Status', 'Emergency Contact', 
        'Medical Conditions', 'Created Date'
      ]

      const csvRows = [
        headers.join(','),
        ...exportData.map(customer => [
          `"${customer.name}"`,
          `"${customer.email}"`,
          `"${customer.phone || ''}"`,
          `"${customer.status}"`,
          `"${customer.type}"`,
          `"${customer.date_of_birth || ''}"`,
          `"${customer.address}"`,
          `"${customer.membership}"`,
          `"${customer.membership_status}"`,
          `"${customer.emergency_contact}"`,
          `"${customer.medical_conditions}"`,
          `"${customer.created_date}"`
        ].join(','))
      ]

      const csv = csvRows.join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `customers-comprehensive-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success(`Successfully exported ${exportData.length} customers`)

    } catch (error) {
      console.error('Error exporting customers:', error)
      toast.error('Failed to export customers - please try again')
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setImportFile(file)
      parseCSVPreview(file)
    } else {
      alert('Please upload a CSV file')
    }
  }

  const parseCSVPreview = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const csv = e.target?.result as string
      const lines = csv.split('\n').slice(0, 6) // Preview first 5 rows + header
      const preview = lines.map(line => {
        // Simple CSV parsing (doesn't handle quoted commas perfectly)
        return line.split(',').map(cell => cell.replace(/"/g, '').trim())
      })
      setImportPreview(preview)
    }
    reader.readAsText(file)
  }

  const processImport = async () => {
    if (!importFile) return

    setImportLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be logged in to import customers')
        return
      }

      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!orgMember) {
        alert('No organization found')
        return
      }

      const reader = new FileReader()
      reader.onload = async (e) => {
        const csv = e.target?.result as string
        const lines = csv.split('\n').filter(line => line.trim())
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase())
        
        const customers = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.replace(/"/g, '').trim())
          const customer: any = {}
          
          headers.forEach((header, index) => {
            customer[header] = values[index] || ''
          })
          
          return customer
        }).filter(customer => customer.email) // Only import rows with email

        let successCount = 0
        let errorCount = 0

        for (const customer of customers) {
          try {
            // Determine if this should be a client or lead
            const isClient = customer.type?.toLowerCase() === 'client' || customer.membership !== 'None'
            
            if (isClient) {
              // Import as client
              const nameParts = customer.name?.split(' ') || []
              await supabase.from('clients').insert({
                organization_id: orgMember.organization_id,
                first_name: nameParts[0] || '',
                last_name: nameParts.slice(1).join(' ') || '',
                email: customer.email,
                phone: customer.phone,
                status: customer.status || 'active',
                date_of_birth: customer['date_of_birth'] || customer.dob || null,
                address_line_1: customer.address || customer['address_line_1'] || null,
                city: customer.city || null,
                postal_code: customer['postal_code'] || customer.postcode || null
              })
            } else {
              // Import as lead
              await supabase.from('leads').insert({
                organization_id: orgMember.organization_id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                status: customer.status || 'new',
                source: 'import'
              })
            }
            successCount++
          } catch (error) {
            console.error('Error importing customer:', customer.email, error)
            errorCount++
          }
        }

        alert(`Import complete: ${successCount} customers imported successfully, ${errorCount} errors`)
        setShowImportModal(false)
        setImportFile(null)
        setImportPreview([])
        fetchCustomers()
      }
      
      reader.readAsText(importFile)
    } catch (error) {
      console.error('Import error:', error)
      alert('Failed to import customers')
    } finally {
      setImportLoading(false)
    }
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
            <h1 className="text-3xl font-bold text-white">Customer List</h1>
            <div className="bg-blue-500/20 text-blue-400 rounded-full p-1">
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
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-1">Search</label>
              <input
                type="text"
                placeholder="Enter customer's name or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-9 w-5 h-5 text-gray-400" />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option>Active Customers</option>
                <option>Inactive Customers</option>
                <option>Slipping Away</option>
                <option>All</option>
              </select>
            </div>

            {/* Membership Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Membership</label>
              <select
                value={membershipFilter}
                onChange={(e) => setMembershipFilter(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
            <span className="text-sm font-medium text-gray-300">Show only:</span>
            <button
              onClick={() => setShowOnlyNew(!showOnlyNew)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                showOnlyNew 
                  ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-500' 
                  : 'bg-gray-700 text-gray-400 border-2 border-gray-600'
              }`}
            >
              New
            </button>
            <button
              onClick={() => setShowOnlySlipping(!showOnlySlipping)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                showOnlySlipping
                  ? 'bg-orange-500/20 text-orange-400 border-2 border-orange-500'
                  : 'bg-gray-700 text-gray-400 border-2 border-gray-600'
              }`}
            >
              Slipping Away
            </button>
          </div>
        </div>

        {/* Export and Pagination */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={exportCustomers}
              className="text-gray-600 hover:text-gray-800 font-medium flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Filtered List ({filteredCustomers.length} customers)
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Import Customers
            </button>
          </div>

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
        <div className="bg-gray-800 rounded-lg">
          {paginatedCustomers.length === 0 ? (
            <div className="p-12 text-center">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No customers found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {paginatedCustomers.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/customers/${customer.id}`}
                  className="block hover:bg-gray-700/50 transition-colors"
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
                          <h3 className="text-lg font-semibold text-white">
                            {customer.first_name} {customer.last_name}
                          </h3>
                          {customer.notes && (
                            <div className="flex items-center gap-1 text-red-400">
                              <span className="text-2xl">•</span>
                              <span className="text-sm">{customer.notes}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-gray-400">{customer.email}</p>
                        {customer.membership_name && (
                          <p className="text-sm text-blue-400 mt-1">{customer.membership_name}</p>
                        )}
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex items-center gap-2">
                      {customer.status === 'active' && (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                          ACTIVE
                        </span>
                      )}
                      {customer.status === 'slipping_away' && (
                        <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
                          SLIPPING AWAY
                        </span>
                      )}
                      {customer.status === 'inactive' && (
                        <span className="px-3 py-1 bg-gray-600 text-gray-300 rounded-full text-sm font-medium">
                          INACTIVE
                        </span>
                      )}
                      {showOnlyNew && (
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
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

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-4">Import Customers</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Upload CSV File
                  </label>
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
                    <Upload className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Click to upload or drag and drop CSV file</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Required columns: Name, Email. Optional: Phone, Status, Type, Address, etc.
                    </p>
                    <input 
                      type="file" 
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden" 
                      id="csv-upload"
                    />
                    <label 
                      htmlFor="csv-upload"
                      className="mt-2 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
                    >
                      Choose File
                    </label>
                  </div>
                </div>

                {importFile && (
                  <div>
                    <p className="text-white font-medium mb-2">
                      Selected file: {importFile.name}
                    </p>
                  </div>
                )}

                {importPreview.length > 0 && (
                  <div>
                    <h4 className="text-white font-medium mb-2">Preview (first 5 rows):</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-gray-700 rounded-lg">
                        <thead>
                          <tr className="bg-gray-600">
                            {importPreview[0]?.map((header: string, index: number) => (
                              <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.slice(1).map((row: string[], index: number) => (
                            <tr key={index} className="border-t border-gray-600">
                              {row.map((cell: string, cellIndex: number) => (
                                <td key={cellIndex} className="px-3 py-2 text-sm text-gray-300">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Import Instructions:</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• CSV must include 'Name' and 'Email' columns</li>
                    <li>• Optional columns: Phone, Status, Type, Date of Birth, Address, City, Postal Code</li>
                    <li>• Type should be 'Client' or 'Lead' (defaults to Lead if not specified)</li>
                    <li>• Status can be 'active', 'inactive' for clients or 'new', 'contacted', 'qualified' for leads</li>
                    <li>• Duplicate emails will be skipped</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowImportModal(false)
                    setImportFile(null)
                    setImportPreview([])
                  }}
                  className="flex-1 px-4 py-2 text-gray-400 hover:text-white"
                  disabled={importLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={processImport}
                  disabled={!importFile || importLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importLoading ? 'Importing...' : 'Import Customers'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}