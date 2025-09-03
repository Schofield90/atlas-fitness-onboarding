import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Validation schema for import request
const importSchema = z.object({
  leads: z.array(z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    source: z.string().optional(),
    notes: z.string().optional(),
    tags: z.string().optional(),
    custom_fields: z.any().optional(),
  })),
  organizationId: z.string().uuid(),
  options: z.object({
    duplicateHandling: z.enum(['skip', 'update', 'create']).default('skip'),
    updateExisting: z.boolean().default(false),
  }).optional(),
});

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    const validated = importSchema.parse(body);
    
    // Initialize Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Service Unavailable', message: 'Missing Supabase configuration' }, { status: 503 })
    }
    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Create import log
    const { data: importLog, error: logError } = await supabase
      .from('import_logs')
      .insert({
        organization_id: validated.organizationId,
        type: 'leads',
        file_name: 'bulk_import.csv',
        status: 'processing',
        total_records: validated.leads.length,
        options: validated.options || {},
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to create import log:', logError);
    }

    const results = {
      total: validated.leads.length,
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: [] as any[],
    };

    // Process leads in batches
    const batchSize = 50;
    for (let i = 0; i < validated.leads.length; i += batchSize) {
      const batch = validated.leads.slice(i, i + batchSize);
      
      for (const leadData of batch) {
        try {
          // Check for duplicates by email
          if (leadData.email && validated.options?.duplicateHandling !== 'create') {
            const { data: existing } = await supabase
              .from('leads')
              .select('id')
              .eq('organization_id', validated.organizationId)
              .eq('email', leadData.email)
              .single();

            if (existing) {
              if (validated.options?.duplicateHandling === 'skip') {
                results.duplicates++;
                continue;
              } else if (validated.options?.duplicateHandling === 'update') {
                // Update existing lead
                const { error: updateError } = await supabase
                  .from('leads')
                  .update({
                    name: leadData.name || existing.name,
                    phone: leadData.phone || existing.phone,
                    source: leadData.source || existing.source,
                    notes: leadData.notes || existing.notes,
                    tags: leadData.tags ? leadData.tags.split(',').map(t => t.trim()) : existing.tags,
                    custom_fields: leadData.custom_fields || existing.custom_fields,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existing.id);

                if (updateError) {
                  results.failed++;
                  results.errors.push({ lead: leadData, error: updateError.message });
                } else {
                  results.success++;
                }
                continue;
              }
            }
          }

          // Create new lead
          const { error: insertError } = await supabase
            .from('leads')
            .insert({
              organization_id: validated.organizationId,
              name: leadData.name || 'Unknown',
              email: leadData.email,
              phone: leadData.phone,
              source: leadData.source || 'Import',
              status: 'new',
              notes: leadData.notes,
              tags: leadData.tags ? leadData.tags.split(',').map(t => t.trim()) : [],
              custom_fields: leadData.custom_fields || {},
            });

          if (insertError) {
            results.failed++;
            results.errors.push({ lead: leadData, error: insertError.message });
          } else {
            results.success++;
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push({ lead: leadData, error: error.message });
        }
      }

      // Update progress
      if (importLog) {
        await supabase
          .from('import_logs')
          .update({
            processed_records: i + batch.length,
            success_count: results.success,
            failed_count: results.failed,
            duplicate_count: results.duplicates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', importLog.id);
      }
    }

    // Update import log to completed
    if (importLog) {
      await supabase
        .from('import_logs')
        .update({
          status: 'completed',
          processed_records: results.total,
          success_count: results.success,
          failed_count: results.failed,
          duplicate_count: results.duplicates,
          errors: results.errors.slice(0, 100), // Store first 100 errors
          completed_at: new Date().toISOString(),
        })
        .eq('id', importLog.id);
    }

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Import failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check import status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const importId = searchParams.get('importId');
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Service Unavailable', message: 'Missing Supabase configuration' }, { status: 503 })
    }
    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    if (importId) {
      // Get specific import status
      const { data, error } = await supabase
        .from('import_logs')
        .select('*')
        .eq('id', importId)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Import not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(data);
    } else {
      // Get all imports for organization
      const { data, error } = await supabase
        .from('import_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('type', 'leads')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch imports' },
          { status: 500 }
        );
      }

      return NextResponse.json(data || []);
    }
  } catch (error) {
    console.error('Error fetching import status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import status' },
      { status: 500 }
    );
  }
}