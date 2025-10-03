'use client'

import { useState } from 'react'
import DashboardLayout from '@/app/components/DashboardLayout'
import AppointmentTypesManager from '@/app/components/booking/AppointmentTypesManager'
import AvailabilityRules from '@/app/components/booking/AvailabilityRules'
import GeneralBookingSettings from '@/app/components/booking/GeneralBookingSettings'
import { Calendar, Clock, Users, Settings as SettingsIcon } from 'lucide-react'

export default function BookingSettingsPage() {
  const [activeTab, setActiveTab] = useState<'appointment-types' | 'availability' | 'general'>('appointment-types')

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Call Booking Settings</h1>
            <p className="text-gray-400">Configure your appointment types and availability for sales calls and consultations</p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('appointment-types')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'appointment-types'
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                }`}
              >
                <Clock className="w-4 h-4" />
                Appointment Types
              </button>
              <button
                onClick={() => setActiveTab('availability')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'availability'
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Availability Rules
              </button>
              <button
                onClick={() => setActiveTab('general')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'general'
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                }`}
              >
                <SettingsIcon className="w-4 h-4" />
                General Settings
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="bg-gray-800 rounded-lg p-6">
            {activeTab === 'appointment-types' && (
              <AppointmentTypesManager />
            )}

            {activeTab === 'availability' && (
              <AvailabilityRules />
            )}

            {activeTab === 'general' && (
              <GeneralBookingSettings />
            )}
          </div>

          {/* Help Box */}
          {activeTab === 'appointment-types' && (
            <div className="mt-6 bg-blue-900 bg-opacity-20 border border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-400 mb-2">Quick Tips</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Create appointment types before setting up booking links</li>
                <li>• Set a buffer time between appointments to avoid back-to-back bookings</li>
                <li>• You can have both free and paid appointment types</li>
                <li>• Inactive appointment types won't appear in booking links</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}