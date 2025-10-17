import { NextRequest, NextResponse } from 'next/server';
import { leadService } from '@/src/services';
import { z } from 'zod';
import { getOrganizationAndUser } from '@/app/lib/auth-utils';

// Schema for updating lead
const updateLeadSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).optional(),
  tags: z.array(z.string()).optional(),
  assigned_to: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional()
});

// GET /api/v2/leads/[id] - Get single lead
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { organization, user } = await getOrganizationAndUser();
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const lead = await leadService.getLead(params.id);
    
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead' },
      { status: 500 }
    );
  }
}

// PATCH /api/v2/leads/[id] - Update lead
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { organization, user } = await getOrganizationAndUser();
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateLeadSchema.parse(body);

    await leadService.updateLead(params.id, validated);

    return NextResponse.json({ 
      message: 'Lead updated successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    );
  }
}

// DELETE /api/v2/leads/[id] - Delete lead (soft delete by changing status)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { organization, user } = await getOrganizationAndUser();
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Soft delete by setting status to 'lost'
    await leadService.updateLead(params.id, { status: 'lost' });

    return NextResponse.json({ 
      message: 'Lead deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    );
  }
}