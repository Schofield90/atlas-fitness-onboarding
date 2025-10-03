'use client'

import { Phone, Link2, ExternalLink } from 'lucide-react'

interface WhatsAppConfigurationProps {
  config: any
  onChange: (config: any) => void
}

export default function WhatsAppConfiguration({ config, onChange }: WhatsAppConfigurationProps) {
  const handleChange = (field: string, value: any) => {
    onChange({
      ...config,
      [field]: value
    })
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">WhatsApp Configuration</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            WhatsApp Business Number *
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="tel"
              value={config.business_number || ''}
              onChange={(e) => handleChange('business_number', e.target.value)}
              placeholder="whatsapp:+14155238886"
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Must include 'whatsapp:' prefix. For testing, use the Twilio sandbox number.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Webhook URL
          </label>
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={config.webhook_url || ''}
              readOnly
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 font-mono text-sm"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Configure this URL in your Twilio WhatsApp webhook settings
          </p>
        </div>

        <div className="p-4 bg-gray-900 rounded-lg">
          <h4 className="text-sm font-medium text-gray-400 mb-2">WhatsApp Business Setup</h4>
          <ol className="space-y-2 text-xs text-gray-500">
            <li className="flex items-start gap-2">
              <span className="text-gray-400">1.</span>
              <span>For testing: Join Twilio Sandbox by sending "join [sandbox-word]" to +14155238886</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400">2.</span>
              <span>Configure webhook URL in Twilio Console → Messaging → Try it out → Sandbox settings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400">3.</span>
              <span>For production: Apply for WhatsApp Business API access and get a dedicated number</span>
            </li>
          </ol>
          <a
            href="https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 text-blue-400 hover:text-blue-300 text-sm"
          >
            Open Twilio Console
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  )
}