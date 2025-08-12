'use client'

import { useState } from 'react'
import DashboardLayout from '@/app/components/DashboardLayout'
import EmailComposer from '@/app/components/campaigns/EmailComposer'
import { Mail, Settings, AlertCircle } from 'lucide-react'

export default function TestEmailPage() {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <DashboardLayout userData={null}>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-8 h-8 text-orange-500" />
            <h1 className="text-3xl font-bold">Email Testing Center</h1>
          </div>
          <p className="text-gray-400">Test your email configuration and send test campaigns</p>
        </div>

        {/* Configuration Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Email Configuration Status</h2>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Primary Provider</div>
              <div className="text-white font-medium">
                {process.env.NEXT_PUBLIC_EMAIL_PROVIDER || 'Not Configured'}
              </div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">From Address</div>
              <div className="text-white font-medium">
                {process.env.NEXT_PUBLIC_EMAIL_FROM || 'noreply@atlas-fitness.com'}
              </div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Status</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-400 font-medium">Ready</span>
              </div>
            </div>
          </div>

          {showSettings && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h3 className="text-white font-medium mb-4">Email Service Configuration</h3>
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-gray-300">To configure email sending, add one of the following to your environment variables:</p>
                      <ul className="mt-2 space-y-2 text-gray-400">
                        <li>• <strong>Resend:</strong> RESEND_API_KEY, RESEND_FROM</li>
                        <li>• <strong>Gmail:</strong> GMAIL_USER, GMAIL_APP_PASSWORD</li>
                        <li>• <strong>SendGrid:</strong> SENDGRID_API_KEY</li>
                        <li>• <strong>Mailgun:</strong> MAILGUN_SMTP_PASSWORD, MAILGUN_SMTP_USER</li>
                        <li>• <strong>Custom SMTP:</strong> SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Email Composer */}
        <EmailComposer />

        {/* Quick Tips */}
        <div className="mt-6 bg-blue-900/20 border border-blue-600 rounded-lg p-6">
          <h3 className="text-blue-400 font-semibold mb-3">Quick Tips</h3>
          <ul className="space-y-2 text-sm text-blue-300">
            <li>• Use the test email feature to verify your configuration before sending to real contacts</li>
            <li>• Variables like {'{firstName}'} will be replaced with actual contact data in real campaigns</li>
            <li>• Test emails are logged in the database for tracking</li>
            <li>• Check spam folders if test emails don't appear in inbox</li>
            <li>• For Gmail, use an App Password instead of your regular password</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  )
}