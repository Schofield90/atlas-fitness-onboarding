import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getUserAndOrganization } from '@/app/lib/auth-utils';

interface PayrollDashboardData {
  summary: {
    total_staff: number;
    pending_payroll: number;
    total_gross_this_month: number;
    total_net_this_month: number;
    average_hourly_rate: number;
    total_hours_this_month: number;
  };
  recent_batches: any[];
  staff_overview: any[];
  pending_approvals: any[];
  upcoming_payments: any[];
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const month = url.searchParams.get('month');
    const year = url.searchParams.get('year');

    // Default to current month/year if not specified
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    const monthStart = new Date(targetYear, targetMonth - 1, 1);
    const monthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    // Get total staff count
    const { count: totalStaff } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .eq('status', 'active');

    // Get payroll batches for the month
    const { data: monthlyBatches } = await supabase
      .from('payroll_batches')
      .select('*')
      .eq('organization_id', organization.id)
      .gte('pay_period_start', monthStart.toISOString())
      .lte('pay_period_end', monthEnd.toISOString());

    // Calculate monthly totals
    const totalGrossThisMonth = (monthlyBatches || []).reduce((sum, batch) => 
      sum + (batch.total_gross_pay || 0), 0
    );
    const totalNetThisMonth = (monthlyBatches || []).reduce((sum, batch) => 
      sum + (batch.total_net_pay || 0), 0
    );

    // Get pending payroll batches
    const { count: pendingPayroll } = await supabase
      .from('payroll_batches')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .in('status', ['draft', 'calculating', 'pending_approval']);

    // Get recent payroll batches
    const { data: recentBatches } = await supabase
      .from('payroll_batches')
      .select(`
        id,
        name,
        pay_period_start,
        pay_period_end,
        payment_date,
        status,
        total_gross_pay,
        total_net_pay,
        employee_count,
        created_at
      `)
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get timesheets for hours calculation
    const { data: timesheets } = await supabase
      .from('timesheets')
      .select('total_hours, hourly_rate')
      .eq('organization_id', organization.id)
      .gte('date', monthStart.toISOString().split('T')[0])
      .lte('date', monthEnd.toISOString().split('T')[0]);

    const totalHoursThisMonth = (timesheets || []).reduce((sum, ts) => 
      sum + (ts.total_hours || 0), 0
    );

    const averageHourlyRate = timesheets && timesheets.length > 0
      ? (timesheets.reduce((sum, ts) => sum + (ts.hourly_rate || 0), 0) / timesheets.length)
      : 0;

    // Get staff overview with recent timesheet data
    const { data: staffOverview } = await supabase
      .from('staff')
      .select(`
        id,
        name,
        email,
        role,
        hourly_rate,
        status,
        timesheets:timesheets!staff_id(
          total_hours,
          date
        )
      `)
      .eq('organization_id', organization.id)
      .eq('status', 'active')
      .limit(10);

    // Process staff overview to include monthly hours
    const processedStaffOverview = (staffOverview || []).map(staff => {
      const monthlyHours = (staff.timesheets || [])
        .filter((ts: any) => {
          const tsDate = new Date(ts.date);
          return tsDate >= monthStart && tsDate <= monthEnd;
        })
        .reduce((sum: number, ts: any) => sum + (ts.total_hours || 0), 0);

      return {
        ...staff,
        monthly_hours: monthlyHours,
        monthly_earnings: monthlyHours * (staff.hourly_rate || 0)
      };
    });

    // Get pending approvals
    const { data: pendingApprovals } = await supabase
      .from('payroll_batches')
      .select(`
        id,
        name,
        pay_period_start,
        pay_period_end,
        total_gross_pay,
        employee_count,
        created_at
      `)
      .eq('organization_id', organization.id)
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: true })
      .limit(5);

    // Get upcoming payments
    const upcomingDate = new Date();
    upcomingDate.setDate(upcomingDate.getDate() + 30); // Next 30 days

    const { data: upcomingPayments } = await supabase
      .from('payroll_batches')
      .select(`
        id,
        name,
        payment_date,
        total_net_pay,
        employee_count,
        status
      `)
      .eq('organization_id', organization.id)
      .gte('payment_date', new Date().toISOString())
      .lte('payment_date', upcomingDate.toISOString())
      .order('payment_date', { ascending: true })
      .limit(5);

    const dashboardData: PayrollDashboardData = {
      summary: {
        total_staff: totalStaff || 0,
        pending_payroll: pendingPayroll || 0,
        total_gross_this_month: totalGrossThisMonth,
        total_net_this_month: totalNetThisMonth,
        average_hourly_rate: averageHourlyRate,
        total_hours_this_month: totalHoursThisMonth
      },
      recent_batches: recentBatches || [],
      staff_overview: processedStaffOverview || [],
      pending_approvals: pendingApprovals || [],
      upcoming_payments: upcomingPayments || []
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
      month: targetMonth,
      year: targetYear
    });

  } catch (error) {
    console.error('Error fetching payroll dashboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, batch_id, data } = body;

    switch (action) {
      case 'approve_batch':
        if (!batch_id) {
          return NextResponse.json({ error: 'Batch ID required' }, { status: 400 });
        }

        const { error: approveError } = await supabase
          .from('payroll_batches')
          .update({
            status: 'approved',
            approved_by: user.id,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', batch_id)
          .eq('organization_id', organization.id);

        if (approveError) {
          return NextResponse.json({ error: 'Failed to approve batch' }, { status: 500 });
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Payroll batch approved successfully' 
        });

      case 'reject_batch':
        if (!batch_id) {
          return NextResponse.json({ error: 'Batch ID required' }, { status: 400 });
        }

        const { error: rejectError } = await supabase
          .from('payroll_batches')
          .update({
            status: 'draft',
            rejection_reason: data?.reason || 'Rejected for review',
            rejected_by: user.id,
            rejected_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', batch_id)
          .eq('organization_id', organization.id);

        if (rejectError) {
          return NextResponse.json({ error: 'Failed to reject batch' }, { status: 500 });
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Payroll batch rejected successfully' 
        });

      case 'process_batch':
        if (!batch_id) {
          return NextResponse.json({ error: 'Batch ID required' }, { status: 400 });
        }

        // Update status to processing
        const { error: processError } = await supabase
          .from('payroll_batches')
          .update({
            status: 'processing',
            processed_by: user.id,
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', batch_id)
          .eq('organization_id', organization.id);

        if (processError) {
          return NextResponse.json({ error: 'Failed to process batch' }, { status: 500 });
        }

        // Here you would integrate with payment systems (Stripe, bank transfers, etc.)
        // For now, we'll just mark as completed after a short delay
        setTimeout(async () => {
          await supabase
            .from('payroll_batches')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', batch_id);
        }, 5000);

        return NextResponse.json({ 
          success: true, 
          message: 'Payroll batch processing started' 
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing payroll dashboard action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}