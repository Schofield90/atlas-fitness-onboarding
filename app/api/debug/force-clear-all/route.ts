import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const results = {
      cacheCleared: false,
      pathsRevalidated: [],
      classCount: 0,
      errors: []
    }

    try {
      // Revalidate all class-related paths
      const pathsToRevalidate = [
        '/classes',
        '/booking',
        '/booking-live',
        '/clean-classes',
        '/client/schedule',
        '/client/bookings',
        '/calendar',
        '/',
      ]
      
      for (const path of pathsToRevalidate) {
        try {
          revalidatePath(path)
          results.pathsRevalidated.push(path)
        } catch (e) {
          results.errors.push(`Failed to revalidate ${path}: ${e}`)
        }
      }

      // Try to revalidate tags
      try {
        revalidateTag('classes')
        revalidateTag('bookings')
        revalidateTag('sessions')
      } catch (e) {
        results.errors.push(`Failed to revalidate tags: ${e}`)
      }

      results.cacheCleared = true
    } catch (error) {
      results.errors.push(`Cache clear error: ${error}`)
    }

    // Check current class count
    const { count, error: countError } = await supabase
      .from('class_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', user.id)

    if (!countError) {
      results.classCount = count || 0
    } else {
      results.errors.push(`Count error: ${countError.message}`)
    }

    // Also check with the actual organization ID
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (userOrg) {
      const { count: orgCount, error: orgCountError } = await supabase
        .from('class_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', userOrg.organization_id)

      if (!orgCountError) {
        results.classCount = orgCount || 0
      }
    }

    return NextResponse.json({
      success: true,
      message: 'All caches cleared and paths revalidated',
      results,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error('Force clear all error:', error)
    return NextResponse.json(
      { error: 'Failed to clear caches', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}