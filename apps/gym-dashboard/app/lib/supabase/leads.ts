import { createClient } from './server'
import type { Database } from './database.types'

type Lead = Database['public']['Tables']['leads']['Row']
type LeadInsert = Database['public']['Tables']['leads']['Insert']
type LeadUpdate = Database['public']['Tables']['leads']['Update']

export async function getLeads(organizationId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    
  if (error) throw error
  return data
}

export async function getLeadById(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()
    
  if (error) throw error
  return data
}

export async function createLead(lead: Omit<LeadInsert, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('leads')
    .insert(lead)
    .select()
    .single()
    
  if (error) throw error
  return data
}

export async function updateLead(id: string, updates: LeadUpdate) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
    
  if (error) throw error
  return data
}

export async function deleteLead(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)
    
  if (error) throw error
}

export async function bulkCreateLeads(leads: Array<Omit<LeadInsert, 'id' | 'created_at' | 'updated_at'>>) {
  const supabase = await createClient()
  
  // Filter out duplicates based on facebook_lead_id
  const facebookLeadIds = leads
    .filter(l => l.facebook_lead_id)
    .map(l => l.facebook_lead_id)
  
  let existingLeadIds: string[] = []
  
  if (facebookLeadIds.length > 0) {
    const { data: existing } = await supabase
      .from('leads')
      .select('facebook_lead_id')
      .in('facebook_lead_id', facebookLeadIds as string[])
    
    existingLeadIds = existing?.map(l => l.facebook_lead_id) || []
  }
  
  const newLeads = leads.filter(
    lead => !lead.facebook_lead_id || !existingLeadIds.includes(lead.facebook_lead_id)
  )
  
  if (newLeads.length === 0) {
    return { created: 0, skipped: leads.length }
  }
  
  const { data, error } = await supabase
    .from('leads')
    .insert(newLeads)
    .select()
    
  if (error) throw error
  
  return {
    created: data?.length || 0,
    skipped: leads.length - newLeads.length
  }
}