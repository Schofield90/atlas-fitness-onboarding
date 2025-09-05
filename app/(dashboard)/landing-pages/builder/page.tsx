'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageBuilder from '@/app/components/landing-builder/PageBuilder'
import { AITemplateImport } from '@/app/components/landing-builder/AITemplateImport'
import { ArrowLeft, Wand2, Edit } from 'lucide-react'
import Link from 'next/link'

export default function LandingPageBuilderPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [showAIImport, setShowAIImport] = useState(false)
  const [showBuilder, setShowBuilder] = useState(false)

  const handleSave = async (content: any[]) => {
    // Prompt for page details first; abort if user cancels at any step
    const name = prompt('Enter a name for this landing page:')
    if (name === null) {
      return
    }
    const finalName = name.trim() === '' ? 'Untitled Page' : name

    const description = prompt('Enter a description (optional):')
    if (description === null) {
      return
    }
    const finalDescription = description || ''

    setSaving(true)
    try {
      const response = await fetch('/api/landing-pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: finalName,
          description: finalDescription,
          content,
          title: finalName,
          meta_title: finalName,
          meta_description: finalDescription
        })
      })
      
      if (!response.ok) throw new Error('Failed to save page')
      
      const { data } = await response.json()
      alert('Page saved successfully!')
      router.push(`/landing-pages/builder/${data.id}`)
    } catch (error) {
      console.error('Error saving page:', error)
      alert('Failed to save page')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async (content: any[]) => {
    // First save, then publish
    await handleSave(content)
  }

  if (!showBuilder && !showAIImport) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/landing-pages"
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold">Create Landing Page</h1>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            How would you like to create your landing page?
          </h2>
          <p className="text-gray-600 mb-8">
            Choose to start from scratch or let AI generate a template from an existing website
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Start from scratch */}
            <button
              onClick={() => setShowBuilder(true)}
              className="p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Edit className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold">Start from Scratch</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Use our drag-and-drop builder to create a custom landing page with pre-built components.
              </p>
              <div className="text-sm text-gray-500">
                • Full control over design
                <br />• Choose from 8+ components
                <br />• Real-time preview
              </div>
            </button>
            
            {/* AI Import */}
            <button
              onClick={() => setShowAIImport(true)}
              className="p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-lg transition-all text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Wand2 className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold">Import from URL</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Enter any website URL and let AI create a customizable template based on that design.
              </p>
              <div className="text-sm text-gray-500">
                • AI-powered analysis
                <br />• Instant template generation
                <br />• Fully editable result
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  if (showAIImport) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAIImport(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">Import from URL</h1>
          </div>
        </div>
        
        <div className="max-w-2xl mx-auto p-8">
          <AITemplateImport 
            onImportComplete={(id) => {
              router.push(`/landing-pages/builder/${id}`)
            }}
          />
        </div>
      </div>
    )
  }
  
  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowBuilder(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold">New Landing Page</h1>
              <p className="text-sm text-gray-600">Drag and drop components to build your page</p>
            </div>
          </div>
          {saving && (
            <div className="text-sm text-gray-600">Saving...</div>
          )}
        </div>
      </div>
      
      {/* Page Builder */}
      <div className="flex-1">
        <PageBuilder
          onSave={handleSave}
          onPublish={handlePublish}
        />
      </div>
    </div>
  )
}