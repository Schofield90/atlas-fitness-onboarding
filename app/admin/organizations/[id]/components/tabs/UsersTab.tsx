'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface UsersTabProps {
  organizationId: string
}

export default function UsersTab({ organizationId }: UsersTabProps) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [organizationId])

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/admin/organizations/${organizationId}/users`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-40 bg-gray-200 rounded"></div>
    </div>
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Users</h3>
      
      {users.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Active</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.name || user.email}
                      </div>
                      {user.name && (
                        <div className="text-sm text-gray-500">{user.email}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full
                      ${user.role === 'owner' ? 'bg-purple-100 text-purple-800' : ''}
                      ${user.role === 'admin' ? 'bg-blue-100 text-blue-800' : ''}
                      ${user.role === 'member' ? 'bg-gray-100 text-gray-800' : ''}
                    `}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full
                      ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                    `}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {user.last_sign_in_at 
                      ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })
                      : 'Never'
                    }
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border rounded-lg p-4 text-center text-gray-500">
          No users found
        </div>
      )}
    </div>
  )
}