import { NextRequest, NextResponse } from 'next/server';
import { SupabaseAnalyticsStorage } from '@/app/lib/analytics/supabase-storage';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'atlas2024';

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
    
    if (token !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }
    
    const realtimeData = await SupabaseAnalyticsStorage.getRealtimeAnalytics();
    
    return NextResponse.json(realtimeData);
    
  } catch (error) {
    console.error('Realtime API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}