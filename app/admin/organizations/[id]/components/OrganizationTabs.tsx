'use client'

import { useState } from 'react'
import BillingTab from './tabs/BillingTab'
import PaymentsTab from './tabs/PaymentsTab'
import UsersTab from './tabs/UsersTab'
import ActivityTab from './tabs/ActivityTab'
import SettingsTab from './tabs/SettingsTab'

interface OrganizationTabsProps {
  organizationId: string
}

export default function OrganizationTabs({ organizationId }: OrganizationTabsProps) {
  const [activeTab, setActiveTab] = useState('billing')

  const tabs = [
    { id: 'billing', name: 'Billing', component: BillingTab },
    { id: 'payments', name: 'Payments', component: PaymentsTab },
    { id: 'users', name: 'Users', component: UsersTab },
    { id: 'activity', name: 'Activity', component: ActivityTab },
    { id: 'settings', name: 'Settings', component: SettingsTab }
  ]

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || BillingTab

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-6 text-sm font-medium border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        <ActiveComponent organizationId={organizationId} />
      </div>
    </div>
  )
}