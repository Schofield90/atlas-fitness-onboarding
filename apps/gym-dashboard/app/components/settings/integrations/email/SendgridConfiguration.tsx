'use client'

import { useState } from 'react'
import { Key, Mail, Eye, EyeOff } from 'lucide-react'

interface SendgridConfigurationProps {
  config: any
  onChange: (config: any) => void
}

export default function SendgridConfiguration({ config, onChange }: SendgridConfigurationProps) {
  const [showApiKey, setShowApiKey] = useState(false)

  const handleChange = (field: string, value: any) => {
    onChange({
      ...config,
      [field]: value
    })
  }

  return (
    <div className="space-y-6">
      {/* SendGrid API Configuration */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">SendGrid Configuration</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              API Key *
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type={showApiKey ? 'text' : 'password'}
                value={config.sendgrid_api_key || ''}
                onChange={(e) => handleChange('sendgrid_api_key', e.target.value)}
                placeholder="SG.xxxxxxxxxxxxxxxxxxxxxx"
                className="w-full pl-10 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Get your API key from SendGrid Settings → API Keys
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              From Name *
            </label>
            <input
              type="text"
              value={config.from_name || ''}
              onChange={(e) => handleChange('from_name', e.target.value)}
              placeholder="Atlas Fitness"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              From Email *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="email"
                value={config.from_email || ''}
                onChange={(e) => handleChange('from_email', e.target.value)}
                placeholder="noreply@atlasfitness.com"
                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Must be verified in SendGrid Sender Authentication
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Reply-To Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="email"
                value={config.reply_to_email || ''}
                onChange={(e) => handleChange('reply_to_email', e.target.value)}
                placeholder="info@atlasfitness.com"
                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SendGrid Features */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">SendGrid Features</h4>
        <ul className="space-y-2 text-xs text-gray-500">
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span><strong className="text-gray-400">High Deliverability:</strong> Industry-leading email delivery rates</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span><strong className="text-gray-400">Email Analytics:</strong> Track opens, clicks, and bounces</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span><strong className="text-gray-400">Template Engine:</strong> Dynamic email templates with personalization</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span><strong className="text-gray-400">Scalability:</strong> Send up to 100 emails/day free, then pay as you grow</span>
          </li>
        </ul>
      </div>
    </div>
  )
}