'use client'

import { useState } from 'react'
import { CheckCircle, Loader2, AlertCircle, Brain } from 'lucide-react'

export default function SeedKnowledgePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const seedKnowledge = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/seed/knowledge-data', {
        method: 'POST'
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to seed knowledge')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Brain className="h-8 w-8 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">Seed AI Knowledge</h1>
          </div>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h2 className="font-semibold mb-2">Atlas Fitness Knowledge Base</h2>
              <p className="text-sm text-gray-600 mb-4">
                This will populate the AI knowledge base with:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 mb-4">
                <li>• Gym locations (Harrogate & York)</li>
                <li>• Opening hours and contact info</li>
                <li>• Membership pricing and options</li>
                <li>• Class types and schedules</li>
                <li>• Facilities and equipment</li>
                <li>• Policies and procedures</li>
                <li>• Staff information</li>
                <li>• FAQs and common queries</li>
              </ul>
              
              <button
                onClick={seedKnowledge}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Creating Knowledge...
                  </>
                ) : (
                  'Seed Knowledge Base'
                )}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-800 font-medium">Error</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            {result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-green-800 font-medium">Success!</p>
                    <p className="text-sm text-green-600 mt-1">
                      Created {result.itemsCreated} knowledge entries
                    </p>
                    <ul className="text-sm text-green-600 mt-2 space-y-1">
                      {Object.entries(result.byType).map(([type, count]) => (
                        <li key={type}>• {type}: {count} items</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Next Steps</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>
                <a href="/test-whatsapp-ai" className="text-purple-600 hover:text-purple-800">
                  → Test WhatsApp AI Responses
                </a>
              </li>
              <li>
                <a href="/whatsapp-debug" className="text-purple-600 hover:text-purple-800">
                  → Debug WhatsApp Integration
                </a>
              </li>
              <li>
                <a href="/ai-training" className="text-purple-600 hover:text-purple-800">
                  → Train AI Responses
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}