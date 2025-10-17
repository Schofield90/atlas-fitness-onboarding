'use client'

import { useState } from 'react'
import { Phone, Plus, Trash2, Globe } from 'lucide-react'

interface PhoneNumberSettingsProps {
  config: any
  onChange: (config: any) => void
}

export default function PhoneNumberSettings({ config, onChange }: PhoneNumberSettingsProps) {
  const [newNumber, setNewNumber] = useState('')

  const addPhoneNumber = () => {
    if (!newNumber) return

    const phoneNumbers = config.phone_numbers || []
    if (!phoneNumbers.find((p: any) => p.number === newNumber)) {
      onChange({
        ...config,
        phone_numbers: [...phoneNumbers, {
          number: newNumber,
          name: 'SMS Number',
          capabilities: ['SMS'],
          is_primary: phoneNumbers.length === 0
        }]
      })
      setNewNumber('')
    }
  }

  const removePhoneNumber = (number: string) => {
    const phoneNumbers = config.phone_numbers || []
    onChange({
      ...config,
      phone_numbers: phoneNumbers.filter((p: any) => p.number !== number)
    })
  }

  const setPrimaryNumber = (number: string) => {
    const phoneNumbers = config.phone_numbers || []
    onChange({
      ...config,
      phone_numbers: phoneNumbers.map((p: any) => ({
        ...p,
        is_primary: p.number === number
      }))
    })
  }

  return (
    <div className="space-y-6">
      {/* Phone Numbers */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Phone Numbers</h3>
        
        <div className="space-y-4">
          {/* Add New Number */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Add Phone Number
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="tel"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  placeholder="+447123456789"
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={addPhoneNumber}
                disabled={!newNumber}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Must be a Twilio phone number with SMS capabilities
            </p>
          </div>

          {/* Phone Number List */}
          {config.phone_numbers && config.phone_numbers.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-400">Configured Numbers</label>
              {config.phone_numbers.map((phone: any) => (
                <div key={phone.number} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-white font-medium">{phone.number}</p>
                      <p className="text-xs text-gray-400">{phone.name || 'SMS Number'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {phone.is_primary && (
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">Primary</span>
                    )}
                    {!phone.is_primary && (
                      <button
                        onClick={() => setPrimaryNumber(phone.number)}
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        Set as Primary
                      </button>
                    )}
                    <button
                      onClick={() => removePhoneNumber(phone.number)}
                      className="p-1 text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Auto-Response Messages */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Auto-Response Messages</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Opt-Out Message (STOP)
            </label>
            <textarea
              value={config.auto_responses?.opt_out || ''}
              onChange={(e) => onChange({
                ...config,
                auto_responses: { ...config.auto_responses, opt_out: e.target.value }
              })}
              rows={2}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="You have been unsubscribed. Reply START to resubscribe."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Opt-In Message (START)
            </label>
            <textarea
              value={config.auto_responses?.opt_in || ''}
              onChange={(e) => onChange({
                ...config,
                auto_responses: { ...config.auto_responses, opt_in: e.target.value }
              })}
              rows={2}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Welcome back! You are now subscribed to receive messages."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Help Message (HELP)
            </label>
            <textarea
              value={config.auto_responses?.help || ''}
              onChange={(e) => onChange({
                ...config,
                auto_responses: { ...config.auto_responses, help: e.target.value }
              })}
              rows={2}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Atlas Fitness: Reply STOP to unsubscribe. For help, call us at {phone_number}."
            />
          </div>
        </div>
      </div>

      {/* Regional Settings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Regional Settings</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Default Country Code
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <select
              value={config.default_country_code || '+44'}
              onChange={(e) => onChange({ ...config, default_country_code: e.target.value })}
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="+44">+44 (United Kingdom)</option>
              <option value="+1">+1 (United States)</option>
              <option value="+353">+353 (Ireland)</option>
              <option value="+61">+61 (Australia)</option>
              <option value="+64">+64 (New Zealand)</option>
            </select>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Used when phone numbers don't include a country code
          </p>
        </div>
      </div>
    </div>
  )
}