import { NextResponse } from 'next/server'
import { getImpersonationSession } from '@/app/lib/admin/impersonation'

export async function GET() {
  try {
    const session = await getImpersonationSession()
    return NextResponse.json({ session })
  } catch (error) {
    console.error('Impersonation status error:', error)
    return NextResponse.json(
      { session: null },
      { status: 200 }
    )
  }
}