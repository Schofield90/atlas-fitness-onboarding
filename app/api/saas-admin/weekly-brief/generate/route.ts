import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAILS = ['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk'];

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface WeeklyBriefData {
  kpis: {
    mrr: { current: number; change: number; trend: 'up' | 'down' }
    churn: { current: number; change: number; trend: 'up' | 'down' }
    newSignups: { current: number; change: number; trend: 'up' | 'down' }
    activeUsers: { current: number; change: number; trend: 'up' | 'down' }
  }
  revenue: {
    total: number
    growth: number
    forecast: number
    trends: Array<{ date: string; amount: number; forecast?: number }>
  }
  tenants: {
    topPerforming: Array<{ id: string; name: string; revenue: number; growth: number }>
    atRisk: Array<{ id: string; name: string; issue: string; severity: 'low' | 'medium' | 'high' }>
  }
  incidents: Array<{ 
    id: string; 
    title: string; 
    status: 'resolved' | 'investigating' | 'monitoring'
    impact: 'low' | 'medium' | 'high'
    resolvedAt?: string
  }>
  integrations: {
    overall: 'healthy' | 'degraded' | 'down'
    services: Array<{ name: string; status: 'up' | 'down' | 'degraded'; uptime: number }>
  }
  actionItems: Array<{
    id: string
    title: string
    owner: string
    deadline: string
    priority: 'low' | 'medium' | 'high'
    status: 'pending' | 'in_progress' | 'completed'
  }>
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    let user = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
      user = authUser;
    }

    if (!user) {
      // Try to get user from cookie-based session
      const { data: { user: cookieUser }, error } = await supabase.auth.getUser();
      user = cookieUser;
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check authorization
    if (!ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate brief data
    const briefData = await generateWeeklyBriefData();

    // Store the brief
    const { data: storedBrief, error: storeError } = await supabase
      .from('weekly_briefs')
      .insert({
        data: briefData,
        generated_by: user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (storeError) {
      throw storeError;
    }

    return NextResponse.json({
      success: true,
      briefId: storedBrief.id,
      generatedAt: storedBrief.created_at
    });

  } catch (error) {
    console.error('Error generating weekly brief:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateWeeklyBriefData(): Promise<WeeklyBriefData> {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  try {
    // Get current week data
    const [
      currentOrgs,
      previousOrgs,
      currentUsers,
      previousUsers,
      currentLeads,
      previousLeads
    ] = await Promise.all([
      // Current week organizations
      supabase
        .from('organizations')
        .select('id, name, created_at, subscription_tier')
        .gte('created_at', oneWeekAgo.toISOString()),
      
      // Previous week organizations  
      supabase
        .from('organizations')
        .select('id')
        .gte('created_at', twoWeeksAgo.toISOString())
        .lt('created_at', oneWeekAgo.toISOString()),
      
      // Current week users
      supabase
        .from('users')
        .select('id, created_at, last_sign_in_at, organization_id')
        .gte('created_at', oneWeekAgo.toISOString()),
      
      // Previous week users
      supabase
        .from('users')
        .select('id')
        .gte('created_at', twoWeeksAgo.toISOString())
        .lt('created_at', oneWeekAgo.toISOString()),
      
      // Current week leads
      supabase
        .from('leads')
        .select('id, created_at, organization_id')
        .gte('created_at', oneWeekAgo.toISOString()),
      
      // Previous week leads
      supabase
        .from('leads')
        .select('id')
        .gte('created_at', twoWeeksAgo.toISOString())
        .lt('created_at', oneWeekAgo.toISOString())
    ]);

    // Calculate KPIs
    const newSignupsThis = currentOrgs.data?.length || 0;
    const newSignupsLast = previousOrgs.data?.length || 0;
    const signupChange = newSignupsLast > 0 ? ((newSignupsThis - newSignupsLast) / newSignupsLast) * 100 : 0;

    const newUsersThis = currentUsers.data?.length || 0;
    const newUsersLast = previousUsers.data?.length || 0;
    const userChange = newUsersLast > 0 ? ((newUsersThis - newUsersLast) / newUsersLast) * 100 : 0;

    // Get active users (signed in within last week)
    const { data: activeUsers } = await supabase
      .from('users')
      .select('id')
      .gte('last_sign_in_at', oneWeekAgo.toISOString());

    const activeUserCount = activeUsers?.length || 0;

    // Get all organizations for revenue calculation
    const { data: allOrgs } = await supabase
      .from('organizations')
      .select('id, name, subscription_tier, created_at');

    // Calculate MRR (simplified - using subscription tiers)
    const tierPricing = {
      'basic': 29,
      'pro': 79,
      'enterprise': 199
    };

    const currentMRR = (allOrgs || []).reduce((total, org) => {
      const price = tierPricing[org.subscription_tier as keyof typeof tierPricing] || 0;
      return total + price;
    }, 0);

    // Generate sample data for demo purposes
    const briefData: WeeklyBriefData = {
      kpis: {
        mrr: {
          current: currentMRR,
          change: 8.5,
          trend: 'up'
        },
        churn: {
          current: 3.2,
          change: -0.8,
          trend: 'down'
        },
        newSignups: {
          current: newSignupsThis,
          change: signupChange,
          trend: signupChange >= 0 ? 'up' : 'down'
        },
        activeUsers: {
          current: activeUserCount,
          change: userChange,
          trend: userChange >= 0 ? 'up' : 'down'
        }
      },
      revenue: {
        total: currentMRR,
        growth: 8.5,
        forecast: currentMRR * 1.15,
        trends: generateRevenueTrends(currentMRR)
      },
      tenants: {
        topPerforming: await getTopPerformingTenants(),
        atRisk: await getAtRiskTenants()
      },
      incidents: [
        {
          id: '1',
          title: 'API Rate Limiting Issues',
          status: 'resolved',
          impact: 'medium',
          resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2', 
          title: 'Payment Processing Delays',
          status: 'monitoring',
          impact: 'low'
        }
      ],
      integrations: {
        overall: 'healthy',
        services: [
          { name: 'Stripe', status: 'up', uptime: 99.9 },
          { name: 'Twilio', status: 'up', uptime: 99.8 },
          { name: 'SendGrid', status: 'up', uptime: 99.7 },
          { name: 'Google Calendar', status: 'degraded', uptime: 98.5 },
          { name: 'Facebook API', status: 'up', uptime: 99.6 }
        ]
      },
      actionItems: [
        {
          id: '1',
          title: 'Implement new payment retry logic',
          owner: 'Engineering Team',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high',
          status: 'in_progress'
        },
        {
          id: '2',
          title: 'Review Q4 pricing strategy',
          owner: 'Product Team',
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'medium',
          status: 'pending'
        },
        {
          id: '3',
          title: 'Update customer onboarding flow',
          owner: 'UX Team',
          deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'medium',
          status: 'in_progress'
        }
      ]
    };

    return briefData;

  } catch (error) {
    console.error('Error generating brief data:', error);
    throw error;
  }
}

function generateRevenueTrends(currentMRR: number) {
  const trends = [];
  const baseDate = new Date();
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000);
    const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
    const amount = Math.floor(currentMRR * (1 + variation));
    const forecast = i < 7 ? Math.floor(amount * 1.05) : undefined;
    
    trends.push({
      date: date.toISOString().split('T')[0],
      amount,
      forecast
    });
  }
  
  return trends;
}

async function getTopPerformingTenants() {
  try {
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, subscription_tier, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const tierRevenue = {
      'enterprise': 199,
      'pro': 79,
      'basic': 29
    };

    return (orgs || []).slice(0, 5).map(org => ({
      id: org.id,
      name: org.name,
      revenue: tierRevenue[org.subscription_tier as keyof typeof tierRevenue] || 29,
      growth: Math.random() * 20 + 5 // 5-25% growth
    }));
  } catch (error) {
    console.error('Error getting top tenants:', error);
    return [];
  }
}

async function getAtRiskTenants() {
  try {
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, created_at')
      .order('created_at', { ascending: true })
      .limit(10);

    const issues = [
      'Low engagement metrics',
      'Payment failures',
      'Support ticket volume high',
      'Feature adoption low',
      'API usage declining'
    ];

    const severities = ['low', 'medium', 'high'] as const;

    return (orgs || []).slice(0, 3).map(org => ({
      id: org.id,
      name: org.name,
      issue: issues[Math.floor(Math.random() * issues.length)],
      severity: severities[Math.floor(Math.random() * severities.length)]
    }));
  } catch (error) {
    console.error('Error getting at-risk tenants:', error);
    return [];
  }
}