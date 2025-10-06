'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function APIPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-6 py-12">
        <Link href="/landing" className="inline-flex items-center text-gray-400 hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">API Reference</h1>
          <p className="text-xl text-gray-300">Build powerful integrations with the Atlas API</p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4">Getting Started</h2>
            <p className="text-gray-300 mb-4">
              The Atlas API is organized around REST. Our API has predictable resource-oriented URLs,
              accepts form-encoded request bodies, returns JSON-encoded responses, and uses standard HTTP response codes.
            </p>
            <div className="bg-gray-900 rounded p-4">
              <code className="text-green-400">
                curl https://api.atlas-fitness.com/v1/leads \<br/>
                  -H "Authorization: Bearer YOUR_API_KEY"
              </code>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Available Endpoints</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-orange-500">Leads</h3>
                <p className="text-sm text-gray-400">Create, retrieve, update, and delete leads</p>
              </div>
              <div>
                <h3 className="font-semibold text-orange-500">Members</h3>
                <p className="text-sm text-gray-400">Manage member accounts and subscriptions</p>
              </div>
              <div>
                <h3 className="font-semibold text-orange-500">Bookings</h3>
                <p className="text-sm text-gray-400">Handle class bookings and appointments</p>
              </div>
              <div>
                <h3 className="font-semibold text-orange-500">Webhooks</h3>
                <p className="text-sm text-gray-400">Receive real-time event notifications</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}