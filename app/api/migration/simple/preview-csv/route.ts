import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Papa from "papaparse";

export async function POST(request: NextRequest) {
  try {
    const { fileName, organizationId } = await request.json();
    const supabaseAdmin = createAdminClient();

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("migrations")
      .download(fileName);

    if (downloadError || !fileData) {
      return NextResponse.json({
        success: false,
        error: "Failed to download file",
      });
    }

    const csvText = await fileData.text();
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (!parseResult.data || parseResult.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No data found in CSV",
      });
    }

    // Get sample of existing clients for comparison
    const { data: clients } = await supabaseAdmin
      .from("clients")
      .select("name, email")
      .eq("organization_id", organizationId)
      .limit(5);

    // Get column headers and sample data
    const headers = Object.keys(parseResult.data[0] as any);
    const sampleRows = parseResult.data.slice(0, 5);

    return NextResponse.json({
      success: true,
      totalRows: parseResult.data.length,
      headers,
      sampleRows,
      sampleClients: clients || [],
      suggestion: {
        nameColumn:
          headers.find(
            (h) =>
              h.toLowerCase().includes("name") ||
              h.toLowerCase().includes("client") ||
              h.toLowerCase().includes("member"),
          ) || headers[0],
        emailColumn: headers.find(
          (h) =>
            h.toLowerCase().includes("email") ||
            h.toLowerCase().includes("mail"),
        ),
        dateColumn:
          headers.find(
            (h) =>
              h.toLowerCase().includes("date") ||
              h.toLowerCase().includes("time"),
          ) || headers[1],
      },
    });
  } catch (error: any) {
    console.error("Preview error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Preview failed",
    });
  }
}
