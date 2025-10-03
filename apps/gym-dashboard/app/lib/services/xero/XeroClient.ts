import { createClient } from '@supabase/supabase-js';

export interface XeroConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface XeroToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
  scope: string;
}

export interface XeroEmployee {
  employeeID: string;
  firstName: string;
  lastName: string;
  email: string;
  payrollNumber: string;
  status: 'ACTIVE' | 'TERMINATED';
  startDate: string;
  dateOfBirth?: string;
  gender?: string;
  jobTitle?: string;
  classification?: string;
  ordinaryEarningsRateID?: string;
  payTemplate?: {
    payTemplateID: string;
    earningsLines: any[];
    deductionLines: any[];
    leaveLines: any[];
  };
}

export interface XeroPayrun {
  payrunID: string;
  payrollCalendarID: string;
  periodStartDate: string;
  periodEndDate: string;
  paymentDate: string;
  wages: number;
  deductions: number;
  tax: number;
  super: number;
  netPay: number;
  payrunStatus: 'DRAFT' | 'POSTED' | 'PAID';
  payslips: XeroPayslip[];
}

export interface XeroPayslip {
  payslipID: string;
  employeeID: string;
  payrunID: string;
  lastEdited: string;
  wages: number;
  deductions: number;
  tax: number;
  super: number;
  netPay: number;
  earningsLines: XeroEarningsLine[];
  deductionLines: XeroDeductionLine[];
  leaveEarningsLines: any[];
  timesheetEarningsLines: XeroTimesheetEarningsLine[];
}

export interface XeroEarningsLine {
  earningsRateID: string;
  displayName: string;
  ratePerUnit: number;
  numberOfUnits: number;
  amount: number;
  isLinkedToTimesheet: boolean;
}

export interface XeroDeductionLine {
  deductionTypeID: string;
  displayName: string;
  amount: number;
  percentage?: number;
}

export interface XeroTimesheetEarningsLine {
  earningsRateID: string;
  ratePerUnit: number;
  numberOfUnits: number;
  amount: number;
}

export interface XeroTimesheetLine {
  timesheetLineID: string;
  date: string;
  earningsRateID: string;
  numberOfUnits: number;
  trackingItemID?: string;
}

export interface XeroTimesheet {
  timesheetID: string;
  employeeID: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'PROCESSED' | 'APPROVED';
  totalHours: number;
  updatedDateUTC: string;
  timesheetLines: XeroTimesheetLine[];
}

export interface XeroPayrollCalendar {
  payrollCalendarID: string;
  name: string;
  calendarType: 'WEEKLY' | 'FORTNIGHTLY' | 'FOURWEEKLY' | 'MONTHLY' | 'TWICEMONTHLY' | 'QUARTERLY';
  startDate: string;
  paymentDate: string;
  updatedDateUTC: string;
}

export class XeroClient {
  private baseUrl = 'https://api.xero.com';
  private supabase;
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Get stored Xero access token for organization
   */
  async getAccessToken(): Promise<XeroToken | null> {
    const { data, error } = await this.supabase
      .from('xero_tokens')
      .select('*')
      .eq('organization_id', this.organizationId)
      .single();

    if (error || !data) {
      console.error('Failed to get Xero token:', error);
      return null;
    }

    // Check if token is expired and needs refresh
    if (Date.now() >= data.expires_at) {
      return await this.refreshAccessToken(data);
    }

    return data;
  }

  /**
   * Refresh expired access token
   */
  private async refreshAccessToken(tokenData: any): Promise<XeroToken | null> {
    try {
      const response = await fetch('https://identity.xero.com/connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(
            `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokenData.refresh_token,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const newToken = await response.json();
      const expiresAt = Date.now() + (newToken.expires_in * 1000);

      const updatedToken = {
        access_token: newToken.access_token,
        refresh_token: newToken.refresh_token || tokenData.refresh_token,
        expires_at: expiresAt,
        token_type: newToken.token_type,
        scope: newToken.scope,
      };

      // Update token in database
      await this.supabase
        .from('xero_tokens')
        .update(updatedToken)
        .eq('organization_id', this.organizationId);

      return updatedToken;
    } catch (error) {
      console.error('Failed to refresh Xero token:', error);
      return null;
    }
  }

  /**
   * Make authenticated request to Xero API
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<T> {
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error('No valid Xero access token available');
    }

    const tenantId = await this.getTenantId();
    if (!tenantId) {
      throw new Error('No Xero tenant ID available');
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token.access_token}`,
      'Xero-tenant-id': tenantId,
      'Accept': 'application/json',
    };

    if (data) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Xero API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get Xero tenant ID for organization
   */
  private async getTenantId(): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('xero_tokens')
      .select('tenant_id')
      .eq('organization_id', this.organizationId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.tenant_id;
  }

  // ============= EMPLOYEES =============

  /**
   * Get all employees from Xero
   */
  async getEmployees(): Promise<XeroEmployee[]> {
    const response = await this.makeRequest<{ employees: XeroEmployee[] }>('/payroll.xro/1.0/employees');
    return response.employees || [];
  }

  /**
   * Get specific employee by ID
   */
  async getEmployee(employeeId: string): Promise<XeroEmployee | null> {
    try {
      const response = await this.makeRequest<{ employees: XeroEmployee[] }>(`/payroll.xro/1.0/employees/${employeeId}`);
      return response.employees?.[0] || null;
    } catch (error) {
      console.error(`Failed to get employee ${employeeId}:`, error);
      return null;
    }
  }

  /**
   * Create new employee in Xero
   */
  async createEmployee(employee: Partial<XeroEmployee>): Promise<XeroEmployee> {
    const response = await this.makeRequest<{ employees: XeroEmployee[] }>(
      '/payroll.xro/1.0/employees',
      'POST',
      { employees: [employee] }
    );
    return response.employees[0];
  }

  /**
   * Update existing employee in Xero
   */
  async updateEmployee(employeeId: string, employee: Partial<XeroEmployee>): Promise<XeroEmployee> {
    const response = await this.makeRequest<{ employees: XeroEmployee[] }>(
      `/payroll.xro/1.0/employees/${employeeId}`,
      'POST',
      { employees: [employee] }
    );
    return response.employees[0];
  }

  // ============= TIMESHEETS =============

  /**
   * Get timesheets for date range
   */
  async getTimesheets(startDate?: string, endDate?: string, employeeId?: string): Promise<XeroTimesheet[]> {
    let endpoint = '/payroll.xro/1.0/timesheets';
    const params = new URLSearchParams();

    if (startDate) params.append('where', `StartDate >= DateTime.Parse("${startDate}")`);
    if (endDate) {
      const whereClause = params.get('where');
      const endDateClause = `EndDate <= DateTime.Parse("${endDate}")`;
      params.set('where', whereClause ? `${whereClause} AND ${endDateClause}` : endDateClause);
    }
    if (employeeId) {
      const whereClause = params.get('where');
      const employeeClause = `EmployeeID == Guid("${employeeId}")`;
      params.set('where', whereClause ? `${whereClause} AND ${employeeClause}` : employeeClause);
    }

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const response = await this.makeRequest<{ timesheets: XeroTimesheet[] }>(endpoint);
    return response.timesheets || [];
  }

  /**
   * Create timesheet in Xero
   */
  async createTimesheet(timesheet: Partial<XeroTimesheet>): Promise<XeroTimesheet> {
    const response = await this.makeRequest<{ timesheets: XeroTimesheet[] }>(
      '/payroll.xro/1.0/timesheets',
      'POST',
      { timesheets: [timesheet] }
    );
    return response.timesheets[0];
  }

  /**
   * Update timesheet in Xero
   */
  async updateTimesheet(timesheetId: string, timesheet: Partial<XeroTimesheet>): Promise<XeroTimesheet> {
    const response = await this.makeRequest<{ timesheets: XeroTimesheet[] }>(
      `/payroll.xro/1.0/timesheets/${timesheetId}`,
      'POST',
      { timesheets: [timesheet] }
    );
    return response.timesheets[0];
  }

  // ============= PAYRUNS =============

  /**
   * Get payruns for date range
   */
  async getPayruns(startDate?: string, endDate?: string): Promise<XeroPayrun[]> {
    let endpoint = '/payroll.xro/1.0/payruns';
    const params = new URLSearchParams();

    if (startDate) params.append('where', `PeriodStartDate >= DateTime.Parse("${startDate}")`);
    if (endDate) {
      const whereClause = params.get('where');
      const endDateClause = `PeriodEndDate <= DateTime.Parse("${endDate}")`;
      params.set('where', whereClause ? `${whereClause} AND ${endDateClause}` : endDateClause);
    }

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const response = await this.makeRequest<{ payruns: XeroPayrun[] }>(endpoint);
    return response.payruns || [];
  }

  /**
   * Get specific payrun by ID
   */
  async getPayrun(payrunId: string): Promise<XeroPayrun | null> {
    try {
      const response = await this.makeRequest<{ payruns: XeroPayrun[] }>(`/payroll.xro/1.0/payruns/${payrunId}`);
      return response.payruns?.[0] || null;
    } catch (error) {
      console.error(`Failed to get payrun ${payrunId}:`, error);
      return null;
    }
  }

  /**
   * Create new payrun in Xero
   */
  async createPayrun(payrun: Partial<XeroPayrun>): Promise<XeroPayrun> {
    const response = await this.makeRequest<{ payruns: XeroPayrun[] }>(
      '/payroll.xro/1.0/payruns',
      'POST',
      { payruns: [payrun] }
    );
    return response.payruns[0];
  }

  /**
   * Update payrun in Xero
   */
  async updatePayrun(payrunId: string, payrun: Partial<XeroPayrun>): Promise<XeroPayrun> {
    const response = await this.makeRequest<{ payruns: XeroPayrun[] }>(
      `/payroll.xro/1.0/payruns/${payrunId}`,
      'POST',
      { payruns: [payrun] }
    );
    return response.payruns[0];
  }

  /**
   * Get payslips for a payrun
   */
  async getPayslips(payrunId: string): Promise<XeroPayslip[]> {
    const response = await this.makeRequest<{ payslips: XeroPayslip[] }>(`/payroll.xro/1.0/payslips?PayrunID=${payrunId}`);
    return response.payslips || [];
  }

  // ============= PAYROLL CALENDARS =============

  /**
   * Get all payroll calendars
   */
  async getPayrollCalendars(): Promise<XeroPayrollCalendar[]> {
    const response = await this.makeRequest<{ payrollCalendars: XeroPayrollCalendar[] }>('/payroll.xro/1.0/payrollcalendars');
    return response.payrollCalendars || [];
  }

  // ============= UTILITY METHODS =============

  /**
   * Test connection to Xero API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/payroll.xro/1.0/employees');
      return true;
    } catch (error) {
      console.error('Xero connection test failed:', error);
      return false;
    }
  }

  /**
   * Get organization info from Xero
   */
  async getOrganisations(): Promise<any[]> {
    try {
      const response = await this.makeRequest<{ organisations: any[] }>('/api.xro/2.0/organisation');
      return response.organisations || [];
    } catch (error) {
      console.error('Failed to get organisations:', error);
      return [];
    }
  }
}