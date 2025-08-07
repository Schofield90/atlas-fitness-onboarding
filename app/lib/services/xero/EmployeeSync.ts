import { createClient } from '@supabase/supabase-js';
import { XeroClient, XeroEmployee } from './XeroClient';

export interface StaffMember {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  hourly_rate?: number;
  salary?: number;
  employment_type: 'full_time' | 'part_time' | 'casual' | 'contractor';
  status: 'active' | 'inactive' | 'terminated';
  start_date: string;
  end_date?: string;
  payroll_number?: string;
  tax_file_number?: string;
  super_fund?: string;
  bank_account?: string;
  xero_employee_id?: string;
  xero_synced: boolean;
  date_of_birth?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  emergency_contact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  created_at: string;
  updated_at: string;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  errors: string[];
  warnings: string[];
  created: string[];
  updated: string[];
  skipped: string[];
}

export interface EmployeeMappingResult {
  localEmployee: StaffMember;
  xeroEmployee?: XeroEmployee;
  syncStatus: 'synced' | 'needs_sync' | 'conflict' | 'error';
  differences?: string[];
  lastSynced?: string;
}

export class EmployeeSync {
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

  // ============= SYNC OPERATIONS =============

  /**
   * Sync all employees from local database to Xero
   */
  async syncAllEmployeesToXero(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      synced: 0,
      errors: [],
      warnings: [],
      created: [],
      updated: [],
      skipped: [],
    };

    try {
      // Get all active employees from local database
      const { data: employees, error } = await this.supabase
        .from('organization_staff')
        .select('*')
        .eq('organization_id', this.organizationId)
        .eq('status', 'active');

      if (error) {
        result.errors.push(`Failed to fetch employees: ${error.message}`);
        return result;
      }

      if (!employees || employees.length === 0) {
        result.warnings.push('No active employees found to sync');
        return result;
      }

      // Process each employee
      for (const employee of employees) {
        try {
          const syncResult = await this.syncEmployeeToXero(employee.id);
          
          if (syncResult.success) {
            result.synced++;
            if (syncResult.created) {
              result.created.push(employee.name);
            } else {
              result.updated.push(employee.name);
            }
          } else {
            result.errors.push(`${employee.name}: ${syncResult.error}`);
          }
        } catch (error: any) {
          result.errors.push(`${employee.name}: ${error.message}`);
        }
      }

      result.success = result.errors.length === 0;

      // Log sync operation
      await this.logSyncActivity('bulk_sync_to_xero', 
        `Synced ${result.synced}/${employees.length} employees to Xero`);

    } catch (error: any) {
      result.errors.push(`Sync operation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Sync single employee to Xero
   */
  async syncEmployeeToXero(employeeId: string): Promise<{
    success: boolean;
    created?: boolean;
    error?: string;
  }> {
    try {
      // Get employee from local database
      const { data: employee, error } = await this.supabase
        .from('organization_staff')
        .select('*')
        .eq('id', employeeId)
        .eq('organization_id', this.organizationId)
        .single();

      if (error || !employee) {
        return { success: false, error: 'Employee not found' };
      }

      // Check if employee already exists in Xero
      let xeroEmployee: XeroEmployee | null = null;
      let isUpdate = false;

      if (employee.xero_employee_id) {
        xeroEmployee = await this.xeroClient.getEmployee(employee.xero_employee_id);
        isUpdate = !!xeroEmployee;
      }

      // Prepare Xero employee data
      const xeroEmployeeData: Partial<XeroEmployee> = {
        firstName: employee.name.split(' ')[0],
        lastName: employee.name.split(' ').slice(1).join(' ') || employee.name.split(' ')[0],
        email: employee.email,
        status: employee.status === 'active' ? 'ACTIVE' : 'TERMINATED',
        startDate: employee.start_date,
        dateOfBirth: employee.date_of_birth,
        jobTitle: employee.position,
        payrollNumber: employee.payroll_number,
      };

      // Create or update employee in Xero
      if (isUpdate && employee.xero_employee_id) {
        xeroEmployee = await this.xeroClient.updateEmployee(employee.xero_employee_id, xeroEmployeeData);
      } else {
        xeroEmployee = await this.xeroClient.createEmployee(xeroEmployeeData);
        
        // Update local employee with Xero ID
        await this.supabase
          .from('organization_staff')
          .update({
            xero_employee_id: xeroEmployee.employeeID,
            xero_synced: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', employeeId);
      }

      await this.logSyncActivity('employee_synced',
        `Employee ${employee.name} ${isUpdate ? 'updated' : 'created'} in Xero`);

      return { success: true, created: !isUpdate };

    } catch (error: any) {
      await this.logSyncActivity('employee_sync_failed',
        `Failed to sync employee ${employeeId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync employees from Xero to local database
   */
  async syncEmployeesFromXero(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      synced: 0,
      errors: [],
      warnings: [],
      created: [],
      updated: [],
      skipped: [],
    };

    try {
      // Get all employees from Xero
      const xeroEmployees = await this.xeroClient.getEmployees();
      
      if (xeroEmployees.length === 0) {
        result.warnings.push('No employees found in Xero');
        return result;
      }

      // Get existing local employees for comparison
      const { data: localEmployees } = await this.supabase
        .from('organization_staff')
        .select('*')
        .eq('organization_id', this.organizationId);

      const localEmployeeMap = new Map(
        (localEmployees || []).map(emp => [emp.xero_employee_id, emp])
      );

      // Process each Xero employee
      for (const xeroEmployee of xeroEmployees) {
        try {
          const existingEmployee = localEmployeeMap.get(xeroEmployee.employeeID);

          if (existingEmployee) {
            // Update existing employee
            const updateResult = await this.updateLocalEmployee(existingEmployee.id, xeroEmployee);
            if (updateResult) {
              result.updated.push(xeroEmployee.firstName + ' ' + xeroEmployee.lastName);
              result.synced++;
            } else {
              result.skipped.push(xeroEmployee.firstName + ' ' + xeroEmployee.lastName);
            }
          } else {
            // Create new employee
            await this.createLocalEmployee(xeroEmployee);
            result.created.push(xeroEmployee.firstName + ' ' + xeroEmployee.lastName);
            result.synced++;
          }
        } catch (error: any) {
          result.errors.push(`${xeroEmployee.firstName} ${xeroEmployee.lastName}: ${error.message}`);
        }
      }

      result.success = result.errors.length === 0;

      await this.logSyncActivity('bulk_sync_from_xero',
        `Synced ${result.synced}/${xeroEmployees.length} employees from Xero`);

    } catch (error: any) {
      result.errors.push(`Failed to sync from Xero: ${error.message}`);
    }

    return result;
  }

  // ============= EMPLOYEE MAPPING =============

  /**
   * Get employee mapping status between local and Xero
   */
  async getEmployeeMappings(): Promise<EmployeeMappingResult[]> {
    const mappings: EmployeeMappingResult[] = [];

    try {
      // Get all local employees
      const { data: localEmployees, error } = await this.supabase
        .from('organization_staff')
        .select('*')
        .eq('organization_id', this.organizationId);

      if (error) {
        throw new Error(`Failed to fetch local employees: ${error.message}`);
      }

      // Get all Xero employees
      const xeroEmployees = await this.xeroClient.getEmployees();
      const xeroEmployeeMap = new Map(
        xeroEmployees.map(emp => [emp.employeeID, emp])
      );

      // Process each local employee
      for (const localEmployee of localEmployees || []) {
        const mapping: EmployeeMappingResult = {
          localEmployee,
          syncStatus: 'needs_sync',
          differences: [],
        };

        if (localEmployee.xero_employee_id) {
          const xeroEmployee = xeroEmployeeMap.get(localEmployee.xero_employee_id);
          
          if (xeroEmployee) {
            mapping.xeroEmployee = xeroEmployee;
            mapping.syncStatus = 'synced';
            
            // Check for differences
            const differences = this.compareEmployeeData(localEmployee, xeroEmployee);
            if (differences.length > 0) {
              mapping.syncStatus = 'conflict';
              mapping.differences = differences;
            }
          } else {
            mapping.syncStatus = 'error';
            mapping.differences = ['Xero employee not found'];
          }
        }

        mappings.push(mapping);
      }

      // Add Xero employees that don't exist locally
      for (const xeroEmployee of xeroEmployees) {
        const existsLocally = (localEmployees || []).some(
          emp => emp.xero_employee_id === xeroEmployee.employeeID
        );

        if (!existsLocally) {
          mappings.push({
            localEmployee: null as any,
            xeroEmployee,
            syncStatus: 'needs_sync',
            differences: ['Employee exists in Xero but not locally'],
          });
        }
      }

    } catch (error: any) {
      console.error('Failed to get employee mappings:', error);
    }

    return mappings;
  }

  /**
   * Compare local employee data with Xero employee data
   */
  private compareEmployeeData(localEmployee: StaffMember, xeroEmployee: XeroEmployee): string[] {
    const differences: string[] = [];

    // Name comparison
    const localFullName = localEmployee.name;
    const xeroFullName = `${xeroEmployee.firstName} ${xeroEmployee.lastName}`;
    if (localFullName !== xeroFullName) {
      differences.push(`Name: Local="${localFullName}", Xero="${xeroFullName}"`);
    }

    // Email comparison
    if (localEmployee.email !== xeroEmployee.email) {
      differences.push(`Email: Local="${localEmployee.email}", Xero="${xeroEmployee.email}"`);
    }

    // Status comparison
    const localStatus = localEmployee.status === 'active' ? 'ACTIVE' : 'TERMINATED';
    if (localStatus !== xeroEmployee.status) {
      differences.push(`Status: Local="${localStatus}", Xero="${xeroEmployee.status}"`);
    }

    // Start date comparison
    if (localEmployee.start_date !== xeroEmployee.startDate) {
      differences.push(`Start Date: Local="${localEmployee.start_date}", Xero="${xeroEmployee.startDate}"`);
    }

    return differences;
  }

  // ============= EMPLOYEE CREATION/UPDATE =============

  /**
   * Create local employee from Xero data
   */
  private async createLocalEmployee(xeroEmployee: XeroEmployee): Promise<void> {
    const { error } = await this.supabase
      .from('organization_staff')
      .insert({
        organization_id: this.organizationId,
        name: `${xeroEmployee.firstName} ${xeroEmployee.lastName}`,
        email: xeroEmployee.email,
        position: xeroEmployee.jobTitle,
        employment_type: 'full_time', // Default, should be configurable
        status: xeroEmployee.status === 'ACTIVE' ? 'active' : 'terminated',
        start_date: xeroEmployee.startDate,
        date_of_birth: xeroEmployee.dateOfBirth,
        payroll_number: xeroEmployee.payrollNumber,
        xero_employee_id: xeroEmployee.employeeID,
        xero_synced: true,
      });

    if (error) {
      throw new Error(`Failed to create local employee: ${error.message}`);
    }
  }

  /**
   * Update local employee with Xero data
   */
  private async updateLocalEmployee(employeeId: string, xeroEmployee: XeroEmployee): Promise<boolean> {
    const updates: any = {
      name: `${xeroEmployee.firstName} ${xeroEmployee.lastName}`,
      email: xeroEmployee.email,
      position: xeroEmployee.jobTitle,
      status: xeroEmployee.status === 'ACTIVE' ? 'active' : 'terminated',
      start_date: xeroEmployee.startDate,
      date_of_birth: xeroEmployee.dateOfBirth,
      payroll_number: xeroEmployee.payrollNumber,
      xero_synced: true,
      updated_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from('organization_staff')
      .update(updates)
      .eq('id', employeeId);

    if (error) {
      throw new Error(`Failed to update local employee: ${error.message}`);
    }

    return true;
  }

  // ============= CONFLICT RESOLUTION =============

  /**
   * Resolve sync conflicts by choosing data source
   */
  async resolveConflict(
    employeeId: string, 
    resolution: 'use_local' | 'use_xero' | 'manual',
    manualData?: Partial<StaffMember>
  ): Promise<void> {
    const { data: employee } = await this.supabase
      .from('organization_staff')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (!employee) {
      throw new Error('Employee not found');
    }

    if (resolution === 'use_local') {
      // Sync local data to Xero
      await this.syncEmployeeToXero(employeeId);
    } else if (resolution === 'use_xero' && employee.xero_employee_id) {
      // Sync Xero data to local
      const xeroEmployee = await this.xeroClient.getEmployee(employee.xero_employee_id);
      if (xeroEmployee) {
        await this.updateLocalEmployee(employeeId, xeroEmployee);
      }
    } else if (resolution === 'manual' && manualData) {
      // Apply manual changes to both systems
      await this.supabase
        .from('organization_staff')
        .update({
          ...manualData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employeeId);

      // Sync manual changes to Xero
      await this.syncEmployeeToXero(employeeId);
    }

    await this.logSyncActivity('conflict_resolved',
      `Resolved sync conflict for employee ${employee.name} using ${resolution}`);
  }

  // ============= UTILITIES =============

  /**
   * Test Xero connection for employee sync
   */
  async testXeroConnection(): Promise<{
    connected: boolean;
    employeeCount?: number;
    error?: string;
  }> {
    try {
      const employees = await this.xeroClient.getEmployees();
      return {
        connected: true,
        employeeCount: employees.length,
      };
    } catch (error: any) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * Get sync status for organization
   */
  async getSyncStatus(): Promise<{
    totalEmployees: number;
    syncedEmployees: number;
    unsyncedEmployees: number;
    lastSyncDate?: string;
    conflicts: number;
  }> {
    const { data: employees } = await this.supabase
      .from('organization_staff')
      .select('id, xero_synced, updated_at')
      .eq('organization_id', this.organizationId);

    const totalEmployees = employees?.length || 0;
    const syncedEmployees = employees?.filter(emp => emp.xero_synced).length || 0;
    const unsyncedEmployees = totalEmployees - syncedEmployees;

    // Get last sync date
    const { data: lastSyncLog } = await this.supabase
      .from('employee_sync_log')
      .select('created_at')
      .eq('organization_id', this.organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get conflicts count by checking mappings
    const mappings = await this.getEmployeeMappings();
    const conflicts = mappings.filter(m => m.syncStatus === 'conflict').length;

    return {
      totalEmployees,
      syncedEmployees,
      unsyncedEmployees,
      lastSyncDate: lastSyncLog?.created_at,
      conflicts,
    };
  }

  /**
   * Log sync activity
   */
  private async logSyncActivity(action: string, description: string): Promise<void> {
    await this.supabase
      .from('employee_sync_log')
      .insert({
        organization_id: this.organizationId,
        action,
        description,
        created_at: new Date().toISOString(),
      });
  }

  /**
   * Get sync history
   */
  async getSyncHistory(limit: number = 50): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('employee_sync_log')
      .select('*')
      .eq('organization_id', this.organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get sync history:', error);
      return [];
    }

    return data || [];
  }
}