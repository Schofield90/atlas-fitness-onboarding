'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import DashboardLayout from '../components/DashboardLayout'
import { Users, Mail, Phone, Calendar, Activity, Search, Filter, Plus, ChevronRight, UserCheck, UserX, Clock, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from '@/app/lib/toast'
import { formatBritishDate, formatBritishCurrency } from '@/app/lib/utils/british-format'

interface Member {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  created_at: string
  membership_status?: string
  membership_plan_id?: string
  membership_plan_name?: string
  last_visit?: string
  total_visits?: number
  status: 'active' | 'inactive' | 'pending'
  tags?: string[]
  notes?: string
}

function MembersContent() {
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'pending'>('all')
  const [planFilter, setPlanFilter] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(25)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for plan filter from URL
    const planId = searchParams.get('plan')
    if (planId) {
      setPlanFilter(planId)
    }
    
    // Get page from URL
    const page = parseInt(searchParams.get('page') || '1')
    setCurrentPage(page)
    
    fetchMembers()
  }, [searchParams])

  useEffect(() => {
    filterMembers()
  }, [members, searchTerm, filterStatus, planFilter])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's organization
      let organizationId: string | null = null
      
      // Try new table first
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (userOrg) {
        organizationId = userOrg.organization_id
      } else {
        // Fallback to users table
        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single()
        
        if (userData) {
          organizationId = userData.organization_id
        }
      }

      if (!organizationId) {
        console.error('No organization found')
        toast.error('No organization found')
        setLoading(false)
        return
      }

      // Fetch clients with their memberships (simplified query)
      
      // Try both organization_id and org_id fields
      const { data: clientsByOrgId, error: error1 } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
      
      const { data: clientsByOrgIdAlt, error: error2 } = await supabase
        .from('clients')
        .select('*')
        .eq('org_id', organizationId)
        .order('created_at', { ascending: false })
      
      // Combine results from both queries
      const clients = [...(clientsByOrgId || []), ...(clientsByOrgIdAlt || [])]
      const error = error1 || error2
      
      // Remove duplicates based on email (primary identifier for members)
      // Keep the most recently updated version if duplicates exist
      const uniqueClients = clients.reduce((acc: any[], client) => {
        const existingIndex = acc.findIndex(c => 
          c.email && client.email && c.email.toLowerCase() === client.email.toLowerCase()
        )
        
        if (existingIndex === -1) {
          // No duplicate found, add the client
          acc.push(client)
        } else {
          // Duplicate found, keep the more recent one
          const existing = acc[existingIndex]
          const existingDate = new Date(existing.updated_at || existing.created_at)
          const currentDate = new Date(client.updated_at || client.created_at)
          
          if (currentDate > existingDate) {
            acc[existingIndex] = client
          }
        }
        
        return acc
      }, [])
      

      if (error1 && error2) {
        console.error('Error fetching members:', error)
        toast.error('Failed to load members')
        return
      }

      // If we have clients, fetch their memberships separately
      let membershipsData: any[] = []
      if (uniqueClients && uniqueClients.length > 0) {
        const clientIds = uniqueClients.map(c => c.id)
        const { data: memberships } = await supabase
          .from('memberships')
          .select('*')
          .in('client_id', clientIds)
        
        membershipsData = memberships || []
      }

      // Fetch membership plans
      const { data: membershipPlans } = await supabase
        .from('membership_plans')
        .select('id, name, price_pennies')
        .eq('organization_id', organizationId)

      // Transform to member format
      const transformedMembers: Member[] = (uniqueClients || []).map(client => {
        const membership = membershipsData.find(m => m.client_id === client.id)
        const membershipPlan = membership && membershipPlans ? 
          membershipPlans.find((p: any) => p.id === membership.membership_plan_id) : null
        
        return {
          id: client.id,
          first_name: client.first_name || '',
          last_name: client.last_name || '',
          email: client.email || '',
          phone: client.phone || '',
          created_at: client.created_at,
          membership_status: membership?.status || 'No Membership',
          membership_plan_id: membership?.membership_plan_id,
          membership_plan_name: membershipPlan?.name || 'No Plan',
          last_visit: client.last_visit,
          total_visits: client.total_visits || 0,
          status: determineStatus(client, membership),
          tags: client.tags || [],
          notes: client.notes
        }
      })

      setMembers(transformedMembers)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  const determineStatus = (client: any, membership: any): 'active' | 'inactive' | 'pending' => {
    if (!membership) return 'inactive'
    
    if (membership.status === 'active') {
      // Check if membership is expired
      if (membership.end_date && new Date(membership.end_date) < new Date()) {
        return 'inactive'
      }
      return 'active'
    }
    
    if (membership.status === 'pending') return 'pending'
    
    return 'inactive'
  }

  const filterMembers = () => {
    let filtered = [...members]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(member => {
        const fullName = `${member.first_name} ${member.last_name}`.toLowerCase()
        const email = member.email.toLowerCase()
        const search = searchTerm.toLowerCase()
        return fullName.includes(search) || email.includes(search)
      })
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(m => m.status === filterStatus)
    }

    // Plan filter (from URL)
    if (planFilter) {
      filtered = filtered.filter(m => m.membership_plan_id === planFilter)
    }

    setFilteredMembers(filtered)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <UserCheck className="w-3 h-3 mr-1" />
            Active
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <UserX className="w-3 h-3 mr-1" />
            Inactive
          </span>
        )
    }
  }

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedMembers = filteredMembers.slice(startIndex, startIndex + itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const handleClearPlanFilter = () => {
    setPlanFilter(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('plan')
    router.replace(`?${params.toString()}`)
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Members</h1>
            <p className="text-gray-400 mt-1">Manage your gym members and their memberships</p>
          </div>
          <Link
            href="/members/add"
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-orange-500 mr-3" />
              <div>
                <p className="text-gray-400 text-sm">Total Members</p>
                <p className="text-2xl font-bold text-white">{members.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-gray-400 text-sm">Active</p>
                <p className="text-2xl font-bold text-white">
                  {members.filter(m => m.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-gray-400 text-sm">Pending</p>
                <p className="text-2xl font-bold text-white">
                  {members.filter(m => m.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center">
              <UserX className="h-8 w-8 text-gray-500 mr-3" />
              <div>
                <p className="text-gray-400 text-sm">Inactive</p>
                <p className="text-2xl font-bold text-white">
                  {members.filter(m => m.status === 'inactive').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
            >
              <option value="all">All Members</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          {planFilter && (
            <div className="mt-4 flex items-center">
              <span className="text-sm text-gray-400 mr-2">Filtering by plan:</span>
              <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-sm">
                {members.find(m => m.membership_plan_id === planFilter)?.membership_plan_name || 'Unknown Plan'}
              </span>
              <button
                onClick={handleClearPlanFilter}
                className="ml-2 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Members Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
              <p className="text-gray-400 mt-4">Loading members...</p>
            </div>
          ) : paginatedMembers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                {searchTerm || filterStatus !== 'all' || planFilter
                  ? 'No members found matching your filters'
                  : 'No members in your organization yet'}
              </p>
              {!searchTerm && !planFilter && filterStatus === 'all' && (
                <>
                  <Link
                    href="/customers/new"
                    className="mt-4 inline-flex items-center text-orange-500 hover:text-orange-400"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add your first member
                  </Link>
                  <p className="text-sm text-gray-500 mt-2">
                    Members are created when customers sign up for a membership plan
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Member
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Membership
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Last Visit
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {paginatedMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-750">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-orange-600 flex items-center justify-center">
                                <span className="text-white font-medium">
                                  {member.first_name[0]}{member.last_name[0]}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-white">
                                {member.first_name} {member.last_name}
                              </div>
                              <div className="text-sm text-gray-400">
                                {member.email}
                              </div>
                              {member.phone && (
                                <div className="text-sm text-gray-500">
                                  {member.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{member.membership_plan_name}</div>
                          <div className="text-sm text-gray-400">{member.membership_status}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(member.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {formatBritishDate(member.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {member.last_visit ? formatBritishDate(member.last_visit) : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/members/${member.id}`}
                            className="text-orange-500 hover:text-orange-400"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-gray-900 px-4 py-3 flex items-center justify-between sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-white bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-white bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-400">
                        Showing{' '}
                        <span className="font-medium">{startIndex + 1}</span> to{' '}
                        <span className="font-medium">
                          {Math.min(startIndex + itemsPerPage, filteredMembers.length)}
                        </span>{' '}
                        of <span className="font-medium">{filteredMembers.length}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-600 bg-gray-700 text-sm font-medium text-gray-400 hover:bg-gray-600 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => handlePageChange(i + 1)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === i + 1
                                ? 'z-10 bg-orange-600 border-orange-600 text-white'
                                : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-600 bg-gray-700 text-sm font-medium text-gray-400 hover:bg-gray-600 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MembersPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      }>
        <MembersContent />
      </Suspense>
    </DashboardLayout>
  )
}