import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { clearUserCache } from '@/app/lib/api/auth-check'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated'
      }, { status: 401 })
    }
    
    // Clear the cache
    clearUserCache(user.id)
    
    // Also try to clear any server-side caches by forcing a new query
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
      userId: user.id,
      userFound: !!userData,
      userData: userData,
      error: userError?.message
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to clear cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}