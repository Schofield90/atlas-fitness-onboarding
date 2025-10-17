import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }
    
    const supabase = createAdminClient()
    
    // Get the magic link record
    const { data: magicLink, error: linkError } = await supabase
      .from('magic_links')
      .select('*, client:clients(*)')
      .eq('token', token)
      .eq('used', false)
      .single()
      
    if (linkError || !magicLink) {
      return NextResponse.json({ error: 'Invalid or expired login link' }, { status: 400 })
    }
    
    // Check if link has expired
    if (new Date(magicLink.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Login link has expired' }, { status: 400 })
    }
    
    // Mark the link as used
    const { error: updateError } = await supabase
      .from('magic_links')
      .update({ 
        used: true, 
        used_at: new Date().toISOString() 
      })
      .eq('id', magicLink.id)
      
    if (updateError) {
      console.error('Failed to update magic link:', updateError)
    }
    
    // For now, we'll return the client details
    // In a production app, you'd create a proper session here
    return NextResponse.json({
      success: true,
      email: magicLink.client.email,
      clientId: magicLink.client.id,
      organizationId: magicLink.organization_id,
      // In a real implementation, you'd handle auth differently
      // This is a simplified version
      temporaryPassword: 'temporary-' + token.substring(0, 8)
    })
    
  } catch (error: unknown) {
    console.error('Validate magic link error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" || 'Internal error' }, { status: 500 })
  }
}