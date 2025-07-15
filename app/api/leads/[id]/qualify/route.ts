import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { aiQualificationService } from '@/lib/ai-qualification';

// POST /api/leads/[id]/qualify - Qualify a lead with AI
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { user_id, additional_context } = body;

    // Get the current lead data
    const { data: lead, error: fetchError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Qualify the lead with AI
    const qualification = await aiQualificationService.qualifyLead(lead, additional_context);

    // Update the lead with qualification results
    const { data: updatedLead, error: updateError } = await supabaseAdmin
      .from('leads')
      .update({
        qualification_score: qualification.score,
        ai_qualification: qualification,
        status: qualification.score >= 70 ? 'qualified' : 'new',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating lead with qualification:', updateError);
      return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
    }

    // Create activity record for AI qualification
    await supabaseAdmin
      .from('lead_activities')
      .insert([{
        lead_id: id,
        user_id,
        type: 'ai_qualification',
        subject: 'AI Lead Qualification',
        content: `Lead qualified with score: ${qualification.score}/100. ${qualification.reasoning}`,
        metadata: qualification
      }]);

    return NextResponse.json({
      lead: updatedLead,
      qualification
    });
  } catch (error) {
    console.error('Error in POST /api/leads/[id]/qualify:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/leads/[id]/qualify - Get qualification results
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .select('ai_qualification, qualification_score')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({
      qualification: lead.ai_qualification,
      score: lead.qualification_score
    });
  } catch (error) {
    console.error('Error in GET /api/leads/[id]/qualify:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}