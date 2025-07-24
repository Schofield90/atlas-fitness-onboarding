import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ organizationId: string }> }
) {
  const params = await context.params;
  
  // Return empty array for demo mode - real implementation will come later
  return NextResponse.json([]);
}