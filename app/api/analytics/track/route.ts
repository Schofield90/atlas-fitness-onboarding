import { NextRequest, NextResponse } from 'next/server';
import { SupabaseAnalyticsStorage } from '@/app/lib/analytics/supabase-storage';
import { z } from 'zod';

const eventSchema = z.object({
  id: z.string(),
  type: z.enum(['pageview', 'click', 'scroll', 'form_submit', 'custom']),
  timestamp: z.string(),
  sessionId: z.string(),
  visitorId: z.string(),
  path: z.string(),
  referrer: z.string(),
  device: z.string(),
  browser: z.string(),
  os: z.string(),
  screenResolution: z.string(),
  viewport: z.string(),
  metadata: z.record(z.string(), z.any()).optional()
});

const batchSchema = z.object({
  events: z.array(eventSchema)
});

// Bot detection patterns
const botPatterns = [
  /bot/i, /crawler/i, /spider/i, /scraper/i,
  /facebookexternalhit/i, /WhatsApp/i, /Slack/i,
  /GoogleBot/i, /Bingbot/i, /YandexBot/i, /DuckDuckBot/i
];

function isBot(userAgent: string): boolean {
  return botPatterns.some(pattern => pattern.test(userAgent));
}

export async function POST(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') || '';
    
    // Filter out bots
    if (isBot(userAgent)) {
      return NextResponse.json({ status: 'ignored' });
    }
    
    const body = await request.json();
    const validated = batchSchema.parse(body);
    
    // Store events in Supabase
    await SupabaseAnalyticsStorage.storeEvents(validated.events);
    
    return NextResponse.json({ status: 'success' });
    
  } catch (error) {
    console.error('Analytics tracking error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}