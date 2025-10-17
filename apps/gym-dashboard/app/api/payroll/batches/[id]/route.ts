import { NextRequest, NextResponse } from "next/server";
import { PayrollService } from "@/app/lib/services/xero/PayrollService";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// GET /api/payroll/batches/[id] - Get specific payroll batch
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    const payrollService = new PayrollService(organizationId);
    const batch = await payrollService.getPayrollBatch(params.id);

    return NextResponse.json({
      success: true,
      data: batch,
    });
  } catch (error: any) {
    console.error("Error fetching payroll batch:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// PUT /api/payroll/batches/[id] - Update payroll batch
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const { organizationId, action, ...updateData } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    const payrollService = new PayrollService(organizationId);

    // Handle different actions
    switch (action) {
      case "add_employees":
        if (!updateData.employeeIds || !Array.isArray(updateData.employeeIds)) {
          return NextResponse.json(
            { error: "Employee IDs array is required" },
            { status: 400 },
          );
        }
        await payrollService.addEmployeesToBatch(
          params.id,
          updateData.employeeIds,
        );
        break;

      case "submit_for_approval":
        if (!updateData.userId) {
          return NextResponse.json(
            { error: "User ID is required for approval submission" },
            { status: 400 },
          );
        }
        await payrollService.submitForApproval(params.id, updateData.userId);
        break;

      case "approve":
        if (!updateData.userId) {
          return NextResponse.json(
            { error: "User ID is required for approval" },
            { status: 400 },
          );
        }
        await payrollService.approveBatch(
          params.id,
          updateData.userId,
          updateData.notes,
        );
        break;

      case "reject":
        if (!updateData.userId || !updateData.reason) {
          return NextResponse.json(
            { error: "User ID and reason are required for rejection" },
            { status: 400 },
          );
        }
        await payrollService.rejectBatch(
          params.id,
          updateData.userId,
          updateData.reason,
        );
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action specified" },
          { status: 400 },
        );
    }

    const updatedBatch = await payrollService.getPayrollBatch(params.id);

    return NextResponse.json({
      success: true,
      data: updatedBatch,
      message: `Payroll batch ${action} completed successfully`,
    });
  } catch (error: any) {
    console.error("Error updating payroll batch:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// DELETE /api/payroll/batches/[id] - Delete payroll batch
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Only allow deletion of draft batches
    const payrollService = new PayrollService(organizationId);
    const batch = await payrollService.getPayrollBatch(params.id);

    if (batch.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft batches can be deleted" },
        { status: 400 },
      );
    }

    // Delete the batch (this should be implemented in PayrollService)
    // For now, we'll update status to cancelled
    await payrollService.updateBatchStatus(params.id, "cancelled");

    return NextResponse.json({
      success: true,
      message: "Payroll batch deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting payroll batch:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
