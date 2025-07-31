'use client'

import { useState } from 'react'
import { Key, Hash, Eye, EyeOff } from 'lucide-react'

interface TwilioConfigurationProps {
  config: any
  onChange: (config: any) => void
}

export default function TwilioConfiguration({ config, onChange }: TwilioConfigurationProps) {
  const [showAuthToken, setShowAuthToken] = useState(false)

  const handleChange = (field: string, value: any) => {
    onChange({
      ...config,
      [field]: value
    })
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Twilio Configuration</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Account SID *
          </label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={config.twilio_account_sid || ''}
              onChange={(e) => handleChange('twilio_account_sid', e.target.value)}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Found in your Twilio Console dashboard
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Auth Token *
          </label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type={showAuthToken ? 'text' : 'password'}
              value={config.twilio_auth_token || ''}
              onChange={(e) => handleChange('twilio_auth_token', e.target.value)}
              placeholder="••••••••••••••••"
              className="w-full pl-10 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowAuthToken(!showAuthToken)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showAuthToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Keep this secret - it provides full access to your Twilio account
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-900 rounded-lg">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Getting Started with Twilio</h4>
        <ol className="space-y-2 text-xs text-gray-500">
          <li>1. Sign up for a Twilio account at twilio.com</li>
          <li>2. Get your Account SID and Auth Token from the Console</li>
          <li>3. Purchase a phone number with SMS capabilities</li>
          <li>4. Configure the phone number in the next section</li>
        </ol>
      </div>
    </div>
  )
}