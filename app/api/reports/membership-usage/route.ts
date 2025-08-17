import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    
    // Get date range from query params
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();
    const organizationId = '63589490-8f55-4157-bd3a-e141594b748e'; // Atlas Fitness
    
    // Fetch membership and usage data
    const { data: memberships, error: membershipError } = await supabase
      .from('customer_memberships')
      .select(`
        id,
        status,
        start_date,
        end_date,
        usage_count,
        usage_limit,
        created_at,
        membership_plan:membership_plans(
          id,
          name,
          price_pennies,
          billing_period,
          class_limit,
          features
        ),
        customer:leads(
          id,
          name,
          email,
          phone
        )
      `)
      .eq('organization_id', organizationId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    if (membershipError) throw membershipError;
    
    // Fetch booking history for usage analysis
    const { data: bookings, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        customer_id,
        created_at,
        checked_in,
        status
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    if (bookingError) throw bookingError;
    
    // Calculate membership statistics
    const totalMemberships = memberships?.length || 0;
    const activeMemberships = memberships?.filter(m => m.status === 'active').length || 0;
    const pausedMemberships = memberships?.filter(m => m.status === 'paused').length || 0;
    const cancelledMemberships = memberships?.filter(m => m.status === 'cancelled').length || 0;
    
    // Calculate usage patterns
    const membershipUsage = memberships?.map(membership => {
      const customerBookings = bookings?.filter(b => 
        b.customer_id === membership.customer?.id && 
        b.checked_in
      ).length || 0;
      
      const usageRate = membership.usage_limit 
        ? ((customerBookings / membership.usage_limit) * 100).toFixed(1)
        : 'Unlimited';
      
      return {
        id: membership.id,
        customerName: membership.customer?.name || 'Unknown',
        customerEmail: membership.customer?.email,
        planName: membership.membership_plan?.name || 'Unknown',
        status: membership.status,
        usageCount: customerBookings,
        usageLimit: membership.usage_limit || 'Unlimited',
        usageRate,
        startDate: membership.start_date,
        endDate: membership.end_date
      };
    }) || [];
    
    // Group by membership plan
    const planDistribution: Record<string, any> = {};
    memberships?.forEach(membership => {
      const planName = membership.membership_plan?.name || 'Unknown';
      if (!planDistribution[planName]) {
        planDistribution[planName] = {
          name: planName,
          count: 0,
          activeCount: 0,
          revenue: 0,
          avgUsage: 0,
          totalUsage: 0
        };
      }
      planDistribution[planName].count++;
      if (membership.status === 'active') planDistribution[planName].activeCount++;
      planDistribution[planName].revenue += (membership.membership_plan?.price_pennies || 0) / 100;
      
      // Add usage for average calculation
      const customerBookings = bookings?.filter(b => 
        b.customer_id === membership.customer?.id && 
        b.checked_in
      ).length || 0;
      planDistribution[planName].totalUsage += customerBookings;
    });
    
    // Calculate averages
    Object.values(planDistribution).forEach(plan => {
      plan.avgUsage = plan.count > 0 ? (plan.totalUsage / plan.count).toFixed(1) : 0;
      delete plan.totalUsage; // Remove temp field
    });
    
    // Identify underutilized memberships (< 30% usage)
    const underutilizedMemberships = membershipUsage.filter(m => {
      if (m.usageLimit === 'Unlimited') return false;
      const rate = parseFloat(m.usageRate as string);
      return rate < 30 && m.status === 'active';
    });
    
    // Identify overutilized memberships (> 80% usage) - upsell opportunities
    const overutilizedMemberships = membershipUsage.filter(m => {
      if (m.usageLimit === 'Unlimited') return false;
      const rate = parseFloat(m.usageRate as string);
      return rate > 80 && m.status === 'active';
    });
    
    // Calculate monthly trend
    const monthlyTrend: Record<string, any> = {};
    memberships?.forEach(membership => {
      const month = new Date(membership.created_at).toLocaleDateString('en-GB', { 
        year: 'numeric', 
        month: 'short' 
      });
      
      if (!monthlyTrend[month]) {
        monthlyTrend[month] = {
          month,
          newMemberships: 0,
          cancellations: 0,
          netGrowth: 0
        };
      }
      
      if (membership.status === 'active') {
        monthlyTrend[month].newMemberships++;
        monthlyTrend[month].netGrowth++;
      } else if (membership.status === 'cancelled') {
        monthlyTrend[month].cancellations++;
        monthlyTrend[month].netGrowth--;
      }
    });
    
    const trend = Object.values(monthlyTrend).sort((a, b) => 
      new Date(a.month).getTime() - new Date(b.month).getTime()
    );
    
    return NextResponse.json({
      summary: {
        totalMemberships,
        activeMemberships,
        pausedMemberships,
        cancelledMemberships,
        activationRate: totalMemberships > 0 
          ? ((activeMemberships / totalMemberships) * 100).toFixed(1) 
          : 0,
        dateRange: {
          start: startDate,
          end: endDate
        }
      },
      planDistribution: Object.values(planDistribution),
      membershipUsage: membershipUsage.slice(0, 50), // Limit for performance
      underutilizedMemberships: underutilizedMemberships.slice(0, 10),
      overutilizedMemberships: overutilizedMemberships.slice(0, 10),
      monthlyTrend: trend,
      insights: {
        averageUsageRate: membershipUsage
          .filter(m => m.usageRate !== 'Unlimited')
          .reduce((sum, m) => sum + parseFloat(m.usageRate as string), 0) / 
          membershipUsage.filter(m => m.usageRate !== 'Unlimited').length || 0,
        mostPopularPlan: Object.values(planDistribution)
          .sort((a, b) => b.activeCount - a.activeCount)[0]?.name || 'None',
        highestRevenuePlan: Object.values(planDistribution)
          .sort((a, b) => b.revenue - a.revenue)[0]?.name || 'None'
      }
    });
  } catch (error: any) {
    console.error('Membership usage report error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}