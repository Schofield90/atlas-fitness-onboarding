import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireOrgAccess } from "@/app/lib/auth/organization";
import {
  DiscountCodeFilters,
  UseType,
  DiscountUsageRecord,
} from "@/app/types/discount-codes";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const searchParams = request.nextUrl.searchParams;

    // Get organization ID from authenticated user
    let organizationId: string;
    try {
      const { organizationId: orgId } = await requireOrgAccess();
      organizationId = orgId;
    } catch (e) {
      return NextResponse.json(
        {
          success: false,
          error: "No organization found. Please complete onboarding.",
        },
        { status: 401 },
      );
    }

    // Parse filters from query params
    const filters: DiscountCodeFilters = {
      customer_id: searchParams.get("customer_id") || undefined,
      code_id: searchParams.get("code_id") || undefined,
      group_name: searchParams.get("group_name") || undefined,
      use_type: (searchParams.get("use_type") as UseType) || undefined,
      date_from: searchParams.get("date_from") || undefined,
      date_to: searchParams.get("date_to") || undefined,
      // For export, we always want all records (no pagination)
      page: 1,
      page_size: 10000,
    };

    // Build query using the discount_usage_report view
    let query = supabase
      .from("discount_usage_report")
      .select("*")
      .eq("org_id", organizationId);

    // Apply date filters
    if (filters.date_from) {
      query = query.gte("used_at", filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte("used_at", filters.date_to);
    }

    // Apply entity filters
    if (filters.customer_id) {
      query = query.eq("customer_id", filters.customer_id);
    }
    if (filters.code_id) {
      query = query.eq("code_id", filters.code_id);
    }
    if (filters.group_name) {
      query = query.eq("group_name", filters.group_name);
    }
    if (filters.use_type) {
      query = query.eq("use_type", filters.use_type);
    }

    // Order by most recent first
    query = query.order("used_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Discount usage export query error:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No data found for the selected filters",
        },
        { status: 404 },
      );
    }

    // Generate CSV content
    const csvContent = generateCSV(data);

    // Generate filename with current date
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const filename = `discount-codes-report-${dateStr}.csv`;

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Discount codes export error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to export discount codes report",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

function generateCSV(data: DiscountUsageRecord[]): string {
  // CSV headers
  const headers = [
    "Use ID",
    "Used At",
    "Discount Code",
    "Discount Name",
    "Group",
    "Customer Name",
    "Customer Email",
    "Use Type",
    "Used For",
    "Discount Type",
    "Discount Value",
    "Amount Discounted",
    "Invoice ID",
    "Code Status",
  ];

  // Convert data to CSV rows
  const rows = data.map((record) => [
    record.id,
    formatDateForCSV(record.used_at),
    record.code,
    record.discount_name,
    record.group_name || "",
    record.customer_name || "",
    record.email || "",
    capitalizeFirst(record.use_type),
    record.used_for || "",
    capitalizeFirst(record.discount_type),
    formatDiscountValue(record.discount_type, record.discount_value),
    formatCurrency(record.amount_discounted_cents),
    record.invoice_id || "",
    record.code_active ? "Active" : "Inactive",
  ]);

  // Combine headers and rows
  const csvRows = [headers, ...rows];

  // Convert to CSV string
  return csvRows
    .map((row) =>
      row
        .map((field) => {
          // Escape fields that contain commas, quotes, or newlines
          const stringField = String(field);
          if (
            stringField.includes(",") ||
            stringField.includes('"') ||
            stringField.includes("\n")
          ) {
            return `"${stringField.replace(/"/g, '""')}"`;
          }
          return stringField;
        })
        .join(","),
    )
    .join("\n");
}

function formatDateForCSV(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDiscountValue(type: string, value: number): string {
  if (type === "percentage") {
    return `${value}%`;
  } else if (type === "fixed") {
    return formatCurrency(value);
  } else {
    return `${value}`;
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
