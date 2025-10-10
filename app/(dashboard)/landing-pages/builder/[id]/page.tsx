'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageBuilder from '@/app/components/landing-builder/PageBuilder'
import { ArrowLeft, Save, Eye } from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/app/components/DashboardLayout'

function EditLandingPageBuilderContent({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [page, setPage] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPage()
  }, [params.id])

  const fetchPage = async () => {
    try {
      const response = await fetch(`/api/landing-pages/${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch page')
      const { data } = await response.json()
      setPage(data)
    } catch (error) {
      console.error('Error fetching page:', error)
      alert('Failed to load page')
      router.push('/landing-pages')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (content: any[]) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/landing-pages/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...page,
          content
        })
      })
      
      if (!response.ok) throw new Error('Failed to save page')
      
      alert('Page saved successfully!')
      fetchPage()
    } catch (error) {
      console.error('Error saving page:', error)
      alert('Failed to save page')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async (content: any[]) => {
    // First save
    await handleSave(content)
    
    // Then publish
    try {
      const response = await fetch(`/api/landing-pages/${params.id}/publish`, {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Failed to publish page')
      
      const { publicUrl } = await response.json()
      alert(`Page published! View at: ${window.location.origin}${publicUrl}`)
      fetchPage()
    } catch (error) {
      console.error('Error publishing page:', error)
      alert('Failed to publish page')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Page not found</h2>
          <Link href="/landing-pages" className="text-blue-600 hover:underline">
            Back to landing pages
          </Link>
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
            <Link
              href="/landing-pages"
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold">{page.name}</h1>
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600">
                  {page.status === 'published' ? 'Published' : 'Draft'}
                </p>
                {page.status === 'published' && (
                  <a
                    href={`/l/${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    View Live
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <div className="text-sm text-gray-600">Saving...</div>
            )}
            <button
              onClick={() => handleSave(page.content || [])}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              disabled={saving}
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      </div>
      
      {/* Page Builder */}
      <div className="flex-1">
        <PageBuilder
          initialContent={page.content || []}
          onSave={handleSave}
          onPublish={handlePublish}
        />
      </div>
    </div>
  )
}

export default function EditLandingPageBuilderPage({ params }: { params: { id: string } }) {
  return (
    <DashboardLayout userData={null}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        }
      >
        <EditLandingPageBuilderContent params={params} />
      </Suspense>
    </DashboardLayout>
  )
}