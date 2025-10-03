'use client'

import React from 'react'

interface LeadTriggerConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

export default function LeadTriggerConfig({ config, onChange, organizationId }: LeadTriggerConfigProps) {
  return (
    <div className="space-y-6">
      <div>
        <p>Lead Trigger Config</p>
      </div>
    </div>
  )
}