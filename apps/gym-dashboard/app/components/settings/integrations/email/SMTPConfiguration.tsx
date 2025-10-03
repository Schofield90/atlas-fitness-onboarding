'use client'

import { useState } from 'react'
import { Server, Lock, Mail, User, Eye, EyeOff } from 'lucide-react'

interface SMTPConfigurationProps {
  config: any
  onChange: (config: any) => void
}

export default function SMTPConfiguration({ config, onChange }: SMTPConfigurationProps) {
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (field: string, value: any) => {
    onChange({
      ...config,
      [field]: value
    })
  }

  return (
    <div className="space-y-6">
      {/* SMTP Server Settings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">SMTP Server Settings</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              SMTP Host *
            </label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                value={config.smtp_host || ''}
                onChange={(e) => handleChange('smtp_host', e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              SMTP Port *
            </label>
            <input
              type="number"
              value={config.smtp_port || ''}
              onChange={(e) => handleChange('smtp_port', parseInt(e.target.value))}
              placeholder="587"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Username *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                value={config.smtp_username || ''}
                onChange={(e) => handleChange('smtp_username', e.target.value)}
                placeholder="your-email@gmail.com"
                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={config.smtp_password || ''}
                onChange={(e) => handleChange('smtp_password', e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.smtp_secure || false}
              onChange={(e) => handleChange('smtp_secure', e.target.checked)}
              className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-300">Use TLS/SSL encryption</span>
          </label>
        </div>
      </div>

      {/* Email Settings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Email Settings</h3>
        
        <div className="space-y-4">
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
            <p className="text-xs text-gray-500 mt-1">
              Email address where customer replies will be sent
            </p>
          </div>
        </div>
      </div>

      {/* Common SMTP Settings Reference */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Common SMTP Settings</h4>
        <div className="grid md:grid-cols-2 gap-4 text-xs text-gray-500">
          <div>
            <strong className="text-gray-400">Gmail:</strong>
            <ul className="mt-1 space-y-1">
              <li>Host: smtp.gmail.com</li>
              <li>Port: 587 (TLS) or 465 (SSL)</li>
              <li>Enable "Less secure app access"</li>
            </ul>
          </div>
          <div>
            <strong className="text-gray-400">Outlook/Office 365:</strong>
            <ul className="mt-1 space-y-1">
              <li>Host: smtp.office365.com</li>
              <li>Port: 587</li>
              <li>Use TLS encryption</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}