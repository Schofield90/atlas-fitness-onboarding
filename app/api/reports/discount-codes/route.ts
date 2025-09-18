import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireOrgAccess } from "@/app/lib/auth/organization";
import {
  DiscountCodeFilters,
  DiscountGroupBy,
  UseType,
  DiscountUsageRecord,
  DiscountGroupedData,
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
      view: (searchParams.get("view") as "all" | "grouped") || "all",
      customer_id: searchParams.get("customer_id") || undefined,
      code_id: searchParams.get("code_id") || undefined,
      group_name: searchParams.get("group_name") || undefined,
      use_type: (searchParams.get("use_type") as UseType) || undefined,
      date_from: searchParams.get("date_from") || undefined,
      date_to: searchParams.get("date_to") || undefined,
      group_by: (searchParams.get("group_by") as DiscountGroupBy) || "each",
      page: parseInt(searchParams.get("page") || "1"),
      page_size: parseInt(searchParams.get("page_size") || "50"),
    };

    // For 'grouped' view, force group_by to 'discount_code' if it's 'each'
    if (filters.view === "grouped" && filters.group_by === "each") {
      filters.group_by = "discount_code";
    }

    // Build base query using the discount_usage_report view
    let query = supabase
      .from("discount_usage_report")
      .select("*", { count: "exact" })
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

    // Handle different views and grouping
    if (filters.view === "all" && filters.group_by === "each") {
      // Return individual usage records with pagination
      const offset = (filters.page! - 1) * filters.page_size!;

      query = query
        .order("used_at", { ascending: false })
        .range(offset, offset + filters.page_size! - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error("Discount usage query error:", error);
        throw error;
      }

      return NextResponse.json({
        success: true,
        data: {
          uses: data || [],
          pagination: {
            page: filters.page,
            page_size: filters.page_size,
            total_count: count || 0,
            total_pages: Math.ceil((count || 0) / filters.page_size!),
          },
          total_count: count || 0,
          view: "all",
          group_by: "each",
        },
      });
    } else {
      // Return grouped data
      const { data: rawData, error } = await query;

      if (error) {
        console.error("Discount usage query error:", error);
        throw error;
      }

      if (!rawData) {
        return NextResponse.json({
          success: true,
          data: {
            grouped_data: [],
            total_count: 0,
            view: filters.view,
            group_by: filters.group_by,
          },
        });
      }

      // Group the data based on group_by parameter
      const groupedData = groupDiscountData(rawData, filters.group_by!);

      return NextResponse.json({
        success: true,
        data: {
          grouped_data: groupedData,
          total_count: rawData.length,
          view: filters.view,
          group_by: filters.group_by,
        },
      });
    }
  } catch (error: any) {
    console.error("Discount codes report error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch discount codes report",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

function groupDiscountData(
  data: DiscountUsageRecord[],
  groupBy: DiscountGroupBy,
): DiscountGroupedData[] {
  const groups: Record<string, DiscountGroupedData> = {};

  data.forEach((record) => {
    let groupKey: string;
    let groupLabel: string;

    switch (groupBy) {
      case "customer":
        groupKey = record.customer_id || "unknown";
        groupLabel = record.customer_name || "Unknown Customer";
        break;
      case "discount_code":
        groupKey = record.code_id;
        groupLabel = `${record.code} - ${record.discount_name}`;
        break;
      case "group":
        groupKey = record.group_name || "ungrouped";
        groupLabel = record.group_name || "Ungrouped";
        break;
      case "use_type":
        groupKey = record.use_type;
        groupLabel =
          record.use_type.charAt(0).toUpperCase() + record.use_type.slice(1);
        break;
      case "use_year":
        const year = new Date(record.used_at).getFullYear();
        groupKey = year.toString();
        groupLabel = year.toString();
        break;
      case "use_month":
        const date = new Date(record.used_at);
        const month = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        });
        groupKey =
          date.getFullYear() +
          "-" +
          (date.getMonth() + 1).toString().padStart(2, "0");
        groupLabel = month;
        break;
      default:
        groupKey = "all";
        groupLabel = "All";
        break;
    }

    if (!groups[groupKey]) {
      groups[groupKey] = {
        group_key: groupKey,
        group_label: groupLabel,
        total_uses: 0,
        unique_codes: 0,
        total_discounted_cents: 0,
        average_discount_cents: 0,
        use_types: [],
        customers_count: 0,
        most_used_code: undefined,
        most_used_code_uses: 0,
      };
    }

    const group = groups[groupKey];
    group.total_uses++;
    group.total_discounted_cents += record.amount_discounted_cents;

    // Track unique codes
    const codeTracker = `codes_${groupKey}` as any;
    if (!groups[codeTracker]) {
      groups[codeTracker] = new Set();
    }
    groups[codeTracker].add(record.code_id);

    // Track unique customers
    const customerTracker = `customers_${groupKey}` as any;
    if (!groups[customerTracker]) {
      groups[customerTracker] = new Set();
    }
    if (record.customer_id) {
      groups[customerTracker].add(record.customer_id);
    }

    // Track use types
    if (!group.use_types.includes(record.use_type)) {
      group.use_types.push(record.use_type);
    }

    // Track most used code for this group
    const codeUsageTracker = `code_usage_${groupKey}` as any;
    if (!groups[codeUsageTracker]) {
      groups[codeUsageTracker] = {};
    }
    const codeKey = `${record.code}_${record.discount_name}`;
    groups[codeUsageTracker][codeKey] =
      (groups[codeUsageTracker][codeKey] || 0) + 1;

    if (groups[codeUsageTracker][codeKey] > (group.most_used_code_uses || 0)) {
      group.most_used_code = codeKey;
      group.most_used_code_uses = groups[codeUsageTracker][codeKey];
    }
  });

  // Calculate final stats for each group
  Object.values(groups).forEach((group: DiscountGroupedData) => {
    const groupKey = group.group_key;
    const codeTracker = `codes_${groupKey}` as any;
    const customerTracker = `customers_${groupKey}` as any;

    if (groups[codeTracker]) {
      group.unique_codes = groups[codeTracker].size;
    }
    if (groups[customerTracker]) {
      group.customers_count = groups[customerTracker].size;
    }

    group.average_discount_cents =
      group.total_uses > 0
        ? Math.round(group.total_discounted_cents / group.total_uses)
        : 0;
  });

  // Filter out tracking objects and return only the groups
  const result = Object.values(groups).filter(
    (item): item is DiscountGroupedData =>
      typeof item === "object" && "group_key" in item && "group_label" in item,
  );

  // Sort by total uses descending (most used first)
  return result.sort((a, b) => b.total_uses - a.total_uses);
}
