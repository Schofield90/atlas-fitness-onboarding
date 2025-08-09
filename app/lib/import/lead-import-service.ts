import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Import types
export interface ImportOptions {
  organizationId: string;
  userId: string;
  file: File | Buffer;
  fileName: string;
  fileType: 'csv' | 'excel';
  mapping: Record<string, string>;
  duplicateHandling: 'skip' | 'update' | 'merge';
  skipFirstRow: boolean;
  tags?: string[];
  assignTo?: string;
  source?: string;
}

export interface ImportProgress {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  failedCount: number;
  duplicateCount: number;
  errors: ImportError[];
  startedAt?: Date;
  completedAt?: Date;
}

export interface ImportError {
  row: number;
  field?: string;
  value?: any;
  message: string;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  required: boolean;
  transform?: (value: any) => any;
}

// Lead validation schema
const LeadSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  source: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

export class LeadImportService {
  private supabase: any;
  private importQueue: Queue | null = null;
  private redis: Redis | null = null;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Initialize Redis and Queue if available
    if (process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL) {
      this.redis = new Redis(process.env.REDIS_URL || {
        host: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN
      });
      
      this.importQueue = new Queue('lead-import', {
        connection: this.redis,
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      });
    }
  }

  // Main import method
  async importLeads(options: ImportOptions): Promise<ImportProgress> {
    // Create import record
    const importId = await this.createImportRecord(options);

    // For large files (>1000 records), use background processing
    const fileSize = options.file instanceof File ? options.file.size : options.file.length;
    const estimatedRecords = this.estimateRecordCount(fileSize, options.fileType);

    if (estimatedRecords > 1000 && this.importQueue) {
      // Queue for background processing
      await this.importQueue.add('process-import', {
        importId,
        options
      });

      return {
        id: importId,
        status: 'pending',
        totalRecords: estimatedRecords,
        processedRecords: 0,
        successCount: 0,
        failedCount: 0,
        duplicateCount: 0,
        errors: []
      };
    } else {
      // Process immediately for smaller files
      return await this.processImport(importId, options);
    }
  }

  // Process the actual import
  async processImport(importId: string, options: ImportOptions): Promise<ImportProgress> {
    const progress: ImportProgress = {
      id: importId,
      status: 'processing',
      totalRecords: 0,
      processedRecords: 0,
      successCount: 0,
      failedCount: 0,
      duplicateCount: 0,
      errors: [],
      startedAt: new Date()
    };

    try {
      // Update status to processing
      await this.updateImportStatus(importId, 'processing');

      // Parse file
      const records = await this.parseFile(options);
      progress.totalRecords = records.length;

      // Process in batches
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const results = await this.processBatch(batch, options, i);
        
        // Update progress
        progress.processedRecords += results.processed;
        progress.successCount += results.success;
        progress.failedCount += results.failed;
        progress.duplicateCount += results.duplicates;
        progress.errors.push(...results.errors);

        // Update progress in database
        await this.updateImportProgress(importId, progress);

        // Emit progress event if using Redis
        if (this.redis) {
          await this.redis.publish(`import-progress:${importId}`, JSON.stringify(progress));
        }
      }

      // Mark as completed
      progress.status = 'completed';
      progress.completedAt = new Date();
      await this.updateImportStatus(importId, 'completed', progress);

    } catch (error) {
      progress.status = 'failed';
      progress.errors.push({
        row: 0,
        message: error instanceof Error ? error.message : 'Import failed'
      });
      await this.updateImportStatus(importId, 'failed', progress);
    }

    return progress;
  }

  // Parse CSV or Excel file
  private async parseFile(options: ImportOptions): Promise<any[]> {
    const fileContent = options.file instanceof File 
      ? await options.file.text()
      : options.file.toString();

    if (options.fileType === 'csv') {
      return new Promise((resolve, reject) => {
        Papa.parse(fileContent, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (error) => reject(error)
        });
      });
    } else {
      // Excel parsing
      const workbook = XLSX.read(fileContent, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(sheet, { 
        header: 1,
        defval: null,
        blankrows: false 
      });
    }
  }

  // Process a batch of records
  private async processBatch(
    records: any[], 
    options: ImportOptions, 
    startIndex: number
  ): Promise<{
    processed: number;
    success: number;
    failed: number;
    duplicates: number;
    errors: ImportError[];
  }> {
    const results = {
      processed: 0,
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: [] as ImportError[]
    };

    const leadsToInsert = [];
    const leadsToUpdate = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = startIndex + i + (options.skipFirstRow ? 2 : 1);

      try {
        // Map fields according to mapping
        const mappedData = this.mapFields(record, options.mapping);

        // Add default values
        mappedData.organization_id = options.organizationId;
        mappedData.source = mappedData.source || options.source || 'import';
        mappedData.tags = [...(mappedData.tags || []), ...(options.tags || [])];
        mappedData.assigned_to = options.assignTo || null;
        mappedData.status = mappedData.status || 'new';

        // Validate
        const validated = LeadSchema.parse(mappedData);

        // Check for duplicates
        const duplicate = await this.checkDuplicate(
          options.organizationId,
          validated.email,
          validated.phone
        );

        if (duplicate) {
          results.duplicates++;
          
          if (options.duplicateHandling === 'skip') {
            continue;
          } else if (options.duplicateHandling === 'update') {
            leadsToUpdate.push({
              id: duplicate.id,
              data: validated
            });
          } else if (options.duplicateHandling === 'merge') {
            const merged = this.mergeLeadData(duplicate, validated);
            leadsToUpdate.push({
              id: duplicate.id,
              data: merged
            });
          }
        } else {
          leadsToInsert.push(validated);
        }

        results.processed++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : 'Validation failed'
        });
      }
    }

    // Bulk insert new leads
    if (leadsToInsert.length > 0) {
      const { data, error } = await this.supabase
        .from('leads')
        .insert(leadsToInsert)
        .select('id');

      if (error) {
        results.failed += leadsToInsert.length;
        results.errors.push({
          row: 0,
          message: `Bulk insert failed: ${error.message}`
        });
      } else {
        results.success += leadsToInsert.length;
      }
    }

    // Bulk update existing leads
    for (const update of leadsToUpdate) {
      const { error } = await this.supabase
        .from('leads')
        .update(update.data)
        .eq('id', update.id);

      if (error) {
        results.failed++;
        results.errors.push({
          row: 0,
          message: `Update failed for lead ${update.id}: ${error.message}`
        });
      } else {
        results.success++;
      }
    }

    return results;
  }

  // Map fields from source to target
  private mapFields(record: any, mapping: Record<string, string>): any {
    const mapped: any = {};

    for (const [sourceColumn, targetField] of Object.entries(mapping)) {
      const value = record[sourceColumn];
      
      // Handle nested fields (e.g., metadata.custom_field)
      if (targetField.includes('.')) {
        const [parent, child] = targetField.split('.');
        if (!mapped[parent]) mapped[parent] = {};
        mapped[parent][child] = value;
      } else {
        mapped[targetField] = value;
      }
    }

    return mapped;
  }

  // Check for duplicate leads
  private async checkDuplicate(
    organizationId: string,
    email?: string | null,
    phone?: string | null
  ): Promise<any | null> {
    if (!email && !phone) return null;

    let query = this.supabase
      .from('leads')
      .select('*')
      .eq('organization_id', organizationId);

    if (email && phone) {
      query = query.or(`email.eq.${email},phone.eq.${phone}`);
    } else if (email) {
      query = query.eq('email', email);
    } else if (phone) {
      query = query.eq('phone', phone);
    }

    const { data } = await query.single();
    return data;
  }

  // Merge lead data for duplicate handling
  private mergeLeadData(existing: any, incoming: any): any {
    const merged = { ...existing };

    // Merge fields, preferring non-empty incoming values
    for (const [key, value] of Object.entries(incoming)) {
      if (value && (!merged[key] || merged[key] === '')) {
        merged[key] = value;
      }
    }

    // Merge tags
    if (incoming.tags && Array.isArray(incoming.tags)) {
      merged.tags = [...new Set([...(merged.tags || []), ...incoming.tags])];
    }

    // Merge metadata
    if (incoming.metadata) {
      merged.metadata = { ...(merged.metadata || {}), ...incoming.metadata };
    }

    return merged;
  }

  // Helper methods
  private estimateRecordCount(fileSize: number, fileType: string): number {
    // Rough estimate: CSV ~50 bytes per record, Excel ~100 bytes per record
    const bytesPerRecord = fileType === 'csv' ? 50 : 100;
    return Math.ceil(fileSize / bytesPerRecord);
  }

  private async createImportRecord(options: ImportOptions): Promise<string> {
    const { data, error } = await this.supabase
      .from('import_logs')
      .insert({
        organization_id: options.organizationId,
        user_id: options.userId,
        type: 'leads',
        file_name: options.fileName,
        status: 'pending',
        options: {
          mapping: options.mapping,
          duplicateHandling: options.duplicateHandling,
          tags: options.tags,
          source: options.source
        }
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  private async updateImportStatus(
    importId: string, 
    status: string, 
    progress?: Partial<ImportProgress>
  ): Promise<void> {
    await this.supabase
      .from('import_logs')
      .update({
        status,
        progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', importId);
  }

  private async updateImportProgress(
    importId: string,
    progress: ImportProgress
  ): Promise<void> {
    await this.supabase
      .from('import_logs')
      .update({
        progress: {
          processedRecords: progress.processedRecords,
          successCount: progress.successCount,
          failedCount: progress.failedCount,
          duplicateCount: progress.duplicateCount,
          errors: progress.errors.slice(-100) // Keep last 100 errors
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', importId);
  }

  // Get import status
  async getImportStatus(importId: string): Promise<ImportProgress | null> {
    const { data, error } = await this.supabase
      .from('import_logs')
      .select('*')
      .eq('id', importId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      status: data.status,
      totalRecords: data.progress?.totalRecords || 0,
      processedRecords: data.progress?.processedRecords || 0,
      successCount: data.progress?.successCount || 0,
      failedCount: data.progress?.failedCount || 0,
      duplicateCount: data.progress?.duplicateCount || 0,
      errors: data.progress?.errors || [],
      startedAt: data.created_at ? new Date(data.created_at) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined
    };
  }

  // Get column suggestions from file
  async getColumnSuggestions(file: File): Promise<string[]> {
    try {
      const fileContent = await file.text();
      const fileType = file.name.endsWith('.csv') ? 'csv' : 'excel';
      
      if (fileType === 'csv') {
        const parsed = Papa.parse(fileContent, {
          header: true,
          preview: 1
        });
        return Object.keys(parsed.data[0] || {});
      } else {
        const workbook = XLSX.read(fileContent, { type: 'string' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        return (json[0] as any[]) || [];
      }
    } catch (error) {
      console.error('Error getting column suggestions:', error);
      return [];
    }
  }
}