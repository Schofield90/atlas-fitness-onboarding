import { NextRequest, NextResponse } from "next/server";
import { PayrunProcessor } from "@/app/lib/services/xero/PayrunProcessor";
import { PayrollService } from "@/app/lib/services/xero/PayrollService";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// POST /api/payroll/process - Process payroll batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, batchId, action, options = {} } = body;

    if (!organizationId || !batchId || !action) {
      return NextResponse.json(
        {
          success: false,
          error: "Organization ID, batch ID, and action are required",
        },
        { status: 400 },
      );
    }

    const payrunProcessor = new PayrunProcessor(organizationId);
    const payrollService = new PayrollService(organizationId);

    switch (action) {
      case "validate":
        const validation = await payrunProcessor.validatePayrun(batchId);
        return NextResponse.json({
          success: true,
          data: validation,
          message: validation.valid
            ? "Payrun validation passed"
            : "Payrun validation failed",
        });

      case "import_timesheets":
        const timesheetResult = await payrollService.importTimesheets(batchId);
        return NextResponse.json({
          success: timesheetResult.errors.length === 0,
          data: timesheetResult,
          message: `Imported timesheets for ${timesheetResult.imported} employees`,
        });

      case "calculate":
        const calculationResult =
          await payrollService.calculatePayroll(batchId);
        return NextResponse.json({
          success: calculationResult.success,
          data: calculationResult,
          message: calculationResult.success
            ? "Payroll calculations completed successfully"
            : "Payroll calculations failed",
        });

      case "process_full":
        // Start full payroll processing
        const processingJob = await payrunProcessor.processPayrollBatch(
          batchId,
          options,
        );
        return NextResponse.json({
          success: true,
          data: {
            jobId: processingJob.id,
            status: processingJob.status,
            progress: processingJob.progress_percentage,
          },
          message: "Payroll processing started",
        });

      case "get_job_status":
        if (!options.jobId) {
          return NextResponse.json(
            { success: false, error: "Job ID is required for status check" },
            { status: 400 },
          );
        }
        const job = await payrunProcessor.getProcessingJob(options.jobId);
        if (!job) {
          return NextResponse.json(
            { success: false, error: "Processing job not found" },
            { status: 404 },
          );
        }
        return NextResponse.json({
          success: true,
          data: job,
        });

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action specified" },
          { status: 400 },
        );
    }
  } catch (error: any) {
    console.error("Error processing payroll:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// GET /api/payroll/process - Get processing jobs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    const payrunProcessor = new PayrunProcessor(organizationId);
    const jobs = await payrunProcessor.getProcessingJobs({
      status: status || undefined,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: jobs,
    });
  } catch (error: any) {
    console.error("Error fetching processing jobs:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
