// API client for making requests to backend endpoints
// This file provides typed methods for all API routes

export const apiClient = {
  // Dashboard endpoints
  getDashboardMetrics: async () => {
    const response = await fetch('/api/dashboard/metrics')
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard metrics')
    }
    return response.json()
  },

  // Organization endpoints
  getOrganization: async () => {
    const response = await fetch('/api/organization')
    if (!response.ok) {
      throw new Error('Failed to fetch organization')
    }
    return response.json()
  },

  updateOrganization: async (id: string, data: any) => {
    const response = await fetch(`/api/organization/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to update organization')
    }
    return response.json()
  },

  // Lead endpoints
  getLeads: async (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params)
    const response = await fetch(`/api/leads?${searchParams}`)
    if (!response.ok) {
      throw new Error('Failed to fetch leads')
    }
    return response.json()
  },

  getLead: async (id: string) => {
    const response = await fetch(`/api/leads/${id}`)
    if (!response.ok) {
      throw new Error('Failed to fetch lead')
    }
    return response.json()
  },

  createLead: async (data: any) => {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to create lead')
    }
    return response.json()
  },

  updateLead: async (id: string, data: any) => {
    const response = await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to update lead')
    }
    return response.json()
  },

  deleteLead: async (id: string) => {
    const response = await fetch(`/api/leads/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('Failed to delete lead')
    }
    return response.json()
  },

  bulkImportLeads: async (leads: any[]) => {
    const response = await fetch('/api/leads/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads }),
    })
    if (!response.ok) {
      throw new Error('Failed to import leads')
    }
    return response.json()
  },

  exportLeads: async (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params)
    const response = await fetch(`/api/leads/export?${searchParams}`)
    if (!response.ok) {
      throw new Error('Failed to export leads')
    }
    return response.blob()
  },

  // Client endpoints
  getClients: async (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams(params)
    const response = await fetch(`/api/clients?${searchParams}`)
    if (!response.ok) {
      throw new Error('Failed to fetch clients')
    }
    return response.json()
  },

  getClient: async (id: string) => {
    const response = await fetch(`/api/clients/${id}`)
    if (!response.ok) {
      throw new Error('Failed to fetch client')
    }
    return response.json()
  },

  createClient: async (data: any) => {
    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to create client')
    }
    return response.json()
  },

  updateClient: async (id: string, data: any) => {
    const response = await fetch(`/api/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to update client')
    }
    return response.json()
  },

  deleteClient: async (id: string) => {
    const response = await fetch(`/api/clients/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('Failed to delete client')
    }
    return response.json()
  },

  // Auth endpoints
  getMe: async () => {
    const response = await fetch('/api/auth/me')
    if (!response.ok) {
      throw new Error('Failed to fetch user profile')
    }
    return response.json()
  },

  updateProfile: async (data: any) => {
    const response = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to update profile')
    }
    return response.json()
  },
}