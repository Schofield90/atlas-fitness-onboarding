import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const clientId = params.id;

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
      .select('id')
      .eq('id', clientId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get body composition scans
    const { data: scans, error } = await supabase
      .from('body_composition_scans')
      .select(`
        *,
        previous_scan:body_composition_scans!inner(
          weight,
          body_fat_percentage,
          skeletal_muscle_mass,
          scan_date
        )
      `)
      .eq('client_id', clientId)
      .eq('organization_id', profile.organization_id)
      .order('scan_date', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    // Calculate changes if we have multiple scans
    const processedScans = scans?.map((scan, index) => {
      if (index < scans.length - 1) {
        const previousScan = scans[index + 1];
        const daysDiff = Math.floor(
          (new Date(scan.scan_date).getTime() - new Date(previousScan.scan_date).getTime()) 
          / (1000 * 60 * 60 * 24)
        );

        return {
          ...scan,
          weight_change: scan.weight - previousScan.weight,
          body_fat_change: scan.body_fat_percentage - previousScan.body_fat_percentage,
          muscle_mass_change: scan.skeletal_muscle_mass - previousScan.skeletal_muscle_mass,
          days_since_last_scan: daysDiff
        };
      }
      return scan;
    }) || [];

    return NextResponse.json({ scans: processedScans });
  } catch (error) {
    console.error('Error fetching body composition data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch body composition data' },
      { status: 500 }
    );
  }
}