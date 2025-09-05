'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Eye, Edit, Trash2, Copy, ExternalLink, MoreVertical, Wand2 } from 'lucide-react'
import { AITemplateImport } from '@/app/components/landing-builder/AITemplateImport'

interface LandingPage {
  id: string
  name: string
  slug: string
  title: string
  description: string
  status: 'draft' | 'published' | 'archived'
  views_count: number
  conversions_count: number
  conversion_rate: number
  published_at: string | null
  created_at: string
  updated_at: string
}

export default function LandingPagesPage() {
  const [pages, setPages] = useState<LandingPage[]>([])
  const [loading, setLoading] = useState(true)
  const [showAIImport, setShowAIImport] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchPages()
  }, [])

  const fetchPages = async () => {
    try {
      const response = await fetch('/api/landing-pages')
      if (!response.ok) throw new Error('Failed to fetch pages')
      const { data } = await response.json()
      setPages(data || [])
    } catch (error) {
      console.error('Error fetching pages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this landing page?')) return
    
    try {
      const response = await fetch(`/api/landing-pages/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete page')
      fetchPages()
    } catch (error) {
      console.error('Error deleting page:', error)
    }
  }

  const handlePublish = async (id: string) => {
    try {
      const response = await fetch(`/api/landing-pages/${id}/publish`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to publish page')
      fetchPages()
    } catch (error) {
      console.error('Error publishing page:', error)
    }
  }

  const handleUnpublish = async (id: string) => {
    try {
      const response = await fetch(`/api/landing-pages/${id}/publish`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to unpublish page')
      fetchPages()
    } catch (error) {
      console.error('Error unpublishing page:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      published: 'bg-green-100 text-green-700',
      archived: 'bg-red-100 text-red-700'
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Landing Pages</h1>
          <p className="text-gray-600 mt-1">Create and manage your landing pages</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAIImport(!showAIImport)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Wand2 className="w-5 h-5" />
            AI Import
          </button>
          <Link
            href="/landing-pages/builder"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create New Page
          </Link>
        </div>
      </div>

      {showAIImport && (
        <div className="mb-8">
          <AITemplateImport 
            onImportComplete={(id) => {
              setShowAIImport(false)
              router.push(`/landing-pages/builder/${id}`)
            }}
          />
        </div>
      )}

      {pages.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Copy className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No landing pages yet</h3>
          <p className="text-gray-600 mb-6">Create your first landing page to get started</p>
          <Link
            href="/landing-pages/builder"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Landing Page
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pages.map((page) => (
            <div key={page.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Page Preview */}
              <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Copy className="w-16 h-16 text-gray-300" />
                </div>
                <div className="absolute top-2 right-2">
                  {getStatusBadge(page.status)}
                </div>
              </div>
              
              {/* Page Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{page.name}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {page.description || 'No description'}
                </p>
                
                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {page.views_count || 0} views
                  </span>
                  <span>{page.conversion_rate || 0}% conversion</span>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/landing-pages/builder/${page.id}`}
                    className="flex-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 text-sm text-center"
                  >
                    Edit
                  </Link>
                  
                  {page.status === 'published' ? (
                    <>
                      <a
                        href={`/l/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleUnpublish(page.id)}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                        title="Unpublish"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handlePublish(page.id)}
                      className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-sm"
                    >
                      Publish
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDelete(page.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}