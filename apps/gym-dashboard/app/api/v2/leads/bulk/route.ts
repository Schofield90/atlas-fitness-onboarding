import { NextRequest, NextResponse } from 'next/server';
import { leadService } from '@/src/services';
import { z } from 'zod';
import { getOrganizationAndUser } from '@/app/lib/auth-utils';

// Schema for bulk operations
const bulkUpdateSchema = z.object({
  leadIds: z.array(z.string().uuid()),
  updates: z.object({
    status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).optional(),
    tags: z.object({
      add: z.array(z.string()).optional(),
      remove: z.array(z.string()).optional()
    }).optional(),
    assignedTo: z.string().uuid().optional()
  })
});

// PATCH /api/v2/leads/bulk - Bulk update leads
export async function PATCH(request: NextRequest) {
  try {
    const { organization, user } = await getOrganizationAndUser();
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = bulkUpdateSchema.parse(body);

    await leadService.bulkUpdateLeads(validated.leadIds, validated.updates);

    return NextResponse.json({ 
      message: `${validated.leadIds.length} leads updated successfully` 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error bulk updating leads:', error);
    return NextResponse.json(
      { error: 'Failed to update leads' },
      { status: 500 }
    );
  }
}