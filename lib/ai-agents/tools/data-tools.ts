/**
 * Data Tools - CRM Data Access for AI Agents
 * Comprehensive tools for querying clients, leads, bookings, payments, and subscriptions
 */

import { z } from 'zod';
import { BaseTool, ToolExecutionContext, ToolExecutionResult } from './types';
import { createAdminClient } from '@/app/lib/supabase/admin';

/**
 * Search for clients by name, email, or phone
 */
export class SearchClientsTool extends BaseTool {
  id = 'search_clients';
  name = 'Search Clients';
  description = 'Search for clients/members by name, email, or phone number. Returns basic profile information with membership details.';
  category = 'crm' as const;

  parametersSchema = z.object({
    query: z.string().describe('Search query - can be name, email, or phone number'),
    limit: z.number().optional().default(10).describe('Maximum number of results to return (default: 10, max: 50)'),
    status: z.enum(['active', 'inactive', 'all']).optional().default('all').describe('Filter by client status')
  });

  requiresPermission = 'clients:read';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    if (!context.organizationId) {
      return {
        success: false,
        error: 'Organization ID is required',
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }

    try {
      const supabase = createAdminClient();

      let query = supabase
        .from('clients')
        .select(`
          id, first_name, last_name, email, phone,
          status, created_at, metadata
        `)
        .eq('org_id', context.organizationId)
        .limit(Math.min(validated.limit, 50));

      // Status filter
      if (validated.status !== 'all') {
        query = query.eq('status', validated.status);
      }

      // Smart search: handle full names (e.g., "John Doe") vs single terms
      const queryWords = validated.query.trim().split(/\s+/);

      if (queryWords.length >= 2) {
        // Multi-word query: assume "FirstName LastName" pattern
        const firstName = queryWords[0];
        const lastName = queryWords.slice(1).join(' ');

        query = query.or(
          `and(first_name.ilike.%${firstName}%,last_name.ilike.%${lastName}%),` +
          `email.ilike.%${validated.query}%,` +
          `phone.ilike.%${validated.query}%`
        );
      } else {
        // Single word: search across all fields
        const searchPattern = `%${validated.query}%`;
        query = query.or(
          `first_name.ilike.${searchPattern},` +
          `last_name.ilike.${searchPattern},` +
          `email.ilike.${searchPattern},` +
          `phone.ilike.${searchPattern}`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        metadata: {
          recordsAffected: data?.length || 0,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Get detailed client profile with full relationship data
 */
export class ViewClientProfileTool extends BaseTool {
  id = 'view_client_profile';
  name = 'View Client Profile';
  description = 'Get comprehensive profile information for a specific client including personal details, membership tier, and metadata.';
  category = 'crm' as const;

  parametersSchema = z.object({
    clientId: z.string().uuid().describe('UUID of the client to retrieve')
  });

  requiresPermission = 'clients:read';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    if (!context.organizationId) {
      return {
        success: false,
        error: 'Organization ID is required',
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }

    try {
      const supabase = createAdminClient();

      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', validated.clientId)
        .eq('org_id', context.organizationId)
        .single();

      if (error) throw error;
      if (!client) {
        return {
          success: false,
          error: 'Client not found or access denied'
        };
      }

      return {
        success: true,
        data: client,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * View client booking history
 */
export class ViewClientBookingsTool extends BaseTool {
  id = 'view_client_bookings';
  name = 'View Client Bookings';
  description = 'Get booking history for a specific client including past and upcoming sessions with attendance tracking.';
  category = 'crm' as const;

  parametersSchema = z.object({
    clientId: z.string().uuid().describe('UUID of the client'),
    startDate: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
    status: z.enum(['booked', 'cancelled', 'attended', 'no_show', 'all']).optional().default('all').describe('Booking status filter'),
    limit: z.number().optional().default(50).describe('Maximum results to return')
  });

  requiresPermission = 'bookings:read';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    if (!context.organizationId) {
      return {
        success: false,
        error: 'Organization ID is required',
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }

    try {
      const supabase = createAdminClient();

      let query = supabase
        .from('bookings')
        .select(`
          id, status, created_at, cancelled_at, attended_at, metadata,
          class_session_id,
          class_sessions(id, start_time, name, instructor_name)
        `)
        .eq('org_id', context.organizationId)
        .eq('client_id', validated.clientId)
        .order('created_at', { ascending: false })
        .limit(validated.limit);

      if (validated.status !== 'all') {
        query = query.eq('status', validated.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        metadata: {
          recordsAffected: data?.length || 0,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * View client payment history
 */
export class ViewClientPaymentsTool extends BaseTool {
  id = 'view_client_payments';
  name = 'View Client Payments';
  description = 'Get payment history for a specific client including successful and failed transactions.';
  category = 'crm' as const;

  parametersSchema = z.object({
    clientId: z.string().uuid().describe('UUID of the client'),
    startDate: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
    limit: z.number().optional().default(50).describe('Maximum results to return')
  });

  requiresPermission = 'payments:read';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    if (!context.organizationId) {
      return {
        success: false,
        error: 'Organization ID is required',
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }

    try {
      const supabase = createAdminClient();

      let query = supabase
        .from('client_subscriptions')
        .select('*')
        .eq('org_id', context.organizationId)
        .eq('client_id', validated.clientId)
        .order('created_at', { ascending: false })
        .limit(validated.limit);

      if (validated.startDate) {
        query = query.gte('created_at', validated.startDate);
      }

      if (validated.endDate) {
        query = query.lte('created_at', validated.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate summary
      const totalAmount = data?.reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0) || 0;

      return {
        success: true,
        data: {
          payments: data || [],
          summary: {
            count: data?.length || 0,
            totalAmountCents: totalAmount,
            totalAmount: totalAmount / 100
          }
        },
        metadata: {
          recordsAffected: data?.length || 0,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Update client status
 */
export class UpdateClientStatusTool extends BaseTool {
  id = 'update_client_status';
  name = 'Update Client Status';
  description = 'Update the status of a client (active/inactive). Use for marking clients as inactive when they cancel membership.';
  category = 'crm' as const;

  parametersSchema = z.object({
    clientId: z.string().uuid().describe('UUID of the client'),
    status: z.enum(['active', 'inactive']).describe('New status for the client'),
    reason: z.string().optional().describe('Reason for status change (stored in metadata)')
  });

  requiresPermission = 'clients:write';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    if (!context.organizationId) {
      return {
        success: false,
        error: 'Organization ID is required',
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }

    try {
      const supabase = createAdminClient();

      // First verify the client belongs to this org
      const { data: existing, error: checkError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', validated.clientId)
        .eq('org_id', context.organizationId)
        .single();

      if (checkError || !existing) {
        return {
          success: false,
          error: 'Client not found or access denied'
        };
      }

      // Update status with metadata
      const updateData: any = {
        status: validated.status,
        updated_at: new Date().toISOString()
      };

      if (validated.reason) {
        updateData.metadata = {
          status_change_reason: validated.reason,
          status_changed_at: new Date().toISOString(),
          status_changed_by: context.userId || 'system'
        };
      }

      const { data, error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', validated.clientId)
        .eq('org_id', context.organizationId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        metadata: {
          recordsAffected: 1,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Search leads
 */
export class SearchLeadsTool extends BaseTool {
  id = 'search_leads';
  name = 'Search Leads';
  description = 'Search for leads by name, email, phone, or source. Filter by status and score.';
  category = 'crm' as const;

  parametersSchema = z.object({
    query: z.string().optional().describe('Search query for name, email, or phone'),
    status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost', 'all']).optional().default('all').describe('Lead status filter'),
    minScore: z.number().optional().describe('Minimum lead score (0-100)'),
    source: z.string().optional().describe('Filter by lead source'),
    limit: z.number().optional().default(20).describe('Maximum results to return')
  });

  requiresPermission = 'leads:read';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    if (!context.organizationId) {
      return {
        success: false,
        error: 'Organization ID is required',
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }

    try {
      const supabase = createAdminClient();

      let query = supabase
        .from('leads')
        .select('*')
        .eq('org_id', context.organizationId)
        .order('score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(validated.limit);

      if (validated.query) {
        const searchPattern = `%${validated.query}%`;
        query = query.or(
          `first_name.ilike.${searchPattern},` +
          `last_name.ilike.${searchPattern},` +
          `email.ilike.${searchPattern},` +
          `phone.ilike.${searchPattern}`
        );
      }

      if (validated.status !== 'all') {
        query = query.eq('status', validated.status);
      }

      if (validated.minScore !== undefined) {
        query = query.gte('score', validated.minScore);
      }

      if (validated.source) {
        query = query.eq('source', validated.source);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        metadata: {
          recordsAffected: data?.length || 0,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * View lead profile
 */
export class ViewLeadProfileTool extends BaseTool {
  id = 'view_lead_profile';
  name = 'View Lead Profile';
  description = 'Get detailed information for a specific lead including contact details, score, and conversion status.';
  category = 'crm' as const;

  parametersSchema = z.object({
    leadId: z.string().uuid().describe('UUID of the lead')
  });

  requiresPermission = 'leads:read';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    if (!context.organizationId) {
      return {
        success: false,
        error: 'Organization ID is required',
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }

    try {
      const supabase = createAdminClient();

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', validated.leadId)
        .eq('org_id', context.organizationId)
        .single();

      if (error) throw error;
      if (!data) {
        return {
          success: false,
          error: 'Lead not found or access denied'
        };
      }

      return {
        success: true,
        data,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Update lead status
 */
export class UpdateLeadStatusTool extends BaseTool {
  id = 'update_lead_status';
  name = 'Update Lead Status';
  description = 'Update the status of a lead in the sales pipeline. Track progression from new to converted or lost.';
  category = 'crm' as const;

  parametersSchema = z.object({
    leadId: z.string().uuid().describe('UUID of the lead'),
    status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).describe('New status for the lead'),
    notes: z.string().optional().describe('Notes about status change')
  });

  requiresPermission = 'leads:write';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    if (!context.organizationId) {
      return {
        success: false,
        error: 'Organization ID is required',
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }

    try {
      const supabase = createAdminClient();

      // Verify lead exists
      const { data: existing, error: checkError } = await supabase
        .from('leads')
        .select('id, status')
        .eq('id', validated.leadId)
        .eq('org_id', context.organizationId)
        .single();

      if (checkError || !existing) {
        return {
          success: false,
          error: 'Lead not found or access denied'
        };
      }

      // Update status
      const updateData: any = {
        status: validated.status,
        updated_at: new Date().toISOString()
      };

      if (validated.notes) {
        updateData.metadata = {
          status_change_note: validated.notes,
          previous_status: existing.status,
          changed_at: new Date().toISOString(),
          changed_by: context.userId || 'system'
        };
      }

      const { data, error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', validated.leadId)
        .eq('org_id', context.organizationId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        metadata: {
          recordsAffected: 1,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Search classes/programs
 */
export class SearchClassesTool extends BaseTool {
  id = 'search_classes';
  name = 'Search Classes';
  description = 'Search for class types/programs by name or category. Returns class definitions, not scheduled sessions.';
  category = 'data' as const;

  parametersSchema = z.object({
    query: z.string().optional().describe('Search query for class name or description'),
    category: z.string().optional().describe('Filter by category'),
    limit: z.number().optional().default(20).describe('Maximum results to return')
  });

  requiresPermission = 'classes:read';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    if (!context.organizationId) {
      return {
        success: false,
        error: 'Organization ID is required',
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }

    try {
      const supabase = createAdminClient();

      let query = supabase
        .from('classes')
        .select('*')
        .eq('org_id', context.organizationId)
        .order('name')
        .limit(validated.limit);

      if (validated.query) {
        const searchPattern = `%${validated.query}%`;
        query = query.or(
          `name.ilike.${searchPattern},` +
          `description.ilike.${searchPattern}`
        );
      }

      if (validated.category) {
        query = query.eq('category', validated.category);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        metadata: {
          recordsAffected: data?.length || 0,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * View class schedule
 */
export class ViewClassScheduleTool extends BaseTool {
  id = 'view_class_schedule';
  name = 'View Class Schedule';
  description = 'Get upcoming class sessions with instructor and booking information. Filter by date range and class type.';
  category = 'data' as const;

  parametersSchema = z.object({
    classId: z.string().uuid().optional().describe('Filter by specific class ID'),
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD), defaults to today'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD), defaults to 7 days from start'),
    status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'all']).optional().default('scheduled').describe('Session status filter'),
    limit: z.number().optional().default(50).describe('Maximum results to return')
  });

  requiresPermission = 'classes:read';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    if (!context.organizationId) {
      return {
        success: false,
        error: 'Organization ID is required',
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }

    try {
      const supabase = createAdminClient();

      const today = new Date().toISOString().split('T')[0];
      const startDate = validated.startDate || today;
      const defaultEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = validated.endDate || defaultEnd;

      let query = supabase
        .from('class_sessions')
        .select(`
          id, start_at, end_at, capacity, status, metadata, waitlist_enabled,
          class:classes(id, name, category, description, duration_minutes, location),
          instructor:users(id, full_name, email)
        `)
        .eq('org_id', context.organizationId)
        .gte('start_at', `${startDate}T00:00:00`)
        .lte('start_at', `${endDate}T23:59:59`)
        .order('start_at', { ascending: true })
        .limit(validated.limit);

      if (validated.classId) {
        query = query.eq('class_id', validated.classId);
      }

      if (validated.status !== 'all') {
        query = query.eq('status', validated.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        metadata: {
          recordsAffected: data?.length || 0,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Check class availability
 */
export class CheckClassAvailabilityTool extends BaseTool {
  id = 'check_class_availability';
  name = 'Check Class Availability';
  description = 'Check available spots for a specific class session. Returns current bookings vs capacity.';
  category = 'data' as const;

  parametersSchema = z.object({
    sessionId: z.string().uuid().describe('UUID of the class session')
  });

  requiresPermission = 'classes:read';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    if (!context.organizationId) {
      return {
        success: false,
        error: 'Organization ID is required',
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }

    try {
      const supabase = createAdminClient();

      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from('class_sessions')
        .select(`
          id, capacity, status, waitlist_enabled,
          class:classes(id, name)
        `)
        .eq('id', validated.sessionId)
        .eq('org_id', context.organizationId)
        .single();

      if (sessionError) throw sessionError;
      if (!session) {
        return {
          success: false,
          error: 'Session not found or access denied'
        };
      }

      // Count current bookings
      const { count: bookedCount, error: countError } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', validated.sessionId)
        .in('status', ['booked', 'attended']);

      if (countError) throw countError;

      const spotsBooked = bookedCount || 0;
      const spotsAvailable = session.capacity - spotsBooked;
      const isFull = spotsAvailable <= 0;
      const canWaitlist = isFull && session.waitlist_enabled;

      return {
        success: true,
        data: {
          sessionId: session.id,
          className: (session.class as any)?.name || 'Unknown',
          capacity: session.capacity,
          spotsBooked,
          spotsAvailable,
          isFull,
          waitlistEnabled: session.waitlist_enabled,
          canWaitlist,
          status: session.status
        },
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * View class bookings
 */
export class ViewClassBookingsTool extends BaseTool {
  id = 'view_class_bookings';
  name = 'View Class Bookings';
  description = 'Get all bookings for a specific class session with client details.';
  category = 'data' as const;

  parametersSchema = z.object({
    sessionId: z.string().uuid().describe('UUID of the class session'),
    includeWaitlist: z.boolean().optional().default(false).describe('Include waitlisted bookings')
  });

  requiresPermission = 'bookings:read';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    if (!context.organizationId) {
      return {
        success: false,
        error: 'Organization ID is required',
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }

    try {
      const supabase = createAdminClient();

      let query = supabase
        .from('bookings')
        .select(`
          id, status, created_at, cancelled_at, attended_at,
          client:clients(id, first_name, last_name, email, phone)
        `)
        .eq('org_id', context.organizationId)
        .eq('session_id', validated.sessionId)
        .order('created_at', { ascending: true });

      if (!validated.includeWaitlist) {
        query = query.neq('status', 'waitlisted');
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        metadata: {
          recordsAffected: data?.length || 0,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Query payments with advanced filters
 */
export class QueryPaymentsTool extends BaseTool {
  id = 'query_payments';
  name = 'Query Payments';
  description = 'Query payment/subscription records with various filters. Useful for financial analysis and reporting.';
  category = 'data' as const;

  parametersSchema = z.object({
    clientId: z.string().uuid().optional().describe('Filter by specific client'),
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
    status: z.enum(['active', 'cancelled', 'expired', 'all']).optional().default('all').describe('Subscription status filter'),
    minAmount: z.number().optional().describe('Minimum amount in cents'),
    limit: z.number().optional().default(50).describe('Maximum results to return')
  });

  requiresPermission = 'payments:read';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    if (!context.organizationId) {
      return {
        success: false,
        error: 'Organization ID is required',
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }

    try {
      const supabase = createAdminClient();

      let query = supabase
        .from('client_subscriptions')
        .select(`
          *,
          client:clients(id, first_name, last_name, email)
        `)
        .eq('org_id', context.organizationId)
        .order('created_at', { ascending: false })
        .limit(validated.limit);

      if (validated.clientId) {
        query = query.eq('client_id', validated.clientId);
      }

      if (validated.startDate) {
        query = query.gte('created_at', validated.startDate);
      }

      if (validated.endDate) {
        query = query.lte('created_at', validated.endDate);
      }

      if (validated.status !== 'all') {
        query = query.eq('status', validated.status);
      }

      if (validated.minAmount !== undefined) {
        query = query.gte('amount_cents', validated.minAmount);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate summary
      const totalAmount = data?.reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0) || 0;

      return {
        success: true,
        data: {
          subscriptions: data || [],
          summary: {
            count: data?.length || 0,
            totalAmountCents: totalAmount,
            totalAmount: totalAmount / 100,
            avgAmountCents: data?.length ? totalAmount / data.length : 0
          }
        },
        metadata: {
          recordsAffected: data?.length || 0,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Query subscriptions
 */
export class QuerySubscriptionsTool extends BaseTool {
  id = 'query_subscriptions';
  name = 'Query Subscriptions';
  description = 'Query active and historical subscriptions with plan details. Filter by status and date range.';
  category = 'data' as const;

  parametersSchema = z.object({
    clientId: z.string().uuid().optional().describe('Filter by specific client'),
    status: z.enum(['active', 'cancelled', 'expired', 'all']).optional().default('active').describe('Subscription status'),
    planId: z.string().uuid().optional().describe('Filter by membership plan'),
    limit: z.number().optional().default(50).describe('Maximum results to return')
  });

  requiresPermission = 'subscriptions:read';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    if (!context.organizationId) {
      return {
        success: false,
        error: 'Organization ID is required',
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }

    try {
      const supabase = createAdminClient();

      let query = supabase
        .from('client_subscriptions')
        .select(`
          *,
          client:clients(id, first_name, last_name, email),
          plan:membership_plans(id, name, price_pennies, billing_period)
        `)
        .eq('org_id', context.organizationId)
        .order('created_at', { ascending: false })
        .limit(validated.limit);

      if (validated.clientId) {
        query = query.eq('client_id', validated.clientId);
      }

      if (validated.status !== 'all') {
        query = query.eq('status', validated.status);
      }

      if (validated.planId) {
        query = query.eq('plan_id', validated.planId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        metadata: {
          recordsAffected: data?.length || 0,
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

/**
 * Calculate member engagement score
 */
export class CalculateEngagementScoreTool extends BaseTool {
  id = 'calculate_engagement_score';
  name = 'Calculate Engagement Score';
  description = 'Calculate engagement score for a member based on attendance, bookings, and activity. Returns score 0-100.';
  category = 'analytics' as const;

  parametersSchema = z.object({
    clientId: z.string().uuid().describe('UUID of the client'),
    periodDays: z.number().optional().default(30).describe('Number of days to analyze (default: 30)')
  });

  requiresPermission = 'analytics:read';

  async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    if (!context.organizationId) {
      return {
        success: false,
        error: 'Organization ID is required',
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }

    try {
      const supabase = createAdminClient();

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - validated.periodDays * 24 * 60 * 60 * 1000);

      // Get bookings in period
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, status, attended_at')
        .eq('org_id', context.organizationId)
        .eq('client_id', validated.clientId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (bookingsError) throw bookingsError;

      const totalBookings = bookings?.length || 0;
      const attendedBookings = bookings?.filter(b => b.status === 'attended').length || 0;
      const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0;
      const noShowBookings = bookings?.filter(b => b.status === 'no_show').length || 0;

      // Calculate engagement metrics
      const attendanceRate = totalBookings > 0 ? (attendedBookings / totalBookings) * 100 : 0;
      const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;
      const noShowRate = totalBookings > 0 ? (noShowBookings / totalBookings) * 100 : 0;

      // Calculate engagement score (0-100)
      // Weighted formula:
      // - 40% attendance rate
      // - 30% booking frequency (normalized to expected 2-3x per week)
      // - 20% penalty for cancellations
      // - 10% penalty for no-shows

      const expectedBookingsPerPeriod = (validated.periodDays / 7) * 2.5; // 2.5 bookings per week
      const bookingFrequencyScore = Math.min(100, (totalBookings / expectedBookingsPerPeriod) * 100);

      const engagementScore = Math.round(
        (attendanceRate * 0.4) +
        (bookingFrequencyScore * 0.3) -
        (cancellationRate * 0.2) -
        (noShowRate * 0.1)
      );

      const finalScore = Math.max(0, Math.min(100, engagementScore));

      return {
        success: true,
        data: {
          clientId: validated.clientId,
          periodDays: validated.periodDays,
          score: finalScore,
          metrics: {
            totalBookings,
            attendedBookings,
            cancelledBookings,
            noShowBookings,
            attendanceRate: Math.round(attendanceRate * 10) / 10,
            cancellationRate: Math.round(cancellationRate * 10) / 10,
            noShowRate: Math.round(noShowRate * 10) / 10,
            bookingFrequencyScore: Math.round(bookingFrequencyScore * 10) / 10
          },
          interpretation: finalScore >= 80 ? 'Highly Engaged' :
                         finalScore >= 60 ? 'Moderately Engaged' :
                         finalScore >= 40 ? 'At Risk' : 'Low Engagement'
        },
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
}

// Export all data tools
export const DATA_TOOLS = [
  new SearchClientsTool(),
  new ViewClientProfileTool(),
  new ViewClientBookingsTool(),
  new ViewClientPaymentsTool(),
  new UpdateClientStatusTool(),
  new SearchLeadsTool(),
  new ViewLeadProfileTool(),
  new UpdateLeadStatusTool(),
  new SearchClassesTool(),
  new ViewClassScheduleTool(),
  new CheckClassAvailabilityTool(),
  new ViewClassBookingsTool(),
  new QueryPaymentsTool(),
  new QuerySubscriptionsTool(),
  new CalculateEngagementScoreTool()
];
