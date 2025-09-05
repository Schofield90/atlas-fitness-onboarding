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
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const handleImport = async () => {
    if (!url) {
      setError('Please enter a URL')
      return
    }
    
    // Validate URL
    try {
      new URL(url)
    } catch {
      setError('Please enter a valid URL')
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
        body: JSON.stringify({ url })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate template')
      }
      
      setSuccess(true)
      setUrl('')
      
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
            AI Template Generation
          </h3>
          <p className="text-sm text-gray-600">
            Enter a URL and let AI create a landing page template for you
          </p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
            Website URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              disabled={loading}
            />
            <button
              onClick={handleImport}
              disabled={loading || !url}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
        
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
                  Analyzing website...
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  This may take up to 30 seconds
                </p>
              </div>
            </div>
            
            <div className="mt-3 space-y-1">
              <div className="text-xs text-purple-700 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
                Fetching webpage content...
              </div>
              <div className="text-xs text-purple-700 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
                Analyzing page structure...
              </div>
              <div className="text-xs text-purple-700 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
                Generating components...
              </div>
            </div>
          </div>
        )}
        
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">How it works:</h4>
          <ol className="text-sm text-gray-600 space-y-1">
            <li>1. Enter any website URL you want to replicate</li>
            <li>2. AI analyzes the page structure and design</li>
            <li>3. A customizable template is generated</li>
            <li>4. Edit and customize using the drag-and-drop builder</li>
          </ol>
        </div>
        
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <ExternalLink className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-blue-800">
                Pro tip: Works best with landing pages, marketing sites, and single-page websites.
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Complex web applications may not convert perfectly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}