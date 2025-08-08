import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Custom storage implementation using AsyncStorage
const customStorage = {
  getItem: async (key: string) => {
    try {
      const item = await AsyncStorage.getItem(key);
      return item;
    } catch (error) {
      console.error('Error getting item from storage:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting item in storage:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item from storage:', error);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Handle app state changes for token refresh
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

// Database types
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone_number: string | null;
          avatar_url: string | null;
          date_of_birth: string | null;
          emergency_contact: {
            name: string;
            phone: string;
            relationship: string;
          } | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          primary_color: string;
          secondary_color: string;
          accent_color: string;
          contact_email: string;
          contact_phone: string;
          address: {
            street: string;
            city: string;
            state: string;
            zip_code: string;
            country: string;
          };
          timezone: string;
          features: {
            class_booking: boolean;
            personal_training: boolean;
            nutrition_plans: boolean;
            online_classes: boolean;
            messaging: boolean;
          };
          social_media: {
            facebook?: string;
            instagram?: string;
            twitter?: string;
            youtube?: string;
          } | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['organizations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
      };
      user_organizations: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          role: 'member' | 'instructor' | 'admin' | 'owner';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_organizations']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['user_organizations']['Insert']>;
      };
      membership_plans: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string;
          price: number;
          interval: 'monthly' | 'quarterly' | 'yearly';
          features: string[];
          max_classes_per_month: number | null;
          personal_training_sessions: number | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['membership_plans']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['membership_plans']['Insert']>;
      };
      memberships: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          membership_plan_id: string;
          status: 'active' | 'paused' | 'cancelled' | 'expired';
          start_date: string;
          end_date: string | null;
          next_billing_date: string | null;
          stripe_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['memberships']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['memberships']['Insert']>;
      };
      class_types: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string;
          duration: number;
          max_participants: number;
          equipment: string[] | null;
          level: 'beginner' | 'intermediate' | 'advanced' | 'all';
          calories: number | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['class_types']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['class_types']['Insert']>;
      };
      instructors: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          bio: string;
          specialties: string[];
          certifications: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['instructors']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['instructors']['Insert']>;
      };
      classes: {
        Row: {
          id: string;
          organization_id: string;
          class_type_id: string;
          instructor_id: string;
          start_time: string;
          end_time: string;
          max_participants: number;
          current_participants: number;
          status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
          location: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['classes']['Row'], 'id' | 'current_participants' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['classes']['Insert']>;
      };
      class_bookings: {
        Row: {
          id: string;
          user_id: string;
          class_id: string;
          status: 'confirmed' | 'waitlisted' | 'cancelled' | 'attended' | 'no-show';
          checked_in_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['class_bookings']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['class_bookings']['Insert']>;
      };
      check_ins: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          type: 'qr' | 'manual' | 'class';
          class_id: string | null;
          checked_in_at: string;
          checked_out_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['check_ins']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['check_ins']['Insert']>;
      };
      conversations: {
        Row: {
          id: string;
          type: 'direct' | 'group' | 'support';
          name: string | null;
          last_message_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
      };
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: 'member' | 'admin';
          joined_at: string;
          last_read_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['conversation_participants']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['conversation_participants']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          type: 'text' | 'image' | 'file';
          attachment_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          type: 'class-reminder' | 'booking-confirmed' | 'membership-expiring' | 'announcement' | 'message';
          data: Record<string, any> | null;
          read: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      payment_methods: {
        Row: {
          id: string;
          user_id: string;
          type: 'card' | 'bank_account';
          last4: string;
          brand: string | null;
          expiry_month: number | null;
          expiry_year: number | null;
          is_default: boolean;
          stripe_payment_method_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['payment_methods']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['payment_methods']['Insert']>;
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          amount: number;
          currency: string;
          status: 'pending' | 'succeeded' | 'failed' | 'refunded';
          description: string;
          payment_method_id: string;
          stripe_payment_intent_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};