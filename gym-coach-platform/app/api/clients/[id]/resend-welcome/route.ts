import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { ClientPortalService } from '@/lib/services/ClientPortalService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const clientId = params.id;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this client
    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Verify client belongs to organization
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (!client.email) {
      return NextResponse.json({ error: 'Client has no email address' }, { status: 400 });
    }

    // Check if portal access exists
    const { data: portalAccess } = await supabase
      .from('client_portal_access')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (!portalAccess) {
      return NextResponse.json({ error: 'Portal access not found' }, { status: 404 });
    }

    // Resend welcome email
    const portalService = new ClientPortalService();
    await portalService.sendWelcomeEmail(clientId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resending welcome email:', error);
    return NextResponse.json(
      { error: 'Failed to resend welcome email' },
      { status: 500 }
    );
  }
}