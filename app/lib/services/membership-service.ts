import { createClient } from '@/app/lib/supabase/client'
import { getCurrentUserOrganization } from '@/app/lib/organization-service'

export interface MembershipPlan {
  id: string
  name: string
  description: string
  price: number
  price_amount: number
  billing_period: string
  features: any
  is_active: boolean
  trial_days?: number
  max_members?: number | null
  class_credits?: number
  created_at: string
  updated_at: string
  organization_id: string
}

export async function getMembershipPlans(): Promise<{ plans: MembershipPlan[], error: string | null }> {
  try {
    const supabase = createClient()
    
    // Get organization ID using the centralized service
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      console.error('Organization error:', orgError)
      return { plans: [], error: orgError || 'No organization found' }
    }
    
    // Fetch membership plans
    const { data, error } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching membership plans:', error)
      return { plans: [], error: error.message }
    }
    
    // Normalize the price field (convert price_amount from decimal to pennies for consistency)
    const normalizedPlans = (data || []).map(plan => ({
      ...plan,
      price: plan.price_amount ? Math.round(plan.price_amount * 100) : 0,
      price_amount: plan.price_amount || 0,
      features: Array.isArray(plan.features) ? plan.features : (plan.features ? [plan.features] : [])
    }))
    
    return { plans: normalizedPlans, error: null }
  } catch (error: any) {
    console.error('Unexpected error in getMembershipPlans:', error)
    return { plans: [], error: error.message || 'Failed to fetch membership plans' }
  }
}

export async function createMembershipPlan(plan: Omit<MembershipPlan, 'id' | 'created_at' | 'updated_at'>): Promise<{ plan: MembershipPlan | null, error: string | null }> {
  try {
    const supabase = createClient()
    
    // Get organization ID
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      return { plan: null, error: orgError || 'No organization found' }
    }
    
    // Convert price from pennies to decimal for price_amount field
    const planData = {
      ...plan,
      organization_id: organizationId,
      price_amount: plan.price ? plan.price / 100 : (plan.price_amount || 0)
    }
    
    // Remove the price field if it exists (we use price_amount in the database)
    delete (planData as any).price
    
    // Create the plan
    const { data, error } = await supabase
      .from('membership_plans')
      .insert(planData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating membership plan:', error)
      return { plan: null, error: error.message }
    }
    
    return { plan: data, error: null }
  } catch (error: any) {
    console.error('Unexpected error in createMembershipPlan:', error)
    return { plan: null, error: error.message || 'Failed to create membership plan' }
  }
}

export async function updateMembershipPlan(id: string, updates: Partial<MembershipPlan>): Promise<{ plan: MembershipPlan | null, error: string | null }> {
  try {
    const supabase = createClient()
    
    // Get organization ID to ensure we're updating our own plan
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      return { plan: null, error: orgError || 'No organization found' }
    }
    
    // Update the plan
    const { data, error } = await supabase
      .from('membership_plans')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId) // Security: ensure we only update our own plans
      .select()
      .single()
    
    if (error) {
      console.error('Error updating membership plan:', error)
      return { plan: null, error: error.message }
    }
    
    return { plan: data, error: null }
  } catch (error: any) {
    console.error('Unexpected error in updateMembershipPlan:', error)
    return { plan: null, error: error.message || 'Failed to update membership plan' }
  }
}

export async function deleteMembershipPlan(id: string): Promise<{ success: boolean, error: string | null }> {
  try {
    const supabase = createClient()
    
    // Get organization ID
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      return { success: false, error: orgError || 'No organization found' }
    }
    
    // Delete the plan
    const { error } = await supabase
      .from('membership_plans')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId) // Security: ensure we only delete our own plans
    
    if (error) {
      console.error('Error deleting membership plan:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, error: null }
  } catch (error: any) {
    console.error('Unexpected error in deleteMembershipPlan:', error)
    return { success: false, error: error.message || 'Failed to delete membership plan' }
  }
}