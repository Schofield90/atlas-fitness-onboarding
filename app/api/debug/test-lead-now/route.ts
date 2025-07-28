import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { clearUserCache, requireAuth } from '@/app/lib/api/auth-check'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated'
      }, { status: 401 })
    }
    
    // Clear cache first
    clearUserCache(user.id)
    
    // Now try requireAuth (which should use admin client)
    let authCheckResult = null
    let authCheckError = null
    try {
      authCheckResult = await requireAuth()
    } catch (err) {
      authCheckError = err instanceof Error ? err.message : String(err)
    }
    
    // If auth check passed, try creating a lead
    let leadTest = null
    if (authCheckResult) {
      const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': (await cookies()).toString()
        },
        body: JSON.stringify({
          name: 'Test Lead After Fix',
          email: 'testafterfix@example.com',
          phone: '+447890123456',
          source: 'manual',
          form_name: 'RLS Fix Test'
        })
      })
      
      const result = await response.json()
      leadTest = {
        status: response.status,
        success: response.ok,
        result
      }
    }
    
    return NextResponse.json({
      cacheCleared: true,
      authCheck: {
        success: !!authCheckResult,
        result: authCheckResult,
        error: authCheckError
      },
      leadCreationTest: leadTest,
      message: authCheckResult 
        ? 'Auth check passed! Try creating a lead in the UI now.' 
        : 'Auth check still failing. Check server logs.'
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Add missing import
import { cookies } from 'next/headers'