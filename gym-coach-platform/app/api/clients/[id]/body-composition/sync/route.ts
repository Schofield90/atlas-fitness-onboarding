import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { LookInBodyService } from '@/lib/services/lookinbody/LookInBodyService';
import { ClientMatchingService } from '@/lib/services/lookinbody/ClientMatchingService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const clientId = params.id;
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    // Get current user's organization
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
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

    // Initialize services
    const lookInBodyService = new LookInBodyService(profile.organization_id);
    const matchingService = new ClientMatchingService();

    try {
      await lookInBodyService.initialize();

      // Create phone mapping if it doesn't exist
      await matchingService.createPhoneMapping(
        clientId,
        phone,
        profile.organization_id,
        true // Mark as verified since gym owner is confirming
      );

      // Fetch scans from LookInBody API
      const scans = await lookInBodyService.getClientScans(phone);
      
      console.log(`Synced ${scans.length} scans for client ${clientId}`);

      return NextResponse.json({
        success: true,
        count: scans.length,
        message: `Successfully synced ${scans.length} body composition scans`
      });

    } catch (error: any) {
      console.error('Error syncing body composition data:', error);
      
      if (error.message === 'LookInBody access denied') {
        return NextResponse.json(
          { error: 'LookInBody integration not configured or inactive' },
          { status: 403 }
        );
      }

      throw error;
    }

  } catch (error) {
    console.error('Error in body composition sync:', error);
    return NextResponse.json(
      { error: 'Failed to sync body composition data' },
      { status: 500 }
    );
  }
}