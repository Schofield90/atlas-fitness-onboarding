import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      first_name, 
      last_name, 
      email, 
      phone, 
      source = 'website',
      notes = '',
      test_lead = false 
    } = body;

    // Validate required fields
    if (!first_name || !email) {
      return NextResponse.json({ 
        error: 'First name and email are required' 
      }, { status: 400 });
    }

    const supabase = createSupabaseClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile for organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Create the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        organization_id: profile.organization_id,
        first_name,
        last_name,
        email,
        phone,
        source,
        status: 'new',
        notes: test_lead ? `TEST LEAD: ${notes}` : notes,
        created_by: user.id,
      })
      .select()
      .single();

    if (leadError) {
      console.error('Error creating lead:', leadError);
      return NextResponse.json({ 
        error: 'Failed to create lead' 
      }, { status: 500 });
    }

    console.log(`New lead created: ${lead.id} (${first_name} ${last_name})`);

    // Note: The database trigger will automatically handle the automation
    // so we don't need to manually call the automation engine here

    return NextResponse.json({ 
      success: true, 
      message: 'Lead created successfully',
      lead: {
        id: lead.id,
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        created_at: lead.created_at
      }
    });

  } catch (error) {
    console.error('Error in lead creation API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}