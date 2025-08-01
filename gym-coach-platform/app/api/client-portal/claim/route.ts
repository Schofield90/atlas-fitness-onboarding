import { NextRequest, NextResponse } from 'next/server';
import { ClientPortalService } from '@/lib/services/ClientPortalService';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const portalService = new ClientPortalService();
    const result = await portalService.claimPortalAccess(token);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: result.user.id,
        email: result.user.email
      }
    });
  } catch (error: any) {
    console.error('Error claiming portal access:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 400 }
    );
  }
}