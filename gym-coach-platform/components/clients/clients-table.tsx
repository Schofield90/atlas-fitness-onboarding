'use client'

import { useState } from 'react'
import { ChevronDown, Search, Plus, Eye, Edit, Trash2 } from 'lucide-react'
import { useClients, useDeleteClient } from '@/hooks/use-api'
import { Client, MembershipStatus } from '@/types/database'
import { cn } from '@/lib/utils'

interface ClientsTableProps {
  onCreateClient: () => void
  onEditClient: (client: Client) => void
  onViewClient: (client: Client) => void
}

export function ClientsTable({ onCreateClient, onEditClient, onViewClient }: ClientsTableProps) {
  const [search, setSearch] = useState('')
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | ''>('')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data: clientsData, isLoading, error } = useClients({
    page,
    limit: 10,
    search: search || undefined,
    membership_status: membershipStatus || undefined,
    sort: sortBy,
    order: sortOrder,
  })
  
  const clientsResponse = clientsData as any

  const deleteClient = useDeleteClient()

  const getStatusBadge = (status: MembershipStatus) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
    }

    return (
      <span className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        styles[status]
      )}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const handleDeleteClient = async (client: Client) => {
    if (window.confirm(`Are you sure you want to delete ${client.name}?`)) {
      deleteClient.mutate(client.id)
    }
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load clients</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Clients</h2>
          <button
            onClick={onCreateClient}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <select
            value={membershipStatus}
            onChange={(e) => setMembershipStatus(e.target.value as MembershipStatus | '')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th 
                className="text-left py-3 px-6 font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Name
                  <ChevronDown className="w-4 h-4 ml-1" />
                </div>
              </th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Email</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Membership</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Status</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Revenue</th>
              <th 
                className="text-left py-3 px-6 font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center">
                  Joined
                  <ChevronDown className="w-4 h-4 ml-1" />
                </div>
              </th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="py-4 px-6">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex space-x-2">
                      <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </td>
                </tr>
              ))
            ) : clientsResponse?.clients?.length ? (
              clientsResponse.clients.map((client: any) => (
                <tr key={client.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div className="font-medium text-gray-900">{client.name}</div>
                    {client.phone && (
                      <div className="text-sm text-gray-500">{client.phone}</div>
                    )}
                  </td>
                  <td className="py-4 px-6 text-gray-900">{client.email}</td>
                  <td className="py-4 px-6 text-gray-700">{client.membership_type}</td>
                  <td className="py-4 px-6">{getStatusBadge(client.membership_status)}</td>
                  <td className="py-4 px-6 text-gray-700">
                    {formatCurrency(client.total_revenue)}
                  </td>
                  <td className="py-4 px-6 text-gray-700">
                    {new Date(client.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onViewClient(client)}
                        className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                        title="View client"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEditClient(client)}
                        className="p-1 text-gray-600 hover:text-green-600 transition-colors"
                        title="Edit client"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClient(client)}
                        className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                        title="Delete client"
                        disabled={deleteClient.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-8 px-6 text-center text-gray-500">
                  No clients found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {clientsResponse?.pagination && clientsResponse.pagination.pages > 1 && (
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((clientsResponse.pagination.page - 1) * clientsResponse.pagination.limit) + 1} to{' '}
            {Math.min(clientsResponse.pagination.page * clientsResponse.pagination.limit, clientsResponse.pagination.total)} of{' '}
            {clientsResponse.pagination.total} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= clientsResponse.pagination.pages}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}