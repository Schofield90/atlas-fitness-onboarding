'use client'

import Link from 'next/link'
import { ArrowLeft, Rocket, Clock, CheckCircle } from 'lucide-react'

export default function RoadmapPage() {
  const roadmapItems = [
    {
      quarter: 'Q1 2025',
      status: 'completed',
      items: [
        'AI-powered lead scoring',
        'WhatsApp Business integration',
        'Visual workflow automation builder',
        'Google Calendar sync'
      ]
    },
    {
      quarter: 'Q2 2025',
      status: 'in-progress',
      items: [
        'Native mobile apps (iOS & Android)',
        'Advanced analytics dashboard',
        'Multi-language support',
        'Wearable device integration'
      ]
    },
    {
      quarter: 'Q3 2025',
      status: 'planned',
      items: [
        'AI workout plan generator',
        'Virtual coaching assistant',
        'Franchise management tools',
        'Advanced revenue optimization'
      ]
    },
    {
      quarter: 'Q4 2025',
      status: 'planned',
      items: [
        'White-label platform',
        'Marketplace for trainers',
        'Equipment management',
        'Predictive member churn'
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-6 py-12">
        <Link href="/landing" className="inline-flex items-center text-gray-400 hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Product Roadmap</h1>
          <p className="text-xl text-gray-300">See what we're building next</p>
        </div>
        
        <div className="max-w-4xl mx-auto space-y-8">
          {roadmapItems.map((item) => (
            <div key={item.quarter} className="bg-gray-800 rounded-lg p-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">{item.quarter}</h2>
                <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  item.status === 'completed' ? 'bg-green-900 text-green-300' :
                  item.status === 'in-progress' ? 'bg-blue-900 text-blue-300' :
                  'bg-gray-700 text-gray-300'
                }`}>
                  {item.status === 'completed' && <CheckCircle className="w-4 h-4" />}
                  {item.status === 'in-progress' && <Clock className="w-4 h-4" />}
                  {item.status === 'planned' && <Rocket className="w-4 h-4" />}
                  {item.status.replace('-', ' ')}
                </span>
              </div>
              <ul className="space-y-2">
                {item.items.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <span className={`mr-2 ${
                      item.status === 'completed' ? 'text-green-500' : 'text-gray-500'
                    }`}>
                      {item.status === 'completed' ? '✓' : '○'}
                    </span>
                    <span className={item.status === 'completed' ? 'text-gray-300' : 'text-gray-400'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}