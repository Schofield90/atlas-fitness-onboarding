import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { portalAccessId, clientId, email, password, clientName } = await request.json()
    
    const adminSupabase = createAdminClient()
    
    // Create auth user
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        client_id: clientId,
        name: clientName
      }
    })

    if (authError) {
      // Check if user already exists
      if (authError.message?.includes('already exists')) {
        // Try to get existing user
        const { data: users } = await adminSupabase.auth.admin.listUsers()
        const existingUser = users?.users?.find((u: any) => u.email === email)
        
        if (existingUser) {
          // Update the user's metadata
          const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
            existingUser.id,
            {
              user_metadata: {
                client_id: clientId,
                name: clientName
              }
            }
          )
          
          if (!updateError) {
            authData.user = existingUser
          }
        }
      } else {
        throw authError
      }
    }

    if (authData?.user) {
      // Update client with user_id
      const { error: updateClientError } = await adminSupabase
        .from('clients')
        .update({ user_id: authData.user.id })
        .eq('id', clientId)

      if (updateClientError) {
        console.error('Error updating client:', updateClientError)
      }

      // Mark portal access as claimed
      const { error: claimError } = await adminSupabase
        .from('client_portal_access')
        .update({
          is_claimed: true,
          claimed_at: new Date().toISOString(),
          user_id: authData.user.id
        })
        .eq('id', portalAccessId)

      if (claimError) {
        console.error('Error claiming access:', claimError)
      }

      return NextResponse.json({ 
        success: true,
        userId: authData.user.id,
        message: 'Account created successfully' 
      })
    }

    throw new Error('Failed to create user account')
  } catch (error: any) {
    console.error('Error claiming portal access:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to claim portal access'
    }, { status: 500 })
  }
}