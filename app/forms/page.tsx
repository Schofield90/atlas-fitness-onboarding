'use client'

import DashboardLayout from '../components/DashboardLayout'
import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'

interface Form {
  id: string
  title: string
  description: string
  type: string
  is_active: boolean
  created_at: string
}

export default function FormsDocumentsPage() {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showFormBuilder, setShowFormBuilder] = useState(false)
  const [formDescription, setFormDescription] = useState('')
  const [generatingForm, setGeneratingForm] = useState(false)
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  
  useEffect(() => {
    fetchForms()
  }, [])
  
  const getFormCountByType = (type: string) => {
    return forms.filter(form => form.type === type).length
  }
  
  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setForms(data || [])
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
      
      if (!response.ok) {
        throw new Error('Failed to generate form');
      }
      
      const data = await response.json();
      console.log('Generated form:', data);
      alert('Form generated successfully!');
      setShowFormBuilder(false);
      setFormDescription('');
      fetchForms(); // Refresh the forms list
    } catch (error) {
      console.error('Error generating form:', error);
      alert('Failed to generate form. Please try again.');
    } finally {
      setGeneratingForm(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Forms & Documents</h2>
              <p className="text-gray-400 mt-1">Manage waivers, contracts, and member documents</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowFormBuilder(true)}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Form Builder
              </button>
              <button 
                onClick={() => setShowUploadModal(true)}
                className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors"
              >
                + Upload Document
              </button>
            </div>
          </div>

          {/* Document Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-750 transition-colors cursor-pointer">
              <svg className="w-12 h-12 mx-auto mb-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="font-semibold mb-1">Waivers</h3>
              <p className="text-sm text-gray-400">{getFormCountByType('waiver')} forms</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-750 transition-colors cursor-pointer">
              <svg className="w-12 h-12 mx-auto mb-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              <h3 className="font-semibold mb-1">Contracts</h3>
              <p className="text-sm text-gray-400">{getFormCountByType('contract')} forms</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-750 transition-colors cursor-pointer">
              <svg className="w-12 h-12 mx-auto mb-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="font-semibold mb-1">Health Forms</h3>
              <p className="text-sm text-gray-400">{getFormCountByType('health')} forms</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-750 transition-colors cursor-pointer">
              <svg className="w-12 h-12 mx-auto mb-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="font-semibold mb-1">Policies</h3>
              <p className="text-sm text-gray-400">{getFormCountByType('policy')} forms</p>
            </div>
          </div>

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
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{form.title}</h4>
                        <p className="text-sm text-gray-400 mt-1">{form.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs bg-gray-700 px-2 py-1 rounded">{form.type}</span>
                          <span className={`text-xs ${form.is_active ? 'text-green-400' : 'text-gray-500'}`}>
                            {form.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="text-gray-400 hover:text-white p-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button className="text-gray-400 hover:text-white p-2">
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
        </div>
      </div>
    </DashboardLayout>
  )
}