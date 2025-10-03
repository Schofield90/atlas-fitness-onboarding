import { createClient } from '@/app/lib/supabase/client'

export interface Instructor {
  id: string
  organization_id: string
  name: string
  email?: string
  phone?: string
  created_at: string
}

export async function getInstructors(organizationId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('instructors')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name')

  if (error) {
    console.error('Error fetching instructors:', error)
    return []
  }

  return data || []
}

export async function createInstructor(organizationId: string, name: string, email?: string, phone?: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('instructors')
    .insert({
      organization_id: organizationId,
      name,
      email,
      phone
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}