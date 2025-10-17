import { createClient } from '@supabase/supabase-js';
import { XeroClient, XeroEmployee, XeroPayrun, XeroTimesheet, XeroPayslip } from './XeroClient';

export interface PayrollBatch {
  id: string;
  organization_id: string;
  name: string;
  pay_period_start: string;
  pay_period_end: string;
  payment_date: string;
  status: 'draft' | 'calculating' | 'pending_approval' | 'approved' | 'processing' | 'completed' | 'cancelled' | 'error';
  total_gross_pay: number;
  total_deductions: number;
  total_tax: number;
  total_super: number;
  total_net_pay: number;
  employee_count: number;
  xero_payrun_id?: string;
  approved_by?: string;
  approved_at?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  frequency: 'weekly' | 'fortnightly' | 'monthly' | 'custom';
}

export interface PayrollBatchEmployee {
  id: string;
  batch_id: string;
  employee_id: string;
  xero_employee_id: string;
  regular_hours: number;
  overtime_hours: number;
  gross_pay: number;
  deductions: number;
  tax: number;
  super_amount: number;
  net_pay: number;
  status: 'draft' | 'calculated' | 'approved' | 'processed' | 'error';
  timesheet_validated: boolean;
  notes?: string;
  xero_payslip_id?: string;
}

export interface TimesheetEntry {
  id: string;
  employee_id: string;
  date: string;
  hours_worked: number;
  overtime_hours: number;
  break_hours: number;
  hourly_rate: number;
  overtime_rate: number;
  total_pay: number;
  approved: boolean;
  approved_by?: string;
  approved_at?: string;
  xero_synced: boolean;
  xero_timesheet_id?: string;
}

export interface PayrollCalculation {
  employee_id: string;
  regular_hours: number;
  overtime_hours: number;
  gross_pay: number;
  tax: number;
  super_amount: number;
  deductions: number;
  net_pay: number;
  errors: string[];
  warnings: string[];
}

export interface PayrollReport {
  batch_id: string;
  report_type: 'payroll_register' | 'tax_summary' | 'super_summary' | 'cost_centre' | 'pay_advice';
  data: any;
  generated_at: string;
  generated_by: string;
}

export class PayrollService {
  private supabase;
  private xeroClient: XeroClient;
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.xeroClient = new XeroClient(organizationId);
  }

  // ============= PAYROLL BATCH MANAGEMENT =============

  /**
   * Create new payroll batch
   */
  async createPayrollBatch(params: {
    name: string;
    payPeriodStart: string;
    payPeriodEnd: string;
    paymentDate: string;
    frequency: 'weekly' | 'fortnightly' | 'monthly' | 'custom';
    employeeIds?: string[];
  }): Promise<PayrollBatch> {
    const { data, error } = await this.supabase
      .from('payroll_batches')
      .insert({
        organization_id: this.organizationId,
        name: params.name,
        pay_period_start: params.payPeriodStart,
        pay_period_end: params.payPeriodEnd,
        payment_date: params.paymentDate,
        frequency: params.frequency,
        status: 'draft',
        total_gross_pay: 0,
        total_deductions: 0,
        total_tax: 0,
        total_super: 0,
        total_net_pay: 0,
        employee_count: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create payroll batch: ${error.message}`);
    }

    // Add employees to batch if specified
    if (params.employeeIds && params.employeeIds.length > 0) {
      await this.addEmployeesToBatch(data.id, params.employeeIds);
    }

    // Log batch creation
    await this.logPayrollActivity(data.id, 'batch_created', `Payroll batch "${params.name}" created`);

    return data;
  }

  /**
   * Get payroll batches with filters
   */
  async getPayrollBatches(filters: {
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ batches: PayrollBatch[]; total: number }> {
    let query = this.supabase
      .from('payroll_batches')
      .select('*, payroll_batch_employees(*)', { count: 'exact' })
      .eq('organization_id', this.organizationId)
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.startDate) {
      query = query.gte('pay_period_start', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('pay_period_end', filters.endDate);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to get payroll batches: ${error.message}`);
    }

    return {
      batches: data || [],
      total: count || 0,
    };
  }

  /**
   * Get specific payroll batch with details
   */
  async getPayrollBatch(batchId: string): Promise<PayrollBatch & { employees: PayrollBatchEmployee[] }> {
    const { data, error } = await this.supabase
      .from('payroll_batches')
      .select(`
        *,
        payroll_batch_employees(*,
          organization_staff(name, email, payroll_number)
        )
      `)
      .eq('id', batchId)
      .eq('organization_id', this.organizationId)
      .single();

    if (error) {
      throw new Error(`Failed to get payroll batch: ${error.message}`);
    }

    return data;
  }

  /**
   * Add employees to payroll batch
   */
  async addEmployeesToBatch(batchId: string, employeeIds: string[]): Promise<void> {
    const employees = [];

    for (const employeeId of employeeIds) {
      // Get employee details from local database
      const { data: employee, error } = await this.supabase
        .from('organization_staff')
        .select('*, xero_employee_id')
        .eq('id', employeeId)
        .eq('organization_id', this.organizationId)
        .single();

      if (error || !employee) {
        console.error(`Employee ${employeeId} not found or accessible`);
        continue;
      }

      employees.push({
        batch_id: batchId,
        employee_id: employeeId,
        xero_employee_id: employee.xero_employee_id,
        regular_hours: 0,
        overtime_hours: 0,
        gross_pay: 0,
        deductions: 0,
        tax: 0,
        super_amount: 0,
        net_pay: 0,
        status: 'draft',
        timesheet_validated: false,
      });
    }

    if (employees.length > 0) {
      const { error } = await this.supabase
        .from('payroll_batch_employees')
        .insert(employees);

      if (error) {
        throw new Error(`Failed to add employees to batch: ${error.message}`);
      }

      // Update employee count
      await this.supabase
        .from('payroll_batches')
        .update({ employee_count: employees.length })
        .eq('id', batchId);
    }
  }

  // ============= TIMESHEET PROCESSING =============

  /**
   * Import timesheets for pay period
   */
  async importTimesheets(batchId: string): Promise<{
    imported: number;
    errors: string[];
  }> {
    const batch = await this.getPayrollBatch(batchId);
    const errors: string[] = [];
    let imported = 0;

    for (const batchEmployee of batch.employees) {
      try {
        // Get timesheets from local database
        const { data: timesheets } = await this.supabase
          .from('staff_timesheets')
          .select('*')
          .eq('staff_id', batchEmployee.employee_id)
          .gte('date', batch.pay_period_start)
          .lte('date', batch.pay_period_end);

        if (timesheets) {
          let totalHours = 0;
          let overtimeHours = 0;

          timesheets.forEach(timesheet => {
            totalHours += timesheet.hours_worked || 0;
            if (timesheet.overtime_hours) {
              overtimeHours += timesheet.overtime_hours;
            }
          });

          // Update batch employee with timesheet data
          await this.supabase
            .from('payroll_batch_employees')
            .update({
              regular_hours: totalHours - overtimeHours,
              overtime_hours: overtimeHours,
              timesheet_validated: true,
            })
            .eq('id', batchEmployee.id);

          imported++;
        }
      } catch (error: any) {
        errors.push(`Employee ${batchEmployee.employee_id}: ${error.message}`);
      }
    }

    await this.logPayrollActivity(batchId, 'timesheets_imported', 
      `Imported timesheets for ${imported} employees`);

    return { imported, errors };
  }

  /**
   * Validate timesheets before payroll processing
   */
  async validateTimesheets(batchId: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const batch = await this.getPayrollBatch(batchId);
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const batchEmployee of batch.employees) {
      // Check if timesheet data exists
      if (batchEmployee.regular_hours === 0 && batchEmployee.overtime_hours === 0) {
        errors.push(`No timesheet data found for employee ${batchEmployee.employee_id}`);
        continue;
      }

      // Check for reasonable hour limits
      const totalHours = batchEmployee.regular_hours + batchEmployee.overtime_hours;
      if (totalHours > 80) { // Assuming 2 week pay period max
        warnings.push(`High hours (${totalHours}) for employee ${batchEmployee.employee_id}`);
      }

      // Check if overtime is properly calculated
      if (batchEmployee.regular_hours > 38 && batchEmployee.overtime_hours === 0) {
        warnings.push(`Potential overtime not recorded for employee ${batchEmployee.employee_id}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============= PAYROLL CALCULATIONS =============

  /**
   * Calculate payroll for all employees in batch
   */
  async calculatePayroll(batchId: string): Promise<{
    success: boolean;
    calculations: PayrollCalculation[];
    errors: string[];
  }> {
    await this.updateBatchStatus(batchId, 'calculating');

    const batch = await this.getPayrollBatch(batchId);
    const calculations: PayrollCalculation[] = [];
    const errors: string[] = [];

    let totalGrossPay = 0;
    let totalDeductions = 0;
    let totalTax = 0;
    let totalSuper = 0;
    let totalNetPay = 0;

    for (const batchEmployee of batch.employees) {
      try {
        const calculation = await this.calculateEmployeePayroll(batchEmployee);
        calculations.push(calculation);

        if (calculation.errors.length === 0) {
          // Update batch employee with calculations
          await this.supabase
            .from('payroll_batch_employees')
            .update({
              gross_pay: calculation.gross_pay,
              deductions: calculation.deductions,
              tax: calculation.tax,
              super_amount: calculation.super_amount,
              net_pay: calculation.net_pay,
              status: 'calculated',
            })
            .eq('id', batchEmployee.id);

          totalGrossPay += calculation.gross_pay;
          totalDeductions += calculation.deductions;
          totalTax += calculation.tax;
          totalSuper += calculation.super_amount;
          totalNetPay += calculation.net_pay;
        } else {
          await this.supabase
            .from('payroll_batch_employees')
            .update({
              status: 'error',
              notes: calculation.errors.join(', '),
            })
            .eq('id', batchEmployee.id);

          errors.push(...calculation.errors);
        }
      } catch (error: any) {
        errors.push(`Employee ${batchEmployee.employee_id}: ${error.message}`);
      }
    }

    // Update batch totals
    await this.supabase
      .from('payroll_batches')
      .update({
        total_gross_pay: totalGrossPay,
        total_deductions: totalDeductions,
        total_tax: totalTax,
        total_super: totalSuper,
        total_net_pay: totalNetPay,
        status: errors.length > 0 ? 'error' : 'pending_approval',
      })
      .eq('id', batchId);

    await this.logPayrollActivity(batchId, 'calculations_completed',
      `Payroll calculations completed. Gross: $${totalGrossPay.toFixed(2)}, Net: $${totalNetPay.toFixed(2)}`);

    return {
      success: errors.length === 0,
      calculations,
      errors,
    };
  }

  /**
   * Calculate payroll for individual employee
   */
  private async calculateEmployeePayroll(batchEmployee: PayrollBatchEmployee): Promise<PayrollCalculation> {
    const calculation: PayrollCalculation = {
      employee_id: batchEmployee.employee_id,
      regular_hours: batchEmployee.regular_hours,
      overtime_hours: batchEmployee.overtime_hours,
      gross_pay: 0,
      tax: 0,
      super_amount: 0,
      deductions: 0,
      net_pay: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Get employee pay rates
      const { data: employee } = await this.supabase
        .from('organization_staff')
        .select('hourly_rate, salary, employment_type')
        .eq('id', batchEmployee.employee_id)
        .single();

      if (!employee) {
        calculation.errors.push('Employee not found');
        return calculation;
      }

      // Calculate gross pay
      if (employee.employment_type === 'hourly') {
        const regularPay = batchEmployee.regular_hours * (employee.hourly_rate || 0);
        const overtimePay = batchEmployee.overtime_hours * (employee.hourly_rate || 0) * 1.5; // 1.5x for overtime
        calculation.gross_pay = regularPay + overtimePay;
      } else if (employee.employment_type === 'salary') {
        // Calculate pro-rata salary based on pay period
        calculation.gross_pay = (employee.salary || 0) / 26; // Assuming fortnightly
      }

      // Calculate tax (simplified - should use ATO tax tables)
      calculation.tax = this.calculateTax(calculation.gross_pay);

      // Calculate superannuation (11% for Australia)
      calculation.super_amount = calculation.gross_pay * 0.11;

      // Calculate deductions (basic - could include health insurance, etc.)
      calculation.deductions = 0; // TODO: Implement deduction logic

      // Calculate net pay
      calculation.net_pay = calculation.gross_pay - calculation.tax - calculation.deductions;

    } catch (error: any) {
      calculation.errors.push(error.message);
    }

    return calculation;
  }

  /**
   * Simplified tax calculation (should use proper ATO tax tables)
   */
  private calculateTax(grossPay: number): number {
    // Basic Australian tax calculation - replace with proper tax engine
    if (grossPay <= 350) return 0; // Tax-free threshold per fortnight
    if (grossPay <= 865) return (grossPay - 350) * 0.19;
    if (grossPay <= 1923) return 97.85 + (grossPay - 865) * 0.325;
    if (grossPay <= 3461) return 441.69 + (grossPay - 1923) * 0.37;
    return 1011.47 + (grossPay - 3461) * 0.45;
  }

  // ============= APPROVAL WORKFLOW =============

  /**
   * Submit batch for approval
   */
  async submitForApproval(batchId: string, userId: string): Promise<void> {
    await this.updateBatchStatus(batchId, 'pending_approval');
    await this.logPayrollActivity(batchId, 'submitted_for_approval', 
      `Payroll batch submitted for approval by user ${userId}`);

    // TODO: Send notifications to approvers
  }

  /**
   * Approve payroll batch
   */
  async approveBatch(batchId: string, userId: string, notes?: string): Promise<void> {
    await this.supabase
      .from('payroll_batches')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        notes: notes,
      })
      .eq('id', batchId);

    await this.logPayrollActivity(batchId, 'batch_approved', 
      `Payroll batch approved by user ${userId}${notes ? `: ${notes}` : ''}`);
  }

  /**
   * Reject payroll batch
   */
  async rejectBatch(batchId: string, userId: string, reason: string): Promise<void> {
    await this.updateBatchStatus(batchId, 'draft');
    await this.logPayrollActivity(batchId, 'batch_rejected', 
      `Payroll batch rejected by user ${userId}: ${reason}`);
  }

  // ============= XERO INTEGRATION =============

  /**
   * Sync batch to Xero
   */
  async syncToXero(batchId: string): Promise<{
    success: boolean;
    xeroPayrunId?: string;
    errors: string[];
  }> {
    const batch = await this.getPayrollBatch(batchId);
    
    if (batch.status !== 'approved') {
      throw new Error('Batch must be approved before syncing to Xero');
    }

    await this.updateBatchStatus(batchId, 'processing');

    try {
      // Create payrun in Xero
      const xeroPayrun = await this.xeroClient.createPayrun({
        payrollCalendarID: await this.getXeroPayrollCalendarId(),
        periodStartDate: batch.pay_period_start,
        periodEndDate: batch.pay_period_end,
        paymentDate: batch.payment_date,
        payrunStatus: 'DRAFT',
      });

      // Update batch with Xero payrun ID
      await this.supabase
        .from('payroll_batches')
        .update({
          xero_payrun_id: xeroPayrun.payrunID,
          status: 'completed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', batchId);

      await this.logPayrollActivity(batchId, 'synced_to_xero', 
        `Successfully synced to Xero with payrun ID: ${xeroPayrun.payrunID}`);

      return {
        success: true,
        xeroPayrunId: xeroPayrun.payrunID,
        errors: [],
      };

    } catch (error: any) {
      await this.updateBatchStatus(batchId, 'error');
      await this.logPayrollActivity(batchId, 'xero_sync_failed', 
        `Failed to sync to Xero: ${error.message}`);

      return {
        success: false,
        errors: [error.message],
      };
    }
  }

  /**
   * Get Xero payroll calendar ID for organization
   */
  private async getXeroPayrollCalendarId(): Promise<string> {
    // This should be configured in organization settings
    const { data } = await this.supabase
      .from('organization_settings')
      .select('xero_payroll_calendar_id')
      .eq('organization_id', this.organizationId)
      .single();

    return data?.xero_payroll_calendar_id || '';
  }

  // ============= UTILITY METHODS =============

  /**
   * Update batch status
   */
  private async updateBatchStatus(batchId: string, status: PayrollBatch['status']): Promise<void> {
    await this.supabase
      .from('payroll_batches')
      .update({ 
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', batchId);
  }

  /**
   * Log payroll activity for audit trail
   */
  private async logPayrollActivity(batchId: string, action: string, description: string): Promise<void> {
    await this.supabase
      .from('payroll_activity_log')
      .insert({
        batch_id: batchId,
        action,
        description,
        organization_id: this.organizationId,
        created_at: new Date().toISOString(),
      });
  }

  /**
   * Generate payroll reports
   */
  async generateReport(batchId: string, reportType: PayrollReport['report_type']): Promise<PayrollReport> {
    const batch = await this.getPayrollBatch(batchId);
    let reportData: any = {};

    switch (reportType) {
      case 'payroll_register':
        reportData = {
          batch,
          employees: batch.employees.map(emp => ({
            name: emp.organization_staff?.name || 'Unknown',
            regular_hours: emp.regular_hours,
            overtime_hours: emp.overtime_hours,
            gross_pay: emp.gross_pay,
            tax: emp.tax,
            super_amount: emp.super_amount,
            net_pay: emp.net_pay,
          })),
          totals: {
            gross_pay: batch.total_gross_pay,
            tax: batch.total_tax,
            super: batch.total_super,
            net_pay: batch.total_net_pay,
          },
        };
        break;

      case 'tax_summary':
        reportData = await this.generateTaxSummaryReport(batch);
        break;

      case 'super_summary':
        reportData = await this.generateSuperSummaryReport(batch);
        break;

      default:
        throw new Error(`Report type ${reportType} not supported`);
    }

    return {
      batch_id: batchId,
      report_type: reportType,
      data: reportData,
      generated_at: new Date().toISOString(),
      generated_by: 'system', // TODO: Pass user ID
    };
  }

  private async generateTaxSummaryReport(batch: any): Promise<any> {
    return {
      pay_period: `${batch.pay_period_start} to ${batch.pay_period_end}`,
      total_tax: batch.total_tax,
      employee_count: batch.employee_count,
      average_tax: batch.total_tax / batch.employee_count,
    };
  }

  private async generateSuperSummaryReport(batch: any): Promise<any> {
    return {
      pay_period: `${batch.pay_period_start} to ${batch.pay_period_end}`,
      total_super: batch.total_super,
      employee_count: batch.employee_count,
      super_rate: 0.11, // 11%
    };
  }
}