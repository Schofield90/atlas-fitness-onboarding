import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/app/lib/supabase/admin'
import OrganizationHeader from './components/OrganizationHeader'
import OrganizationTabs from './components/OrganizationTabs'
import ImpersonationControls from './components/ImpersonationControls'

interface PageProps {
  params: {
    id: string
  }
}

export default async function OrganizationDetailPage({ params }: PageProps) {
  const supabase = createAdminClient()

  // Fetch organization with all related data
  const { data: organization, error } = await supabase
    .from('organizations')
    .select(`
      *,
      billing_subscriptions(*),
      billing_customers(*),
      connected_accounts(*),
      user_organizations(count)
    `)
    .eq('id', params.id)
    .single()

  if (error || !organization) {
    notFound()
  }

  // Fetch metrics
  const { data: metrics } = await supabase
    .from('admin_organization_metrics')
    .select('*')
    .eq('id', params.id)
    .single()

  return (
    <div className="space-y-6">
      <OrganizationHeader organization={organization} metrics={metrics} />
      
      <ImpersonationControls organizationId={params.id} organizationName={organization.name} />

      <Suspense fallback={<div className="animate-pulse h-96 bg-gray-200 rounded-lg" />}>
        <OrganizationTabs organizationId={params.id} />
      </Suspense>
    </div>
  )
}