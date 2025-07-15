export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          email: string
          subscription_plan: 'free' | 'basic' | 'premium' | 'enterprise'
          subscription_status: 'active' | 'cancelled' | 'expired'
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          subscription_plan?: 'free' | 'basic' | 'premium' | 'enterprise'
          subscription_status?: 'active' | 'cancelled' | 'expired'
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          subscription_plan?: 'free' | 'basic' | 'premium' | 'enterprise'
          subscription_status?: 'active' | 'cancelled' | 'expired'
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          organization_id: string
          email: string
          name: string
          role: 'owner' | 'admin' | 'staff' | 'viewer'
          avatar_url: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          name: string
          role?: 'owner' | 'admin' | 'staff' | 'viewer'
          avatar_url?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          name?: string
          role?: 'owner' | 'admin' | 'staff' | 'viewer'
          avatar_url?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          organization_id: string
          name: string
          email: string
          phone: string | null
          status: 'cold' | 'warm' | 'hot' | 'converted' | 'lost'
          lead_score: number
          source: string
          campaign_id: string | null
          metadata: Json
          ai_analysis: Json | null
          qualification_notes: string | null
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          email: string
          phone?: string | null
          status?: 'cold' | 'warm' | 'hot' | 'converted' | 'lost'
          lead_score?: number
          source: string
          campaign_id?: string | null
          metadata?: Json
          ai_analysis?: Json | null
          qualification_notes?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          email?: string
          phone?: string | null
          status?: 'cold' | 'warm' | 'hot' | 'converted' | 'lost'
          lead_score?: number
          source?: string
          campaign_id?: string | null
          metadata?: Json
          ai_analysis?: Json | null
          qualification_notes?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          organization_id: string
          lead_id: string | null
          name: string
          email: string
          phone: string | null
          membership_type: string
          membership_status: 'active' | 'paused' | 'cancelled'
          start_date: string
          end_date: string | null
          total_revenue: number
          engagement_score: number
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          lead_id?: string | null
          name: string
          email: string
          phone?: string | null
          membership_type: string
          membership_status?: 'active' | 'paused' | 'cancelled'
          start_date: string
          end_date?: string | null
          total_revenue?: number
          engagement_score?: number
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          lead_id?: string | null
          name?: string
          email?: string
          phone?: string | null
          membership_type?: string
          membership_status?: 'active' | 'paused' | 'cancelled'
          start_date?: string
          end_date?: string | null
          total_revenue?: number
          engagement_score?: number
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      interactions: {
        Row: {
          id: string
          organization_id: string
          lead_id: string | null
          client_id: string | null
          type: 'email' | 'sms' | 'call' | 'meeting' | 'whatsapp' | 'telegram' | 'note'
          direction: 'inbound' | 'outbound'
          subject: string | null
          content: string
          metadata: Json
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          lead_id?: string | null
          client_id?: string | null
          type: 'email' | 'sms' | 'call' | 'meeting' | 'whatsapp' | 'telegram' | 'note'
          direction: 'inbound' | 'outbound'
          subject?: string | null
          content: string
          metadata?: Json
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          lead_id?: string | null
          client_id?: string | null
          type?: 'email' | 'sms' | 'call' | 'meeting' | 'whatsapp' | 'telegram' | 'note'
          direction?: 'inbound' | 'outbound'
          subject?: string | null
          content?: string
          metadata?: Json
          created_by?: string
          created_at?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          organization_id: string
          name: string
          type: 'facebook' | 'instagram' | 'google' | 'email' | 'sms' | 'whatsapp'
          status: 'draft' | 'active' | 'paused' | 'completed'
          budget: number
          spend: number
          impressions: number
          clicks: number
          conversions: number
          settings: Json
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          type: 'facebook' | 'instagram' | 'google' | 'email' | 'sms' | 'whatsapp'
          status?: 'draft' | 'active' | 'paused' | 'completed'
          budget?: number
          spend?: number
          impressions?: number
          clicks?: number
          conversions?: number
          settings?: Json
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          type?: 'facebook' | 'instagram' | 'google' | 'email' | 'sms' | 'whatsapp'
          status?: 'draft' | 'active' | 'paused' | 'completed'
          budget?: number
          spend?: number
          impressions?: number
          clicks?: number
          conversions?: number
          settings?: Json
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      workflows: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          trigger_type: 'webhook' | 'schedule' | 'event'
          trigger_config: Json
          actions: Json
          is_active: boolean
          execution_count: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          trigger_type: 'webhook' | 'schedule' | 'event'
          trigger_config: Json
          actions: Json
          is_active?: boolean
          execution_count?: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          trigger_type?: 'webhook' | 'schedule' | 'event'
          trigger_config?: Json
          actions?: Json
          is_active?: boolean
          execution_count?: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          organization_id: string
          title: string
          description: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          due_date: string | null
          assigned_to: string
          created_by: string
          lead_id: string | null
          client_id: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          description?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          due_date?: string | null
          assigned_to: string
          created_by: string
          lead_id?: string | null
          client_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          description?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          due_date?: string | null
          assigned_to?: string
          created_by?: string
          lead_id?: string | null
          client_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      analytics_events: {
        Row: {
          id: string
          organization_id: string
          event_type: string
          event_name: string
          properties: Json
          user_id: string | null
          lead_id: string | null
          client_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          event_type: string
          event_name: string
          properties: Json
          user_id?: string | null
          lead_id?: string | null
          client_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          event_type?: string
          event_name?: string
          properties?: Json
          user_id?: string | null
          lead_id?: string | null
          client_id?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}