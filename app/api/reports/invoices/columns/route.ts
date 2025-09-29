import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

const DEFAULT_COLUMNS = [
  {
    key: "status",
    label: "Status",
    enabled: true,
    sortable: true,
    width: "120px",
  },
  {
    key: "invoice_date",
    label: "Invoice Date",
    enabled: true,
    sortable: true,
    width: "140px",
  },
  {
    key: "payment_date",
    label: "Payment Date",
    enabled: true,
    sortable: true,
    width: "140px",
  },
  {
    key: "total",
    label: "Total",
    enabled: true,
    sortable: true,
    width: "120px",
  },
  {
    key: "subtotal",
    label: "Subtotal",
    enabled: false,
    sortable: true,
    width: "120px",
  },
  { key: "tax", label: "Tax", enabled: false, sortable: true, width: "100px" },
  {
    key: "discount",
    label: "Discount",
    enabled: false,
    sortable: true,
    width: "120px",
  },
  {
    key: "fees",
    label: "Fees",
    enabled: false,
    sortable: true,
    width: "100px",
  },
  {
    key: "customer_name",
    label: "Customer",
    enabled: true,
    sortable: true,
    width: "200px",
  },
  {
    key: "membership_plan_name",
    label: "Customer Membership",
    enabled: true,
    sortable: true,
    width: "200px",
  },
  {
    key: "description",
    label: "Description",
    enabled: true,
    sortable: false,
    width: "250px",
  },
  {
    key: "processor",
    label: "Processor",
    enabled: true,
    sortable: true,
    width: "120px",
  },
  {
    key: "actions",
    label: "Actions",
    enabled: true,
    sortable: false,
    width: "100px",
  },
];

// GET: Return available columns
export async function OPTIONS(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      data: {
        columns: DEFAULT_COLUMNS,
      },
    });
  } catch (error: any) {
    console.error("Columns options error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch column options",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

// GET: Return user's saved column preferences
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Fetch user's column preferences
    const { data: preferences, error } = await supabase
      .from("report_preferences")
      .select("columns_json")
      .eq("user_id", user.id)
      .eq("report_key", "invoices")
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error fetching column preferences:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch column preferences" },
        { status: 500 },
      );
    }

    // Return saved preferences or defaults
    const columns = preferences?.columns_json || DEFAULT_COLUMNS;

    return NextResponse.json({
      success: true,
      data: {
        columns,
      },
    });
  } catch (error: any) {
    console.error("Column preferences GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch column preferences",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

// POST: Save user's column preferences
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { columns } = body;

    if (!columns || !Array.isArray(columns)) {
      return NextResponse.json(
        { success: false, error: "Invalid columns data" },
        { status: 400 },
      );
    }

    // Validate column structure
    const isValidColumn = (col: any) => {
      return (
        typeof col === "object" &&
        typeof col.key === "string" &&
        typeof col.label === "string" &&
        typeof col.enabled === "boolean"
      );
    };

    if (!columns.every(isValidColumn)) {
      return NextResponse.json(
        { success: false, error: "Invalid column structure" },
        { status: 400 },
      );
    }

    // Upsert the preferences
    const { data, error } = await supabase
      .from("report_preferences")
      .upsert(
        {
          user_id: user.id,
          report_key: "invoices",
          columns_json: columns,
        },
        {
          onConflict: "user_id,report_key",
        },
      )
      .select()
      .single();

    if (error) {
      console.error("Error saving column preferences:", error);
      return NextResponse.json(
        { success: false, error: "Failed to save column preferences" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        preferences: data,
      },
    });
  } catch (error: any) {
    console.error("Column preferences POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to save column preferences",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
