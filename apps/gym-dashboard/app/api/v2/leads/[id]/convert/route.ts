import { NextRequest, NextResponse } from 'next/server';
import { leadService } from '@/src/services';
import { getOrganizationAndUser } from '@/app/lib/auth-utils';

// POST /api/v2/leads/[id]/convert - Convert lead to client
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { organization, user } = await getOrganizationAndUser();
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const clientId = await leadService.convertLead(params.id);

    return NextResponse.json({ 
      clientId,
      message: 'Lead converted to client successfully' 
    });
  } catch (error) {
    console.error('Error converting lead:', error);
    return NextResponse.json(
      { error: 'Failed to convert lead' },
      { status: 500 }
    );
  }
}