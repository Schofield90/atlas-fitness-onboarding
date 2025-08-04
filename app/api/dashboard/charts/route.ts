import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { getCurrentUserOrganization } from '@/app/lib/organization-service';

export async function GET() {
  try {
    const supabase = await createClient();
    const { organizationId } = await getCurrentUserOrganization();
    
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const now = new Date();
    
    // Get customers and revenue data for the last 30 days
    const { data: customers } = await supabase
      .from('leads')
      .select('created_at')
      .eq('organization_id', organizationId)
      .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const { data: transactions } = await supabase
      .from('payment_transactions')
      .select('amount, created_at')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());

    // Generate customer growth chart data (last 7 days)
    const customerGrowth = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayCustomers = customers?.filter(c => {
        const created = new Date(c.created_at);
        return created >= date && created < nextDate;
      }).length || 0;
      
      customerGrowth.push({
        date: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        value: dayCustomers
      });
    }

    // Generate revenue growth chart data (last 7 days)
    const revenueGrowth = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayRevenue = transactions?.filter(t => {
        const created = new Date(t.created_at);
        return created >= date && created < nextDate;
      }).reduce((sum, t) => sum + t.amount, 0) || 0;
      
      revenueGrowth.push({
        date: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        value: dayRevenue / 100
      });
    }

    return NextResponse.json({
      customerGrowth,
      revenueGrowth
    });
  } catch (error: any) {
    console.error('Dashboard charts error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}