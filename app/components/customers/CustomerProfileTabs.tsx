'use client'

import { useState } from 'react'
import ProfileTab from './tabs/ProfileTab'
import ActivityTab from './tabs/ActivityTab'
import MessagesTab from './tabs/MessagesTab'
import RegistrationsTab from './tabs/RegistrationsTab'
import WaiversTab from './tabs/WaiversTab'
import FamilyTab from './tabs/FamilyTab'
import PaymentsTab from './tabs/PaymentsTab'
import MembershipsTab from './tabs/MembershipsTab'
import FormsTab from './tabs/FormsTab'
import IssuesTab from './tabs/IssuesTab'

interface CustomerProfileTabsProps {
  customer: any
  onUpdate: () => void
}

export default function CustomerProfileTabs({ customer, onUpdate }: CustomerProfileTabsProps) {
  const [activeTab, setActiveTab] = useState('profile')

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'activity', label: 'Activity' },
    { id: 'messages', label: 'Messages' },
    { id: 'registrations', label: 'Registrations' },
    { id: 'waivers', label: 'Waivers' },
    { id: 'family', label: 'Family' },
    { id: 'payments', label: 'Payments' },
    { id: 'memberships', label: 'Memberships' },
    { id: 'forms', label: 'Forms' },
    { id: 'issues', label: 'Issues' },
  ]

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-3 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'profile' && <ProfileTab customer={customer} onUpdate={onUpdate} />}
        {activeTab === 'activity' && <ActivityTab customerId={customer.id} />}
        {activeTab === 'messages' && <MessagesTab customerId={customer.id} customer={customer} />}
        {activeTab === 'registrations' && <RegistrationsTab customerId={customer.id} />}
        {activeTab === 'waivers' && <WaiversTab customerId={customer.id} />}
        {activeTab === 'family' && <FamilyTab customerId={customer.id} organizationId={customer.organization_id} />}
        {activeTab === 'payments' && <PaymentsTab customerId={customer.id} organizationId={customer.organization_id} />}
        {activeTab === 'memberships' && <MembershipsTab customerId={customer.id} />}
        {activeTab === 'forms' && <FormsTab customerId={customer.id} />}
        {activeTab === 'issues' && <IssuesTab customerId={customer.id} />}
      </div>
    </div>
  )
}