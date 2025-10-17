'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/app/components/DashboardLayout'
import DragDropFormBuilder from '@/app/components/forms/DragDropFormBuilder'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, 
  FileText, 
  Edit, 
  Trash2, 
  Copy, 
  ExternalLink,
  Users,
  BarChart,
  Settings,
  Eye
} from 'lucide-react'

interface Form {
  id: string
  title: string
  description: string
  fields: any[]
  submissions: number
  lastModified: string
  status: 'active' | 'draft'
  embedCode?: string
}

export default function CRMFormsPage() {
  const [forms, setForms] = useState<Form[]>([])
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingForm, setEditingForm] = useState<Form | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'draft'>('all')
  const [organizationId, setOrganizationId] = useState<string>('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadForms()
  }, [])

  const loadForms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (userOrg) {
        setOrganizationId(userOrg.organization_id)
        
        const { data: formsData } = await supabase
          .from('forms')
          .select('*')
          .eq('organization_id', userOrg.organization_id)
          .eq('type', 'lead')
          .order('created_at', { ascending: false })

        if (formsData) {
          setForms(formsData.map(form => ({
            id: form.id,
            title: form.title,
            description: form.description,
            fields: form.fields,
            submissions: form.submission_count || 0,
            lastModified: form.updated_at,
            status: form.status,
            embedCode: form.embed_code
          })))
        }
      }
    } catch (error) {
      console.error('Error loading forms:', error)
    }
  }

  const handleSaveForm = async (formData: any) => {
    try {
      if (editingForm) {
        // Update existing form
        const { error } = await supabase
          .from('forms')
          .update({
            title: formData.title,
            description: formData.description,
            fields: formData.fields,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingForm.id)

        if (!error) {
          await loadForms()
          setShowBuilder(false)
          setEditingForm(null)
        }
      } else {
        // Create new form
        const embedCode = `<script src="https://atlasfitness.com/embed.js" data-form-id="${Date.now()}"></script>`
        
        const { error } = await supabase
          .from('forms')
          .insert({
            organization_id: organizationId,
            title: formData.title,
            description: formData.description,
            fields: formData.fields,
            type: 'lead',
            status: 'active',
            embed_code: embedCode,
            created_at: new Date().toISOString()
          })

        if (!error) {
          await loadForms()
          setShowBuilder(false)
        }
      }
    } catch (error) {
      console.error('Error saving form:', error)
    }
  }

  const deleteForm = async (formId: string) => {
    if (confirm('Are you sure you want to delete this form?')) {
      try {
        const { error } = await supabase
          .from('forms')
          .delete()
          .eq('id', formId)

        if (!error) {
          await loadForms()
        }
      } catch (error) {
        console.error('Error deleting form:', error)
      }
    }
  }

  const duplicateForm = async (form: Form) => {
    try {
      const { error } = await supabase
        .from('forms')
        .insert({
          organization_id: organizationId,
          title: `${form.title} (Copy)`,
          description: form.description,
          fields: form.fields,
          type: 'lead',
          status: 'draft',
          created_at: new Date().toISOString()
        })

      if (!error) {
        await loadForms()
      }
    } catch (error) {
      console.error('Error duplicating form:', error)
    }
  }

  const filteredForms = forms.filter(form => {
    if (activeTab === 'active') return form.status === 'active'
    if (activeTab === 'draft') return form.status === 'draft'
    return true
  })

  if (showBuilder) {
    return (
      <DashboardLayout>
        <div className="h-full flex flex-col">
          <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-white">
                {editingForm ? `Edit: ${editingForm.title}` : 'Create Lead Form'}
              </h1>
              <button
                onClick={() => {
                  setShowBuilder(false)
                  setEditingForm(null)
                }}
                className="text-gray-400 hover:text-white"
              >
                ← Back to Forms
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <DragDropFormBuilder
              onSave={handleSaveForm}
              initialForm={editingForm}
              formType="lead"
            />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Lead Forms</h1>
            <p className="text-gray-300">Create and manage lead capture forms for your gym</p>
          </div>
          <button
            onClick={() => setShowBuilder(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Form
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-400">Total Forms</h3>
                <div className="text-2xl font-bold text-white mt-1">{forms.length}</div>
              </div>
              <FileText className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-400">Active Forms</h3>
                <div className="text-2xl font-bold text-white mt-1">
                  {forms.filter(f => f.status === 'active').length}
                </div>
              </div>
              <Users className="h-8 w-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-400">Total Submissions</h3>
                <div className="text-2xl font-bold text-white mt-1">
                  {forms.reduce((sum, f) => sum + f.submissions, 0)}
                </div>
              </div>
              <BarChart className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-400">Avg. Conversion</h3>
                <div className="text-2xl font-bold text-white mt-1">24.5%</div>
              </div>
              <BarChart className="h-8 w-8 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          {(['all', 'active', 'draft'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} Forms
            </button>
          ))}
        </div>

        {/* Forms List */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {filteredForms.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No forms yet</h3>
              <p className="text-gray-400 mb-6">Create your first lead capture form</p>
              <button
                onClick={() => setShowBuilder(true)}
                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                Create Your First Form
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredForms.map(form => (
                <div key={form.id} className="p-6 hover:bg-gray-750 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-white">{form.title}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          form.status === 'active' 
                            ? 'bg-green-900/50 text-green-300'
                            : 'bg-gray-700 text-gray-300'
                        }`}>
                          {form.status}
                        </span>
                      </div>
                      {form.description && (
                        <p className="text-gray-400 text-sm mb-2">{form.description}</p>
                      )}
                      <div className="flex items-center gap-6 text-sm text-gray-400">
                        <span>{form.fields.length} fields</span>
                        <span>{form.submissions} submissions</span>
                        <span>Modified {new Date(form.lastModified).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/crm/forms/${form.id}/submissions`)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        title="View Submissions"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingForm(form)
                          setShowBuilder(true)
                        }}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        title="Edit Form"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => duplicateForm(form)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        title="Duplicate Form"
                      >
                        <Copy className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          if (form.embedCode) {
                            navigator.clipboard.writeText(form.embedCode)
                            alert('Embed code copied to clipboard!')
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        title="Copy Embed Code"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteForm(form.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Delete Form"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}