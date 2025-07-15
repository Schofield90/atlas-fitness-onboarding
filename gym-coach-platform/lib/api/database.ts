import { supabaseAdmin } from './middleware'
import type { Database } from '@/lib/supabase/database.types'

type TableName = keyof Database['public']['Tables']

export class DatabaseService {
  static async findById<T extends TableName>(
    table: T,
    id: string,
    organizationId: string,
    select = '*'
  ) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(select)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      throw new Error(`Failed to fetch ${table} record`)
    }

    return data
  }

  static async findMany<T extends TableName>(
    table: T,
    organizationId: string,
    options: {
      select?: string
      filters?: Record<string, any>
      sort?: { column: string; ascending?: boolean }
      pagination?: { page: number; limit: number }
    } = {}
  ) {
    const { select = '*', filters = {}, sort, pagination } = options

    let query = supabaseAdmin
      .from(table)
      .select(select, { count: 'exact' })
      .eq('organization_id', organizationId)

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value)
      }
    })

    // Apply sorting
    if (sort) {
      query = query.order(sort.column, { ascending: sort.ascending ?? false })
    }

    // Apply pagination
    if (pagination) {
      const { page, limit } = pagination
      query = query.range((page - 1) * limit, page * limit - 1)
    }

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Failed to fetch ${table} records`)
    }

    return { data, count }
  }

  static async create<T extends TableName>(
    table: T,
    data: any,
    organizationId: string,
    select = '*'
  ) {
    const { data: newRecord, error } = await supabaseAdmin
      .from(table)
      .insert({ ...data, organization_id: organizationId })
      .select(select)
      .single()

    if (error) {
      throw new Error(`Failed to create ${table} record`)
    }

    return newRecord
  }

  static async update<T extends TableName>(
    table: T,
    id: string,
    data: any,
    organizationId: string,
    select = '*'
  ) {
    const { data: updatedRecord, error } = await supabaseAdmin
      .from(table)
      .update(data)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select(select)
      .single()

    if (error) {
      throw new Error(`Failed to update ${table} record`)
    }

    return updatedRecord
  }

  static async delete<T extends TableName>(
    table: T,
    id: string,
    organizationId: string
  ) {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (error) {
      throw new Error(`Failed to delete ${table} record`)
    }

    return true
  }

  static async logAnalyticsEvent(
    organizationId: string,
    eventType: string,
    eventName: string,
    properties: Record<string, any>,
    userId?: string,
    leadId?: string,
    clientId?: string
  ) {
    const { error } = await supabaseAdmin
      .from('analytics_events')
      .insert({
        organization_id: organizationId,
        event_type: eventType,
        event_name: eventName,
        properties,
        user_id: userId,
        lead_id: leadId,
        client_id: clientId
      })

    if (error) {
      console.error('Failed to log analytics event:', error)
    }
  }

  static async getOrganizationMetrics(organizationId: string) {
    const [leadsResult, clientsResult, campaignsResult, tasksResult] = await Promise.all([
      supabaseAdmin
        .from('leads')
        .select('id, status, lead_score, created_at')
        .eq('organization_id', organizationId),
      
      supabaseAdmin
        .from('clients')
        .select('id, membership_status, total_revenue, created_at')
        .eq('organization_id', organizationId),
      
      supabaseAdmin
        .from('campaigns')
        .select('id, status, spend, conversions, impressions, clicks')
        .eq('organization_id', organizationId),
      
      supabaseAdmin
        .from('tasks')
        .select('id, status, priority, created_at')
        .eq('organization_id', organizationId)
    ])

    const leads = leadsResult.data || []
    const clients = clientsResult.data || []
    const campaigns = campaignsResult.data || []
    const tasks = tasksResult.data || []

    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    return {
      leads: {
        total: leads.length,
        by_status: {
          cold: leads.filter(l => l.status === 'cold').length,
          warm: leads.filter(l => l.status === 'warm').length,
          hot: leads.filter(l => l.status === 'hot').length,
          converted: leads.filter(l => l.status === 'converted').length,
          lost: leads.filter(l => l.status === 'lost').length
        },
        this_month: leads.filter(l => new Date(l.created_at) >= thisMonth).length,
        avg_score: leads.length > 0 
          ? Math.round(leads.reduce((sum, l) => sum + (l.lead_score || 0), 0) / leads.length)
          : 0
      },
      clients: {
        total: clients.length,
        active: clients.filter(c => c.membership_status === 'active').length,
        paused: clients.filter(c => c.membership_status === 'paused').length,
        cancelled: clients.filter(c => c.membership_status === 'cancelled').length,
        this_month: clients.filter(c => new Date(c.created_at) >= thisMonth).length,
        total_revenue: clients.reduce((sum, c) => sum + (c.total_revenue || 0), 0),
        revenue_this_month: clients
          .filter(c => new Date(c.created_at) >= thisMonth)
          .reduce((sum, c) => sum + (c.total_revenue || 0), 0)
      },
      campaigns: {
        total: campaigns.length,
        active: campaigns.filter(c => c.status === 'active').length,
        total_spend: campaigns.reduce((sum, c) => sum + (c.spend || 0), 0),
        total_conversions: campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0),
        total_impressions: campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0),
        total_clicks: campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0)
      },
      tasks: {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        overdue: tasks.filter(t => t.status === 'pending' && new Date(t.created_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length
      },
      conversion_rate: leads.length > 0 
        ? Math.round((leads.filter(l => l.status === 'converted').length / leads.length) * 100)
        : 0
    }
  }
}