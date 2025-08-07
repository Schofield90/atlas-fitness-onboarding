import { NextRequest, NextResponse } from 'next/server';
import { EmployeeSync } from '@/app/lib/services/xero/EmployeeSync';
import { XeroClient } from '@/app/lib/services/xero/XeroClient';
import { PayrollService } from '@/app/lib/services/xero/PayrollService';

// POST /api/payroll/sync-xero - Sync with Xero
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      action,
      ...actionData
    } = body;

    if (!organizationId || !action) {
      return NextResponse.json(
        { success: false, error: 'Organization ID and action are required' },
        { status: 400 }
      );
    }

    const employeeSync = new EmployeeSync(organizationId);
    const xeroClient = new XeroClient(organizationId);
    const payrollService = new PayrollService(organizationId);

    switch (action) {
      case 'test_connection':
        const connectionTest = await xeroClient.testConnection();
        return NextResponse.json({
          success: connectionTest,
          data: { connected: connectionTest },
          message: connectionTest ? 'Xero connection successful' : 'Xero connection failed',
        });

      case 'get_organisations':
        const organisations = await xeroClient.getOrganisations();
        return NextResponse.json({
          success: true,
          data: organisations,
        });

      case 'sync_employees_to_xero':
        const syncToXeroResult = await employeeSync.syncAllEmployeesToXero();
        return NextResponse.json({
          success: syncToXeroResult.success,
          data: syncToXeroResult,
          message: `Synced ${syncToXeroResult.synced} employees to Xero`,
        });

      case 'sync_employees_from_xero':
        const syncFromXeroResult = await employeeSync.syncEmployeesFromXero();
        return NextResponse.json({
          success: syncFromXeroResult.success,
          data: syncFromXeroResult,
          message: `Synced ${syncFromXeroResult.synced} employees from Xero`,
        });

      case 'sync_single_employee':
        if (!actionData.employeeId) {
          return NextResponse.json(
            { success: false, error: 'Employee ID is required' },
            { status: 400 }
          );
        }
        const singleSyncResult = await employeeSync.syncEmployeeToXero(actionData.employeeId);
        return NextResponse.json({
          success: singleSyncResult.success,
          data: singleSyncResult,
          message: singleSyncResult.success 
            ? 'Employee synced to Xero successfully' 
            : `Employee sync failed: ${singleSyncResult.error}`,
        });

      case 'get_employee_mappings':
        const mappings = await employeeSync.getEmployeeMappings();
        return NextResponse.json({
          success: true,
          data: mappings,
        });

      case 'resolve_conflict':
        if (!actionData.employeeId || !actionData.resolution) {
          return NextResponse.json(
            { success: false, error: 'Employee ID and resolution method are required' },
            { status: 400 }
          );
        }
        await employeeSync.resolveConflict(
          actionData.employeeId,
          actionData.resolution,
          actionData.manualData
        );
        return NextResponse.json({
          success: true,
          message: 'Conflict resolved successfully',
        });

      case 'sync_batch_to_xero':
        if (!actionData.batchId) {
          return NextResponse.json(
            { success: false, error: 'Batch ID is required' },
            { status: 400 }
          );
        }
        const batchSyncResult = await payrollService.syncToXero(actionData.batchId);
        return NextResponse.json({
          success: batchSyncResult.success,
          data: batchSyncResult,
          message: batchSyncResult.success 
            ? `Batch synced to Xero with payrun ID: ${batchSyncResult.xeroPayrunId}`
            : 'Batch sync to Xero failed',
        });

      case 'get_xero_employees':
        const xeroEmployees = await xeroClient.getEmployees();
        return NextResponse.json({
          success: true,
          data: xeroEmployees,
        });

      case 'get_xero_payruns':
        const startDate = actionData.startDate;
        const endDate = actionData.endDate;
        const xeroPayruns = await xeroClient.getPayruns(startDate, endDate);
        return NextResponse.json({
          success: true,
          data: xeroPayruns,
        });

      case 'get_xero_timesheets':
        const timesheets = await xeroClient.getTimesheets(
          actionData.startDate,
          actionData.endDate,
          actionData.employeeId
        );
        return NextResponse.json({
          success: true,
          data: timesheets,
        });

      case 'get_payroll_calendars':
        const calendars = await xeroClient.getPayrollCalendars();
        return NextResponse.json({
          success: true,
          data: calendars,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action specified' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Error in Xero sync:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET /api/payroll/sync-xero - Get sync status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const type = searchParams.get('type');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const employeeSync = new EmployeeSync(organizationId);

    switch (type) {
      case 'status':
        const status = await employeeSync.getSyncStatus();
        return NextResponse.json({
          success: true,
          data: status,
        });

      case 'connection':
        const connectionStatus = await employeeSync.testXeroConnection();
        return NextResponse.json({
          success: true,
          data: connectionStatus,
        });

      case 'history':
        const limit = parseInt(searchParams.get('limit') || '50');
        const history = await employeeSync.getSyncHistory(limit);
        return NextResponse.json({
          success: true,
          data: history,
        });

      case 'mappings':
        const mappings = await employeeSync.getEmployeeMappings();
        return NextResponse.json({
          success: true,
          data: mappings,
        });

      default:
        // Default to sync status
        const defaultStatus = await employeeSync.getSyncStatus();
        return NextResponse.json({
          success: true,
          data: defaultStatus,
        });
    }

  } catch (error: any) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}