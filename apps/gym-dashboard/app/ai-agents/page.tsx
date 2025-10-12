'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/app/hooks/useOrganization';

/**
 * Top-level /ai-agents route that redirects to organization-scoped route
 * Redirects to /org/[orgSlug]/ai-agents
 */
export default function AIAgentsRedirect() {
  const router = useRouter();
  const { organization, loading } = useOrganization();

  useEffect(() => {
    if (!loading && organization?.slug) {
      // Redirect to organization-scoped AI agents page
      router.replace(`/org/${organization.slug}/ai-agents`);
    }
  }, [loading, organization, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return null;
}
