'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/app/components/ui/Card'
import { Button } from '@/app/components/ui/Button'
import { SOPList } from '@/app/components/sops/SOPList'
import { SOPEditor } from '@/app/components/sops/SOPEditor'
import { SOPViewer } from '@/app/components/sops/SOPViewer'
import { SOPAnalysis } from '@/app/components/sops/SOPAnalysis'
import { SOPAssistant } from '@/app/components/sops/SOPAssistant'
import { SOPWithDetails, SOPFilters, SOPAnalysisResult } from '@/app/lib/types/sop'

type ViewMode = 'list' | 'create' | 'edit' | 'view'

export default function SOPsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedSOP, setSelectedSOP] = useState<SOPWithDetails | null>(null)
  const [filters, setFilters] = useState<SOPFilters>({})
  const [activeTab, setActiveTab] = useState<'content' | 'analysis' | 'assistant'>('content')
  const [showAssistant, setShowAssistant] = useState(false)

  const handleSelectSOP = (sop: SOPWithDetails) => {
    setSelectedSOP(sop)
    setViewMode('view')
    setActiveTab('content')
  }

  const handleCreateNew = () => {
    setSelectedSOP(null)
    setViewMode('create')
  }

  const handleEdit = () => {
    if (selectedSOP) {
      setViewMode('edit')
    }
  }

  const handleSave = (sop: SOPWithDetails) => {
    setSelectedSOP(sop)
    setViewMode('view')
    setActiveTab('content')
  }

  const handleCancel = () => {
    if (viewMode === 'create') {
      setSelectedSOP(null)
      setViewMode('list')
    } else if (viewMode === 'edit') {
      setViewMode('view')
    }
  }

  const handleBack = () => {
    setSelectedSOP(null)
    setViewMode('list')
    setActiveTab('content')
  }

  const handleAnalyze = async (file: File, metadata: any) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', metadata.title)
      formData.append('category', metadata.category)
      formData.append('description', metadata.description || '')
      formData.append('trainingRequired', metadata.training_required?.toString() || 'false')
      formData.append('saveAsNew', 'true')
      formData.append('generateQuiz', 'true')

      const response = await fetch('/api/sops/analyze', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to analyze document')
      }

      const data = await response.json()
      
      if (data.sop) {
        setSelectedSOP(data.sop)
        setViewMode('view')
        setActiveTab('analysis')
      }

      // Show success message or handle the analyzed content
      alert('Document analyzed successfully! You can now review and edit the content.')
    } catch (error) {
      console.error('Error analyzing document:', error)
      throw error
    }
  }

  const handleNavigateToSOP = async (sopId: string) => {
    try {
      const response = await fetch(`/api/sops/${sopId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedSOP(data.sop)
        setViewMode('view')
        setActiveTab('content')
      }
    } catch (error) {
      console.error('Error fetching SOP:', error)
    }
  }

  // Check if user can edit (you might want to implement role-based permissions)
  const canEdit = true // For now, assume all users can edit

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Global Assistant Toggle */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setShowAssistant(!showAssistant)}
            className="rounded-full w-14 h-14 bg-blue-600 hover:bg-blue-700 shadow-lg"
            title="SOP Assistant"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </Button>
        </div>

        {/* Assistant Modal */}
        {showAssistant && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl h-[600px] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-xl font-semibold">SOP Assistant</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssistant(false)}
                >
                  ✕
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <SOPAssistant 
                  sop={selectedSOP} 
                  onNavigateToSOP={handleNavigateToSOP}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {viewMode === 'list' && (
              <SOPList
                onSelectSOP={handleSelectSOP}
                onCreateNew={handleCreateNew}
                filters={filters}
                onFiltersChange={setFilters}
              />
            )}

            {viewMode === 'create' && (
              <SOPEditor
                onSave={handleSave}
                onCancel={handleCancel}
                onAnalyze={handleAnalyze}
              />
            )}

            {viewMode === 'edit' && selectedSOP && (
              <SOPEditor
                sop={selectedSOP}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            )}

            {viewMode === 'view' && selectedSOP && (
              <div className="space-y-6">
                {/* Tab Navigation */}
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex gap-8">
                    <button
                      onClick={() => setActiveTab('content')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'content'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Content
                    </button>
                    <button
                      onClick={() => setActiveTab('analysis')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'analysis'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      AI Analysis
                      {selectedSOP.ai_summary && (
                        <span className="ml-1 inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('assistant')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'assistant'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Ask Assistant
                    </button>
                  </nav>
                </div>

                {/* Tab Content */}
                {activeTab === 'content' && (
                  <SOPViewer
                    sop={selectedSOP}
                    onEdit={canEdit ? handleEdit : undefined}
                    onBack={handleBack}
                    canEdit={canEdit}
                  />
                )}

                {activeTab === 'analysis' && (
                  <SOPAnalysis
                    sop={selectedSOP}
                    onNavigateToSOP={handleNavigateToSOP}
                  />
                )}

                {activeTab === 'assistant' && (
                  <Card className="h-[600px]">
                    <SOPAssistant 
                      sop={selectedSOP}
                      onNavigateToSOP={handleNavigateToSOP}
                    />
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Sidebar - Quick Stats */}
          {viewMode === 'list' && (
            <div className="w-80 space-y-6">
              <QuickStats />
              <RecentActivity />
              <TrainingOverview />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Quick Stats Component
function QuickStats() {
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    draft: 0,
    training_required: 0
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/sops/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total SOPs</span>
          <span className="font-semibold text-gray-900">{stats.total}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Approved</span>
          <span className="font-semibold text-green-600">{stats.approved}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Drafts</span>
          <span className="font-semibold text-yellow-600">{stats.draft}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Require Training</span>
          <span className="font-semibold text-purple-600">{stats.training_required}</span>
        </div>
      </div>
    </Card>
  )
}

// Recent Activity Component
function RecentActivity() {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
          <div>
            <p className="text-gray-900">New SOP created</p>
            <p className="text-gray-500 text-xs">Emergency Procedures - 2 hours ago</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
          <div>
            <p className="text-gray-900">Training completed</p>
            <p className="text-gray-500 text-xs">Equipment Maintenance - 4 hours ago</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
          <div>
            <p className="text-gray-900">SOP updated</p>
            <p className="text-gray-500 text-xs">Customer Service Standards - 1 day ago</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

// Training Overview Component
function TrainingOverview() {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Training Overview</h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Completion Rate</span>
            <span className="font-medium">87%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '87%' }}></div>
          </div>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Pending</span>
            <span className="font-medium text-yellow-600">12</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Overdue</span>
            <span className="font-medium text-red-600">3</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Completed</span>
            <span className="font-medium text-green-600">45</span>
          </div>
        </div>
        
        <Button variant="outline" size="sm" className="w-full">
          View Training Dashboard
        </Button>
      </div>
    </Card>
  )
}