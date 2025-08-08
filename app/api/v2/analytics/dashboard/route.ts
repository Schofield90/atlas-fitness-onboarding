import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/src/services';
import { getOrganizationAndUser } from '@/app/lib/auth-utils';

// GET /api/v2/analytics/dashboard - Get dashboard metrics
export async function GET(request: NextRequest) {
  try {
    const { organization, user } = await getOrganizationAndUser();
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const metrics = await analyticsService.getDashboardMetrics(organization.id);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}