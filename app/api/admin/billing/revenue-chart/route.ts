import { NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { requireAdminAccess } from '@/app/lib/admin/impersonation'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { isAdmin } = await requireAdminAccess()
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()
    
    // Get last 6 months of revenue data
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const { data: subscriptions } = await supabase
      .from('billing_subscriptions')
      .select(`
        created_at,
        status,
        billing_plans(amount)
      `)
      .gte('created_at', sixMonthsAgo.toISOString())
      .eq('is_primary', true)

    // Group by month
    const monthlyRevenue = new Map<string, number>()
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const key = `${months[date.getMonth()]} ${date.getFullYear()}`
      monthlyRevenue.set(key, 0)
    }

    // Calculate revenue
    subscriptions?.forEach(sub => {
      if (sub.status === 'active' && sub.billing_plans?.amount) {
        const date = new Date(sub.created_at)
        const key = `${months[date.getMonth()]} ${date.getFullYear()}`
        const current = monthlyRevenue.get(key) || 0
        monthlyRevenue.set(key, current + (sub.billing_plans.amount / 100))
      }
    })

    const data = Array.from(monthlyRevenue.entries()).map(([label, revenue]) => ({
      label,
      revenue
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Failed to fetch revenue data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue data' },
      { status: 500 }
    )
  }
}