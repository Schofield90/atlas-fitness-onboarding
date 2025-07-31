'use client'

import { Bot, MessageSquare, Clock, Zap } from 'lucide-react'

interface AIResponseSettingsProps {
  config: any
  onChange: (config: any) => void
}

export default function AIResponseSettings({ config, onChange }: AIResponseSettingsProps) {
  const handleChange = (field: string, value: any) => {
    onChange({
      ...config,
      [field]: value
    })
  }

  return (
    <div className="space-y-6">
      {/* AI Assistant Settings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Assistant Settings
          </h3>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.ai_enabled || false}
              onChange={(e) => handleChange('ai_enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        <p className="text-gray-400 text-sm mb-4">
          Enable AI-powered responses using your gym's knowledge base
        </p>

        {config.ai_enabled && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                <MessageSquare className="inline h-4 w-4 mr-1" />
                Greeting Message
              </label>
              <textarea
                value={config.greeting_message || ''}
                onChange={(e) => handleChange('greeting_message', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Hi! Welcome to Atlas Fitness..."
              />
              <p className="text-xs text-gray-500 mt-1">
                First message sent when a new conversation starts
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                <Clock className="inline h-4 w-4 mr-1" />
                Offline Message
              </label>
              <textarea
                value={config.offline_message || ''}
                onChange={(e) => handleChange('offline_message', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Thanks for your message! Our team is currently offline..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Sent outside of business hours
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                <Zap className="inline h-4 w-4 mr-1" />
                Booking Interest Prompt
              </label>
              <textarea
                value={config.booking_prompt || ''}
                onChange={(e) => handleChange('booking_prompt', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Great! I can help you book a class..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Response when customer shows interest in booking
              </p>
            </div>
          </div>
        )}
      </div>

      {/* AI Features */}
      {config.ai_enabled && (
        <div className="bg-gray-900 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-2">AI Assistant Features</h4>
          <ul className="space-y-2 text-xs text-gray-500">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong className="text-gray-400">Smart Responses:</strong> Uses your gym's knowledge base for accurate information</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong className="text-gray-400">Lead Qualification:</strong> Automatically identifies and qualifies potential customers</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong className="text-gray-400">Booking Detection:</strong> Recognizes booking intent and guides customers</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong className="text-gray-400">24/7 Availability:</strong> Responds instantly any time of day</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}