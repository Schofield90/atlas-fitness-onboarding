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

    // Find Atlas Fitness organization
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('id, name, email, created_at')
      .ilike('name', '%atlas%')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to fetch organizations', 
        details: error.message 
      }, { status: 500 });
    }

    if (!organizations || organizations.length === 0) {
      return NextResponse.json({ 
        error: 'No Atlas organizations found',
        suggestion: 'Please create an organization first at /setup-org'
      }, { status: 404 });
    }

    // Return the most recent Atlas organization
    const org = organizations[0];
    
    return NextResponse.json({
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        email: org.email,
        created_at: org.created_at
      },
      urls: {
        public_booking: `https://atlas-fitness-onboarding.vercel.app/book/public/${org.id}`,
        emergency_access: `https://atlas-fitness-onboarding.vercel.app/emergency`,
        setup_org: `https://atlas-fitness-onboarding.vercel.app/setup-org`
      },
      message: `Found ${organizations.length} Atlas organization(s). Showing the most recent.`
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}