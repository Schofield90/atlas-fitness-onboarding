import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getOrganizationBySlug, Organization } from '@/lib/api/organizations';

export function useOrganization() {
  const params = useParams();
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get organization slug from URL params or subdomain
  const organizationSlug = params.organization as string || getSubdomain();

  useEffect(() => {
    async function loadOrganization() {
      if (!organizationSlug) {
        setError('No organization specified');
        setLoading(false);
        return;
      }

      try {
        const org = await getOrganizationBySlug(organizationSlug);
        
        if (!org) {
          setError('Organization not found');
          // Redirect to a generic error page or home
          router.push('/organization-not-found');
          return;
        }

        // Check if organization is active
        if (org.subscription_status !== 'active') {
          setError('This organization is not active');
          router.push('/organization-inactive');
          return;
        }

        setOrganization(org);
        
        // Apply branding
        applyOrganizationBranding(org);
        
      } catch (err) {
        console.error('Failed to load organization:', err);
        setError('Failed to load organization');
      } finally {
        setLoading(false);
      }
    }

    loadOrganization();
  }, [organizationSlug, router]);

  return { organization, loading, error };
}

function getSubdomain(): string | null {
  if (typeof window === 'undefined') return null;
  
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // Check if we have a subdomain (not www, app, or localhost)
  if (parts.length >= 2 && !['www', 'app', 'localhost', '127'].includes(parts[0])) {
    return parts[0];
  }
  
  return null;
}

function applyOrganizationBranding(org: Organization) {
  if (!org.branding) return;

  // Apply primary color
  if (org.branding.primary_color) {
    document.documentElement.style.setProperty('--primary', org.branding.primary_color);
    // Also set related color variables
    document.documentElement.style.setProperty('--primary-foreground', '#ffffff');
  }

  // Update page title
  document.title = `${org.name} - Member Portal`;

  // Update favicon
  if (org.branding.favicon_url) {
    updateFavicon(org.branding.favicon_url);
  }

  // Add organization class for custom CSS
  document.body.classList.add(`org-${org.slug}`);
}

function updateFavicon(url: string) {
  // Remove existing favicons
  const existingLinks = document.querySelectorAll("link[rel*='icon']");
  existingLinks.forEach(link => link.remove());

  // Add new favicon
  const link = document.createElement('link');
  link.type = 'image/x-icon';
  link.rel = 'shortcut icon';
  link.href = url;
  document.getElementsByTagName('head')[0].appendChild(link);
}