import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Debug endpoint to check environment
  return NextResponse.json({
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    openAIKeyLength: process.env.OPENAI_API_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
}