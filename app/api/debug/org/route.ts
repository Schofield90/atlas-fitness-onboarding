import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
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

    // First try to find Atlas Performance Gym specifically
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('id, name')
      .ilike('name', '%atlas%')
      .limit(5);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!orgs || orgs.length === 0) {
      // If not found, try to get any organizations
      const { data: allOrgs, error: allError } = await supabase
        .from('organizations')
        .select('id, name')
        .limit(10);
      
      return NextResponse.json({ 
        message: 'No Atlas organizations found',
        available_orgs: allOrgs || [],
        error: allError?.message
      }, { status: 404 });
    }

    // Return the first Atlas organization found
    const organization = orgs[0];

    return NextResponse.json({
      organization,
      public_booking_url: `https://atlas-fitness-onboarding.vercel.app/book/public/${organization.id}`,
      admin_booking_url: `https://atlas-fitness-onboarding.vercel.app/booking/admin`,
      all_found_orgs: orgs
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}