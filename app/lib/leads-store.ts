// Simple in-memory store for leads
// In production, this would be replaced with a database

export interface Lead {
  id: string
  name: string
  email: string
  phone: string
  source: string
  status: string
  created_at: string
  form_name?: string | null
  campaign_name?: string | null
  facebook_lead_id?: string | null
  page_id?: string | null
  form_id?: string | null
  custom_fields?: Record<string, any>
  updated_at?: string
}

// Initialize with some mock data
let leadsStore: Lead[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+1 (555) 123-4567',
    source: 'facebook',
    status: 'new',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    form_name: 'Free Trial Sign Up',
    campaign_name: 'Summer Special 2024',
    facebook_lead_id: 'fb_lead_123',
    page_id: '123456789',
    form_id: 'form_123'
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '+1 (555) 234-5678',
    source: 'facebook',
    status: 'contacted',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    form_name: 'Membership Inquiry',
    campaign_name: 'New Year Campaign',
    facebook_lead_id: 'fb_lead_124',
    page_id: '123456789',
    form_id: 'form_124'
  },
  {
    id: '3',
    name: 'Mike Wilson',
    email: 'mike.wilson@email.com',
    phone: '+1 (555) 345-6789',
    source: 'website',
    status: 'qualified',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    form_name: 'Contact Form',
    campaign_name: null,
    facebook_lead_id: null,
    page_id: null,
    form_id: null
  }
]

export const leadsDB = {
  // Get all leads
  getAll(): Lead[] {
    return [...leadsStore]
  },

  // Get filtered leads
  getFiltered(filters: {
    status?: string
    source?: string
    formId?: string
    pageId?: string
  }): Lead[] {
    let filtered = [...leadsStore]
    
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(lead => lead.status === filters.status)
    }
    
    if (filters.source) {
      filtered = filtered.filter(lead => lead.source === filters.source)
    }
    
    if (filters.formId) {
      filtered = filtered.filter(lead => lead.form_id === filters.formId)
    }
    
    if (filters.pageId) {
      filtered = filtered.filter(lead => lead.page_id === filters.pageId)
    }
    
    return filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  },

  // Get single lead
  getById(id: string): Lead | undefined {
    return leadsStore.find(lead => lead.id === id)
  },

  // Create new lead
  create(leadData: Omit<Lead, 'id' | 'created_at'>): Lead {
    const newLead: Lead = {
      ...leadData,
      id: Date.now().toString(),
      created_at: new Date().toISOString()
    }
    leadsStore.unshift(newLead)
    return newLead
  },

  // Update lead
  update(id: string, updates: Partial<Lead>): Lead | null {
    const index = leadsStore.findIndex(lead => lead.id === id)
    if (index === -1) return null
    
    leadsStore[index] = {
      ...leadsStore[index],
      ...updates,
      updated_at: new Date().toISOString()
    }
    return leadsStore[index]
  },

  // Delete lead
  delete(id: string): Lead | null {
    const index = leadsStore.findIndex(lead => lead.id === id)
    if (index === -1) return null
    
    return leadsStore.splice(index, 1)[0]
  },

  // Check if lead exists by Facebook ID
  existsByFacebookId(facebookLeadId: string): boolean {
    return leadsStore.some(lead => lead.facebook_lead_id === facebookLeadId)
  },

  // Bulk create leads (for sync)
  bulkCreate(leads: Array<Omit<Lead, 'id' | 'created_at'>>): { created: number, skipped: number } {
    let created = 0
    let skipped = 0
    
    for (const leadData of leads) {
      // Skip if lead already exists (based on Facebook ID)
      if (leadData.facebook_lead_id && this.existsByFacebookId(leadData.facebook_lead_id)) {
        skipped++
        continue
      }
      
      this.create(leadData)
      created++
    }
    
    return { created, skipped }
  }
}