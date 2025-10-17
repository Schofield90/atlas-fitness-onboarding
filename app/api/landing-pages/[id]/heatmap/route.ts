import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithOrg } from '@/app/lib/api/auth-check-org';
import { createAdminClient } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/landing-pages/[id]/heatmap?days=7&type=click&device=desktop
 * Fetch heatmap data for visualization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireAuthWithOrg();
    const { organizationId } = authUser;
    const pageId = params.id;

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const heatmapType = searchParams.get('type') || 'click';
    const deviceType = searchParams.get('device') || 'desktop';

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify page ownership
    const { data: page, error: pageError } = await supabase
      .from('landing_pages')
      .select('id, name, organization_id')
      .eq('id', pageId)
      .eq('organization_id', organizationId)
      .single();

    if (pageError || !page) {
      return NextResponse.json(
        { error: 'Landing page not found' },
        { status: 404 }
      );
    }

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Fetch heatmap data
    const { data: heatmaps, error: heatmapError } = await supabase
      .from('analytics_heatmaps')
      .select('*')
      .eq('page_id', pageId)
      .eq('heatmap_type', heatmapType)
      .eq('device_type', deviceType)
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (heatmapError) {
      throw heatmapError;
    }

    return NextResponse.json({
      success: true,
      data: {
        heatmaps: heatmaps || [],
        filters: {
          type: heatmapType,
          device: deviceType,
          days: days,
        },
        page: {
          id: page.id,
          name: page.name,
        },
      },
    });
  } catch (error: any) {
    console.error('Heatmap fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch heatmap data' },
      { status: 500 }
    );
  }
}
