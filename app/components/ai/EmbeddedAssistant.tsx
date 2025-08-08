'use client'

import { useEffect, useState } from 'react'
import { AIAssistant } from './AIAssistant'

interface EmbeddedAssistantProps {
  organizationId?: string
}

export function EmbeddedAssistant({ organizationId: propOrgId }: EmbeddedAssistantProps) {
  const [organizationId, setOrganizationId] = useState<string | null>(propOrgId || null)
  
  useEffect(() => {
    if (!propOrgId) {
      // Get organization ID from context if not provided
      import('@/app/lib/organization-client').then(({ getCurrentUserOrganization }) => {
        getCurrentUserOrganization().then(({ organizationId: orgId }) => {
          if (orgId) setOrganizationId(orgId)
        })
      })
    }
  }, [propOrgId])
  
  if (!organizationId) return null
  
  return <AIAssistant organizationId={organizationId} embedded />
}