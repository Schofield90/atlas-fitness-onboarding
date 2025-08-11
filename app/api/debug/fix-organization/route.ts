import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user has organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (userOrg) {
      return NextResponse.json({
        status: 'ok',
        message: 'User already has organization',
        user_id: user.id,
        organization_id: userOrg.organization_id,
        role: userOrg.role
      })
    }

    // Check if user owns any organization
    const { data: ownedOrg } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (ownedOrg) {
      // Create user_organizations entry
      const { error: insertError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: ownedOrg.id,
          role: 'owner'
        })

      if (insertError) {
        return NextResponse.json({ 
          error: 'Failed to create user_organizations entry',
          details: insertError 
        }, { status: 500 })
      }

      return NextResponse.json({
        status: 'fixed',
        message: 'Created user_organizations entry for existing org',
        user_id: user.id,
        organization_id: ownedOrg.id
      })
    }

    // No organization exists, create one
    const { data: newOrg, error: createOrgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Atlas Fitness',
        owner_id: user.id,
        settings: {}
      })
      .select()
      .single()

    if (createOrgError) {
      return NextResponse.json({ 
        error: 'Failed to create organization',
        details: createOrgError 
      }, { status: 500 })
    }

    // Create user_organizations entry
    const { error: insertError } = await supabase
      .from('user_organizations')
      .insert({
        user_id: user.id,
        organization_id: newOrg.id,
        role: 'owner'
      })

    if (insertError) {
      return NextResponse.json({ 
        error: 'Failed to create user_organizations entry',
        details: insertError 
      }, { status: 500 })
    }

    return NextResponse.json({
      status: 'created',
      message: 'Created new organization and association',
      user_id: user.id,
      organization_id: newOrg.id,
      organization_name: newOrg.name
    })

  } catch (error: any) {
    console.error('Fix organization error:', error)
    return NextResponse.json({ 
      error: 'Failed to fix organization',
      details: error.message 
    }, { status: 500 })
  }
}