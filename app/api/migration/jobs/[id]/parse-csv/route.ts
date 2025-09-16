import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { supabaseAdmin } from "@/app/lib/supabase/admin";
import Papa from "papaparse";

/**
 * POST /api/migration/jobs/[id]/parse-csv
 * Parse CSV file and create migration records
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const jobId = params.id;
  const logs: string[] = [];

  const log = (message: string) => {
    console.log(`[PARSE-CSV] ${message}`);
    logs.push(`${new Date().toISOString()}: ${message}`);
  };

  try {
    log(`Starting CSV parse for job ${jobId}`);

    // Get current user
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", logs },
        { status: 401 },
      );
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg?.organization_id) {
      return NextResponse.json(
        { success: false, error: "User organization not found", logs },
        { status: 401 },
      );
    }
    log(`Organization: ${userOrg.organization_id}`);

    // Get migration job and file info
    const { data: job, error: jobError } = await supabaseAdmin
      .from("migration_jobs")
      .select(
        `
        *,
        migration_files(*)
      `,
      )
      .eq("id", jobId)
      .eq("organization_id", userOrg.organization_id)
      .single();

    if (jobError || !job) {
      log(`Job error: ${jobError?.message || "No job"}`);
      return NextResponse.json(
        { success: false, error: "Migration job not found", logs },
        { status: 404 },
      );
    }

    log(`Found job with ${job.migration_files?.length || 0} files`);

    if (!job.migration_files || job.migration_files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files found for this job", logs },
        { status: 400 },
      );
    }

    const file = job.migration_files[0];
    log(
      `Processing file: ${file.file_name}, storage path: ${file.storage_path}`,
    );

    // Try multiple approaches to get the file
    let csvText: string | null = null;

    // Approach 1: Try authenticated download
    try {
      const { data: fileData, error: downloadError } =
        await supabaseAdmin.storage
          .from("migrations")
          .download(file.storage_path);

      if (!downloadError && fileData) {
        csvText = await fileData.text();
        log(
          `Downloaded ${csvText.length} characters via authenticated download`,
        );
      } else {
        log(
          `Authenticated download failed: ${downloadError?.message || "No file data"}`,
        );
      }
    } catch (e: any) {
      log(`Authenticated download exception: ${e.message}`);
    }

    // Approach 2: Try public URL with service key
    if (!csvText) {
      try {
        const {
          data: { publicUrl },
        } = supabaseAdmin.storage
          .from("migrations")
          .getPublicUrl(file.storage_path);

        log(`Trying public URL with service key: ${publicUrl}`);
        const response = await fetch(publicUrl);

        if (response.ok) {
          csvText = await response.text();
          log(`Downloaded ${csvText.length} characters from public URL`);
        } else {
          log(`Public URL failed: ${response.status} ${response.statusText}`);
        }
      } catch (e: any) {
        log(`Public URL exception: ${e.message}`);
      }
    }

    // Approach 3: Direct public URL
    if (!csvText) {
      const directUrl = `https://lzlrojoaxrqvmhempnkn.supabase.co/storage/v1/object/public/migrations/${file.storage_path}`;
      log(`Trying direct public URL: ${directUrl}`);

      try {
        const response = await fetch(directUrl);
        if (response.ok) {
          csvText = await response.text();
          log(`Downloaded ${csvText.length} characters from direct URL`);
        } else {
          log(`Direct URL failed: ${response.status} ${response.statusText}`);
          return NextResponse.json(
            {
              success: false,
              error: "Failed to download file from storage",
              logs,
            },
            { status: 500 },
          );
        }
      } catch (e: any) {
        log(`Direct URL exception: ${e.message}`);
        return NextResponse.json(
          {
            success: false,
            error: `Storage access failed: ${e.message}`,
            logs,
          },
          { status: 500 },
        );
      }
    }

    if (!csvText) {
      return NextResponse.json(
        { success: false, error: "Could not retrieve CSV content", logs },
        { status: 500 },
      );
    }

    // Parse CSV
    log(`Starting to parse ${csvText.length} characters of CSV data`);

    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parseResult.errors.length > 0) {
      log(`Parse errors: ${JSON.stringify(parseResult.errors.slice(0, 3))}`);
    }

    log(`Parsed ${parseResult.data.length} rows from CSV`);

    // Create migration records
    const records = [];
    const batchSize = 50;

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i] as any;
      records.push({
        migration_job_id: jobId,
        organization_id: userOrg.organization_id,
        source_row_number: i + 2, // +2 because row 1 is headers
        source_data: row,
        status: "pending",
        record_type: "client",
      });
    }

    log(
      `Creating ${records.length} migration records in batches of ${batchSize}`,
    );

    // Insert in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error: insertError } = await supabaseAdmin
        .from("migration_records")
        .insert(batch);

      if (insertError) {
        log(`Batch ${i / batchSize + 1} error: ${insertError.message}`);
      } else {
        log(`Batch ${i / batchSize + 1} inserted successfully`);
      }
    }

    // Update job status
    await supabaseAdmin
      .from("migration_jobs")
      .update({
        status: "ready_to_process",
        total_records: parseResult.data.length,
      })
      .eq("id", jobId);

    log(`Job updated with ${parseResult.data.length} total records`);

    return NextResponse.json({
      success: true,
      logs,
      stats: {
        totalRows: parseResult.data.length,
        recordsCreated: records.length,
        sampleData: parseResult.data.slice(0, 2),
      },
    });
  } catch (error: any) {
    log(`Fatal error: ${error.message}`);
    console.error("Parse CSV error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        logs,
      },
      { status: 500 },
    );
  }
}
