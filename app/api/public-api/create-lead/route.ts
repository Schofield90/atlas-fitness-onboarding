import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Simple in-memory rate limiting (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    const now = Date.now();
    const rateLimit = rateLimitMap.get(clientIp);
    
    if (rateLimit) {
      if (now < rateLimit.resetTime) {
        if (rateLimit.count >= 5) { // Max 5 requests per minute
          return NextResponse.json({ 
            error: 'Too many requests. Please try again later.' 
          }, { status: 429 });
        }
        rateLimit.count++;
      } else {
        rateLimitMap.set(clientIp, { count: 1, resetTime: now + 60000 });
      }
    } else {
      rateLimitMap.set(clientIp, { count: 1, resetTime: now + 60000 });
    }
    
    const { organizationId, name, email, phone } = await request.json();

    if (!organizationId || !name || !email || !phone) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }
    
    // Basic email validation to prevent injection
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 });
    }

    // Use service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create lead record
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        organization_id: organizationId,
        name,
        email,
        phone,
        source: 'public_booking',
        status: 'new',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (leadError) {
      console.error('Lead creation error:', leadError);
      return NextResponse.json({ 
        error: 'Failed to create lead',
        details: leadError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      leadId: lead.id
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}