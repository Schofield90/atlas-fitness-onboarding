import { NextRequest, NextResponse } from 'next/server';
import { workflowService } from '@/src/services';
import { z } from 'zod';
import { getOrganizationAndUser } from '@/app/lib/auth-utils';

// Schema for creating workflow
const createWorkflowSchema = z.object({
  name: z.string().min(1),
  trigger_type: z.string(),
  trigger_config: z.record(z.any()).default({}),
  actions: z.array(z.object({
    type: z.string(),
    config: z.record(z.any()),
    conditions: z.array(z.any()).optional()
  })).min(1),
  conditions: z.array(z.any()).optional(),
  active: z.boolean().default(true)
});

// GET /api/v2/workflows - Get workflows
export async function GET(request: NextRequest) {
  try {
    const { organization, user } = await getOrganizationAndUser();
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const filter = {
      active: searchParams.get('active') === 'true' ? true : 
               searchParams.get('active') === 'false' ? false : undefined,
      trigger_type: searchParams.get('trigger_type') || undefined
    };

    const workflows = await workflowService.getWorkflows(organization.id, filter);

    return NextResponse.json(workflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

// POST /api/v2/workflows - Create workflow
export async function POST(request: NextRequest) {
  try {
    const { organization, user } = await getOrganizationAndUser();
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = createWorkflowSchema.parse(body);

    const workflowId = await workflowService.createWorkflow(organization.id, validated);

    return NextResponse.json({ 
      id: workflowId,
      message: 'Workflow created successfully' 
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}

// GET /api/v2/workflows/templates - Get workflow templates
export async function getTemplates(request: NextRequest) {
  try {
    const templates = workflowService.getWorkflowTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}