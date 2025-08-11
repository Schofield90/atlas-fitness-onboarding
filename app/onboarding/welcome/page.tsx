'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/app/components/DashboardLayout'

export default function OnboardingWelcomePage() {
  const router = useRouter()
  const [organizationName, setOrganizationName] = useState('')

  useEffect(() => {
    // Fetch organization details
    const fetchOrg = async () => {
      try {
        const response = await fetch('/api/organization/current')
        const data = await response.json()
        if (data.organization) {
          setOrganizationName(data.organization.name)
        }
      } catch (error) {
        console.error('Error fetching organization:', error)
      }
    }
    fetchOrg()
  }, [])

  const steps = [
    {
      number: 1,
      title: 'Connect Facebook',
      description: 'Link your Facebook account to start capturing leads from your ads',
      action: () => router.push('/integrations/facebook'),
      icon: '📘'
    },
    {
      number: 2,
      title: 'Set Up Messaging',
      description: 'Configure WhatsApp, SMS, and email to communicate with leads',
      action: () => router.push('/settings/integrations'),
      icon: '💬'
    },
    {
      number: 3,
      title: 'Create Your First Form',
      description: 'Build a lead capture form for your website or landing pages',
      action: () => router.push('/forms'),
      icon: '📝'
    },
    {
      number: 4,
      title: 'Set Up Automations',
      description: 'Create automated workflows to nurture leads 24/7',
      action: () => router.push('/automations'),
      icon: '🤖'
    }
  ]

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold mb-4">
              Welcome to GymLeadHub, {organizationName}! 🎉
            </h1>
            <p className="text-xl text-gray-300">
              Let's get your gym set up to capture and convert more leads
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Quick Setup Guide</h2>
            <p className="text-gray-300 mb-8">
              Complete these steps to start capturing leads and growing your gym:
            </p>

            <div className="space-y-6">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="bg-gray-700 rounded-lg p-6 hover:bg-gray-600 transition-colors cursor-pointer"
                  onClick={step.action}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{step.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                          {step.number}
                        </span>
                        <h3 className="text-xl font-semibold">{step.title}</h3>
                      </div>
                      <p className="text-gray-300">{step.description}</p>
                    </div>
                    <div className="text-gray-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-3">💡 Pro Tip</h3>
              <p className="text-gray-300 text-sm">
                Start with Facebook integration first. This will allow you to immediately
                begin capturing leads from your existing ad campaigns.
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-3">🎯 Your Goal</h3>
              <p className="text-gray-300 text-sm">
                Complete all 4 setup steps within the next 30 minutes to start
                capturing and converting leads on autopilot.
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Skip setup and go to dashboard →
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}