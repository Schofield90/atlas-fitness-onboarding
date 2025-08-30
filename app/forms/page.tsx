'use client'

import DashboardLayout from '../components/DashboardLayout'
import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Form {
  id: string
  title: string
  description: string
  type: string
  is_active: boolean
  created_at: string
  schema?: any
}

export default function FormsDocumentsPage() {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showFormBuilder, setShowFormBuilder] = useState(false)
  const [formDescription, setFormDescription] = useState('')
  const [generatingForm, setGeneratingForm] = useState(false)
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [generatedForm, setGeneratedForm] = useState<any>(null)
  const [showFormPreview, setShowFormPreview] = useState(false)
  const [editingForm, setEditingForm] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({
    waivers: false,
    contracts: false,
    health: false,
    policies: false
  })
  const supabase = createClient()
  
  useEffect(() => {
    fetchForms()
  }, [])
  
  const getFormCountByType = (type: string) => {
    return forms.filter(form => form.type === type).length
  }
  
  const fetchForms = async () => {
    try {
      const response = await fetch('/api/forms/list')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch forms')
      }
      
      setForms(data.forms || [])
    } catch (error) {
      console.error('Error fetching forms:', error)
    } finally {
      setLoading(false)
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
      console.log('API Response:', data);
      
      if (!response.ok) {
        console.error('API Error:', data);
        throw new Error(data.error || 'Failed to generate form');
      }
      
      if (data.success) {
        console.log('Generated form:', data.form);
        setGeneratedForm(data.form);
        setShowFormBuilder(false);
        setShowFormPreview(true);
        setFormDescription('');
      } else {
        throw new Error(data.error || 'Failed to generate form');
      }
    } catch (error: any) {
      console.error('Error generating form:', error);
      const errorMessage = error.message || 'Failed to generate form. Please try again.';
      alert(errorMessage);
    } finally {
      setGeneratingForm(false);
    }
  }
  
  const saveForm = async () => {
    try {
      const url = generatedForm.id ? '/api/forms/update' : '/api/forms/save';
      const method = generatedForm.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generatedForm),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save form');
      }
      
      alert(generatedForm.id ? 'Form updated successfully!' : 'Form saved successfully!');
      setShowFormPreview(false);
      setGeneratedForm(null);
      setEditingForm(false);
      fetchForms(); // Refresh the forms list
    } catch (error: any) {
      console.error('Error saving form:', error);
      alert(error.message || 'Failed to save form. Please try again.');
    }
  }
  
  const updateFormField = (fieldId: string, updates: any) => {
    setGeneratedForm((prev: any) => ({
      ...prev,
      schema: {
        ...prev.schema,
        fields: prev.schema.fields.map((field: any) =>
          field.id === fieldId ? { ...field, ...updates } : field
        )
      }
    }));
  }
  
  const addFormField = () => {
    const newField = {
      id: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      placeholder: ''
    };
    
    setGeneratedForm((prev: any) => ({
      ...prev,
      schema: {
        ...prev.schema,
        fields: [...prev.schema.fields, newField]
      }
    }));
  }
  
  const removeFormField = (fieldId: string) => {
    setGeneratedForm((prev: any) => ({
      ...prev,
      schema: {
        ...prev.schema,
        fields: prev.schema.fields.filter((field: any) => field.id !== fieldId)
      }
    }));
  }
  
  const viewForm = (form: Form) => {
    setGeneratedForm(form);
    setShowFormPreview(true);
    setEditingForm(false);
  }
  
  const editForm = (form: Form) => {
    setGeneratedForm(form);
    setShowFormPreview(true);
    setEditingForm(true);
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Website & Forms</h2>
              <p className="text-gray-400 mt-1">Manage lead capture forms, waivers, contracts, and member documents</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => window.location.href = '/lead-forms'}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a1.5 1.5 0 01-3 0 1.5 1.5 0 013 0z" />
                </svg>
                Create Lead Form
              </button>
              <button 
                onClick={() => {
                  // Create a blank form for manual building
                  const blankForm = {
                    title: 'New Form',
                    description: 'Custom form built manually',
                    type: 'custom',
                    is_active: true,
                    schema: {
                      fields: [
                        {
                          id: `field_${Date.now()}`,
                          label: 'Full Name',
                          type: 'text',
                          required: true,
                          placeholder: 'Enter your full name'
                        }
                      ]
                    }
                  };
                  setGeneratedForm(blankForm);
                  setShowFormPreview(true);
                  setEditingForm(true);
                }}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Manual Form Builder
              </button>
              <button 
                onClick={() => setShowFormBuilder(true)}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Document Builder
              </button>
              <button 
                onClick={() => setShowUploadModal(true)}
                className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors"
              >
                + Upload Document
              </button>
            </div>
          </div>

          {/* Lead Forms Section */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">Lead Capture Forms</h3>
            <p className="text-gray-400 mb-6">Create forms to capture potential customers from your website, social media, and marketing campaigns</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="border border-gray-700 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                <div className="flex items-center mb-3">
                  <div className="bg-blue-100 p-2 rounded-lg mr-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Free Trial Forms</h4>
                    <p className="text-sm text-gray-400">Capture trial signups</p>
                  </div>
                </div>
                <div className="text-xs text-gray-500">0 forms created</div>
              </div>

              <div className="border border-gray-700 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                <div className="flex items-center mb-3">
                  <div className="bg-green-100 p-2 rounded-lg mr-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Contact Forms</h4>
                    <p className="text-sm text-gray-400">General enquiries</p>
                  </div>
                </div>
                <div className="text-xs text-gray-500">0 forms created</div>
              </div>

              <div className="border border-gray-700 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                <div className="flex items-center mb-3">
                  <div className="bg-purple-100 p-2 rounded-lg mr-3">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Class Interest</h4>
                    <p className="text-sm text-gray-400">Specific class signups</p>
                  </div>
                </div>
                <div className="text-xs text-gray-500">0 forms created</div>
              </div>
            </div>

            <div className="text-center">
              <button 
                onClick={() => window.location.href = '/lead-forms'}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition-colors font-medium"
              >
                Create Your First Lead Form
              </button>
            </div>
          </div>

          {/* Document Categories */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Member Documents & Waivers</h3>
            <p className="text-gray-400 mb-6">Manage legal documents, waivers, and contracts for existing members</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div 
              onClick={() => setExpandedCategories(prev => ({ ...prev, waivers: !prev.waivers }))}
              className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-750 transition-colors cursor-pointer">
              <svg className="w-12 h-12 mx-auto mb-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="font-semibold mb-1">Waivers</h3>
              <p className="text-sm text-gray-400">{getFormCountByType('waiver')} forms</p>
              <div className="mt-2 flex justify-center">
                {expandedCategories.waivers ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
              </div>
            </div>
            <div 
              onClick={() => setExpandedCategories(prev => ({ ...prev, contracts: !prev.contracts }))}
              className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-750 transition-colors cursor-pointer">
              <svg className="w-12 h-12 mx-auto mb-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              <h3 className="font-semibold mb-1">Contracts</h3>
              <p className="text-sm text-gray-400">{getFormCountByType('contract')} forms</p>
              <div className="mt-2 flex justify-center">
                {expandedCategories.contracts ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
              </div>
            </div>
            <div 
              onClick={() => setExpandedCategories(prev => ({ ...prev, health: !prev.health }))}
              className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-750 transition-colors cursor-pointer">
              <svg className="w-12 h-12 mx-auto mb-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="font-semibold mb-1">Health Forms</h3>
              <p className="text-sm text-gray-400">{getFormCountByType('health')} forms</p>
              <div className="mt-2 flex justify-center">
                {expandedCategories.health ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
              </div>
            </div>
            <div 
              onClick={() => setExpandedCategories(prev => ({ ...prev, policies: !prev.policies }))}
              className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-750 transition-colors cursor-pointer">
              <svg className="w-12 h-12 mx-auto mb-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="font-semibold mb-1">Policies</h3>
              <p className="text-sm text-gray-400">{getFormCountByType('policy')} forms</p>
              <div className="mt-2 flex justify-center">
                {expandedCategories.policies ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
              </div>
            </div>
          </div>

          {/* Expanded Category Content */}
          {Object.entries(expandedCategories).map(([category, isExpanded]) => 
            isExpanded && (
              <div key={category} className="mb-8 bg-gray-800 rounded-lg p-6 transition-all duration-300 ease-in-out">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold capitalize">{category} Documents</h3>
                  <button
                    onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: false }))}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Collapse section"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                </div>
                <div className="grid gap-4">
                  {forms.filter(f => f.type === category.slice(0, -1)).length > 0 ? (
                    forms.filter(f => f.type === category.slice(0, -1)).map(form => (
                      <div key={form.id} className="flex justify-between items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-650 transition-colors">
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{form.title}</h4>
                          <p className="text-sm text-gray-400 mt-1">{form.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs bg-gray-600 px-2 py-1 rounded capitalize">{form.type}</span>
                            <span className={`text-xs px-2 py-1 rounded ${form.is_active ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-400'}`}>
                              {form.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button 
                            onClick={() => viewForm(form)}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-1"
                            title="View form"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </button>
                          <button 
                            onClick={() => editForm(form)}
                            className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors flex items-center gap-1"
                            title="Edit form"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-400 bg-gray-750 rounded-lg border-2 border-dashed border-gray-600">
                      <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h4 className="text-lg font-medium text-white mb-2">No {category.toLowerCase()} forms yet</h4>
                      <p className="text-sm mb-6">Create your first {category.slice(0, -1).toLowerCase()} form to get started</p>
                      <div className="flex gap-3 justify-center">
                        <button 
                          onClick={() => setShowFormBuilder(true)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          Create with AI
                        </button>
                        <button 
                          onClick={() => {
                            const blankForm = {
                              title: `New ${category.slice(0, -1)} Form`,
                              description: `Custom ${category.slice(0, -1).toLowerCase()} form`,
                              type: category.slice(0, -1).toLowerCase(),
                              is_active: false,
                              schema: {
                                fields: [
                                  {
                                    id: `field_${Date.now()}`,
                                    label: 'Full Name',
                                    type: 'text',
                                    required: true,
                                    placeholder: 'Enter your full name'
                                  }
                                ]
                              }
                            }
                            setGeneratedForm(blankForm)
                            setShowFormPreview(true)
                            setEditingForm(true)
                          }}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Manual Builder
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {/* Recent Forms & Documents */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">All Forms & Documents</h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
              </div>
            ) : forms.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No forms created yet</p>
                <p className="text-sm text-gray-500 mt-2">Use the AI Form Builder to create forms for your gym</p>
              </div>
            ) : (
              <div className="space-y-3">
                {forms.map((form) => (
                  <div key={form.id} className="border border-gray-700 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium">{form.title}</h4>
                        <p className="text-sm text-gray-400 mt-1">{form.description}</p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
                          <span className="text-xs bg-gray-700 px-2 py-1 rounded">{form.type}</span>
                          <span className={`text-xs ${form.is_active ? 'text-green-400' : 'text-gray-500'}`}>
                            {form.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 self-start sm:self-auto">
                        <button 
                          onClick={() => viewForm(form)}
                          className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
                          title="View form"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => editForm(form)}
                          className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
                          title="Edit form"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Modal */}
          {showUploadModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">Upload Document</h3>
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-gray-400 mb-2">Drag and drop your file here, or click to browse</p>
                  <input 
                    type="file" 
                    className="hidden" 
                    id="file-upload"
                    onChange={(e) => {
                      alert('File upload functionality will be implemented soon!')
                      setShowUploadModal(false)
                    }}
                  />
                  <label 
                    htmlFor="file-upload"
                    className="inline-block bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors"
                  >
                    Select File
                  </label>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button 
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI Form Builder Modal */}
          {showFormBuilder && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">AI Form Builder</h3>
                <p className="text-gray-400 mb-6">
                  Describe the form you want to create, and our AI will help you build it!
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">What type of form do you need?</label>
                    <textarea 
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
                      rows={4}
                      placeholder="E.g., A gym membership waiver form with emergency contact info, health conditions, and liability release..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setFormDescription('Create a comprehensive gym liability waiver form that includes: member personal information, emergency contact details, acknowledgment of risks, liability release clause, photo/video consent, and signature fields')}
                      className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left">
                      <h4 className="font-medium mb-1">Liability Waiver</h4>
                      <p className="text-sm text-gray-400">Standard gym liability and injury waiver</p>
                    </button>
                    <button 
                      onClick={() => setFormDescription('Create a health assessment form with: personal details, medical history checklist, current medications, previous injuries, fitness goals, physical limitations, doctor clearance requirement, and emergency medical information')}
                      className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left">
                      <h4 className="font-medium mb-1">Health Assessment</h4>
                      <p className="text-sm text-gray-400">Medical history and fitness goals</p>
                    </button>
                    <button 
                      onClick={() => setFormDescription('Create a membership agreement form including: membership type selection, payment terms, automatic renewal clause, cancellation policy, gym rules and regulations, member responsibilities, and agreement signature')}
                      className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left">
                      <h4 className="font-medium mb-1">Membership Agreement</h4>
                      <p className="text-sm text-gray-400">Terms, payment, and cancellation policy</p>
                    </button>
                    <button className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left">
                      <h4 className="font-medium mb-1">Personal Training</h4>
                      <p className="text-sm text-gray-400">PT agreement and health screening</p>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button 
                    onClick={() => setShowFormBuilder(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={generateForm}
                    disabled={generatingForm}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
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

          {/* Form Preview Modal */}
          {showFormPreview && generatedForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold">{editingForm ? 'Edit Form' : 'View Form'}</h3>
                      <p className="text-gray-400 mt-1">
                        {editingForm ? 'Make changes to your form' : (generatedForm.id ? 'Review your saved form' : 'Review and edit your form before saving')}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setShowFormPreview(false);
                        setGeneratedForm(null);
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  {/* Form Details */}
                  <div className="mb-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Form Title</label>
                      <input 
                        type="text"
                        value={generatedForm.title}
                        onChange={(e) => editingForm && setGeneratedForm({ ...generatedForm, title: e.target.value })}
                        readOnly={!editingForm && generatedForm.id}
                        className={`w-full px-4 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none ${!editingForm && generatedForm.id ? 'opacity-75 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <textarea 
                        value={generatedForm.description}
                        onChange={(e) => setGeneratedForm({ ...generatedForm, description: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
                        rows={2}
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Type</label>
                        <select 
                          value={generatedForm.type}
                          onChange={(e) => setGeneratedForm({ ...generatedForm, type: e.target.value })}
                          className="px-4 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        >
                          <option value="waiver">Waiver</option>
                          <option value="contract">Contract</option>
                          <option value="health">Health</option>
                          <option value="policy">Policy</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          id="is_active"
                          checked={generatedForm.is_active}
                          onChange={(e) => setGeneratedForm({ ...generatedForm, is_active: e.target.checked })}
                          className="w-4 h-4 text-orange-500 bg-gray-700 rounded focus:ring-orange-500"
                        />
                        <label htmlFor="is_active" className="text-sm">Active</label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Form Fields */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Form Fields</h4>
                      <button 
                        onClick={addFormField}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
                      >
                        + Add Field
                      </button>
                    </div>
                    
                    {generatedForm.schema.fields.map((field: any, index: number) => (
                      <div key={field.id} className="bg-gray-700 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Label</label>
                            <input 
                              type="text"
                              value={field.label}
                              onChange={(e) => updateFormField(field.id, { label: e.target.value })}
                              className="w-full px-3 py-1 bg-gray-600 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Type</label>
                            <select 
                              value={field.type}
                              onChange={(e) => updateFormField(field.id, { type: e.target.value })}
                              className="w-full px-3 py-1 bg-gray-600 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:outline-none"
                            >
                              <option value="text">Text</option>
                              <option value="email">Email</option>
                              <option value="tel">Phone</option>
                              <option value="number">Number</option>
                              <option value="date">Date</option>
                              <option value="select">Select</option>
                              <option value="checkbox">Checkbox</option>
                              <option value="textarea">Textarea</option>
                              <option value="signature">Signature</option>
                            </select>
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <label className="block text-xs text-gray-400 mb-1">Placeholder</label>
                              <input 
                                type="text"
                                value={field.placeholder || ''}
                                onChange={(e) => updateFormField(field.id, { placeholder: e.target.value })}
                                className="w-full px-3 py-1 bg-gray-600 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox"
                                id={`required_${field.id}`}
                                checked={field.required}
                                onChange={(e) => updateFormField(field.id, { required: e.target.checked })}
                                className="w-3 h-3 text-orange-500 bg-gray-600 rounded focus:ring-orange-500"
                              />
                              <label htmlFor={`required_${field.id}`} className="text-xs">Required</label>
                            </div>
                            <button 
                              onClick={() => removeFormField(field.id)}
                              className="p-1 text-red-400 hover:text-red-300"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {field.type === 'select' && (
                          <div className="mt-3">
                            <label className="block text-xs text-gray-400 mb-1">Options (comma separated)</label>
                            <input 
                              type="text"
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => updateFormField(field.id, { 
                                options: e.target.value.split(',').map(o => o.trim()).filter(o => o) 
                              })}
                              className="w-full px-3 py-1 bg-gray-600 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:outline-none"
                              placeholder="Option 1, Option 2, Option 3"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="p-6 border-t border-gray-700">
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => {
                        setShowFormPreview(false);
                        setGeneratedForm(null);
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      Discard
                    </button>
                    <button 
                      onClick={saveForm}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                    >
                      Save Form
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}