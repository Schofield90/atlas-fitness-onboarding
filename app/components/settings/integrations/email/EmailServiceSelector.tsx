'use client'

import { Shield, Server, Mail } from 'lucide-react'

interface EmailServiceSelectorProps {
  provider: string
  onChange: (provider: string) => void
}

export default function EmailServiceSelector({ provider, onChange }: EmailServiceSelectorProps) {
  const providers = [
    {
      id: 'smtp',
      name: 'SMTP Server',
      description: 'Connect using your own SMTP server',
      icon: <Server className="h-8 w-8" />,
      features: ['Full control', 'Any email provider', 'Custom domains']
    },
    {
      id: 'sendgrid',
      name: 'SendGrid',
      description: 'Professional email delivery service',
      icon: <Mail className="h-8 w-8" />,
      features: ['High deliverability', 'Email analytics', 'Template editor']
    },
    {
      id: 'mailgun',
      name: 'Mailgun',
      description: 'Developer-friendly email API',
      icon: <Shield className="h-8 w-8" />,
      features: ['Powerful API', 'Email validation', 'Detailed logs']
    }
  ]

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Email Service Provider</h3>
      <div className="grid md:grid-cols-3 gap-4">
        {providers.map((providerOption) => (
          <button
            key={providerOption.id}
            onClick={() => onChange(providerOption.id)}
            className={`
              relative p-6 rounded-lg border-2 transition-all text-left
              ${provider === providerOption.id
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-700 hover:border-gray-600'
              }
            `}
          >
            {provider === providerOption.id && (
              <div className="absolute top-2 right-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              </div>
            )}
            
            <div className="text-blue-400 mb-3">
              {providerOption.icon}
            </div>
            
            <h4 className="text-white font-medium mb-1">{providerOption.name}</h4>
            <p className="text-gray-400 text-sm mb-3">{providerOption.description}</p>
            
            <ul className="space-y-1">
              {providerOption.features.map((feature, idx) => (
                <li key={idx} className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="text-green-500">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  )
}