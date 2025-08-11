import { NextRequest, NextResponse } from 'next/server';
import { SupabaseAnalyticsStorage } from '@/app/lib/analytics/supabase-storage';
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Get authenticated user's organization - NO MORE HARDCODED PASSWORDS!
    const user = await requireAuth();
    const organizationId = user.organizationId;
    
    // Get date range from query params
    const url = new URL(request.url);
    const range = url.searchParams.get('range') || '7d';
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (range) {
      case '24h':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }
    
    // SECURITY: Get analytics data filtered by organization
    const analyticsData = await SupabaseAnalyticsStorage.getAnalytics(startDate, endDate, organizationId);
    
    // SECURITY: Get realtime data filtered by organization
    const realtimeData = await SupabaseAnalyticsStorage.getRealtimeAnalytics(organizationId);
    
    return NextResponse.json({
      ...analyticsData,
      realtime: realtimeData
    });
    
  } catch (error) {
    console.error('Dashboard API error:', error);
    return createErrorResponse(error);
  }
}