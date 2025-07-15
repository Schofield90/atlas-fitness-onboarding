import { Database } from '@/lib/supabase/database.types'

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Type aliases for easier use
export type Organization = Tables<'organizations'>
export type User = Tables<'users'>
export type Lead = Tables<'leads'>
export type Client = Tables<'clients'>
export type Interaction = Tables<'interactions'>
export type Campaign = Tables<'campaigns'>
export type Workflow = Tables<'workflows'>
export type Task = Tables<'tasks'>
export type AnalyticsEvent = Tables<'analytics_events'>

// Insert types
export type OrganizationInsert = Inserts<'organizations'>
export type UserInsert = Inserts<'users'>
export type LeadInsert = Inserts<'leads'>
export type ClientInsert = Inserts<'clients'>
export type InteractionInsert = Inserts<'interactions'>
export type CampaignInsert = Inserts<'campaigns'>
export type WorkflowInsert = Inserts<'workflows'>
export type TaskInsert = Inserts<'tasks'>
export type AnalyticsEventInsert = Inserts<'analytics_events'>

// Update types
export type OrganizationUpdate = Updates<'organizations'>
export type UserUpdate = Updates<'users'>
export type LeadUpdate = Updates<'leads'>
export type ClientUpdate = Updates<'clients'>
export type InteractionUpdate = Updates<'interactions'>
export type CampaignUpdate = Updates<'campaigns'>
export type WorkflowUpdate = Updates<'workflows'>
export type TaskUpdate = Updates<'tasks'>
export type AnalyticsEventUpdate = Updates<'analytics_events'>

// Enums
export type UserRole = 'owner' | 'admin' | 'staff' | 'viewer'
export type LeadStatus = 'cold' | 'warm' | 'hot' | 'converted' | 'lost'
export type MembershipStatus = 'active' | 'paused' | 'cancelled'
export type InteractionType = 'email' | 'sms' | 'call' | 'meeting' | 'whatsapp' | 'telegram' | 'note'
export type InteractionDirection = 'inbound' | 'outbound'
export type CampaignType = 'facebook' | 'instagram' | 'google' | 'email' | 'sms' | 'whatsapp'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed'
export type TriggerType = 'webhook' | 'schedule' | 'event'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type SubscriptionPlan = 'free' | 'basic' | 'premium' | 'enterprise'
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired'

// Extended types with relationships
export type LeadWithDetails = Lead & {
  assigned_user?: Pick<User, 'id' | 'name' | 'email'>
  campaign?: Pick<Campaign, 'id' | 'name' | 'type'>
  interactions_count?: number
  latest_interaction?: Pick<Interaction, 'type' | 'created_at'>
}

export type ClientWithDetails = Client & {
  lead?: Pick<Lead, 'id' | 'source' | 'campaign_id'>
  interactions_count?: number
  latest_interaction?: Pick<Interaction, 'type' | 'created_at'>
}

export type TaskWithDetails = Task & {
  assigned_user?: Pick<User, 'id' | 'name' | 'email'>
  created_user?: Pick<User, 'id' | 'name' | 'email'>
  lead?: Pick<Lead, 'id' | 'name' | 'email'>
  client?: Pick<Client, 'id' | 'name' | 'email'>
}

export type InteractionWithDetails = Interaction & {
  created_user?: Pick<User, 'id' | 'name' | 'email'>
  lead?: Pick<Lead, 'id' | 'name' | 'email'>
  client?: Pick<Client, 'id' | 'name' | 'email'>
}

// API Response types
export type ApiResponse<T = any> = {
  data?: T
  error?: string
  message?: string
}

// Dashboard metrics types
export type DashboardMetrics = {
  total_leads: number
  active_clients: number
  conversion_rate: number
  total_revenue: number
  leads_this_month: number
  clients_this_month: number
  revenue_this_month: number
  avg_lead_score: number
}

// AI Analysis types
export type AIAnalysis = {
  score: number
  qualification: 'high' | 'medium' | 'low'
  insights: string[]
  recommended_actions: string[]
  next_best_action: string
  confidence: number
}

// Workflow action types
export type WorkflowAction = {
  type: 'email' | 'sms' | 'task' | 'webhook' | 'update_field'
  config: Record<string, any>
  delay?: number // in minutes
  conditions?: WorkflowCondition[]
}

export type WorkflowCondition = {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
  value: any
}