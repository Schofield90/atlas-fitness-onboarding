'use client'

import Link from 'next/link'
import { ArrowLeft, CheckCircle, AlertCircle, Activity } from 'lucide-react'

export default function StatusPage() {
  const services = [
    { name: 'API', status: 'operational', uptime: '99.99%' },
    { name: 'Dashboard', status: 'operational', uptime: '99.99%' },
    { name: 'Database', status: 'operational', uptime: '99.98%' },
    { name: 'Email Service', status: 'operational', uptime: '99.95%' },
    { name: 'SMS/WhatsApp', status: 'operational', uptime: '99.97%' },
    { name: 'AI Services', status: 'operational', uptime: '99.90%' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-6 py-12">
        <Link href="/landing" className="inline-flex items-center text-gray-400 hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">System Status</h1>
          <div className="flex items-center justify-center gap-2 text-green-400">
            <CheckCircle className="w-6 h-6" />
            <p className="text-xl">All Systems Operational</p>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Service Status</h2>
            <div className="space-y-4">
              {services.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-medium">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400">{service.uptime} uptime</span>
                    <span className="text-xs px-2 py-1 bg-green-900 text-green-300 rounded-full">
                      {service.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Recent Incidents</h2>
            <p className="text-gray-400">No incidents reported in the last 30 days.</p>
          </div>
        </div>
      </div>
    </div>
  )
}