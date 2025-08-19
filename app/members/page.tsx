'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import DashboardLayout from '../components/DashboardLayout'
import { Users, Mail, Phone, Calendar, Activity, Search, Filter, Plus, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Member {
  id: string
  full_name: string
  email: string
  phone?: string
  created_at: string
  membership_status?: string
  last_visit?: string
  total_visits?: number
  membership_type?: string
  lead_source?: string
  tags?: string[]
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const supabase = createClient()

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's organization
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) {
        console.error('No organization found')
        setLoading(false)
        return
      }

      // Fetch all leads/clients for this organization
      const { data: leads, error } = await supabase
        .from('leads')
        .select(`
          *,
          lead_status:lead_statuses(name, color),
          customer_memberships(
            membership_plan:membership_plans(
              name,
              price,
              billing_period
            ),
            status,
            start_date,
            end_date
          )
        `)
        .eq('organization_id', userOrg.organization_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching members:', error)
      } else if (leads) {
        // Transform the data to match our Member interface
        const transformedMembers: Member[] = leads.map(lead => ({
          id: lead.id,
          full_name: lead.name || lead.full_name || 'Unknown',
          email: lead.email || '',
          phone: lead.phone,
          created_at: lead.created_at,
          membership_status: lead.customer_memberships?.[0]?.status || 'none',
          membership_type: lead.customer_memberships?.[0]?.membership_plan?.name || 'No membership',
          lead_source: lead.source,
          tags: lead.tags || [],
          last_visit: lead.last_activity_at,
          total_visits: lead.total_visits || 0
        }))
        
        setMembers(transformedMembers)
      }
    } catch (error) {
      console.error('Error in fetchMembers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          member.phone?.includes(searchTerm)
    
    const matchesFilter = filterStatus === 'all' ||
                          (filterStatus === 'active' && member.membership_status === 'active') ||
                          (filterStatus === 'inactive' && member.membership_status !== 'active')
    
    return matchesSearch && matchesFilter
  })

  const stats = {
    total: members.length,
    active: members.filter(m => m.membership_status === 'active').length,
    inactive: members.filter(m => m.membership_status !== 'active').length,
    newThisMonth: members.filter(m => {
      const createdDate = new Date(m.created_at)
      const now = new Date()
      return createdDate.getMonth() === now.getMonth() && 
             createdDate.getFullYear() === now.getFullYear()
    }).length
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">Members</h2>
              <p className="text-gray-400 mt-1">Manage your gym members and clients</p>
            </div>
            <Link
              href="/leads/new"
              className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Member
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Members</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active</p>
                  <p className="text-2xl font-bold text-white">{stats.active}</p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Inactive</p>
                  <p className="text-2xl font-bold text-white">{stats.inactive}</p>
                </div>
                <Users className="h-8 w-8 text-gray-500" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">New This Month</p>
                  <p className="text-2xl font-bold text-white">{stats.newThisMonth}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search members by name, email or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filterStatus === 'all' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  All ({stats.total})
                </button>
                <button
                  onClick={() => setFilterStatus('active')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filterStatus === 'active' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Active ({stats.active})
                </button>
                <button
                  onClick={() => setFilterStatus('inactive')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filterStatus === 'inactive' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Inactive ({stats.inactive})
                </button>
              </div>
            </div>
          </div>

          {/* Members List */}
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <p className="mt-2">Loading members...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'No members found matching your criteria' 
                    : 'No members yet'}
                </p>
                {!searchTerm && filterStatus === 'all' && (
                  <Link
                    href="/leads/new"
                    className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-400"
                  >
                    <Plus className="h-4 w-4" />
                    Add your first member
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700 border-b border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Member
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Membership
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-orange-600 flex items-center justify-center">
                              <span className="text-white font-medium">
                                {member.full_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-3">
                              <p className="text-white font-medium">{member.full_name}</p>
                              {member.lead_source && (
                                <p className="text-gray-400 text-sm">Source: {member.lead_source}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="flex items-center gap-2 text-gray-300">
                              <Mail className="h-4 w-4" />
                              {member.email}
                            </div>
                            {member.phone && (
                              <div className="flex items-center gap-2 text-gray-400 mt-1">
                                <Phone className="h-4 w-4" />
                                {member.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-white">{member.membership_type}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            member.membership_status === 'active'
                              ? 'bg-green-900 text-green-300'
                              : member.membership_status === 'pending'
                              ? 'bg-yellow-900 text-yellow-300'
                              : 'bg-gray-700 text-gray-300'
                          }`}>
                            {member.membership_status || 'No membership'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-sm">
                          {new Date(member.created_at).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/leads/${member.id}`}
                            className="text-orange-500 hover:text-orange-400 flex items-center gap-1"
                          >
                            View
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}