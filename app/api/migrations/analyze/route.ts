import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();
    
    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get the migration job
    const { data: job, error: jobError } = await supabase
      .from("migration_jobs")
      .select("*, migration_files(*)")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      console.error("Error fetching job:", jobError);
      return NextResponse.json(
        { error: "Migration job not found" },
        { status: 404 }
      );
    }

    // Get the file from storage
    const file = job.migration_files[0];
    if (!file) {
      return NextResponse.json(
        { error: "No file found for this job" },
        { status: 404 }
      );
    }

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("migrations")
      .download(file.storage_path);

    if (downloadError) {
      console.error("Error downloading file:", downloadError);
      return NextResponse.json(
        { error: "Failed to download file" },
        { status: 500 }
      );
    }

    // Convert file to text
    const text = await fileData.text();
    
    // Parse CSV (simple parsing for now)
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const sampleRows = lines.slice(1, 6).map(line => 
      line.split(',').map(cell => cell.trim())
    );

    // Use AI to analyze the data structure
    const aiPrompt = `Analyze this CSV data for a gym management system migration from GoTeamUp.
    
Headers: ${headers.join(', ')}

Sample data (first 5 rows):
${sampleRows.map(row => row.join(', ')).join('\n')}

Provide a JSON response with:
1. field_mappings: A FLAT object mapping CSV column names to database field names. 
   IMPORTANT: This must be a simple key-value object where keys are CSV column names and values are database field names.
   
   Available database fields:
   - first_name, last_name, email, phone, date_of_birth, gender, status, notes, emergency_contact_name, emergency_contact_phone
   - For address fields that will be stored in metadata, still use these field names: address, city, postcode, country
   
   Example format:
   {
     "First Name": "first_name",
     "Last Name": "last_name",
     "Email": "email",
     "Phone": "phone",
     "DOB": "date_of_birth",
     "City": "city",
     "Postcode": "postcode",
     "Address Line 1": "address"
   }
   
2. data_quality: Assessment of data completeness and quality
3. recommendations: Any suggestions for the migration

Format as JSON with these exact keys: field_mappings, data_quality, recommendations
The field_mappings MUST be a flat object, not nested.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a data migration expert. Analyze CSV data and provide structured migration guidance. IMPORTANT: When creating field_mappings, always return a FLAT object mapping CSV column names (keys) to database field names (values). Never nest objects within field_mappings."
        },
        {
          role: "user",
          content: aiPrompt
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const aiAnalysis = JSON.parse(completion.choices[0].message.content || "{}");

    // Update the job with AI analysis
    const { error: updateError } = await supabase
      .from("migration_jobs")
      .update({
        status: "analyzing",
        ai_analysis: aiAnalysis,
        field_mappings: aiAnalysis.field_mappings,
        total_records: lines.length - 1,
        updated_at: new Date().toISOString()
      })
      .eq("id", jobId);

    if (updateError) {
      console.error("Error updating job:", updateError);
      return NextResponse.json(
        { error: "Failed to update job with analysis" },
        { status: 500 }
      );
    }

    // Store parsed data in migration_files
    const { error: fileUpdateError } = await supabase
      .from("migration_files")
      .update({
        parsed_headers: headers,
        row_count: lines.length - 1,
        status: "parsed",
        raw_data: {
          headers,
          sample_rows: sampleRows
        }
      })
      .eq("id", file.id);

    if (fileUpdateError) {
      console.error("Error updating file:", fileUpdateError);
    }

    // Create field mappings records
    if (aiAnalysis.field_mappings) {
      const mappings = Object.entries(aiAnalysis.field_mappings).map(([source, target]) => ({
        migration_job_id: jobId,
        organization_id: job.organization_id,
        source_field: source,
        target_field: target as string,
        target_table: "clients",
        ai_confidence: 0.9,
        sample_values: sampleRows.slice(0, 3).map(row => 
          row[headers.indexOf(source)]
        ).filter(Boolean)
      }));

      const { error: mappingsError } = await supabase
        .from("migration_field_mappings")
        .insert(mappings);

      if (mappingsError) {
        console.error("Error creating field mappings:", mappingsError);
      }
    }

    return NextResponse.json({
      success: true,
      analysis: aiAnalysis,
      mappings: Object.entries(aiAnalysis.field_mappings || {}).map(([source, target]) => ({
        source_field: source,
        target_field: target,
        target_table: "clients",  // Add this to ensure it's set
        confidence: 0.9,
        editable: true
      })),
      recordCount: lines.length - 1,
      headers
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Internal server error during analysis" },
      { status: 500 }
    );
  }
}