import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { emailService } from '@/app/lib/services/unified-email.service';

export async function GET(request: NextRequest) {
  try {
    // Get organization ID from auth or use default
    let organizationId = '63589490-8f55-4157-bd3a-e141594b748e'; // Default Atlas Fitness

    // Try to get from auth
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: org } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();
        
        if (org) {
          organizationId = org.organization_id;
        }
      }
    }

    // Get stats from service
    const stats = await emailService.getStats(organizationId, 30);

    return NextResponse.json(stats || {
      total: 0,
      sent: 0,
      failed: 0,
      delivered: 0,
      bounced: 0
    });
  } catch (error: any) {
    console.error('Failed to get email stats:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}