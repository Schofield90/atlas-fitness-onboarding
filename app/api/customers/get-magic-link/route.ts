import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { requireAuth, createOrgScopedClient } from '@/lib/auth-middleware'

export async function POST(request: NextRequest) {
  // Authentication check
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  
  // Create organization-scoped Supabase client
  const supabase = createOrgScopedClient(auth.organizationId)
  
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    
    // First check if user exists in auth.users
    const { data: users } = await supabase.auth.admin.listUsers()
    const existingUser = users?.users?.find((u: any) => u.email === email)
    
    if (existingUser) {
      // User exists, generate magic link
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app'}/booking`
        }
      })

      if (error || !data) {
        return NextResponse.json(
          { error: 'Failed to generate magic link', details: error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        magicLink: data.properties.action_link,
        userExists: true,
        message: 'User exists in auth system. Use the magic link below to log in.'
      })
    } else {
      // User doesn't exist, create them first
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true
      })

      if (createError) {
        return NextResponse.json(
          { error: 'Failed to create user', details: createError },
          { status: 500 }
        )
      }

      // Generate magic link for new user
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app'}/booking`
        }
      })

      if (error || !data) {
        return NextResponse.json(
          { error: 'Failed to generate magic link', details: error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        magicLink: data.properties.action_link,
        userExists: false,
        message: 'New user created. Use the magic link below to log in.'
      })
    }
  } catch (error: any) {
    console.error('Error generating magic link:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}