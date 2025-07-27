import { NextRequest, NextResponse } from 'next/server';
import { SupabaseAnalyticsStorage } from '@/app/lib/analytics/supabase-storage';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'atlas2024';

function verifyPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!verifyPassword(token)) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }
    
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
    
    // Get analytics data from Supabase
    const analyticsData = await SupabaseAnalyticsStorage.getAnalytics(startDate, endDate);
    
    // Get realtime data
    const realtimeData = await SupabaseAnalyticsStorage.getRealtimeAnalytics();
    
    return NextResponse.json({
      ...analyticsData,
      realtime: realtimeData
    });
    
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}