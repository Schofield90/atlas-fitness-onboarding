'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Users, Mail, Calendar, Shield, Search } from 'lucide-react'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      // Fetch from user_organizations with user and organization info
      const { data: userOrgs, error } = await supabase
        .from('user_organizations')
        .select(`
          *,
          organization:organizations(name),
          user:auth.users!user_id(email, created_at, last_sign_in_at, raw_user_meta_data)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching users:', error)
        // Fallback to basic query
        const { data: basicUserOrgs } = await supabase
          .from('user_organizations')
          .select('*')
          .eq('is_active', true)
        
        // Get auth.users data separately
        const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()
        
        if (basicUserOrgs && authUsers) {
          const mergedUsers = basicUserOrgs.map(uo => {
            const authUser = authUsers.find(au => au.id === uo.user_id)
            return {
              id: uo.user_id,
              email: authUser?.email || 'Unknown',
              name: authUser?.user_metadata?.name || authUser?.email?.split('@')[0] || 'Unknown',
              role: uo.role,
              organization_name: 'Atlas Fitness',
              created_at: uo.created_at,
              last_sign_in_at: authUser?.last_sign_in_at || null
            }
          })
          setUsers(mergedUsers)
        }
      } else {
        // Transform data from the joined query
        const transformedUsers = userOrgs?.map(uo => ({
          id: uo.user_id,
          email: uo.user?.email || 'Unknown',
          name: uo.user?.raw_user_meta_data?.name || uo.user?.email?.split('@')[0] || 'Unknown',
          role: uo.role,
          organization_name: uo.organization?.name || 'No Organization',
          created_at: uo.created_at,
          last_sign_in_at: uo.user?.last_sign_in_at || null
        })) || []
        
        setUsers(transformedUsers)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-500">Users Management</h1>
            <p className="text-sm text-gray-400">Manage all platform users</p>
          </div>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <div className="p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Organization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium">{user.name || user.email}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {user.organization_name || 'No Organization'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.role === 'owner' ? 'bg-purple-500/20 text-purple-400' :
                      user.role === 'admin' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {user.role || 'member'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button className="text-purple-400 hover:text-purple-300">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}