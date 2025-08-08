import { createClient } from '@/app/lib/supabase/server';
import { cache } from 'react';
import { Redis } from 'ioredis';

// Initialize Redis if available
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

export interface DashboardMetrics {
  revenue: {
    mtd: number;
    growth: number;
  };
  leads: {
    total: number;
    new: number;
    qualified: number;
    conversionRate: number;
  };
  bookings: {
    today: number;
    week: number;
    cancellationRate: number;
    attendanceRate: number;
  };
  sessions: {
    upcoming: number;
    capacity: number;
  };
}

export interface LeadAnalytics {
  bySource: Record<string, number>;
  byStatus: Record<string, number>;
  byScore: {
    high: number;
    medium: number;
    low: number;
  };
  timeline: Array<{
    date: string;
    count: number;
  }>;
}

export interface RevenueAnalytics {
  daily: Array<{
    date: string;
    amount: number;
  }>;
  byService: Record<string, number>;
  recurring: number;
  oneTime: number;
  projectedMRR: number;
}

class AnalyticsService {
  private cachePrefix = 'analytics:';
  private cacheTTL = 300; // 5 minutes

  // Get dashboard overview metrics
  getDashboardMetrics = cache(async (orgId: string): Promise<DashboardMetrics> => {
    const cacheKey = `${this.cachePrefix}dashboard:${orgId}`;
    
    // Try cache first
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    const supabase = await createClient();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const today = new Date().toISOString().split('T')[0];

    // Fetch all metrics in parallel
    const [
      monthlyMetrics,
      leadStats,
      bookingStats,
      upcomingSessions
    ] = await Promise.all([
      // Monthly metrics
      supabase
        .from('daily_metrics')
        .select('revenue_cents, new_leads, conversions, bookings, cancellations, attendance_rate')
        .eq('org_id', orgId)
        .gte('metric_date', startOfMonth.toISOString().split('T')[0])
        .order('metric_date', { ascending: false }),

      // Lead statistics
      supabase
        .from('leads')
        .select('status, score, created_at')
        .eq('org_id', orgId),

      // Booking statistics
      supabase
        .from('bookings')
        .select('status, created_at, cancelled_at')
        .eq('org_id', orgId)
        .gte('created_at', startOfWeek.toISOString()),

      // Upcoming sessions
      supabase
        .from('class_sessions')
        .select(`
          id,
          capacity,
          bookings!inner(status)
        `)
        .eq('org_id', orgId)
        .gte('start_at', new Date().toISOString())
        .lte('start_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
    ]);

    // Calculate metrics
    const mtdRevenue = monthlyMetrics.data?.reduce((sum, day) => sum + (day.revenue_cents || 0), 0) || 0;
    const totalLeads = leadStats.data?.length || 0;
    const newLeads = leadStats.data?.filter(l => 
      new Date(l.created_at) >= startOfMonth
    ).length || 0;
    const qualifiedLeads = leadStats.data?.filter(l => l.status === 'qualified').length || 0;
    const conversionRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;

    const todayBookings = bookingStats.data?.filter(b => 
      b.created_at.startsWith(today)
    ).length || 0;
    const weekBookings = bookingStats.data?.length || 0;
    const cancellations = bookingStats.data?.filter(b => b.status === 'cancelled').length || 0;
    const cancellationRate = weekBookings > 0 ? (cancellations / weekBookings) * 100 : 0;

    const avgAttendanceRate = monthlyMetrics.data?.reduce((sum, day) => 
      sum + (day.attendance_rate || 0), 0
    ) / (monthlyMetrics.data?.length || 1);

    const upcomingCount = upcomingSessions.data?.length || 0;
    const totalCapacity = upcomingSessions.data?.reduce((sum, session) => 
      sum + session.capacity, 0
    ) || 0;
    const totalBooked = upcomingSessions.data?.reduce((sum, session) => 
      sum + (session.bookings?.filter((b: any) => b.status === 'booked').length || 0), 0
    ) || 0;

    const metrics: DashboardMetrics = {
      revenue: {
        mtd: mtdRevenue / 100, // Convert cents to currency
        growth: 0 // TODO: Calculate month-over-month growth
      },
      leads: {
        total: totalLeads,
        new: newLeads,
        qualified: qualifiedLeads,
        conversionRate
      },
      bookings: {
        today: todayBookings,
        week: weekBookings,
        cancellationRate,
        attendanceRate: avgAttendanceRate
      },
      sessions: {
        upcoming: upcomingCount,
        capacity: totalCapacity > 0 ? (totalBooked / totalCapacity) * 100 : 0
      }
    };

    // Cache the result
    if (redis) {
      await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(metrics));
    }

    return metrics;
  });

  // Get lead analytics
  getLeadAnalytics = cache(async (orgId: string, days: number = 30): Promise<LeadAnalytics> => {
    const cacheKey = `${this.cachePrefix}leads:${orgId}:${days}`;
    
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    const supabase = await createClient();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data: leads } = await supabase
      .from('leads')
      .select('source, status, score, created_at')
      .eq('org_id', orgId)
      .gte('created_at', startDate.toISOString());

    // Aggregate by source
    const bySource = leads?.reduce((acc, lead) => {
      const source = lead.source || 'Direct';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Aggregate by status
    const byStatus = leads?.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Aggregate by score
    const byScore = leads?.reduce((acc, lead) => {
      if (lead.score >= 70) acc.high++;
      else if (lead.score >= 40) acc.medium++;
      else acc.low++;
      return acc;
    }, { high: 0, medium: 0, low: 0 }) || { high: 0, medium: 0, low: 0 };

    // Timeline data
    const timeline = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const count = leads?.filter(l => 
        l.created_at.startsWith(dateStr)
      ).length || 0;
      timeline.unshift({ date: dateStr, count });
    }

    const analytics: LeadAnalytics = {
      bySource,
      byStatus,
      byScore,
      timeline
    };

    if (redis) {
      await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(analytics));
    }

    return analytics;
  });

  // Get revenue analytics
  getRevenueAnalytics = cache(async (orgId: string, days: number = 30): Promise<RevenueAnalytics> => {
    const cacheKey = `${this.cachePrefix}revenue:${orgId}:${days}`;
    
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    const supabase = await createClient();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get daily metrics
    const { data: dailyMetrics } = await supabase
      .from('daily_metrics')
      .select('metric_date, revenue_cents')
      .eq('org_id', orgId)
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .order('metric_date', { ascending: true });

    const daily = dailyMetrics?.map(d => ({
      date: d.metric_date,
      amount: d.revenue_cents / 100
    })) || [];

    // TODO: Integrate with Stripe for actual revenue data
    const analytics: RevenueAnalytics = {
      daily,
      byService: {
        'Personal Training': 15000,
        'Group Classes': 8000,
        'Memberships': 25000
      },
      recurring: 25000,
      oneTime: 23000,
      projectedMRR: 28000
    };

    if (redis) {
      await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(analytics));
    }

    return analytics;
  });

  // Refresh materialized metrics
  async refreshDailyMetrics(orgId: string, date: Date = new Date()): Promise<void> {
    const supabase = await createClient();
    const dateStr = date.toISOString().split('T')[0];

    await supabase.rpc('refresh_daily_metrics', {
      target_date: dateStr,
      target_org_id: orgId
    });

    // Clear cache
    if (redis) {
      const pattern = `${this.cachePrefix}*:${orgId}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  }

  // Clear analytics cache
  async clearCache(orgId: string): Promise<void> {
    if (!redis) return;
    
    const pattern = `${this.cachePrefix}*:${orgId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export const analyticsService = new AnalyticsService();