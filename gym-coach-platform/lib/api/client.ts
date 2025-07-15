import { ApiResponse } from '@/types/database'

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
  }

  setToken(token: string) {
    this.token = token
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
    }

    const response = await fetch(url, config)
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }))
      throw new Error(error.error || 'Request failed')
    }

    const data: ApiResponse<T> = await response.json()
    
    if (data.error) {
      throw new Error(data.error)
    }

    return data.data as T
  }

  // Dashboard methods
  async getDashboardMetrics() {
    return this.request('/dashboard/metrics')
  }

  // Organization methods
  async getOrganization() {
    return this.request('/organizations')
  }

  async updateOrganization(id: string, data: any) {
    return this.request(`/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Lead methods
  async getLeads(params?: Record<string, any>) {
    const searchParams = new URLSearchParams(params).toString()
    return this.request(`/leads${searchParams ? `?${searchParams}` : ''}`)
  }

  async getLead(id: string) {
    return this.request(`/leads/${id}`)
  }

  async createLead(data: any) {
    return this.request('/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateLead(id: string, data: any) {
    return this.request(`/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteLead(id: string) {
    return this.request(`/leads/${id}`, {
      method: 'DELETE',
    })
  }

  // Client methods
  async getClients(params?: Record<string, any>) {
    const searchParams = new URLSearchParams(params).toString()
    return this.request(`/clients${searchParams ? `?${searchParams}` : ''}`)
  }

  async getClient(id: string) {
    return this.request(`/clients/${id}`)
  }

  async createClient(data: any) {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateClient(id: string, data: any) {
    return this.request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteClient(id: string) {
    return this.request(`/clients/${id}`, {
      method: 'DELETE',
    })
  }

  // Auth methods
  async getMe() {
    return this.request('/auth/me')
  }

  async updateProfile(data: any) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // AI methods
  async analyzeLead(leadId: string) {
    return this.request(`/leads/${leadId}/analyze`, {
      method: 'POST',
    })
  }

  async bulkAnalyzeLeads(leadIds: string[], forceReanalyze = false) {
    return this.request('/ai/bulk-analyze', {
      method: 'POST',
      body: JSON.stringify({ lead_ids: leadIds, force_reanalyze: forceReanalyze }),
    })
  }

  async getAIInsights() {
    return this.request('/ai/insights')
  }

  async getAIRecommendations() {
    return this.request('/ai/recommendations')
  }

  async actOnRecommendation(leadId: string, actionType: string) {
    return this.request('/ai/recommendations', {
      method: 'POST',
      body: JSON.stringify({ lead_id: leadId, action_type: actionType }),
    })
  }

  async getAIJobStatus() {
    return this.request('/ai/job')
  }

  async manageAIJob(action: string, config?: any) {
    return this.request('/ai/job', {
      method: 'POST',
      body: JSON.stringify({ action, config }),
    })
  }

}

export const apiClient = new ApiClient()