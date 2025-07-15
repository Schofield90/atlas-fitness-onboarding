'use client'

import { useState } from 'react'
import { ClientsTable } from '@/components/clients/clients-table'
import { Client } from '@/types/database'

export default function ClientsPage() {
  const [showForm, setShowForm] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | undefined>()

  const handleCreateClient = () => {
    setSelectedClient(undefined)
    setShowForm(true)
  }

  const handleEditClient = (client: Client) => {
    setSelectedClient(client)
    setShowForm(true)
  }

  const handleViewClient = (client: Client) => {
    setSelectedClient(client)
    // Could implement client details modal here
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
        <p className="text-gray-600">Manage your active gym members and their memberships</p>
      </div>

      <ClientsTable
        onCreateClient={handleCreateClient}
        onEditClient={handleEditClient}
        onViewClient={handleViewClient}
      />
    </div>
  )
}