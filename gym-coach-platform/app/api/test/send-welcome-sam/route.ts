import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ClientPortalService } from '@/lib/services/ClientPortalService';

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Create admin client
    const cookieStore = cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Service Unavailable', message: 'Missing Supabase configuration' }, { status: 503 })
    }
    const supabase = createServerClient(
      supabaseUrl,
      serviceRoleKey,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Find Sam Schofield client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('name', 'Sam Schofield')
      .single();

    if (clientError || !client) {
      return NextResponse.json({ 
        error: 'Sam Schofield client not found',
        details: clientError 
      }, { status: 404 });
    }

    // Check if portal access exists
    const { data: existingAccess } = await supabase
      .from('client_portal_access')
      .select('*')
      .eq('client_id', client.id)
      .single();

    if (existingAccess) {
      // Send welcome email
      const portalService = new ClientPortalService();
      await portalService.sendWelcomeEmail(client.id);

      return NextResponse.json({
        message: 'Welcome email sent to Sam Schofield',
        client: {
          id: client.id,
          name: client.name,
          email: client.email
        },
        portal_access: {
          access_code: existingAccess.access_code,
          magic_link_token: existingAccess.magic_link_token,
          is_claimed: existingAccess.is_claimed,
          expires_at: existingAccess.expires_at
        },
        portal_login_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app'}/client-portal/login`,
        magic_link_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app'}/client-portal/claim?token=${existingAccess.magic_link_token}`
      });
    } else {
      // Create portal access
      const portalService = new ClientPortalService();
      const access = await portalService.getOrCreatePortalAccess(client.id);
      
      // Send welcome email
      await portalService.sendWelcomeEmail(client.id);

      return NextResponse.json({
        message: 'Portal access created and welcome email sent to Sam Schofield',
        client: {
          id: client.id,
          name: client.name,
          email: client.email
        },
        portal_access: {
          access_code: access.access_code,
          magic_link_token: access.magic_link_token,
          is_claimed: access.is_claimed,
          expires_at: access.expires_at
        },
        portal_login_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app'}/client-portal/login`,
        magic_link_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app'}/client-portal/claim?token=${access.magic_link_token}`
      });
    }
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error },
      { status: 500 }
    );
  }
}