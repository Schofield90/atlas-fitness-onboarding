import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns';

// Payroll schemas
export const timesheetSchema = z.object({
  staff_id: z.string().uuid(),
  started_at: z.string().datetime(),
  ended_at: z.string().datetime().optional(),
  break_minutes: z.number().default(0),
  notes: z.string().optional()
});

export const payrollBatchSchema = z.object({
  period_start: z.string(),
  period_end: z.string(),
  staff_ids: z.array(z.string().uuid()).optional()
});

export interface PayrollPeriod {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  status: 'draft' | 'processing' | 'completed' | 'cancelled';
  totalAmount: number;
  staffCount: number;
  processedAt?: Date;
}

export interface StaffPayroll {
  staffId: string;
  staffName: string;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  commission: number;
  deductions: number;
  netPay: number;
  timesheets: Array<{
    date: Date;
    hours: number;
    approved: boolean;
  }>;
}

export interface PayrollExport {
  format: 'csv' | 'pdf' | 'xero' | 'quickbooks';
  data: any;
}

class PayrollService {
  // Clock in/out
  async clockIn(staffId: string): Promise<string> {
    const supabase = await createClient();
    
    // Check if already clocked in
    const { data: activeTimesheet } = await supabase
      .from('timesheets')
      .select('id')
      .eq('staff_id', staffId)
      .is('ended_at', null)
      .single();
      
    if (activeTimesheet) {
      throw new Error('Already clocked in. Please clock out first.');
    }
    
    // Get staff org_id
    const { data: staff } = await supabase
      .from('staff')
      .select('org_id')
      .eq('id', staffId)
      .single();
      
    if (!staff) throw new Error('Staff member not found');
    
    // Create new timesheet
    const { data: timesheet, error } = await supabase
      .from('timesheets')
      .insert({
        org_id: staff.org_id,
        staff_id: staffId,
        started_at: new Date().toISOString()
      })
      .select('id')
      .single();
      
    if (error) throw error;
    
    return timesheet.id;
  }

  async clockOut(staffId: string, notes?: string): Promise<void> {
    const supabase = await createClient();
    
    // Find active timesheet
    const { data: activeTimesheet } = await supabase
      .from('timesheets')
      .select('id, started_at')
      .eq('staff_id', staffId)
      .is('ended_at', null)
      .single();
      
    if (!activeTimesheet) {
      throw new Error('No active timesheet found. Please clock in first.');
    }
    
    const endedAt = new Date();
    const startedAt = new Date(activeTimesheet.started_at);
    const minutes = differenceInMinutes(endedAt, startedAt);
    const hours = Math.round(minutes / 60 * 100) / 100; // Round to 2 decimal places
    
    // Update timesheet
    const { error } = await supabase
      .from('timesheets')
      .update({
        ended_at: endedAt.toISOString(),
        hours,
        metadata: notes ? { notes } : undefined
      })
      .eq('id', activeTimesheet.id);
      
    if (error) throw error;
  }

  // Get timesheets
  async getTimesheets(
    orgId: string,
    filter?: {
      staffId?: string;
      periodStart?: Date;
      periodEnd?: Date;
      approved?: boolean;
    }
  ) {
    const supabase = await createClient();
    
    let query = supabase
      .from('timesheets')
      .select(`
        *,
        staff:staff_id (
          id,
          user:users!inner (
            full_name,
            email
          )
        )
      `)
      .eq('org_id', orgId);
      
    if (filter?.staffId) {
      query = query.eq('staff_id', filter.staffId);
    }
    
    if (filter?.periodStart) {
      query = query.gte('started_at', filter.periodStart.toISOString());
    }
    
    if (filter?.periodEnd) {
      query = query.lte('started_at', filter.periodEnd.toISOString());
    }
    
    if (filter?.approved !== undefined) {
      if (filter.approved) {
        query = query.not('approved_by', 'is', null);
      } else {
        query = query.is('approved_by', null);
      }
    }
    
    const { data, error } = await query.order('started_at', { ascending: false });
    
    if (error) throw error;
    
    return data?.map(ts => ({
      id: ts.id,
      staffId: ts.staff_id,
      staffName: ts.staff?.user?.full_name || 'Unknown',
      startedAt: new Date(ts.started_at),
      endedAt: ts.ended_at ? new Date(ts.ended_at) : undefined,
      hours: ts.hours || 0,
      approved: !!ts.approved_by,
      approvedAt: ts.approved_at ? new Date(ts.approved_at) : undefined,
      notes: ts.metadata?.notes
    })) || [];
  }

  // Approve timesheet
  async approveTimesheet(timesheetId: string, approverId: string): Promise<void> {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('timesheets')
      .update({
        approved_by: approverId,
        approved_at: new Date().toISOString()
      })
      .eq('id', timesheetId);
      
    if (error) throw error;
  }

  // Create payroll batch
  async createPayrollBatch(
    orgId: string,
    data: z.infer<typeof payrollBatchSchema>
  ): Promise<string> {
    const supabase = await createClient();
    const validated = payrollBatchSchema.parse(data);
    
    // Create batch
    const { data: batch, error } = await supabase
      .from('payroll_batches')
      .insert({
        org_id: orgId,
        period_start: validated.period_start,
        period_end: validated.period_end,
        status: 'draft'
      })
      .select('id')
      .single();
      
    if (error) throw error;
    
    // Calculate payroll for the period
    await this.calculatePayroll(batch.id);
    
    return batch.id;
  }

  // Calculate payroll for a batch
  async calculatePayroll(batchId: string): Promise<StaffPayroll[]> {
    const supabase = await createClient();
    
    // Get batch details
    const { data: batch } = await supabase
      .from('payroll_batches')
      .select('*')
      .eq('id', batchId)
      .single();
      
    if (!batch) throw new Error('Payroll batch not found');
    
    // Get all staff with timesheets in this period
    const { data: timesheets } = await supabase
      .from('timesheets')
      .select(`
        *,
        staff:staff_id (
          id,
          pay_rate_cents,
          employment_type,
          commission_rate,
          user:users!inner (
            full_name,
            email
          )
        )
      `)
      .eq('org_id', batch.org_id)
      .gte('started_at', batch.period_start)
      .lte('started_at', batch.period_end)
      .not('approved_by', 'is', null); // Only approved timesheets
      
    if (!timesheets || timesheets.length === 0) {
      return [];
    }
    
    // Group by staff
    const staffPayrollMap = new Map<string, StaffPayroll>();
    
    for (const timesheet of timesheets) {
      const staffId = timesheet.staff_id;
      const staff = timesheet.staff;
      
      if (!staff) continue;
      
      if (!staffPayrollMap.has(staffId)) {
        staffPayrollMap.set(staffId, {
          staffId,
          staffName: staff.user?.full_name || 'Unknown',
          regularHours: 0,
          overtimeHours: 0,
          regularPay: 0,
          overtimePay: 0,
          commission: 0,
          deductions: 0,
          netPay: 0,
          timesheets: []
        });
      }
      
      const payroll = staffPayrollMap.get(staffId)!;
      const hours = timesheet.hours || 0;
      
      // Add to timesheets
      payroll.timesheets.push({
        date: new Date(timesheet.started_at),
        hours,
        approved: true
      });
      
      // Calculate hours (40 hour work week)
      if (payroll.regularHours + hours <= 40) {
        payroll.regularHours += hours;
      } else {
        const regularToAdd = Math.max(0, 40 - payroll.regularHours);
        payroll.regularHours += regularToAdd;
        payroll.overtimeHours += hours - regularToAdd;
      }
    }
    
    // Calculate pay for each staff member
    const staffPayrolls: StaffPayroll[] = [];
    let totalAmount = 0;
    
    for (const [staffId, payroll] of staffPayrollMap) {
      const staff = timesheets.find(t => t.staff_id === staffId)?.staff;
      if (!staff) continue;
      
      const hourlyRate = (staff.pay_rate_cents || 0) / 100;
      
      // Calculate regular and overtime pay
      payroll.regularPay = payroll.regularHours * hourlyRate;
      payroll.overtimePay = payroll.overtimeHours * hourlyRate * 1.5; // 1.5x for overtime
      
      // Calculate commission (would need to fetch sales/bookings data)
      // For now, set to 0
      payroll.commission = 0;
      
      // Calculate deductions (simplified - would need tax tables)
      const grossPay = payroll.regularPay + payroll.overtimePay + payroll.commission;
      payroll.deductions = grossPay * 0.2; // 20% for example
      
      payroll.netPay = grossPay - payroll.deductions;
      totalAmount += payroll.netPay;
      
      staffPayrolls.push(payroll);
    }
    
    // Update batch total
    await supabase
      .from('payroll_batches')
      .update({ 
        total_cents: Math.round(totalAmount * 100),
        metadata: { staff_count: staffPayrolls.length }
      })
      .eq('id', batchId);
    
    return staffPayrolls;
  }

  // Get payroll batches
  async getPayrollBatches(orgId: string, limit = 10): Promise<PayrollPeriod[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('payroll_batches')
      .select('*')
      .eq('org_id', orgId)
      .order('period_start', { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    
    return (data || []).map(batch => ({
      id: batch.id,
      periodStart: new Date(batch.period_start),
      periodEnd: new Date(batch.period_end),
      status: batch.status,
      totalAmount: (batch.total_cents || 0) / 100,
      staffCount: batch.metadata?.staff_count || 0,
      processedAt: batch.processed_at ? new Date(batch.processed_at) : undefined
    }));
  }

  // Process payroll batch
  async processPayroll(batchId: string): Promise<void> {
    const supabase = await createClient();
    
    // Update status
    const { error } = await supabase
      .from('payroll_batches')
      .update({
        status: 'processing',
        processed_at: new Date().toISOString()
      })
      .eq('id', batchId);
      
    if (error) throw error;
    
    // In a real system, this would:
    // 1. Generate payment files for banks
    // 2. Send to payroll provider
    // 3. Create journal entries
    // 4. Send payslips to employees
    
    // For now, just mark as completed
    await supabase
      .from('payroll_batches')
      .update({ status: 'completed' })
      .eq('id', batchId);
  }

  // Export payroll data
  async exportPayroll(
    batchId: string,
    format: 'csv' | 'pdf' | 'xero' | 'quickbooks'
  ): Promise<PayrollExport> {
    const staffPayrolls = await this.calculatePayroll(batchId);
    
    switch (format) {
      case 'csv':
        return {
          format: 'csv',
          data: this.generateCSV(staffPayrolls)
        };
        
      case 'xero':
        return {
          format: 'xero',
          data: this.generateXeroFormat(staffPayrolls)
        };
        
      case 'quickbooks':
        return {
          format: 'quickbooks',
          data: this.generateQuickBooksFormat(staffPayrolls)
        };
        
      case 'pdf':
      default:
        return {
          format: 'pdf',
          data: staffPayrolls // Would generate actual PDF
        };
    }
  }

  // Generate CSV export
  private generateCSV(payrolls: StaffPayroll[]): string {
    const headers = [
      'Staff Name',
      'Regular Hours',
      'Overtime Hours',
      'Regular Pay',
      'Overtime Pay',
      'Commission',
      'Gross Pay',
      'Deductions',
      'Net Pay'
    ];
    
    const rows = payrolls.map(p => [
      p.staffName,
      p.regularHours.toFixed(2),
      p.overtimeHours.toFixed(2),
      p.regularPay.toFixed(2),
      p.overtimePay.toFixed(2),
      p.commission.toFixed(2),
      (p.regularPay + p.overtimePay + p.commission).toFixed(2),
      p.deductions.toFixed(2),
      p.netPay.toFixed(2)
    ]);
    
    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
  }

  // Generate Xero format
  private generateXeroFormat(payrolls: StaffPayroll[]): any {
    // Simplified Xero payrun format
    return {
      PayRunID: '',
      PayRunPeriodStartDate: '',
      PayRunPeriodEndDate: '',
      PayRunStatus: 'DRAFT',
      Payslips: payrolls.map(p => ({
        EmployeeID: p.staffId,
        EarningsLines: [
          {
            EarningsRateID: 'ORDINARY_TIME',
            NumberOfUnits: p.regularHours,
            RatePerUnit: p.regularPay / p.regularHours
          },
          {
            EarningsRateID: 'OVERTIME',
            NumberOfUnits: p.overtimeHours,
            RatePerUnit: p.overtimePay / p.overtimeHours
          }
        ]
      }))
    };
  }

  // Generate QuickBooks format
  private generateQuickBooksFormat(payrolls: StaffPayroll[]): any {
    // Simplified QuickBooks format
    return {
      payrolls: payrolls.map(p => ({
        employeeId: p.staffId,
        regularHours: p.regularHours,
        overtimeHours: p.overtimeHours,
        regularPay: p.regularPay,
        overtimePay: p.overtimePay,
        grossPay: p.regularPay + p.overtimePay + p.commission,
        taxes: p.deductions,
        netPay: p.netPay
      }))
    };
  }

  // Get staff payroll summary
  async getStaffPayrollSummary(
    staffId: string,
    year: number
  ): Promise<{
    totalEarnings: number;
    totalHours: number;
    averageHoursPerWeek: number;
    payrollsByMonth: Record<string, number>;
  }> {
    const supabase = await createClient();
    
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    const { data: timesheets } = await supabase
      .from('timesheets')
      .select('started_at, hours, metadata')
      .eq('staff_id', staffId)
      .gte('started_at', startDate.toISOString())
      .lte('started_at', endDate.toISOString())
      .not('approved_by', 'is', null);
      
    const totalHours = timesheets?.reduce((sum, ts) => sum + (ts.hours || 0), 0) || 0;
    const weeks = 52;
    const averageHoursPerWeek = totalHours / weeks;
    
    // Group by month
    const payrollsByMonth: Record<string, number> = {};
    
    timesheets?.forEach(ts => {
      const month = format(new Date(ts.started_at), 'yyyy-MM');
      payrollsByMonth[month] = (payrollsByMonth[month] || 0) + (ts.hours || 0);
    });
    
    // Get staff pay rate
    const { data: staff } = await supabase
      .from('staff')
      .select('pay_rate_cents')
      .eq('id', staffId)
      .single();
      
    const hourlyRate = (staff?.pay_rate_cents || 0) / 100;
    const totalEarnings = totalHours * hourlyRate;
    
    return {
      totalEarnings,
      totalHours,
      averageHoursPerWeek,
      payrollsByMonth
    };
  }
}

export const payrollService = new PayrollService();