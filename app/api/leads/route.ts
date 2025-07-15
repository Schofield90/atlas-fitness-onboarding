import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { aiQualificationService } from '@/lib/ai-qualification';

// GET /api/leads - Get all leads for organization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const assignedTo = searchParams.get('assigned_to');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('leads')
      .select(`
        *,
        assigned_user:user_profiles!assigned_to(full_name, email),
        activities:lead_activities(
          id,
          type,
          subject,
          content,
          created_at,
          user:user_profiles(full_name)
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (source) {
      query = query.eq('source', source);
    }
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: leads, error } = await query;

    if (error) {
      console.error('Error fetching leads:', error);
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    // Get total count for pagination
    const { count } = await supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error in GET /api/leads:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/leads - Create a new lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organization_id,
      first_name,
      last_name,
      email,
      phone,
      source = 'unknown',
      campaign_id,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      interests,
      goals,
      budget_range,
      preferred_contact_method = 'email',
      notes,
      tags,
      auto_qualify = true
    } = body;

    // Validate required fields
    if (!organization_id || !first_name || !last_name) {
      return NextResponse.json({ 
        error: 'Organization ID, first name, and last name are required' 
      }, { status: 400 });
    }

    // Create the lead
    const leadData = {
      organization_id,
      first_name,
      last_name,
      email,
      phone,
      source,
      campaign_id,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      interests,
      goals,
      budget_range,
      preferred_contact_method,
      notes,
      tags,
      status: 'new'
    };

    const { data: lead, error: insertError } = await supabaseAdmin
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating lead:', insertError);
      return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
    }

    // Auto-qualify the lead with AI if enabled
    if (auto_qualify) {
      try {
        const qualification = await aiQualificationService.qualifyLead(lead);
        
        // Update the lead with qualification results
        const { error: updateError } = await supabaseAdmin
          .from('leads')
          .update({
            qualification_score: qualification.score,
            ai_qualification: qualification,
            status: qualification.score >= 70 ? 'qualified' : 'new'
          })
          .eq('id', lead.id);

        if (updateError) {
          console.error('Error updating lead with qualification:', updateError);
        }

        // Create activity record for AI qualification
        await supabaseAdmin
          .from('lead_activities')
          .insert([{
            lead_id: lead.id,
            type: 'ai_qualification',
            subject: 'AI Lead Qualification',
            content: `Lead qualified with score: ${qualification.score}/100. ${qualification.reasoning}`,
            metadata: qualification
          }]);

        // Return the updated lead data
        return NextResponse.json({
          lead: {
            ...lead,
            qualification_score: qualification.score,
            ai_qualification: qualification,
            status: qualification.score >= 70 ? 'qualified' : 'new'
          },
          qualification
        });
      } catch (qualificationError) {
        console.error('Error during AI qualification:', qualificationError);
        // Return the lead even if qualification fails
        return NextResponse.json({ lead });
      }
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Error in POST /api/leads:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}