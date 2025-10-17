import { useState } from 'react'
import { MessageSquare, Image, Phone } from 'lucide-react'

interface WhatsAppConfigProps {
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
  availableVariables?: string[]
}

export default function WhatsAppConfig({ 
  config, 
  onChange, 
  availableVariables = [] 
}: WhatsAppConfigProps) {
  const [useTemplate, setUseTemplate] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')

  const templates = [
    { id: 'welcome', name: 'Welcome Message', description: 'Send welcome message to new members' },
    { id: 'reminder', name: 'Class Reminder', description: 'Remind members about upcoming classes' },
    { id: 'payment', name: 'Payment Reminder', description: 'Send payment due reminders' },
    { id: 'expiry', name: 'Membership Expiring', description: 'Notify about expiring membership' },
  ]

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    // Pre-fill message based on template
    const templateMessages: Record<string, string> = {
      welcome: `🎉 Welcome to {gymName}, {firstName}! 

Your membership is now active. Here's what happens next:
📅 Book classes through our app
🏋️ Meet our trainers
💪 Start your fitness journey

Need help? Just reply to this message!`,
      reminder: `Hi {firstName}! 🏃‍♀️ 

Reminder: You have {className} at {classTime} today.

See you there! 💪`,
      payment: `Hi {firstName}, 

Your membership payment of {amount} is due on {dueDate}.

Please ensure payment is made to keep your membership active.`,
      expiry: `Hi {firstName}, 

Your membership expires on {expiryDate}. 

Renew now to keep your fitness journey going! Reply 'RENEW' to get started.`
    }
    
    onChange({
      ...config,
      message: templateMessages[templateId] || config.message
    })
  }

  return (
    <div className="space-y-4">
      {/* Phone Number */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          <Phone className="inline h-4 w-4 mr-1" />
          Phone Number
        </label>
        <input
          type="text"
          value={config.to || ''}
          onChange={(e) => onChange({ ...config, to: e.target.value })}
          placeholder="+1234567890 or {variable}"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Include country code (e.g., +1 for US). Can use variables like {'{lead.phone}'}
        </p>
      </div>

      {/* Template Selection */}
      <div>
        <label className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-2">
          <input
            type="checkbox"
            checked={useTemplate}
            onChange={(e) => setUseTemplate(e.target.checked)}
            className="rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500"
          />
          <span>Use Message Template</span>
        </label>
        
        {useTemplate && (
          <div className="grid grid-cols-2 gap-2">
            {templates.map(template => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateSelect(template.id)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  selectedTemplate === template.id
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="font-medium text-white text-sm">{template.name}</div>
                <div className="text-xs text-gray-400 mt-1">{template.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          <MessageSquare className="inline h-4 w-4 mr-1" />
          Message
        </label>
        <textarea
          value={config.message || ''}
          onChange={(e) => onChange({ ...config, message: e.target.value })}
          placeholder="Enter your WhatsApp message..."
          rows={6}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <div className="mt-2">
          <p className="text-xs text-gray-400 mb-1">Available variables:</p>
          <div className="flex flex-wrap gap-1">
            {availableVariables.map(variable => (
              <button
                key={variable}
                type="button"
                onClick={() => {
                  const currentMessage = config.message || ''
                  onChange({ 
                    ...config, 
                    message: currentMessage + ` {${variable}}` 
                  })
                }}
                className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-orange-400"
              >
                {variable}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Media URL (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          <Image className="inline h-4 w-4 mr-1" />
          Media URL (Optional)
        </label>
        <input
          type="text"
          value={config.mediaUrl || ''}
          onChange={(e) => onChange({ ...config, mediaUrl: e.target.value })}
          placeholder="https://example.com/image.jpg"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Attach images or videos to your WhatsApp message
        </p>
      </div>

      {/* Test Configuration */}
      <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
        <h4 className="text-sm font-medium text-white mb-2">Test Your Configuration</h4>
        <p className="text-xs text-gray-400 mb-3">
          Make sure to add your Twilio credentials in the environment variables:
        </p>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• TWILIO_ACCOUNT_SID</li>
          <li>• TWILIO_AUTH_TOKEN</li>
          <li>• TWILIO_WHATSAPP_FROM (your WhatsApp sender number)</li>
        </ul>
      </div>
    </div>
  )
}