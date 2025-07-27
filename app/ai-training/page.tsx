'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'

interface Feedback {
  id: string
  user_message: string
  ai_response: string
  preferred_response: string
  feedback_category: string
  context_notes: string | null
  is_active: boolean
  created_at: string
}

const FEEDBACK_CATEGORIES = [
  { value: 'tone', label: 'Tone & Style' },
  { value: 'accuracy', label: 'Accuracy' },
  { value: 'length', label: 'Response Length' },
  { value: 'sales_approach', label: 'Sales Approach' },
  { value: 'information', label: 'Information Detail' },
  { value: 'other', label: 'Other' }
]

export default function AITrainingPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [testMessage, setTestMessage] = useState('')
  const [testResponse, setTestResponse] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newFeedback, setNewFeedback] = useState({
    user_message: '',
    ai_response: '',
    preferred_response: '',
    feedback_category: 'tone',
    context_notes: ''
  })

  const supabase = createClient()

  useEffect(() => {
    loadFeedbacks()
  }, [])

  const loadFeedbacks = async () => {
    const { data, error } = await supabase
      .from('ai_feedback')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data && !error) {
      setFeedbacks(data)
    }
    setLoading(false)
  }

  const testAI = async () => {
    if (!testMessage) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/whatsapp/test-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testMessage })
      })
      const data = await res.json()
      if (data.success) {
        setTestResponse(data.aiResponse)
        setNewFeedback({
          ...newFeedback,
          user_message: testMessage,
          ai_response: data.aiResponse
        })
        setShowAddForm(true)
      }
    } catch (error) {
      console.error('Test error:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveFeedback = async () => {
    try {
      console.log('Saving feedback:', newFeedback)
      
      const { data, error } = await supabase
        .from('ai_feedback')
        .insert([{
          user_message: newFeedback.user_message,
          ai_response: newFeedback.ai_response,
          preferred_response: newFeedback.preferred_response,
          feedback_category: newFeedback.feedback_category,
          context_notes: newFeedback.context_notes || null
        }])
        .select()
      
      if (error) {
        console.error('Error saving feedback:', error)
        alert(`Error saving feedback: ${error.message}`)
        return
      }
      
      console.log('Feedback saved successfully:', data)
      await loadFeedbacks()
      setShowAddForm(false)
      setNewFeedback({
        user_message: '',
        ai_response: '',
        preferred_response: '',
        feedback_category: 'tone',
        context_notes: ''
      })
      setTestMessage('')
      setTestResponse('')
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('An unexpected error occurred. Please check the console.')
    }
  }

  const toggleFeedback = async (id: string, isActive: boolean) => {
    await supabase
      .from('ai_feedback')
      .update({ is_active: !isActive })
      .eq('id', id)
    
    await loadFeedbacks()
  }

  const deleteFeedback = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return
    
    await supabase
      .from('ai_feedback')
      .delete()
      .eq('id', id)
    
    await loadFeedbacks()
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">AI Response Training</h1>
      
      {/* Test Section */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Test Current AI Response</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Type a message to test..."
              className="flex-1 p-2 border rounded"
              onKeyPress={(e) => e.key === 'Enter' && testAI()}
            />
            <button
              onClick={testAI}
              disabled={loading || !testMessage}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Test AI
            </button>
          </div>
          
          {testResponse && (
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600 mb-1">AI Response:</p>
              <p className="text-gray-800">{testResponse}</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                → Provide better response
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Feedback Form */}
      {showAddForm && (
        <div className="mb-8 p-6 bg-blue-50 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Provide Better Response</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">User Message</label>
              <input
                type="text"
                value={newFeedback.user_message}
                onChange={(e) => setNewFeedback({...newFeedback, user_message: e.target.value})}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Current AI Response</label>
              <textarea
                value={newFeedback.ai_response}
                onChange={(e) => setNewFeedback({...newFeedback, ai_response: e.target.value})}
                className="w-full p-2 border rounded h-20"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Preferred Response</label>
              <textarea
                value={newFeedback.preferred_response}
                onChange={(e) => setNewFeedback({...newFeedback, preferred_response: e.target.value})}
                placeholder="Write how you'd prefer the AI to respond..."
                className="w-full p-2 border rounded h-20"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={newFeedback.feedback_category}
                  onChange={(e) => setNewFeedback({...newFeedback, feedback_category: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  {FEEDBACK_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={newFeedback.context_notes}
                  onChange={(e) => setNewFeedback({...newFeedback, context_notes: e.target.value})}
                  placeholder="Any additional context..."
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={saveFeedback}
                disabled={!newFeedback.preferred_response}
                className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                Save Feedback
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setTestResponse('')
                }}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Training Examples ({feedbacks.filter(f => f.is_active).length} active)</h2>
        
        {loading ? (
          <p>Loading...</p>
        ) : feedbacks.length === 0 ? (
          <p className="text-gray-500">No training examples yet. Test the AI above to add some!</p>
        ) : (
          feedbacks.map((feedback) => (
            <div
              key={feedback.id}
              className={`p-6 bg-white rounded-lg shadow ${!feedback.is_active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 text-sm rounded-full ${
                    feedback.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {feedback.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                    {FEEDBACK_CATEGORIES.find(c => c.value === feedback.feedback_category)?.label || feedback.feedback_category}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleFeedback(feedback.id, feedback.is_active)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {feedback.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => deleteFeedback(feedback.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">User:</p>
                  <p className="text-gray-800">{feedback.user_message}</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 bg-red-50 rounded">
                    <p className="text-sm font-medium text-red-800 mb-1">Current AI Response:</p>
                    <p className="text-sm text-gray-700">{feedback.ai_response}</p>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded">
                    <p className="text-sm font-medium text-green-800 mb-1">Preferred Response:</p>
                    <p className="text-sm text-gray-700">{feedback.preferred_response}</p>
                  </div>
                </div>
                
                {feedback.context_notes && (
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Note:</span> {feedback.context_notes}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}