import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

// Get AI settings for an organization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('organizations')
      .select('ai_chatbot_enabled, ai_chatbot_settings')
      .eq('id', organizationId)
      .single()

    if (error) {
      console.error('Error fetching AI settings:', error)
      return NextResponse.json({ error: 'Failed to fetch AI settings' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('AI settings API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update AI settings for an organization
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationId, ai_chatbot_enabled, ai_chatbot_settings } = body

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    const updateData: any = {}
    if (typeof ai_chatbot_enabled === 'boolean') {
      updateData.ai_chatbot_enabled = ai_chatbot_enabled
    }
    if (ai_chatbot_settings) {
      updateData.ai_chatbot_settings = ai_chatbot_settings
    }

    const { data, error } = await adminSupabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating AI settings:', error)
      return NextResponse.json({ error: 'Failed to update AI settings' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('AI settings update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}