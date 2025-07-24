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
      programs: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          duration_weeks: number | null
          price_pennies: number | null
          max_participants: number
          program_type: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          duration_weeks?: number | null
          price_pennies?: number | null
          max_participants?: number
          program_type?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          duration_weeks?: number | null
          price_pennies?: number | null
          max_participants?: number
          program_type?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      class_sessions: {
        Row: {
          id: string
          organization_id: string
          program_id: string
          trainer_id: string | null
          name: string | null
          description: string | null
          start_time: string
          end_time: string
          max_capacity: number
          current_bookings: number
          room_location: string | null
          session_status: string
          repeat_pattern: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          program_id: string
          trainer_id?: string | null
          name?: string | null
          description?: string | null
          start_time: string
          end_time: string
          max_capacity?: number
          current_bookings?: number
          room_location?: string | null
          session_status?: string
          repeat_pattern?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          program_id?: string
          trainer_id?: string | null
          name?: string | null
          description?: string | null
          start_time?: string
          end_time?: string
          max_capacity?: number
          current_bookings?: number
          room_location?: string | null
          session_status?: string
          repeat_pattern?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          customer_id: string
          class_session_id: string
          booking_status: string
          booking_time: string
          payment_status: string
          stripe_payment_intent_id: string | null
          attended_at: string | null
          cancelled_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          class_session_id: string
          booking_status?: string
          booking_time?: string
          payment_status?: string
          stripe_payment_intent_id?: string | null
          attended_at?: string | null
          cancelled_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          class_session_id?: string
          booking_status?: string
          booking_time?: string
          payment_status?: string
          stripe_payment_intent_id?: string | null
          attended_at?: string | null
          cancelled_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      waitlist: {
        Row: {
          id: string
          customer_id: string
          class_session_id: string
          position: number
          joined_at: string
          auto_book: boolean
          notified_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          class_session_id: string
          position: number
          joined_at?: string
          auto_book?: boolean
          notified_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          class_session_id?: string
          position?: number
          joined_at?: string
          auto_book?: boolean
          notified_at?: string | null
          created_at?: string
        }
      }
      memberships: {
        Row: {
          id: string
          customer_id: string
          program_id: string | null
          stripe_subscription_id: string | null
          membership_status: string
          start_date: string
          end_date: string | null
          credits_remaining: number | null
          unlimited_access: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          program_id?: string | null
          stripe_subscription_id?: string | null
          membership_status?: string
          start_date: string
          end_date?: string | null
          credits_remaining?: number | null
          unlimited_access?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          program_id?: string | null
          stripe_subscription_id?: string | null
          membership_status?: string
          start_date?: string
          end_date?: string | null
          credits_remaining?: number | null
          unlimited_access?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      class_credits: {
        Row: {
          id: string
          customer_id: string
          program_id: string | null
          credits_purchased: number
          credits_used: number
          credits_remaining: number
          expiry_date: string | null
          purchase_date: string
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          program_id?: string | null
          credits_purchased: number
          credits_used?: number
          expiry_date?: string | null
          purchase_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          program_id?: string | null
          credits_purchased?: number
          credits_used?: number
          expiry_date?: string | null
          purchase_date?: string
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
  }
}