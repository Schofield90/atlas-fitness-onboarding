import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithOrg } from '@/app/lib/api/auth-check-org';
import { createAdminClient } from '@/app/lib/supabase/server';
import { ClarityIntegrationService } from '@/lib/analytics/clarity-integration';

export const dynamic = 'force-dynamic';

/**
 * POST /api/landing-pages/[id]/clarity-setup
 * Enable Clarity tracking for a landing page
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireAuthWithOrg();
    const { organizationId, id: userId } = authUser;
    const pageId = params.id;

    const { clarityProjectId } = await request.json();

    if (!clarityProjectId) {
      return NextResponse.json(
        { error: 'Clarity Project ID is required' },
        { status: 400 }
      );
    }

    // Validate project ID format
    if (!ClarityIntegrationService.validateProjectId(clarityProjectId)) {
      return NextResponse.json(
        { error: 'Invalid Clarity Project ID format. Should be 10 alphanumeric characters.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify page belongs to organization
    const { data: page, error: pageError } = await supabase
      .from('landing_pages')
      .select('id, name, content, organization_id')
      .eq('id', pageId)
      .eq('organization_id', organizationId)
      .single();

    if (pageError || !page) {
      return NextResponse.json(
        { error: 'Landing page not found' },
        { status: 404 }
      );
    }

    // Update page with Clarity settings
    const { data: updatedPage, error: updateError } = await supabase
      .from('landing_pages')
      .update({
        clarity_project_id: clarityProjectId,
        clarity_enabled: true,
        analytics_updated_at: new Date().toISOString(),
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pageId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Generate Clarity URLs for user convenience
    const clarityUrls = {
      dashboard: ClarityIntegrationService.getDashboardUrl(clarityProjectId),
      heatmaps: ClarityIntegrationService.getHeatmapsUrl(clarityProjectId),
      recordings: ClarityIntegrationService.getRecordingsUrl(clarityProjectId),
    };

    return NextResponse.json({
      success: true,
      data: {
        page: updatedPage,
        clarityUrls,
        setupInstructions: ClarityIntegrationService.getSetupInstructions(),
      },
      message: 'Clarity tracking enabled successfully. Script will be injected on next page publish.',
    });
  } catch (error: any) {
    console.error('Clarity setup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enable Clarity tracking' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/landing-pages/[id]/clarity-setup
 * Disable Clarity tracking for a landing page
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireAuthWithOrg();
    const { organizationId, id: userId } = authUser;
    const pageId = params.id;

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify page belongs to organization
    const { data: page, error: pageError } = await supabase
      .from('landing_pages')
      .select('id, organization_id')
      .eq('id', pageId)
      .eq('organization_id', organizationId)
      .single();

    if (pageError || !page) {
      return NextResponse.json(
        { error: 'Landing page not found' },
        { status: 404 }
      );
    }

    // Disable Clarity (keep project ID for history)
    const { data: updatedPage, error: updateError } = await supabase
      .from('landing_pages')
      .update({
        clarity_enabled: false,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pageId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      data: updatedPage,
      message: 'Clarity tracking disabled successfully',
    });
  } catch (error: any) {
    console.error('Clarity disable error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disable Clarity tracking' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/landing-pages/[id]/clarity-setup
 * Get Clarity setup status and URLs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireAuthWithOrg();
    const { organizationId } = authUser;
    const pageId = params.id;

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: page, error: pageError } = await supabase
      .from('landing_pages')
      .select('id, name, clarity_project_id, clarity_enabled, slug')
      .eq('id', pageId)
      .eq('organization_id', organizationId)
      .single();

    if (pageError || !page) {
      return NextResponse.json(
        { error: 'Landing page not found' },
        { status: 404 }
      );
    }

    const response: any = {
      success: true,
      data: {
        page: {
          id: page.id,
          name: page.name,
          slug: page.slug,
        },
        clarityEnabled: page.clarity_enabled,
        clarityProjectId: page.clarity_project_id,
        setupInstructions: ClarityIntegrationService.getSetupInstructions(),
      },
    };

    if (page.clarity_project_id) {
      response.data.clarityUrls = {
        dashboard: ClarityIntegrationService.getDashboardUrl(page.clarity_project_id),
        heatmaps: ClarityIntegrationService.getHeatmapsUrl(page.clarity_project_id),
        recordings: ClarityIntegrationService.getRecordingsUrl(page.clarity_project_id),
      };
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Clarity status fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Clarity status' },
      { status: 500 }
    );
  }
}
