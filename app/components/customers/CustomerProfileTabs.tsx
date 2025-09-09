"use client";

import { useState } from "react";
import ProfileTab from "./tabs/ProfileTab";
import ActivityTab from "./tabs/ActivityTab";
import ComprehensiveMessagingTab from "./tabs/ComprehensiveMessagingTab";
import NutritionTab from "./tabs/NutritionTab";
import ClassBookingsTab from "./tabs/ClassBookingsTab";
import PaymentsTab from "./tabs/PaymentsTab";
import MembershipsTab from "./tabs/MembershipsTab";
import WaiversTab from "./tabs/WaiversTab";
import NotesTab from "./tabs/NotesTab";

interface CustomerProfileTabsProps {
  customer: any;
  onUpdate: () => void;
}

export default function CustomerProfileTabs({
  customer,
  onUpdate,
}: CustomerProfileTabsProps) {
  const [activeTab, setActiveTab] = useState("profile");

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "activity", label: "Activity" },
    { id: "class-bookings", label: "Class Bookings" },
    { id: "payments", label: "Payments" },
    { id: "memberships", label: "Memberships" },
    { id: "waivers", label: "Waivers" },
    { id: "notes", label: "Notes" },
    { id: "messaging", label: "Messaging" },
    { id: "nutrition", label: "Nutrition" },
  ];

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
                ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-500"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
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
        {activeTab === "profile" && (
          <ProfileTab customer={customer} onUpdate={onUpdate} />
        )}
        {activeTab === "activity" && <ActivityTab customerId={customer.id} />}
        {activeTab === "class-bookings" && (
          <ClassBookingsTab
            customerId={customer.id}
            organizationId={customer.organization_id}
          />
        )}
        {activeTab === "payments" && (
          <PaymentsTab
            customerId={customer.id}
            organizationId={customer.organization_id}
          />
        )}
        {activeTab === "memberships" && (
          <MembershipsTab customerId={customer.id} />
        )}
        {activeTab === "waivers" && <WaiversTab customerId={customer.id} />}
        {activeTab === "notes" && <NotesTab customerId={customer.id} />}
        {activeTab === "messaging" && (
          <ComprehensiveMessagingTab
            customerId={customer.id}
            organizationId={customer.organization_id}
            customer={customer}
          />
        )}
        {activeTab === "nutrition" && (
          <NutritionTab
            customerId={customer.id}
            organizationId={customer.organization_id}
          />
        )}
      </div>
    </div>
  );
}
