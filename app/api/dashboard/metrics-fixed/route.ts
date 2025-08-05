import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

function getUpcomingBirthdays(customers: any[]) {
  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  return customers
    .filter(customer => customer.date_of_birth)
    .map(customer => {
      const dob = new Date(customer.date_of_birth);
      const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      const nextYearBirthday = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
      
      let birthdayDate = thisYearBirthday;
      if (thisYearBirthday < today) {
        birthdayDate = nextYearBirthday;
      }
      
      const daysUntil = Math.ceil((birthdayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        birthdayDate,
        daysUntil,
        age: today.getFullYear() - dob.getFullYear() + (birthdayDate.getFullYear() - today.getFullYear())
      };
    })
    .filter(b => b.daysUntil >= 0 && b.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);
}

export async function GET() {
  try {
    const supabase = await createAdminClient();
    
    // Use the Atlas Fitness organization ID directly
    const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
    
    console.log('Fixed metrics - Using organization ID:', organizationId);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all metrics in parallel for performance
    const [
      membershipsResult,
      bookingsResult,
      customersResult,
      classesResult,
      transactionsResult,
      birthdaysResult
    ] = await Promise.all([
      // Active memberships with payment status
      supabase
        .from('customer_memberships')
        .select(`
          *,
          membership_plan:membership_plans(name, price_pennies),
          customer:leads(name, email)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active'),

      // Recent bookings
      supabase
        .from('bookings')
        .select(`
          *,
          class_session:class_sessions(
            start_time,
            program:programs(name, price_pennies)
          ),
          customer:leads(name)
        `)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString()),

      // Recent customers
      supabase
        .from('leads')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('created_at', last30Days.toISOString()),

      // Upcoming classes - get next 10 classes
      supabase
        .from('class_sessions')
        .select(`
          *,
          program:programs(name),
          bookings(id)
        `)
        .eq('organization_id', organizationId)
        .gte('start_time', now.toISOString())
        .order('start_time', { ascending: true })
        .limit(10),

      // Recent transactions/payments
      supabase
        .from('payment_transactions')
        .select(`
          *,
          customer:leads(name)
        `)
        .eq('organization_id', organizationId)
        .gte('created_at', startOfMonth.toISOString())
        .order('created_at', { ascending: false })
        .limit(10),

      // Upcoming birthdays (next 30 days)
      supabase
        .from('leads')
        .select('id, name, date_of_birth, email')
        .eq('organization_id', organizationId)
        .not('date_of_birth', 'is', null)
    ]);

    const memberships = membershipsResult.data || [];
    const bookings = bookingsResult.data || [];
    const customers = customersResult.data || [];
    const classes = classesResult.data || [];
    const transactions = transactionsResult.data || [];
    const birthdayData = birthdaysResult?.data || [];
    
    console.log('Classes found:', classes.length);
    console.log('First 3 classes:', classes.slice(0, 3).map(c => ({
      id: c.id,
      program: c.program?.name,
      startTime: c.start_time,
      bookings: c.bookings?.length
    })));

    // Calculate metrics
    const pendingPayments = memberships.filter(m => m.payment_status === 'pending');
    const confirmedPayments = memberships.filter(m => m.payment_status === 'paid');
    
    const pendingTotal = pendingPayments.reduce((sum, m) => sum + (m.membership_plan?.price_pennies || 0), 0);
    const confirmedTotal = confirmedPayments.reduce((sum, m) => sum + (m.membership_plan?.price_pennies || 0), 0);

    // Calculate customer growth percentage
    const previousMonthCustomers = customers.filter(c => {
      const createdDate = new Date(c.created_at);
      return createdDate < startOfMonth;
    }).length;
    
    const currentMonthCustomers = customers.filter(c => {
      const createdDate = new Date(c.created_at);
      return createdDate >= startOfMonth;
    }).length;
    
    const growthPercentage = previousMonthCustomers > 0 
      ? ((currentMonthCustomers - previousMonthCustomers) / previousMonthCustomers * 100).toFixed(0)
      : 0;

    // Format upcoming events with full details
    const upcomingEvents = classes.map(cls => ({
      id: cls.id,
      title: cls.program?.name || 'Class',
      startTime: cls.start_time,
      endTime: cls.end_time,
      bookings: cls.bookings?.length || 0,
      capacity: cls.capacity,
      instructor: cls.instructor_name || 'TBD',
      location: cls.location || 'Studio',
      duration: cls.duration_minutes || 60
    }));

    // Calculate membership breakdown
    const membershipBreakdown: Record<string, number> = {};
    memberships.forEach(m => {
      const planName = m.membership_plan?.name || 'Unknown';
      membershipBreakdown[planName] = (membershipBreakdown[planName] || 0) + 1;
    });

    // Calculate revenue by type
    const revenueByType: Record<string, number> = {};
    memberships.forEach(m => {
      const planName = m.membership_plan?.name || 'Unknown';
      const revenue = m.membership_plan?.price_pennies || 0;
      revenueByType[planName] = (revenueByType[planName] || 0) + revenue;
    });

    return NextResponse.json({
      metrics: {
        pendingPayments: {
          count: pendingPayments.length,
          total: pendingTotal / 100
        },
        confirmedRevenue: {
          count: confirmedPayments.length,
          total: confirmedTotal / 100
        },
        newCustomers: {
          count: currentMonthCustomers,
          growthPercentage: Number(growthPercentage)
        },
        bookingsThisMonth: bookings.length,
        activeMemberships: memberships.length
      },
      upcomingEvents: upcomingEvents.slice(0, 5),
      upcomingBilling: memberships
        .filter(m => m.next_billing_date)
        .sort((a, b) => new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime())
        .slice(0, 5)
        .map(m => ({
          id: m.id,
          customer: m.customer?.name || 'Unknown',
          amount: (m.membership_plan?.price_pennies || 0) / 100,
          date: m.next_billing_date
        })),
      membershipBreakdown: Object.entries(membershipBreakdown).map(([name, count]) => ({
        name,
        value: count
      })),
      revenueByType: Object.entries(revenueByType).map(([name, value]) => ({
        name,
        value: value / 100
      })),
      recentTransactions: transactions.map(t => ({
        id: t.id,
        date: t.created_at,
        customer: t.customer?.name || 'Unknown',
        amount: t.amount / 100,
        status: t.status,
        type: t.description || 'Payment'
      })),
      upcomingBirthdays: getUpcomingBirthdays(birthdayData)
    });
  } catch (error: any) {
    console.error('Dashboard metrics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}