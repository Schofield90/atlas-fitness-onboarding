'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import DashboardLayout from '@/app/components/DashboardLayout'

export default function LeadFormsPage() {
  const [embedCode, setEmbedCode] = useState('')
  const [showEmbedModal, setShowEmbedModal] = useState(false)
  const [selectedFormId, setSelectedFormId] = useState('default')
  const [embedType, setEmbedType] = useState<'iframe' | 'popup' | 'inline'>('iframe')
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    week: 0,
    conversion: 0
  })
  const [showFormBuilder, setShowFormBuilder] = useState(false)
  const [formDescription, setFormDescription] = useState('')
  const [generatingForm, setGeneratingForm] = useState(false)
  const [customForms, setCustomForms] = useState<any[]>([])
  const [editingForm, setEditingForm] = useState<any>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  
  const supabase = createClient()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app'

  useEffect(() => {
    loadLeads()
    loadStats()
    loadCustomForms()
  }, [])

  const loadLeads = async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (data && !error) {
      setLeads(data)
    }
    setLoading(false)
  }

  const loadStats = async () => {
    const now = new Date()
    const todayStart = new Date(now.setHours(0,0,0,0))
    const weekStart = new Date(now.setDate(now.getDate() - 7))
    
    const { count: total } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
    
    const { count: today } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())
    
    const { count: week } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekStart.toISOString())
    
    setStats({
      total: total || 0,
      today: today || 0,
      week: week || 0,
      conversion: 0
    })
  }

  const loadCustomForms = async () => {
    try {
      const response = await fetch('/api/forms/list')
      const data = await response.json()
      console.log('Loaded forms:', data.forms?.length || 0)
      if (data.forms) {
        setCustomForms(data.forms)
      } else if (data.error) {
        console.error('Error from API:', data.error)
      }
    } catch (error) {
      console.error('Error loading forms:', error)
    }
  }

  const handleEditForm = (form: any) => {
    setEditingForm(form)
    setShowEditModal(true)
  }

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form?')) return
    
    try {
      const response = await fetch(`/api/forms/delete?id=${formId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        alert('Form deleted successfully')
        loadCustomForms()
      } else {
        const error = await response.json()
        const errorMsg = error?.error?.userMessage || error?.error?.message || error?.message || 'Failed to delete form'
        alert(`Failed to delete form: ${errorMsg}`)
      }
    } catch (error) {
      console.error('Error deleting form:', error)
      alert('Failed to delete form')
    }
  }

  const handleSaveForm = async (formData: any) => {
    try {
      const url = editingForm ? '/api/forms/update' : '/api/forms/save'
      const method = editingForm ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id: editingForm?.id
        })
      })
      
      if (response.ok) {
        alert(editingForm ? 'Form updated successfully' : 'Form created successfully')
        setShowEditModal(false)
        setEditingForm(null)
        // Add a small delay to ensure database write completes
        setTimeout(() => {
          loadCustomForms()
        }, 500)
      } else {
        const error = await response.json()
        const errorMsg = error?.error?.userMessage || error?.error?.message || error?.message || 'Failed to save form'
        alert(`Failed to save form: ${errorMsg}`)
      }
    } catch (error) {
      console.error('Error saving form:', error)
      alert('Failed to save form')
    }
  }

  const generateForm = async () => {
    if (!formDescription.trim()) {
      alert('Please describe the form you want to create');
      return;
    }
    
    setGeneratingForm(true);
    
    try {
      const response = await fetch('/api/ai/generate-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: formDescription }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate form');
      }
      
      if (data.success) {
        // Save the generated form immediately
        const saveResponse = await fetch('/api/forms/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.form)
        })
        const saveData = await saveResponse.json()

        if (!saveResponse.ok || !saveData?.form) {
          throw new Error(saveData?.error || 'Failed to save generated form')
        }

        // Refresh forms list so it appears straight away
        setTimeout(() => {
          loadCustomForms()
        }, 300)

        // Open edit modal so user can name and tweak the form
        setEditingForm(saveData.form)
        setShowEditModal(true)

        // Close builder modal and reset input
        setShowFormBuilder(false)
        setFormDescription('')
      }
    } catch (error: any) {
      console.error('Error generating form:', error);
      alert(error.message || 'Failed to generate form. Please try again.');
    } finally {
      setGeneratingForm(false);
    }
  }

  const generateEmbedCode = (formId: string, type: 'iframe' | 'popup' | 'inline') => {
    const formUrl = `${baseUrl}/embed/form/${formId}`
    
    switch (type) {
      case 'iframe':
        return `<!-- Atlas Fitness Lead Form -->
<iframe 
  src="${formUrl}"
  width="100%" 
  height="800" 
  frameborder="0"
  style="border: none; max-width: 600px; margin: 0 auto; display: block;">
</iframe>`
        
      case 'popup':
        return `<!-- Atlas Fitness Lead Form Popup -->
<script>
  function openAtlasForm() {
    window.open('${formUrl}', 'atlas-form', 'width=600,height=800');
  }
</script>
<button onclick="openAtlasForm()" style="background: #3B82F6; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
  Get Your FREE Trial
</button>`
        
      case 'inline':
        return `<!-- Atlas Fitness Lead Form Script -->
<div id="atlas-form-container"></div>
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${baseUrl}/embed/form.js';
    script.setAttribute('data-form-id', '${formId}');
    script.setAttribute('data-container', 'atlas-form-container');
    document.head.appendChild(script);
  })();
</script>`
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Embed code copied to clipboard!')
  }

  const updateLeadStatus = async (leadId: string, status: string) => {
    await supabase
      .from('leads')
      .update({ status })
      .eq('id', leadId)
    
    await loadLeads()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500'
      case 'contacted': return 'bg-yellow-500'
      case 'qualified': return 'bg-green-500'
      case 'converted': return 'bg-purple-500'
      case 'lost': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Lead Forms</h1>
          <p className="text-gray-400">Create and manage embeddable lead capture forms for your landing pages</p>
        </div>

        <div className="grid gap-6">
          {/* Quick Stats */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-sm text-gray-400 mb-1">Total Leads</h3>
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-sm text-green-500 mt-1">All time</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-sm text-gray-400 mb-1">Today</h3>
              <p className="text-3xl font-bold">{stats.today}</p>
              <p className="text-sm text-gray-500 mt-1">New leads</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-sm text-gray-400 mb-1">This Week</h3>
              <p className="text-3xl font-bold">{stats.week}</p>
              <p className="text-sm text-gray-500 mt-1">Total leads</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-sm text-gray-400 mb-1">Active Forms</h3>
              <p className="text-3xl font-bold">1</p>
              <p className="text-sm text-gray-500 mt-1">Default form</p>
            </div>
          </div>

          {/* Forms List */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Your Forms</h2>
              <button 
                onClick={() => setShowFormBuilder(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Create New Form
              </button>
            </div>

            <div className="space-y-4">
              {/* Default Form */}
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">Default Lead Form</h3>
                    <p className="text-sm text-gray-400">Standard fitness consultation form with goals and preferences</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-green-500">● Active</span>
                      <span className="text-gray-400">{stats.total} submissions</span>
                      <span className="text-gray-400">Created: Today</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.open(`${baseUrl}/embed/form/default`, '_blank')}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFormId('default')
                        setEmbedCode(generateEmbedCode('default', embedType))
                        setShowEmbedModal(true)
                      }}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                    >
                      Get Embed Code
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Custom Forms */}
              {customForms.map((form) => (
                <div key={form.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold mb-1">{form.title}</h3>
                      <p className="text-sm text-gray-400">{form.description || 'Custom lead capture form'}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className={form.is_active ? "text-green-500" : "text-red-500"}>
                          ● {form.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-gray-400">Type: {form.type || 'custom'}</span>
                        <span className="text-gray-400">Created: {new Date(form.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditForm(form)}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => window.open(`${baseUrl}/embed/form/${form.id}`, '_blank')}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => {
                          setSelectedFormId(form.id)
                          setEmbedCode(generateEmbedCode(form.id, embedType))
                          setShowEmbedModal(true)
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                      >
                        Embed
                      </button>
                      <button
                        onClick={() => handleDeleteForm(form.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Leads */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Leads</h2>
            {loading ? (
              <p className="text-gray-400">Loading...</p>
            ) : leads.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No leads yet. Share your form to start collecting leads!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm">
                      <th className="pb-4">Name</th>
                      <th className="pb-4">Email</th>
                      <th className="pb-4">Phone</th>
                      <th className="pb-4">Goals</th>
                      <th className="pb-4">Status</th>
                      <th className="pb-4">Date</th>
                      <th className="pb-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-t border-gray-700">
                        <td className="py-3">{lead.first_name} {lead.last_name}</td>
                        <td className="py-3">{lead.email}</td>
                        <td className="py-3">{lead.phone || '-'}</td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            {(lead.fitness_goals || []).slice(0, 2).map((goal: string, i: number) => (
                              <span key={i} className="px-2 py-1 bg-gray-700 rounded text-xs">
                                {goal}
                              </span>
                            ))}
                            {lead.fitness_goals?.length > 2 && (
                              <span className="text-xs text-gray-500">+{lead.fitness_goals.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(lead.status)}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-3 text-gray-400">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <select 
                            value={lead.status}
                            onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                            className="bg-gray-700 text-white text-xs rounded px-2 py-1"
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="converted">Converted</option>
                            <option value="lost">Lost</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Embed Modal */}
        {showEmbedModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold mb-4">Embed Your Lead Form</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Embed Type</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setEmbedType('iframe')
                      setEmbedCode(generateEmbedCode(selectedFormId, 'iframe'))
                    }}
                    className={`px-4 py-2 rounded ${embedType === 'iframe' ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    iFrame
                  </button>
                  <button
                    onClick={() => {
                      setEmbedType('popup')
                      setEmbedCode(generateEmbedCode(selectedFormId, 'popup'))
                    }}
                    className={`px-4 py-2 rounded ${embedType === 'popup' ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    Popup Button
                  </button>
                  <button
                    onClick={() => {
                      setEmbedType('inline')
                      setEmbedCode(generateEmbedCode(selectedFormId, 'inline'))
                    }}
                    className={`px-4 py-2 rounded ${embedType === 'inline' ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    Inline Script
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Embed Code</label>
                <textarea
                  value={embedCode}
                  readOnly
                  className="w-full h-40 p-3 bg-gray-900 text-gray-300 rounded font-mono text-sm"
                />
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-2">Instructions:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-400">
                  <li>Copy the embed code above</li>
                  <li>Paste it into your website&apos;s HTML where you want the form to appear</li>
                  <li>
                    {embedType === 'iframe' && 'The form will display in an iframe with responsive sizing'}
                    {embedType === 'popup' && 'Clicking the button will open the form in a popup window'}
                    {embedType === 'inline' && 'The form will load dynamically in the specified container'}
                  </li>
                  <li>All submissions will appear in your leads dashboard</li>
                </ol>
              </div>

              <div className="mb-4 p-4 bg-blue-900 bg-opacity-30 rounded">
                <h4 className="font-medium mb-2">🔔 Webhook Integration</h4>
                <p className="text-sm text-gray-300 mb-2">
                  Connect to Zapier, Make, or any webhook service:
                </p>
                <code className="block p-2 bg-gray-900 rounded text-xs">
                  POST {baseUrl}/api/forms/submit
                </code>
                <p className="text-xs text-gray-400 mt-2">
                  Headers: Content-Type: application/json, X-Form-ID: {selectedFormId}
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => copyToClipboard(embedCode)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors"
                >
                  Copy Code
                </button>
                <button
                  onClick={() => setShowEmbedModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Form Builder Modal */}
        {showFormBuilder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">Create Lead Form</h3>
              <p className="text-gray-400 mb-6">
                Describe the lead capture form you want to create for your landing page
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">What information do you want to collect?</label>
                  <textarea 
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none text-white"
                    rows={4}
                    placeholder="E.g., Create a free trial signup form with name, email, phone, fitness goals checkboxes (weight loss, muscle gain, endurance), preferred contact time, and how they heard about us..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setFormDescription('Create a free trial signup form with: full name, email, phone number, fitness goals (checkboxes for weight loss, muscle gain, strength training, endurance), preferred class times, and how they heard about us')}
                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left">
                    <h4 className="font-medium mb-1">Free Trial Form</h4>
                    <p className="text-sm text-gray-400">Capture trial signups with goals</p>
                  </button>
                  <button 
                    onClick={() => setFormDescription('Create a contact form for general inquiries with: name, email, phone (optional), subject dropdown (membership info, class schedules, personal training, other), message textarea, and preferred contact method')}
                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left">
                    <h4 className="font-medium mb-1">Contact Form</h4>
                    <p className="text-sm text-gray-400">General inquiries and questions</p>
                  </button>
                  <button 
                    onClick={() => setFormDescription('Create a class interest form with: name, email, phone, interested classes (checkboxes for yoga, HIIT, spin, strength training, pilates), experience level, availability, and any injuries or limitations')}
                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left">
                    <h4 className="font-medium mb-1">Class Interest</h4>
                    <p className="text-sm text-gray-400">Specific class registrations</p>
                  </button>
                  <button 
                    onClick={() => setFormDescription('Create a quick lead capture form with just: first name, email address, and a single dropdown for main fitness goal (lose weight, build muscle, get stronger, improve health)')}
                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left">
                    <h4 className="font-medium mb-1">Quick Capture</h4>
                    <p className="text-sm text-gray-400">Minimal fields for high conversion</p>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => {
                    setShowFormBuilder(false);
                    setFormDescription('');
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={generateForm}
                  disabled={generatingForm}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
                >
                  {generatingForm ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    'Generate Form'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Form Modal */}
        {showEditModal && editingForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">Edit Form</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Form Title</label>
                  <input
                    type="text"
                    value={editingForm.title || ''}
                    onChange={(e) => setEditingForm({...editingForm, title: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white"
                    placeholder="Enter form title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={editingForm.description || ''}
                    onChange={(e) => setEditingForm({...editingForm, description: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white"
                    rows={3}
                    placeholder="Enter form description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Form Type</label>
                  <select
                    value={editingForm.type || 'custom'}
                    onChange={(e) => setEditingForm({...editingForm, type: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white"
                  >
                    <option value="custom">Custom</option>
                    <option value="waiver">Waiver</option>
                    <option value="contract">Contract</option>
                    <option value="health">Health</option>
                    <option value="policy">Policy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Form Fields (JSON Schema)</label>
                  <textarea
                    value={JSON.stringify(editingForm.schema, null, 2)}
                    onChange={(e) => {
                      try {
                        const schema = JSON.parse(e.target.value)
                        setEditingForm({...editingForm, schema})
                      } catch (error) {
                        // Invalid JSON, don't update
                      }
                    }}
                    className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white font-mono text-sm"
                    rows={10}
                    placeholder="Enter form schema as JSON"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Edit the JSON schema to add, remove, or modify form fields
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editingForm.is_active !== false}
                    onChange={(e) => setEditingForm({...editingForm, is_active: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="isActive" className="text-sm">Form is active</label>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => handleSaveForm(editingForm)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingForm(null)
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  )
}