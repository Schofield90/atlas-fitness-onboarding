import { NextRequest, NextResponse } from "next/server";
import { PayrollService } from "@/app/lib/services/xero/PayrollService";
import { createClient } from "@supabase/supabase-js";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

function getSupabaseClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error("Supabase credentials not configured");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

// GET /api/payroll/reports - Get payroll reports
export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const batchId = searchParams.get("batchId");
    const reportType = searchParams.get("reportType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // If specific batch report is requested
    if (batchId && reportType) {
      const payrollService = new PayrollService(organizationId);
      const report = await payrollService.generateReport(
        batchId,
        reportType as any,
      );

      return NextResponse.json({
        success: true,
        data: report,
      });
    }

    // Get all reports for organization
    let query = supabase
      .from("payroll_reports")
      .select(
        `
        *,
        payroll_batches!inner(name, pay_period_start, pay_period_end, status)
      `,
      )
      .eq("payroll_batches.organization_id", organizationId)
      .order("generated_at", { ascending: false });

    if (startDate) {
      query = query.gte("payroll_batches.pay_period_start", startDate);
    }

    if (endDate) {
      query = query.lte("payroll_batches.pay_period_end", endDate);
    }

    const { data: reports, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch reports: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: reports || [],
    });
  } catch (error: any) {
    console.error("Error fetching payroll reports:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// POST /api/payroll/reports - Generate payroll report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, batchId, reportType, customParams = {} } = body;

    if (!organizationId || !batchId || !reportType) {
      return NextResponse.json(
        {
          success: false,
          error: "Organization ID, batch ID, and report type are required",
        },
        { status: 400 },
      );
    }

    const validReportTypes = [
      "payroll_register",
      "tax_summary",
      "super_summary",
      "cost_centre",
      "pay_advice",
      "banking_file",
      "audit_report",
    ];

    if (!validReportTypes.includes(reportType)) {
      return NextResponse.json(
        { success: false, error: "Invalid report type" },
        { status: 400 },
      );
    }

    const payrollService = new PayrollService(organizationId);

    let report;
    switch (reportType) {
      case "banking_file":
        report = await generateBankingFile(organizationId, batchId);
        break;

      case "audit_report":
        report = await generateAuditReport(organizationId, batchId);
        break;

      case "cost_centre":
        report = await generateCostCentreReport(
          organizationId,
          batchId,
          customParams,
        );
        break;

      case "pay_advice":
        report = await generatePayAdviceReport(
          organizationId,
          batchId,
          customParams.employeeId,
        );
        break;

      default:
        report = await payrollService.generateReport(batchId, reportType);
    }

    // Save report to database
    const { data: savedReport, error } = await supabase
      .from("payroll_reports")
      .insert({
        batch_id: batchId,
        report_type: reportType,
        report_data: report.data,
        generated_at: new Date().toISOString(),
        generated_by: customParams.userId || "system",
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to save report:", error);
    }

    return NextResponse.json({
      success: true,
      data: report,
      reportId: savedReport?.id,
      message: `${reportType} report generated successfully`,
    });
  } catch (error: any) {
    console.error("Error generating payroll report:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// Helper functions for specialized reports

async function generateBankingFile(
  organizationId: string,
  batchId: string,
): Promise<any> {
  const { data: batch, error: batchError } = await supabase
    .from("payroll_batches")
    .select(
      `
      *,
      payroll_batch_employees(*,
        organization_staff(name, bank_account, bsb_number)
      )
    `,
    )
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    throw new Error("Batch not found");
  }

  const bankingEntries = batch.payroll_batch_employees
    .filter(
      (emp: any) => emp.organization_staff?.bank_account && emp.net_pay > 0,
    )
    .map((emp: any) => ({
      employeeName: emp.organization_staff.name,
      bankAccount: emp.organization_staff.bank_account,
      bsbNumber: emp.organization_staff.bsb_number,
      amount: emp.net_pay,
      reference: `Payroll ${batch.name} - ${emp.organization_staff.name}`,
    }));

  const totalAmount = bankingEntries.reduce(
    (sum: number, entry: any) => sum + entry.amount,
    0,
  );

  return {
    batch_id: batchId,
    report_type: "banking_file",
    data: {
      batch_name: batch.name,
      payment_date: batch.payment_date,
      total_amount: totalAmount,
      employee_count: bankingEntries.length,
      entries: bankingEntries,
    },
    generated_at: new Date().toISOString(),
    generated_by: "system",
  };
}

async function generateAuditReport(
  organizationId: string,
  batchId: string,
): Promise<any> {
  // Get batch with all related data
  const { data: batch } = await supabase
    .from("payroll_batches")
    .select(
      `
      *,
      payroll_batch_employees(*,
        organization_staff(name, email)
      )
    `,
    )
    .eq("id", batchId)
    .single();

  // Get activity logs
  const { data: activityLogs } = await supabase
    .from("payroll_activity_log")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });

  // Get processing jobs
  const { data: processingJobs } = await supabase
    .from("payroll_processing_jobs")
    .select("*")
    .eq("batch_id", batchId);

  return {
    batch_id: batchId,
    report_type: "audit_report",
    data: {
      batch_summary: {
        name: batch?.name,
        status: batch?.status,
        created_at: batch?.created_at,
        processed_at: batch?.processed_at,
        approved_by: batch?.approved_by,
        approved_at: batch?.approved_at,
      },
      processing_history: processingJobs || [],
      activity_log: activityLogs || [],
      employee_summary:
        batch?.payroll_batch_employees?.map((emp: any) => ({
          name: emp.organization_staff?.name,
          status: emp.status,
          gross_pay: emp.gross_pay,
          net_pay: emp.net_pay,
        })) || [],
    },
    generated_at: new Date().toISOString(),
    generated_by: "system",
  };
}

async function generateCostCentreReport(
  organizationId: string,
  batchId: string,
  params: { costCentres?: string[] },
): Promise<any> {
  const { data: batch } = await supabase
    .from("payroll_batches")
    .select(
      `
      *,
      payroll_batch_employees(*,
        organization_staff(name, department, cost_centre)
      )
    `,
    )
    .eq("id", batchId)
    .single();

  // Group by cost centre
  const costCentres: { [key: string]: any } = {};

  batch?.payroll_batch_employees?.forEach((emp: any) => {
    const costCentre = emp.organization_staff?.cost_centre || "Unassigned";

    if (!costCentres[costCentre]) {
      costCentres[costCentre] = {
        name: costCentre,
        employee_count: 0,
        total_gross_pay: 0,
        total_net_pay: 0,
        employees: [],
      };
    }

    costCentres[costCentre].employee_count++;
    costCentres[costCentre].total_gross_pay += emp.gross_pay || 0;
    costCentres[costCentre].total_net_pay += emp.net_pay || 0;
    costCentres[costCentre].employees.push({
      name: emp.organization_staff?.name,
      department: emp.organization_staff?.department,
      gross_pay: emp.gross_pay,
      net_pay: emp.net_pay,
    });
  });

  return {
    batch_id: batchId,
    report_type: "cost_centre",
    data: {
      batch_name: batch?.name,
      pay_period: `${batch?.pay_period_start} to ${batch?.pay_period_end}`,
      cost_centres: Object.values(costCentres),
    },
    generated_at: new Date().toISOString(),
    generated_by: "system",
  };
}

async function generatePayAdviceReport(
  organizationId: string,
  batchId: string,
  employeeId?: string,
): Promise<any> {
  let query = supabase
    .from("payroll_batch_employees")
    .select(
      `
      *,
      payroll_batches!inner(name, pay_period_start, pay_period_end, payment_date),
      organization_staff!inner(name, email, employee_number, address)
    `,
    )
    .eq("batch_id", batchId);

  if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }

  const { data: employees } = await query;

  const payAdvices =
    employees?.map((emp: any) => ({
      employee: {
        name: emp.organization_staff.name,
        email: emp.organization_staff.email,
        employee_number: emp.organization_staff.employee_number,
      },
      pay_period: {
        start: emp.payroll_batches.pay_period_start,
        end: emp.payroll_batches.pay_period_end,
        payment_date: emp.payroll_batches.payment_date,
      },
      earnings: {
        regular_hours: emp.regular_hours,
        overtime_hours: emp.overtime_hours,
        gross_pay: emp.gross_pay,
      },
      deductions: {
        tax: emp.tax,
        super_amount: emp.super_amount,
        other_deductions: emp.deductions,
      },
      net_pay: emp.net_pay,
    })) || [];

  return {
    batch_id: batchId,
    report_type: "pay_advice",
    data: {
      pay_advices: payAdvices,
      batch_name: employees?.[0]?.payroll_batches?.name,
    },
    generated_at: new Date().toISOString(),
    generated_by: "system",
  };
}
