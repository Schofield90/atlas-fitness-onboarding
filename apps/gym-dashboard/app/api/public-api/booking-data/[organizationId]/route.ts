import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface Context {
  params: Promise<{ organizationId: string }>;
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const params = await context.params;
    const { organizationId } = params;

    // Use service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Fetching organization with ID:', organizationId);
    console.log('Using service role key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Get organization (without .single() to avoid errors)
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId);

    console.log('Organization query result:', { data: orgData, error: orgError });

    const organization = orgData?.[0];

    if (!organization) {
      // Try without any filters to see what's in the table
      const { data: allOrgs } = await supabase
        .from('organizations')
        .select('id, name')
        .limit(5);
      
      return NextResponse.json({ 
        error: 'Organization not found',
        requestedId: organizationId,
        availableOrgs: allOrgs || [],
        details: orgError?.message 
      }, { status: 404 });
    }

    // Get programs
    const { data: programs } = await supabase
      .from('programs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    // Get upcoming class sessions
    const { data: sessions } = await supabase
      .from('class_sessions')
      .select(`
        *,
        programs (
          name,
          description,
          price_pennies,
          program_type
        )
      `)
      .eq('organization_id', organizationId)
      .eq('session_status', 'scheduled')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    return NextResponse.json({
      organization,
      programs: programs || [],
      sessions: sessions || []
    });

  } catch (error) {
    console.error('Error fetching booking data:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}