'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/app/components/DashboardLayout'
import { isFeatureEnabled } from '@/app/lib/feature-flags'
import ComingSoon from '@/app/components/ComingSoon'
import { useToast } from '@/app/lib/hooks/useToast'
import SurveyAnalytics from '@/app/components/surveys/SurveyAnalytics'
import { 
  PlusIcon,
  EyeIcon,
  EditIcon,
  TrashIcon,
  SendIcon,
  BarChartIcon,
  ClipboardListIcon,
  UsersIcon,
  CalendarIcon,
  TrendingUpIcon,
  CheckCircleIcon
} from 'lucide-react'

// Mock data for surveys
const mockSurveys = [
  {
    id: 1,
    title: 'Fitness Goals Assessment',
    description: 'Understanding member fitness objectives and preferences',
    status: 'active',
    responses: 47,
    completionRate: 73.4,
    createdAt: '2025-01-15',
    questions: 8,
    type: 'fitness_assessment'
  },
  {
    id: 2,
    title: 'Class Feedback Survey',
    description: 'Gathering feedback on our group fitness classes',
    status: 'completed',
    responses: 124,
    completionRate: 89.2,
    createdAt: '2025-01-10',
    questions: 12,
    type: 'feedback'
  },
  {
    id: 3,
    title: 'Facility Satisfaction Survey',
    description: 'Member satisfaction with gym facilities and services',
    status: 'draft',
    responses: 0,
    completionRate: 0,
    createdAt: '2025-01-20',
    questions: 15,
    type: 'satisfaction'
  },
  {
    id: 4,
    title: 'New Member Welcome Survey',
    description: 'Welcome survey for new gym members',
    status: 'active',
    responses: 23,
    completionRate: 95.8,
    createdAt: '2025-01-05',
    questions: 6,
    type: 'onboarding'
  }
]

const surveyTemplates = [
  { id: 1, name: 'Member Satisfaction', questions: 10, description: 'Comprehensive satisfaction survey' },
  { id: 2, name: 'Fitness Goals', questions: 8, description: 'Assess member fitness objectives' },
  { id: 3, name: 'Class Feedback', questions: 6, description: 'Gather feedback on specific classes' },
  { id: 4, name: 'Facility Feedback', questions: 12, description: 'Feedback on gym facilities and equipment' },
  { id: 5, name: 'Personal Training', questions: 9, description: 'PT service feedback and preferences' },
  { id: 6, name: 'Membership Renewal', questions: 5, description: 'Renewal decision factors' }
]

export default function SurveyPage() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'create' | 'responses' | 'analytics'>('overview')
  const [surveys, setSurveys] = useState(mockSurveys)
  const [selectedSurvey, setSelectedSurvey] = useState<any>(null)
  const toast = useToast()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <DashboardLayout userData={null}>
        <div className="container mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-48 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-96 mb-8"></div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-500 text-white',
      completed: 'bg-blue-500 text-white',
      draft: 'bg-gray-500 text-white',
      paused: 'bg-yellow-500 text-black'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-500 text-white'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getTypeIcon = (type: string) => {
    const icons = {
      fitness_assessment: <TrendingUpIcon className="h-4 w-4" />,
      feedback: <ClipboardListIcon className="h-4 w-4" />,
      satisfaction: <CheckCircleIcon className="h-4 w-4" />,
      onboarding: <UsersIcon className="h-4 w-4" />
    }
    return icons[type] || <ClipboardListIcon className="h-4 w-4" />
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Active Surveys</p>
              <p className="text-2xl font-bold text-white">
                {surveys.filter(s => s.status === 'active').length}
              </p>
            </div>
            <div className="p-3 bg-green-500 rounded-lg">
              <ClipboardListIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Responses</p>
              <p className="text-2xl font-bold text-white">
                {surveys.reduce((sum, s) => sum + s.responses, 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <UsersIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Avg Completion Rate</p>
              <p className="text-2xl font-bold text-white">
                {(surveys.reduce((sum, s) => sum + s.completionRate, 0) / surveys.length).toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-purple-500 rounded-lg">
              <BarChartIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">This Month</p>
              <p className="text-2xl font-bold text-white">
                {surveys.filter(s => new Date(s.createdAt) > new Date(Date.now() - 30*24*60*60*1000)).length}
              </p>
            </div>
            <div className="p-3 bg-orange-500 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Surveys Table */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">All Surveys</h2>
          <button
            onClick={() => setActiveTab('create')}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Create Survey
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-400">Survey</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Responses</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Completion</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Created</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map((survey) => (
                <tr key={survey.id} className="border-b border-gray-700 hover:bg-gray-700">
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-white">{survey.title}</div>
                      <div className="text-sm text-gray-400">{survey.description}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(survey.type)}
                      <span className="text-gray-300 capitalize">{survey.type.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {getStatusBadge(survey.status)}
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-white font-medium">{survey.responses}</div>
                    <div className="text-sm text-gray-400">{survey.questions} questions</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-white">{survey.completionRate}%</div>
                    <div className="w-16 bg-gray-600 rounded-full h-2 mt-1">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(survey.completionRate, 100)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-gray-300">
                      {new Date(survey.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setSelectedSurvey(survey)
                          setActiveTab('responses')
                        }}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => {
                          // Edit survey
                          alert(`Edit survey: ${survey.title}`)
                          console.log('Edit survey:', survey.id)
                        }}
                        className="text-gray-400 hover:text-white"
                        title="Edit Survey"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`Delete survey: ${survey.title}?`)) {
                            // Delete survey
                            console.log('Delete survey:', survey.id)
                            // You could also remove from state here
                          }
                        }}
                        className="text-red-400 hover:text-red-300"
                        title="Delete Survey"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (!isFeatureEnabled('surveysActions')) {
                            toast.error('Survey sending coming soon!')
                            return
                          }
                        }}
                        className="text-green-400 hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!isFeatureEnabled('surveysActions')}
                      >
                        <SendIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderCreateSurvey = () => {
    if (!isFeatureEnabled('surveysCreate')) {
      return (
        <div className="bg-gray-800 rounded-lg p-6">
          <ComingSoon
            feature="Survey Creation"
            description="Build custom surveys with multiple question types, templates, and advanced logic to gather valuable member feedback."
            estimatedDate="Q2 2025"
          />
        </div>
      )
    }
    
    return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6">Create New Survey</h2>
        
        {/* Survey Templates */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Choose a Template</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {surveyTemplates.map((template) => (
              <button
                key={template.id}
                className="p-4 border border-gray-600 rounded-lg hover:border-gray-500 hover:bg-gray-700 text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <ClipboardListIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-white">{template.name}</div>
                    <div className="text-sm text-gray-400 mt-1">{template.description}</div>
                    <div className="text-xs text-gray-500 mt-2">{template.questions} questions</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          <button className="mt-4 w-full p-4 border-2 border-dashed border-gray-600 rounded-lg hover:border-gray-500 text-gray-400 hover:text-white">
            <PlusIcon className="h-6 w-6 mx-auto mb-2" />
            Create from Scratch
          </button>
        </div>

        {/* Survey Builder Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Survey Title</label>
            <input
              type="text"
              placeholder="e.g., Member Satisfaction Survey"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
            <textarea
              placeholder="Brief description of the survey purpose..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white h-24"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Survey Type</label>
              <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                <option>Satisfaction</option>
                <option>Feedback</option>
                <option>Fitness Assessment</option>
                <option>Onboarding</option>
                <option>Exit Survey</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Target Audience</label>
              <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                <option>All Members</option>
                <option>Active Members</option>
                <option>New Members</option>
                <option>Inactive Members</option>
                <option>Prospects</option>
              </select>
            </div>
          </div>

          {/* Question Builder Preview */}
          <div className="border border-gray-600 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-white">Survey Questions</h4>
              <button className="text-orange-500 hover:text-orange-400 text-sm">
                + Add Question
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 bg-gray-700 rounded border-l-4 border-orange-500">
                <div className="text-sm text-gray-300">Question 1 - Multiple Choice</div>
                <div className="text-white mt-1">How satisfied are you with our gym facilities?</div>
              </div>
              <div className="p-3 bg-gray-700 rounded border-l-4 border-blue-500">
                <div className="text-sm text-gray-300">Question 2 - Text</div>
                <div className="text-white mt-1">What could we improve about our services?</div>
              </div>
              <div className="p-3 border-2 border-dashed border-gray-600 rounded text-center text-gray-500">
                Click "Add Question" to build your survey
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg">
              Create Survey
            </button>
            <button className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg">
              Save as Draft
            </button>
            <button 
              onClick={() => setActiveTab('overview')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
  }

  const renderResponses = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">
              {selectedSurvey ? selectedSurvey.title : 'Survey Responses'}
            </h2>
            {selectedSurvey && (
              <p className="text-gray-400">{selectedSurvey.responses} responses collected</p>
            )}
          </div>
          <button
            onClick={() => setActiveTab('overview')}
            className="text-gray-400 hover:text-white"
          >
            ← Back to Surveys
          </button>
        </div>

        {/* Response Summary */}
        {selectedSurvey && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{selectedSurvey.responses}</div>
              <div className="text-gray-400">Total Responses</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">{selectedSurvey.completionRate}%</div>
              <div className="text-gray-400">Completion Rate</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400">4.2</div>
              <div className="text-gray-400">Avg Rating</div>
            </div>
          </div>
        )}

        {/* Coming Soon */}
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChartIcon className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Response Analysis Coming Soon</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Detailed response analytics, charts, and individual response viewing will be available soon.
          </p>
        </div>
      </div>
    </div>
  )

  const renderAnalytics = () => (
    <div className="space-y-6">
      <SurveyAnalytics 
        surveyId={selectedSurvey?.id} 
        surveyData={selectedSurvey}
      />
    </div>
  )

  return (
    <DashboardLayout userData={null}>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Surveys & Feedback</h1>
          <p className="text-gray-400">Create and manage member surveys to gather valuable feedback</p>
          {!isFeatureEnabled('surveysActions') && (
            <ComingSoon 
              variant="banner" 
              feature="Surveys & Feedback"
              description="This module is currently in development. You can view mock data but survey creation and management features are coming soon."
            />
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'overview' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            All Surveys
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'create' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Create Survey
          </button>
          <button
            onClick={() => setActiveTab('responses')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'responses' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Responses
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'analytics' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Analytics
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'create' && renderCreateSurvey()}
        {activeTab === 'responses' && renderResponses()}
        {activeTab === 'analytics' && renderAnalytics()}
      </div>
    </DashboardLayout>
  )
}