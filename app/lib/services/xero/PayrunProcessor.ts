import { createClient } from '@supabase/supabase-js';
import { XeroClient, XeroPayrun, XeroPayslip, XeroTimesheet } from './XeroClient';
import { PayrollService, PayrollBatch } from './PayrollService';

export interface PayrunProcessingStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'skipped';
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  result?: any;
}

export interface PayrunProcessingJob {
  id: string;
  batch_id: string;
  organization_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduled_for?: string;
  started_at?: string;
  completed_at?: string;
  progress_percentage: number;
  steps: PayrunProcessingStep[];
  errors: string[];
  warnings: string[];
  result?: {
    xero_payrun_id?: string;
    processed_employees: number;
    total_gross_pay: number;
    total_net_pay: number;
    processing_time_seconds: number;
  };
  created_at: string;
  updated_at: string;
}

export interface PayrunValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checks: {
    timesheets_validated: boolean;
    employee_data_complete: boolean;
    pay_rates_configured: boolean;
    tax_settings_valid: boolean;
    banking_details_complete: boolean;
    xero_connection_active: boolean;
  };
}

export interface PayrunReport {
  batch_id: string;
  payrun_id: string;
  summary: {
    employee_count: number;
    total_regular_hours: number;
    total_overtime_hours: number;
    total_gross_pay: number;
    total_tax: number;
    total_super: number;
    total_deductions: number;
    total_net_pay: number;
  };
  employees: {
    employee_id: string;
    name: string;
    regular_hours: number;
    overtime_hours: number;
    gross_pay: number;
    tax: number;
    super_amount: number;
    deductions: number;
    net_pay: number;
    bank_account: string;
  }[];
  generated_at: string;
}

export class PayrunProcessor {
  private supabase;
  private xeroClient: XeroClient;
  private payrollService: PayrollService;
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.xeroClient = new XeroClient(organizationId);
    this.payrollService = new PayrollService(organizationId);
  }

  // ============= PAYRUN PROCESSING =============

  /**
   * Process payroll batch through complete workflow
   */
  async processPayrollBatch(batchId: string, options: {
    skipValidation?: boolean;
    autoApprove?: boolean;
    scheduleFor?: string;
  } = {}): Promise<PayrunProcessingJob> {
    // Create processing job
    const job = await this.createProcessingJob(batchId, options);

    // Start processing in background
    this.executeProcessingJob(job.id).catch(error => {
      console.error('Processing job failed:', error);
      this.markJobAsFailed(job.id, error.message);
    });

    return job;
  }

  /**
   * Execute the processing job
   */
  private async executeProcessingJob(jobId: string): Promise<void> {
    const job = await this.getProcessingJob(jobId);
    if (!job) return;

    await this.updateJobStatus(jobId, 'processing');

    const startTime = Date.now();
    let currentStep = 0;

    try {
      const batch = await this.payrollService.getPayrollBatch(job.batch_id);

      // Step 1: Validate payrun
      await this.executeStep(jobId, currentStep++, 'Validating Payrun', async () => {
        const validation = await this.validatePayrun(job.batch_id);
        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
        return validation;
      });

      // Step 2: Import and validate timesheets
      await this.executeStep(jobId, currentStep++, 'Processing Timesheets', async () => {
        const result = await this.payrollService.importTimesheets(job.batch_id);
        if (result.errors.length > 0) {
          throw new Error(`Timesheet import failed: ${result.errors.join(', ')}`);
        }
        return result;
      });

      // Step 3: Calculate payroll
      await this.executeStep(jobId, currentStep++, 'Calculating Payroll', async () => {
        const result = await this.payrollService.calculatePayroll(job.batch_id);
        if (!result.success) {
          throw new Error(`Payroll calculation failed: ${result.errors.join(', ')}`);
        }
        return result;
      });

      // Step 4: Generate pay slips
      await this.executeStep(jobId, currentStep++, 'Generating Pay Slips', async () => {
        return await this.generatePaySlips(job.batch_id);
      });

      // Step 5: Sync timesheets to Xero
      await this.executeStep(jobId, currentStep++, 'Syncing Timesheets to Xero', async () => {
        return await this.syncTimesheetsToXero(job.batch_id, batch);
      });

      // Step 6: Create Xero payrun
      await this.executeStep(jobId, currentStep++, 'Creating Xero Payrun', async () => {
        const result = await this.payrollService.syncToXero(job.batch_id);
        if (!result.success) {
          throw new Error(`Xero sync failed: ${result.errors.join(', ')}`);
        }
        return result;
      });

      // Step 7: Generate reports
      await this.executeStep(jobId, currentStep++, 'Generating Reports', async () => {
        return await this.generatePayrunReports(job.batch_id);
      });

      // Step 8: Finalize payrun
      await this.executeStep(jobId, currentStep++, 'Finalizing Payrun', async () => {
        return await this.finalizePayrun(job.batch_id);
      });

      // Complete the job
      const processingTime = Math.round((Date.now() - startTime) / 1000);
      const updatedBatch = await this.payrollService.getPayrollBatch(job.batch_id);

      await this.completeProcessingJob(jobId, {
        xero_payrun_id: updatedBatch.xero_payrun_id,
        processed_employees: updatedBatch.employee_count,
        total_gross_pay: updatedBatch.total_gross_pay,
        total_net_pay: updatedBatch.total_net_pay,
        processing_time_seconds: processingTime,
      });

    } catch (error: any) {
      await this.markJobAsFailed(jobId, error.message);
      throw error;
    }
  }

  /**
   * Execute a processing step
   */
  private async executeStep(
    jobId: string,
    stepIndex: number,
    stepName: string,
    executor: () => Promise<any>
  ): Promise<void> {
    await this.updateStepStatus(jobId, stepIndex, 'processing');
    
    try {
      const result = await executor();
      await this.updateStepStatus(jobId, stepIndex, 'completed', undefined, result);
      await this.updateJobProgress(jobId, ((stepIndex + 1) / 8) * 100);
    } catch (error: any) {
      await this.updateStepStatus(jobId, stepIndex, 'error', error.message);
      throw error;
    }
  }

  // ============= VALIDATION =============

  /**
   * Validate payrun before processing
   */
  async validatePayrun(batchId: string): Promise<PayrunValidationResult> {
    const validation: PayrunValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      checks: {
        timesheets_validated: false,
        employee_data_complete: false,
        pay_rates_configured: false,
        tax_settings_valid: false,
        banking_details_complete: false,
        xero_connection_active: false,
      },
    };

    try {
      const batch = await this.payrollService.getPayrollBatch(batchId);

      // Check timesheets
      const timesheetValidation = await this.payrollService.validateTimesheets(batchId);
      validation.checks.timesheets_validated = timesheetValidation.valid;
      if (!timesheetValidation.valid) {
        validation.errors.push(...timesheetValidation.errors);
      }
      validation.warnings.push(...timesheetValidation.warnings);

      // Check employee data completeness
      const employeeDataCheck = await this.validateEmployeeData(batch.employees);
      validation.checks.employee_data_complete = employeeDataCheck.valid;
      if (!employeeDataCheck.valid) {
        validation.errors.push(...employeeDataCheck.errors);
      }

      // Check pay rates configuration
      const payRatesCheck = await this.validatePayRates(batch.employees);
      validation.checks.pay_rates_configured = payRatesCheck.valid;
      if (!payRatesCheck.valid) {
        validation.errors.push(...payRatesCheck.errors);
      }

      // Check tax settings
      validation.checks.tax_settings_valid = await this.validateTaxSettings();
      if (!validation.checks.tax_settings_valid) {
        validation.errors.push('Tax settings not properly configured');
      }

      // Check banking details
      const bankingCheck = await this.validateBankingDetails(batch.employees);
      validation.checks.banking_details_complete = bankingCheck.valid;
      if (!bankingCheck.valid) {
        validation.warnings.push(...bankingCheck.errors);
      }

      // Check Xero connection
      validation.checks.xero_connection_active = await this.xeroClient.testConnection();
      if (!validation.checks.xero_connection_active) {
        validation.errors.push('Xero connection not active');
      }

      validation.valid = validation.errors.length === 0;

    } catch (error: any) {
      validation.errors.push(`Validation error: ${error.message}`);
      validation.valid = false;
    }

    return validation;
  }

  /**
   * Validate employee data completeness
   */
  private async validateEmployeeData(employees: any[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const employee of employees) {
      const staff = employee.organization_staff;
      if (!staff) {
        errors.push(`Employee data missing for ${employee.employee_id}`);
        continue;
      }

      if (!staff.name) errors.push(`Name missing for employee ${staff.id}`);
      if (!staff.email) errors.push(`Email missing for employee ${staff.name}`);
      if (!staff.tax_file_number) errors.push(`TFN missing for employee ${staff.name}`);
      if (!employee.xero_employee_id) errors.push(`Xero employee ID missing for ${staff.name}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate pay rates configuration
   */
  private async validatePayRates(employees: any[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const employee of employees) {
      const staff = employee.organization_staff;
      if (!staff) continue;

      if (staff.employment_type === 'hourly' && !staff.hourly_rate) {
        errors.push(`Hourly rate missing for ${staff.name}`);
      }

      if (staff.employment_type === 'salary' && !staff.salary) {
        errors.push(`Salary amount missing for ${staff.name}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate tax settings
   */
  private async validateTaxSettings(): Promise<boolean> {
    // Check if organization has tax settings configured
    const { data } = await this.supabase
      .from('organization_settings')
      .select('tax_settings')
      .eq('organization_id', this.organizationId)
      .single();

    return data?.tax_settings != null;
  }

  /**
   * Validate banking details
   */
  private async validateBankingDetails(employees: any[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const employee of employees) {
      const staff = employee.organization_staff;
      if (!staff) continue;

      if (!staff.bank_account) {
        errors.push(`Banking details missing for ${staff.name}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ============= PAYSLIP GENERATION =============

  /**
   * Generate pay slips for all employees in batch
   */
  async generatePaySlips(batchId: string): Promise<{ generated: number; errors: string[] }> {
    const batch = await this.payrollService.getPayrollBatch(batchId);
    let generated = 0;
    const errors: string[] = [];

    for (const employee of batch.employees) {
      try {
        await this.generateEmployeePaySlip(batchId, employee);
        generated++;
      } catch (error: any) {
        errors.push(`${employee.organization_staff?.name}: ${error.message}`);
      }
    }

    return { generated, errors };
  }

  /**
   * Generate pay slip for individual employee
   */
  private async generateEmployeePaySlip(batchId: string, employee: any): Promise<void> {
    const paySlipData = {
      batch_id: batchId,
      employee_id: employee.employee_id,
      pay_period_start: employee.pay_period_start,
      pay_period_end: employee.pay_period_end,
      regular_hours: employee.regular_hours,
      overtime_hours: employee.overtime_hours,
      gross_pay: employee.gross_pay,
      tax: employee.tax,
      super_amount: employee.super_amount,
      deductions: employee.deductions,
      net_pay: employee.net_pay,
      generated_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from('employee_pay_slips')
      .insert(paySlipData);

    if (error) {
      throw new Error(`Failed to generate pay slip: ${error.message}`);
    }
  }

  // ============= XERO TIMESHEET SYNC =============

  /**
   * Sync timesheets to Xero before payrun
   */
  async syncTimesheetsToXero(batchId: string, batch: PayrollBatch): Promise<{
    synced: number;
    errors: string[];
  }> {
    let synced = 0;
    const errors: string[] = [];

    // Get timesheet data for pay period
    const { data: timesheetData } = await this.supabase
      .from('staff_timesheets')
      .select(`
        *,
        organization_staff(xero_employee_id, name)
      `)
      .gte('date', batch.pay_period_start)
      .lte('date', batch.pay_period_end);

    if (!timesheetData) {
      return { synced: 0, errors: ['No timesheet data found'] };
    }

    // Group timesheets by employee
    const employeeTimesheets = new Map();
    timesheetData.forEach(timesheet => {
      const empId = timesheet.organization_staff.xero_employee_id;
      if (!employeeTimesheets.has(empId)) {
        employeeTimesheets.set(empId, []);
      }
      employeeTimesheets.get(empId).push(timesheet);
    });

    // Sync each employee's timesheet to Xero
    for (const [xeroEmployeeId, timesheets] of employeeTimesheets) {
      try {
        const xeroTimesheet: Partial<XeroTimesheet> = {
          employeeID: xeroEmployeeId,
          startDate: batch.pay_period_start,
          endDate: batch.pay_period_end,
          status: 'APPROVED',
          timesheetLines: timesheets.map((ts: any) => ({
            date: ts.date,
            earningsRateID: await this.getDefaultEarningsRateId(),
            numberOfUnits: ts.hours_worked,
          })),
        };

        await this.xeroClient.createTimesheet(xeroTimesheet);
        synced++;

      } catch (error: any) {
        const employeeName = timesheets[0]?.organization_staff?.name || xeroEmployeeId;
        errors.push(`${employeeName}: ${error.message}`);
      }
    }

    return { synced, errors };
  }

  /**
   * Get default earnings rate ID from organization settings
   */
  private async getDefaultEarningsRateId(): Promise<string> {
    const { data } = await this.supabase
      .from('organization_settings')
      .select('xero_default_earnings_rate_id')
      .eq('organization_id', this.organizationId)
      .single();

    return data?.xero_default_earnings_rate_id || 'default-rate-id';
  }

  // ============= REPORTING =============

  /**
   * Generate comprehensive payrun reports
   */
  async generatePayrunReports(batchId: string): Promise<{ reports: string[]; errors: string[] }> {
    const reports: string[] = [];
    const errors: string[] = [];

    try {
      // Generate payroll register
      const payrollRegister = await this.payrollService.generateReport(batchId, 'payroll_register');
      await this.saveReport(batchId, 'payroll_register', payrollRegister);
      reports.push('Payroll Register');

      // Generate tax summary
      const taxSummary = await this.payrollService.generateReport(batchId, 'tax_summary');
      await this.saveReport(batchId, 'tax_summary', taxSummary);
      reports.push('Tax Summary');

      // Generate super summary
      const superSummary = await this.payrollService.generateReport(batchId, 'super_summary');
      await this.saveReport(batchId, 'super_summary', superSummary);
      reports.push('Superannuation Summary');

    } catch (error: any) {
      errors.push(`Report generation failed: ${error.message}`);
    }

    return { reports, errors };
  }

  /**
   * Save report to database
   */
  private async saveReport(batchId: string, reportType: string, reportData: any): Promise<void> {
    await this.supabase
      .from('payroll_reports')
      .insert({
        batch_id: batchId,
        report_type: reportType,
        report_data: reportData,
        generated_at: new Date().toISOString(),
      });
  }

  // ============= FINALIZATION =============

  /**
   * Finalize payrun processing
   */
  async finalizePayrun(batchId: string): Promise<{ finalized: boolean; notifications_sent: number }> {
    // Mark batch as completed
    await this.supabase
      .from('payroll_batches')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', batchId);

    // Send notifications to employees
    const notificationsSent = await this.sendPayrunNotifications(batchId);

    return {
      finalized: true,
      notifications_sent: notificationsSent,
    };
  }

  /**
   * Send payrun notifications to employees
   */
  private async sendPayrunNotifications(batchId: string): Promise<number> {
    const batch = await this.payrollService.getPayrollBatch(batchId);
    let notificationsSent = 0;

    for (const employee of batch.employees) {
      try {
        // Send email notification with pay slip
        await this.sendPaySlipNotification(employee);
        notificationsSent++;
      } catch (error) {
        console.error(`Failed to send notification to ${employee.employee_id}:`, error);
      }
    }

    return notificationsSent;
  }

  /**
   * Send pay slip notification to employee
   */
  private async sendPaySlipNotification(employee: any): Promise<void> {
    // TODO: Implement email notification with pay slip attachment
    console.log(`Sending pay slip notification to ${employee.organization_staff?.email}`);
  }

  // ============= JOB MANAGEMENT =============

  /**
   * Create processing job
   */
  private async createProcessingJob(
    batchId: string,
    options: any
  ): Promise<PayrunProcessingJob> {
    const steps: PayrunProcessingStep[] = [
      { id: '1', name: 'Validation', description: 'Validating payrun data', status: 'pending' },
      { id: '2', name: 'Timesheets', description: 'Processing timesheets', status: 'pending' },
      { id: '3', name: 'Calculations', description: 'Calculating payroll', status: 'pending' },
      { id: '4', name: 'Pay Slips', description: 'Generating pay slips', status: 'pending' },
      { id: '5', name: 'Xero Timesheets', description: 'Syncing timesheets to Xero', status: 'pending' },
      { id: '6', name: 'Xero Payrun', description: 'Creating Xero payrun', status: 'pending' },
      { id: '7', name: 'Reports', description: 'Generating reports', status: 'pending' },
      { id: '8', name: 'Finalization', description: 'Finalizing payrun', status: 'pending' },
    ];

    const { data, error } = await this.supabase
      .from('payroll_processing_jobs')
      .insert({
        batch_id: batchId,
        organization_id: this.organizationId,
        status: 'queued',
        priority: options.priority || 'medium',
        scheduled_for: options.scheduleFor,
        progress_percentage: 0,
        steps,
        errors: [],
        warnings: [],
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create processing job: ${error.message}`);
    }

    return data;
  }

  /**
   * Get processing job
   */
  async getProcessingJob(jobId: string): Promise<PayrunProcessingJob | null> {
    const { data, error } = await this.supabase
      .from('payroll_processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('Failed to get processing job:', error);
      return null;
    }

    return data;
  }

  /**
   * Update job status
   */
  private async updateJobStatus(jobId: string, status: PayrunProcessingJob['status']): Promise<void> {
    await this.supabase
      .from('payroll_processing_jobs')
      .update({
        status,
        started_at: status === 'processing' ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(jobId: string, percentage: number): Promise<void> {
    await this.supabase
      .from('payroll_processing_jobs')
      .update({
        progress_percentage: Math.round(percentage),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  /**
   * Update step status
   */
  private async updateStepStatus(
    jobId: string,
    stepIndex: number,
    status: PayrunProcessingStep['status'],
    errorMessage?: string,
    result?: any
  ): Promise<void> {
    const job = await this.getProcessingJob(jobId);
    if (!job) return;

    const steps = [...job.steps];
    steps[stepIndex] = {
      ...steps[stepIndex],
      status,
      started_at: status === 'processing' ? new Date().toISOString() : steps[stepIndex].started_at,
      completed_at: ['completed', 'error', 'skipped'].includes(status) ? new Date().toISOString() : undefined,
      error_message: errorMessage,
      result,
    };

    await this.supabase
      .from('payroll_processing_jobs')
      .update({
        steps,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  /**
   * Mark job as failed
   */
  private async markJobAsFailed(jobId: string, errorMessage: string): Promise<void> {
    const job = await this.getProcessingJob(jobId);
    if (!job) return;

    await this.supabase
      .from('payroll_processing_jobs')
      .update({
        status: 'failed',
        errors: [...job.errors, errorMessage],
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  /**
   * Complete processing job
   */
  private async completeProcessingJob(jobId: string, result: any): Promise<void> {
    await this.supabase
      .from('payroll_processing_jobs')
      .update({
        status: 'completed',
        result,
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  /**
   * Get processing jobs for organization
   */
  async getProcessingJobs(filters: {
    status?: string;
    limit?: number;
  } = {}): Promise<PayrunProcessingJob[]> {
    let query = this.supabase
      .from('payroll_processing_jobs')
      .select('*')
      .eq('organization_id', this.organizationId)
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get processing jobs:', error);
      return [];
    }

    return data || [];
  }
}