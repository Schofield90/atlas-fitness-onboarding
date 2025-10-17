'use server'

import { createClient } from '@/app/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createOrganization(organizationData: {
  name: string
  type: string
  phone: string
  email: string
  address: string
}) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { 
        success: false, 
        error: 'Authentication required' 
      }
    }

    // Generate slug from organization name
    const slug = organizationData.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: organizationData.name,
        slug: slug,
        type: organizationData.type || 'gym',
        phone: organizationData.phone,
        email: organizationData.email,
        address: organizationData.address,
        settings: {}
      })
      .select()
      .single()

    if (orgError) {
      console.error('Organization creation error:', orgError)
      return { 
        success: false, 
        error: `Failed to create organization: ${orgError.message}` 
      }
    }

    // Add user as owner (handle both org_id and organization_id column names)
    const memberData: any = {
      user_id: user.id,
      role: 'owner',
      is_active: true
    }
    
    // Try organization_id first, fallback to org_id if it fails
    memberData.organization_id = org.id
    
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert(memberData)

    if (memberError) {
      console.error('Member creation error:', memberError)
      // Try to rollback organization creation
      await supabase
        .from('organizations')
        .delete()
        .eq('id', org.id)
      
      return { 
        success: false, 
        error: `Failed to add user to organization: ${memberError.message}` 
      }
    }

    // Revalidate paths
    revalidatePath('/dashboard')
    revalidatePath('/onboarding')

    return { 
      success: true, 
      organizationId: org.id 
    }
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return { 
      success: false, 
      error: `Unexpected error: ${error.message}` 
    }
  }
}