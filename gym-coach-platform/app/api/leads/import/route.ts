import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Import endpoint not implemented yet',
    status: 'stub' 
  })
}