import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function withAuth(handler: (req: NextRequest, user: any) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    return handler(req, user)
  }
}

export async function withOrganization(handler: (req: NextRequest, user: any, organizationId: string) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const organizationId = req.headers.get('x-organization-id')
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }
    
    return handler(req, user, organizationId)
  }
}