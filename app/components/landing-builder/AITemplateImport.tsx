'use client'

import React, { useState } from 'react'
import { Wand2, Loader2, ExternalLink, AlertCircle } from 'lucide-react'

interface AITemplateImportProps {
  onImportComplete?: (landingPageId: string) => void
  organizationId?: string
}

export const AITemplateImport: React.FC<AITemplateImportProps> = ({ 
  onImportComplete 
}) => {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleImport = async () => {
    if (!description || description.trim().length < 10) {
      setError('Please describe your landing page (at least 10 characters)')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/landing-pages/ai-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ description: description.trim() })
      })
      
      const result = await response.json()

      // DEBUG: Log the actual response to see what's being generated
      const debugInfo = {
        status: response.status,
        components: result.components?.length || 0,
        colors: result.components?.map((c: any) => c.props?.backgroundColor).filter(Boolean) || [],
        cost: result.cost,
        pageId: result.data?.id
      };
      console.log('🔍 AI GENERATION DEBUG:', debugInfo);
      alert('AI Response: ' + JSON.stringify(debugInfo, null, 2));

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate template')
      }

      setSuccess(true)
      setDescription('')

      // Redirect to edit the new page
      if (onImportComplete && result.data?.id) {
        setTimeout(() => {
          onImportComplete(result.data.id)
        }, 1500)
      } else if (result.data?.id) {
        setTimeout(() => {
          window.location.href = `/landing-pages/builder/${result.data.id}`
        }, 1500)
      }
      
    } catch (err: any) {
      console.error('Import error:', err)
      setError(err.message || 'Failed to import template')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Wand2 className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            AI Build Landing Page
          </h3>
          <p className="text-sm text-gray-600">
            Describe what you want and let AI create a complete landing page tailored to your needs
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Describe your page in plain English
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Example: A landing page for my CrossFit gym targeting busy professionals who want to get fit in 30-minute sessions..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
            rows={4}
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            • Describe your page in plain English
            <br />• AI generates complete layout
            <br />• Fully editable result
          </p>
        </div>

        <button
          onClick={handleImport}
          disabled={loading || !description || description.trim().length < 10}
          className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              AI Building Page...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              AI Build Page
            </>
          )}
        </button>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Import Failed</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800">
              ✨ Template generated successfully!
            </p>
            <p className="text-sm text-green-700">
              Redirecting to the editor...
            </p>
          </div>
        )}

        {loading && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium text-purple-800">
                  AI Building Page...
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  This may take up to 30 seconds
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}