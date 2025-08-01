"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

interface Organization {
  id: string;
  name: string;
  slug: string;
  branding: {
    primary_color?: string;
    logo_url?: string;
    favicon_url?: string;
  };
  settings: {
    features?: {
      booking?: boolean;
      referrals?: boolean;
      coaching?: boolean;
    };
  };
}

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const organizationSlug = params.organization as string;
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrganization() {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('slug', organizationSlug)
          .single();

        if (error) throw error;
        
        setOrganization(data);
        
        // Apply organization branding
        if (data?.branding?.primary_color) {
          document.documentElement.style.setProperty('--primary', data.branding.primary_color);
        }
        
        // Update page title
        if (data?.name) {
          document.title = data.name;
        }
        
        // Update favicon
        if (data?.branding?.favicon_url) {
          const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (link) {
            link.href = data.branding.favicon_url;
          }
        }
      } catch (error) {
        console.error('Failed to load organization:', error);
      } finally {
        setLoading(false);
      }
    }

    if (organizationSlug) {
      loadOrganization();
    }
  }, [organizationSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Organization Not Found</h1>
          <p className="text-muted-foreground">The gym you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Provide organization context to all child components
  return (
    <OrganizationProvider value={organization}>
      {children}
    </OrganizationProvider>
  );
}

// Context Provider for organization data
import { createContext, useContext } from 'react';

const OrganizationContext = createContext<Organization | null>(null);

export function OrganizationProvider({ 
  children, 
  value 
}: { 
  children: React.ReactNode;
  value: Organization;
}) {
  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
}