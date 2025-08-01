import { supabase } from '@/lib/supabase/client';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  subscription_plan: 'free' | 'basic' | 'premium' | 'enterprise';
  subscription_status: 'active' | 'cancelled' | 'expired';
  settings: any;
  branding?: {
    primary_color?: string;
    logo_url?: string;
    favicon_url?: string;
  };
  features?: {
    booking?: boolean;
    referrals?: boolean;
    coaching?: boolean;
    ai_insights?: boolean;
  };
}

export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('Error fetching organization:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getOrganizationBySlug:', error);
    return null;
  }
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching organization:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getOrganizationById:', error);
    return null;
  }
}

export async function updateOrganizationBranding(
  organizationId: string, 
  branding: Partial<Organization['branding']>
) {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .update({ branding })
      .eq('id', organizationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating organization branding:', error);
    throw error;
  }
}