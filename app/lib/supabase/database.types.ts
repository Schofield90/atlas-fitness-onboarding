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
          created_at: string
          updated_at: string
          settings: Json | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
          settings?: Json | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
          settings?: Json | null
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          organization_id: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          organization_id: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          organization_id?: string
          role?: string
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
          phone: string
          source: string
          status: string
          form_name: string | null
          campaign_name: string | null
          facebook_lead_id: string | null
          page_id: string | null
          form_id: string | null
          custom_fields: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          email: string
          phone: string
          source?: string
          status?: string
          form_name?: string | null
          campaign_name?: string | null
          facebook_lead_id?: string | null
          page_id?: string | null
          form_id?: string | null
          custom_fields?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          email?: string
          phone?: string
          source?: string
          status?: string
          form_name?: string | null
          campaign_name?: string | null
          facebook_lead_id?: string | null
          page_id?: string | null
          form_id?: string | null
          custom_fields?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      facebook_pages: {
        Row: {
          id: string
          organization_id: string
          page_id: string
          name: string
          access_token: string
          webhook_active: boolean
          webhook_activated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          page_id: string
          name: string
          access_token: string
          webhook_active?: boolean
          webhook_activated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          page_id?: string
          name?: string
          access_token?: string
          webhook_active?: boolean
          webhook_activated_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      facebook_integrations: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          access_token: string
          user_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          access_token: string
          user_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          access_token?: string
          user_data?: Json | null
          created_at?: string
          updated_at?: string
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
  }
}