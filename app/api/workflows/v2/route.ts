import { NextRequest, NextResponse } from 'next/server';
import { checkAuthAndOrganization } from '@/app/lib/api/auth-check-org';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const authResult = await checkAuthAndOrganization(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  const { organizationId } = authResult;
  const searchParams = request.nextUrl.searchParams;
  const includeTemplates = searchParams.get('includeTemplates') === 'true';
  const status = searchParams.get('status');
  const templateCategory = searchParams.get('templateCategory');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  try {
    const supabase = createAdminClient();
    
    let query = supabase
      .from('workflows')
      .select(`
        *,
        workflow_variables(count),
        workflow_steps(count),
        workflow_executions(
          id,
          status,
          created_at
        )
      `, { count: 'exact' });

    // Filter by organization or templates
    if (includeTemplates) {
      query = query.or(`organization_id.eq.${organizationId},is_template.eq.true`);
    } else {
      query = query.eq('organization_id', organizationId);
    }

    // Filter by status
    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    // Filter by template category
    if (templateCategory) {
      query = query.eq('template_category', templateCategory);
    }

    // Pagination
    query = query
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: workflows, error, count } = await query;

    if (error) throw error;

    // Get execution stats for each workflow
    const workflowsWithStats = await Promise.all(
      workflows.map(async (workflow) => {
        const { data: stats } = await supabase
          .from('workflow_analytics')
          .select('*')
          .eq('workflow_id', workflow.id)
          .order('period_end', { ascending: false })
          .limit(1)
          .single();

        return {
          ...workflow,
          stats: stats || {
            total_executions: 0,
            success_rate: 0,
            average_duration_ms: 0
          }
        };
      })
    );

    return NextResponse.json({
      workflows: workflowsWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await checkAuthAndOrganization(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  const { user, organizationId } = authResult;

  try {
    const body = await request.json();
    const {
      name,
      description,
      template_id,
      trigger_type,
      nodes = [],
      edges = [],
      variables = [],
      settings = {},
      is_active = false
    } = body;

    if (!name || !trigger_type) {
      return NextResponse.json(
        { error: 'Name and trigger type are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // If creating from template, load template data
    let templateData = null;
    if (template_id) {
      const { data: template } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('id', template_id)
        .single();

      if (template) {
        templateData = template.workflow_definition;
      }
    }

    // Create workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .insert({
        organization_id: organizationId,
        name,
        description,
        template_id,
        trigger_type: templateData?.trigger_type || trigger_type,
        nodes: templateData?.nodes || nodes,
        edges: templateData?.edges || edges,
        settings: { ...templateData?.settings, ...settings },
        is_active,
        version: 1,
        created_by: user.id
      })
      .select()
      .single();

    if (workflowError) throw workflowError;

    // Create workflow variables
    const variablesToCreate = templateData?.variables || variables;
    if (variablesToCreate.length > 0) {
      const { error: varError } = await supabase
        .from('workflow_variables')
        .insert(
          variablesToCreate.map((v: any) => ({
            workflow_id: workflow.id,
            name: v.name,
            type: v.type,
            default_value: v.default_value,
            description: v.description,
            is_required: v.is_required || false,
            is_sensitive: v.is_sensitive || false
          }))
        );

      if (varError) throw varError;
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        organization_id: organizationId,
        entity_type: 'workflow',
        entity_id: workflow.id,
        action: 'workflow_created',
        details: {
          name,
          trigger_type,
          from_template: !!template_id
        },
        user_id: user.id
      });

    // Track template usage
    if (template_id) {
      await supabase.rpc('increment_template_usage', {
        template_id
      });
    }

    return NextResponse.json({ workflow }, { status: 201 });

  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}