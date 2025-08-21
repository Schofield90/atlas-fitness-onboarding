import { NextResponse } from 'next/server'
import { stopImpersonation } from '@/app/lib/admin/impersonation'

export async function POST() {
  try {
    const result = await stopImpersonation()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Impersonation stop error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}