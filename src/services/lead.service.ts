import { createClient } from '@/app/lib/supabase/server';
import { z } from 'zod';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Lead schemas
export const leadSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).default('new'),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({})
});

export type Lead = z.infer<typeof leadSchema>;

export interface LeadImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

export interface LeadFilter {
  status?: string[];
  tags?: string[];
  source?: string[];
  assignedTo?: string;
  dateFrom?: Date;
  dateTo?: Date;
  score?: {
    min: number;
    max: number;
  };
  search?: string;
}

class LeadService {
  // Create a single lead
  async createLead(orgId: string, data: Lead): Promise<string> {
    const supabase = await createClient();
    
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        org_id: orgId,
        ...data
      })
      .select('id')
      .single();

    if (error) throw error;

    // Trigger lead scoring
    await this.scoreLead(lead.id);

    // Trigger workflow events
    await this.triggerLeadEvent('lead.created', orgId, lead.id);

    return lead.id;
  }

  // Bulk import leads from CSV/XLSX
  async importLeads(
    orgId: string,
    file: File,
    mapping: Record<string, string>
  ): Promise<LeadImportResult> {
    const result: LeadImportResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    let data: any[] = [];

    // Parse file based on type
    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true });
      data = parsed.data;
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(firstSheet);
    } else {
      throw new Error('Unsupported file format. Please use CSV or Excel files.');
    }

    const supabase = await createClient();
    const batchSize = 100;

    // Process in batches
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const leads = [];

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const rowIndex = i + j + 2; // +2 for header row and 1-based index

        try {
          // Map fields based on user mapping
          const mappedData: any = {};
          for (const [sourceField, targetField] of Object.entries(mapping)) {
            if (row[sourceField] !== undefined) {
              mappedData[targetField] = row[sourceField];
            }
          }

          // Validate with schema
          const validated = leadSchema.parse(mappedData);
          
          leads.push({
            org_id: orgId,
            ...validated
          });
        } catch (error) {
          result.failed++;
          result.errors.push({
            row: rowIndex,
            error: error instanceof Error ? error.message : 'Invalid data'
          });
        }
      }

      // Insert batch
      if (leads.length > 0) {
        const { error } = await supabase
          .from('leads')
          .insert(leads);

        if (error) {
          result.failed += leads.length;
          result.errors.push({
            row: i,
            error: error.message
          });
        } else {
          result.success += leads.length;
        }
      }
    }

    return result;
  }

  // Get leads with filters
  async getLeads(orgId: string, filter: LeadFilter = {}, page = 1, limit = 50) {
    const supabase = await createClient();
    
    let query = supabase
      .from('leads')
      .select('*, assigned_user:users!assigned_to(id, full_name, email)', { count: 'exact' })
      .eq('org_id', orgId);

    // Apply filters
    if (filter.status?.length) {
      query = query.in('status', filter.status);
    }

    if (filter.source?.length) {
      query = query.in('source', filter.source);
    }

    if (filter.assignedTo) {
      query = query.eq('assigned_to', filter.assignedTo);
    }

    if (filter.tags?.length) {
      query = query.contains('tags', filter.tags);
    }

    if (filter.dateFrom) {
      query = query.gte('created_at', filter.dateFrom.toISOString());
    }

    if (filter.dateTo) {
      query = query.lte('created_at', filter.dateTo.toISOString());
    }

    if (filter.score) {
      if (filter.score.min !== undefined) {
        query = query.gte('score', filter.score.min);
      }
      if (filter.score.max !== undefined) {
        query = query.lte('score', filter.score.max);
      }
    }

    if (filter.search) {
      const searchTerm = `%${filter.search}%`;
      query = query.or(
        `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`
      );
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  // Update lead
  async updateLead(leadId: string, updates: Partial<Lead>): Promise<void> {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId);

    if (error) throw error;

    // Re-score if certain fields changed
    if ('email' in updates || 'phone' in updates || 'status' in updates) {
      await this.scoreLead(leadId);
    }

    // Trigger workflow events
    const { data: lead } = await supabase
      .from('leads')
      .select('org_id')
      .eq('id', leadId)
      .single();

    if (lead) {
      await this.triggerLeadEvent('lead.updated', lead.org_id, leadId);
    }
  }

  // Bulk operations
  async bulkUpdateLeads(
    leadIds: string[],
    updates: {
      status?: string;
      tags?: { add?: string[]; remove?: string[] };
      assignedTo?: string;
    }
  ): Promise<void> {
    const supabase = await createClient();

    // Handle status update
    if (updates.status) {
      await supabase
        .from('leads')
        .update({ status: updates.status })
        .in('id', leadIds);
    }

    // Handle tag updates
    if (updates.tags) {
      const { data: leads } = await supabase
        .from('leads')
        .select('id, tags')
        .in('id', leadIds);

      if (leads) {
        for (const lead of leads) {
          let newTags = lead.tags || [];
          
          if (updates.tags.add) {
            newTags = [...new Set([...newTags, ...updates.tags.add])];
          }
          
          if (updates.tags.remove) {
            newTags = newTags.filter(tag => !updates.tags.remove!.includes(tag));
          }

          await supabase
            .from('leads')
            .update({ tags: newTags })
            .eq('id', lead.id);
        }
      }
    }

    // Handle assignment
    if (updates.assignedTo) {
      await supabase
        .from('leads')
        .update({ assigned_to: updates.assignedTo })
        .in('id', leadIds);
    }
  }

  // AI-powered lead scoring
  async scoreLead(leadId: string): Promise<number> {
    const supabase = await createClient();
    
    // Get lead data
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (!lead) return 0;

    let score = 0;

    // Basic scoring rules
    if (lead.email) score += 10;
    if (lead.phone) score += 10;
    if (lead.first_name && lead.last_name) score += 5;
    
    // Status-based scoring
    switch (lead.status) {
      case 'contacted': score += 15; break;
      case 'qualified': score += 30; break;
      case 'converted': score += 50; break;
    }

    // Source-based scoring
    const highValueSources = ['referral', 'website', 'partner'];
    if (lead.source && highValueSources.includes(lead.source)) {
      score += 15;
    }

    // Tag-based scoring
    const highValueTags = ['hot', 'urgent', 'decision-maker', 'budget-approved'];
    const matchingTags = lead.tags?.filter(tag => highValueTags.includes(tag)) || [];
    score += matchingTags.length * 10;

    // Engagement scoring (would connect to email/SMS tracking)
    // TODO: Add engagement tracking

    // Cap at 100
    score = Math.min(score, 100);

    // Update lead score
    await supabase
      .from('leads')
      .update({ score })
      .eq('id', leadId);

    return score;
  }

  // Trigger workflow events
  private async triggerLeadEvent(event: string, orgId: string, leadId: string): Promise<void> {
    // This would integrate with the workflow service
    // For now, just log the event
    const supabase = await createClient();
    
    await supabase
      .from('analytics_events')
      .insert({
        org_id: orgId,
        event_type: event,
        event_data: { lead_id: leadId }
      });
  }

  // Get lead by ID
  async getLead(leadId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        assigned_user:users!assigned_to(id, full_name, email),
        opportunities(id, stage, value_cents, probability)
      `)
      .eq('id', leadId)
      .single();

    if (error) throw error;
    return data;
  }

  // Convert lead to client
  async convertLead(leadId: string): Promise<string> {
    const supabase = await createClient();
    
    // Get lead data
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (!lead) throw new Error('Lead not found');

    // Create client
    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        org_id: lead.org_id,
        lead_id: leadId,
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        metadata: lead.metadata
      })
      .select('id')
      .single();

    if (error) throw error;

    // Update lead status
    await supabase
      .from('leads')
      .update({ status: 'converted' })
      .eq('id', leadId);

    // Trigger event
    await this.triggerLeadEvent('lead.converted', lead.org_id, leadId);

    return client.id;
  }
}

export const leadService = new LeadService();