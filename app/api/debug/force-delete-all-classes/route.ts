import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function DELETE() {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Use service role client to bypass RLS
    const serviceSupabase = await createClient()

    // Delete ALL bookings first
    const { error: bookingsError } = await serviceSupabase
      .from('bookings')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000') // This will match all UUIDs

    if (bookingsError) {
      console.error('Error deleting bookings:', bookingsError)
    }

    // Delete ALL class sessions
    const { data: deletedClasses, error: classError } = await serviceSupabase
      .from('class_sessions')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000') // This will match all UUIDs
      .select()

    if (classError) {
      throw classError
    }

    return NextResponse.json({ 
      success: true, 
      message: 'All classes forcefully deleted',
      deletedCount: deletedClasses?.length || 0
    })

  } catch (error: any) {
    console.error('Error force deleting classes:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to force delete classes' 
    }, { status: 500 })
  }
}