import { NextRequest, NextResponse } from 'next/server';
import { ClientPortalService } from '@/lib/services/ClientPortalService';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Access code required' }, { status: 400 });
    }

    const portalService = new ClientPortalService();
    const access = await portalService.verifyAccessCode(code);

    return NextResponse.json({
      valid: true,
      magic_link_token: access.magic_link_token,
      client_name: access.client.name
    });
  } catch (error: any) {
    console.error('Error verifying access code:', error);
    return NextResponse.json(
      { error: error.message || 'Invalid access code' },
      { status: 400 }
    );
  }
}