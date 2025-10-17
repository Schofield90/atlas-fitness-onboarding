import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * GET /api/saas-admin/lead-bots/templates
 * List all AI agent task templates across organizations
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    const { data: templates, error } = await supabaseAdmin
      .from('ai_agent_task_templates')
      .select(`
        id,
        name,
        description,
        trigger_event,
        task_title_template,
        task_instructions_template,
        schedule_delay_minutes,
        priority,
        enabled,
        organization_id,
        organizations!inner(name)
      `)
      .order('priority', { ascending: false });

    if (error) throw error;

    const transformedTemplates = (templates || []).map((template: any) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      triggerEvent: template.trigger_event,
      taskTitleTemplate: template.task_title_template,
      taskInstructionsTemplate: template.task_instructions_template,
      scheduleDelayMinutes: template.schedule_delay_minutes,
      priority: template.priority,
      enabled: template.enabled,
      organizationName: template.organizations?.name || 'Unknown',
    }));

    return NextResponse.json({
      success: true,
      templates: transformedTemplates,
      total: transformedTemplates.length,
    });
  } catch (error: any) {
    console.error('[Templates API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates', details: error.message },
      { status: 500 }
    );
  }
}
