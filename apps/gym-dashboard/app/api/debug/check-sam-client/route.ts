import { NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()
    
    // Check all clients
    const { data: allClients, error: allError } = await supabase
      .from('clients')
      .select('id, name, email, organization_id, status')
      .order('created_at', { ascending: false })
    
    // Search for Sam specifically
    const { data: samByEmail, error: emailError } = await supabase
      .from('clients')
      .select('*')
      .eq('email', 'samschofield90@hotmail.co.uk')
      .maybeSingle()
    
    const { data: samByName, error: nameError } = await supabase
      .from('clients')
      .select('*')
      .ilike('name', '%sam%schofield%')
    
    const { data: samByNameExact, error: exactError } = await supabase
      .from('clients')
      .select('*')
      .eq('name', 'Sam Schofield')
      .maybeSingle()
    
    // Get current organization from the first client if exists
    const currentOrgId = allClients?.[0]?.organization_id
    
    return NextResponse.json({
      success: true,
      totalClients: allClients?.length || 0,
      currentOrganizationId: currentOrgId,
      allClients: allClients || [],
      searchResults: {
        byEmail: samByEmail,
        byNameLike: samByName,
        byNameExact: samByNameExact
      },
      errors: {
        allClients: allError,
        byEmail: emailError,
        byName: nameError,
        byNameExact: exactError
      }
    })
  } catch (error: any) {
    console.error('Error checking Sam client:', error)
    return NextResponse.json({
      error: 'Failed to check clients',
      details: error.message
    }, { status: 500 })
  }
}