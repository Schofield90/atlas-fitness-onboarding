'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Globe, Code, Copy, CheckCircle, Plus, Trash2, ExternalLink, Loader2 } from 'lucide-react'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import { useRouter } from 'next/navigation'

export default function WebsiteIntegrationPage() {
  const [forms, setForms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchForms()
  }, [])

  const fetchForms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      // Get all forms for this organization
      const { data: formsData } = await supabase
        .from('forms')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .order('created_at', { ascending: false })

      setForms(formsData || [])
    } catch (error) {
      console.error('Error fetching forms:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyEmbedCode = (formId: string) => {
    const embedCode = `<iframe src="${window.location.origin}/embed/form/${formId}" width="100%" height="600" frameborder="0"></iframe>`
    navigator.clipboard.writeText(embedCode)
    setCopiedFormId(formId)
    setTimeout(() => setCopiedFormId(null), 2000)
  }

  const copyApiEndpoint = (formId: string) => {
    const endpoint = `${window.location.origin}/api/forms/${formId}/submit`
    navigator.clipboard.writeText(endpoint)
    setCopiedFormId(formId)
    setTimeout(() => setCopiedFormId(null), 2000)
  }

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', formId)

      if (error) throw error
      fetchForms()
    } catch (error) {
      console.error('Error deleting form:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsHeader 
        title="Website & Forms"
        description="Create and manage lead capture forms for your website"
        icon={<Globe className="h-6 w-6" />}
        action={
          <button
            onClick={() => router.push('/forms')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Form
          </button>
        }
      />

      {/* Forms List */}
      <div className="space-y-4">
        {forms.map((form) => (
          <div key={form.id} className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{form.name}</h3>
                <p className="text-gray-400 text-sm mt-1">{form.description || 'No description'}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-gray-500">
                    Created {new Date(form.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {form.submissions_count || 0} submissions
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push(`/forms/${form.id}/edit`)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteForm(form.id)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Embed Code */}
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-400">Embed Code</h4>
                  <button
                    onClick={() => copyEmbedCode(form.id)}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    {copiedFormId === form.id ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <code className="text-xs text-gray-300 break-all">
                  {`<iframe src="${window.location.origin}/embed/form/${form.id}" ...>`}
                </code>
              </div>

              {/* API Endpoint */}
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-400">API Endpoint</h4>
                  <button
                    onClick={() => copyApiEndpoint(form.id)}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    {copiedFormId === form.id ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <code className="text-xs text-gray-300 break-all">
                  POST {window.location.origin}/api/forms/{form.id}/submit
                </code>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4">
              <a
                href={`/embed/form/${form.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="h-4 w-4" />
                Preview Form
              </a>
              <button
                onClick={() => router.push(`/forms/${form.id}/submissions`)}
                className="text-sm text-gray-400 hover:text-white"
              >
                View Submissions
              </button>
            </div>
          </div>
        ))}
      </div>

      {forms.length === 0 && (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <Globe className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No forms yet</h3>
          <p className="text-gray-400 mb-4">Create your first lead capture form to start collecting leads from your website</p>
          <button
            onClick={() => router.push('/forms')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Your First Form
          </button>
        </div>
      )}

      {/* Integration Instructions */}
      <div className="bg-gray-900 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Integration Methods</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Code className="h-4 w-4" />
              Embed on Your Website
            </h4>
            <p className="text-sm text-gray-500 mb-2">
              Copy the embed code and paste it into your website's HTML where you want the form to appear.
            </p>
            <pre className="bg-gray-800 rounded p-3 text-xs text-gray-400 overflow-x-auto">
{`<!-- Add this to your website -->
<iframe 
  src="https://your-domain.com/embed/form/[FORM_ID]" 
  width="100%" 
  height="600" 
  frameborder="0"
></iframe>`}
            </pre>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Code className="h-4 w-4" />
              API Integration
            </h4>
            <p className="text-sm text-gray-500 mb-2">
              Submit form data programmatically using our REST API.
            </p>
            <pre className="bg-gray-800 rounded p-3 text-xs text-gray-400 overflow-x-auto">
{`// Example API request
fetch('https://your-domain.com/api/forms/[FORM_ID]/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+447123456789',
    message: 'I\'m interested in membership'
  })
})`}
            </pre>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Webhook Notifications</h4>
            <p className="text-sm text-gray-500">
              Configure webhooks in your form settings to receive real-time notifications when someone submits a form.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}