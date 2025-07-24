import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Public API is working',
    routes: [
      '/api/public-api/booking-data/[organizationId]',
      '/api/public-api/create-lead'
    ]
  });
}