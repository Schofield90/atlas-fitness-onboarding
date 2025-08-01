import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Create admin client
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
      // Try to find any client
      const { data: anyClient } = await supabase
        .from('clients')
        .select('*')
        .limit(1)
        .single();

      return NextResponse.json({ 
        error: 'Sam Schofield not found',
        suggestion: 'No Sam Schofield client found. Here is an existing client:',
        existing_client: anyClient,
        all_clients_count: await supabase.from('clients').select('count')
      });
    }

    // Check if portal access exists
    const { data: portalAccess } = await supabase
      .from('client_portal_access')
      .select('*')
      .eq('client_id', client.id)
      .single();

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        status: client.status,
        organization_id: client.organization_id
      },
      portal_access: portalAccess ? {
        access_code: portalAccess.access_code,
        is_claimed: portalAccess.is_claimed,
        welcome_email_sent: portalAccess.welcome_email_sent,
        expires_at: portalAccess.expires_at
      } : null,
      needs_email: !client.email,
      ready_to_send: client.email && portalAccess
    });
  } catch (error) {
    console.error('Error checking Sam client:', error);
    return NextResponse.json(
      { error: 'Failed to check client', details: error },
      { status: 500 }
    );
  }
}