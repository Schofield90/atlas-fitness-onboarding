import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/api/database';

export async function GET(request: NextRequest) {
  try {
    // For demo purposes, we'll use a mock client ID and organization ID
    // In production, these would come from the authenticated session
    const mockClientId = 'demo_client_123';
    const mockOrganizationId = 'demo_org_123';

    // Try to find existing nutrition profile for this client
    const result = await DatabaseService.findMany(
      'client_nutrition_plans',
      mockOrganizationId,
      {
        filters: { client_id: mockClientId },
        select: '*'
      }
    );

    if (result.data && result.data.length > 0) {
      const profile = result.data[0];
      return NextResponse.json({
        success: true,
        data: profile
      });
    } else {
      // No profile found
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No nutrition profile found'
      });
    }

  } catch (error) {
    console.error('Error loading nutrition profile:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to load nutrition profile'
    }, { status: 500 });
  }
}