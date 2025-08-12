'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/app/components/DashboardLayout'
import { 
  PlusIcon,
  EyeIcon,
  EditIcon,
  TrashIcon,
  TrendingUpIcon,
  DollarSignIcon,
  CalendarIcon,
  UserIcon,
  PhoneIcon,
  MailIcon,
  MessageSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  FilterIcon,
  ChevronDownIcon,
  SettingsIcon,
  UploadIcon,
  FolderPlusIcon,
  GripVerticalIcon,
  X as XIcon
} from 'lucide-react'

// Mock pipelines data
const mockPipelines = [
  { id: 'sales', name: 'Sales Pipeline', stages: ['discovery', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] },
  { id: 'onboarding', name: 'Member Onboarding', stages: ['contacted', 'tour_scheduled', 'tour_completed', 'trial_started', 'converted', 'cancelled'] },
  { id: 'pt', name: 'PT Sales', stages: ['initial_contact', 'assessment', 'package_presented', 'follow_up', 'signed', 'declined'] }
]

// Mock data for opportunities
const mockOpportunities = [
  {
    id: 1,
    title: 'Premium Membership Upgrade',
    contactName: 'Sarah Johnson',
    contactEmail: 'sarah.johnson@email.com',
    contactPhone: '+447123456789',
    value: 2400,
    stage: 'qualification',
    probability: 60,
    expectedCloseDate: '2025-02-15',
    source: 'Website',
    assignedTo: 'John Smith',
    lastActivity: '2025-01-05',
    activities: 3,
    type: 'upgrade',
    priority: 'high',
    pipelineId: 'sales'
  },
  {
    id: 2,
    title: 'Personal Training Package',
    contactName: 'Mike Wilson',
    contactEmail: 'mike.wilson@email.com',
    contactPhone: '+447987654321',
    value: 1200,
    stage: 'proposal',
    probability: 75,
    expectedCloseDate: '2025-02-01',
    source: 'Referral',
    assignedTo: 'Emma Davis',
    lastActivity: '2025-01-04',
    activities: 5,
    type: 'personal_training',
    priority: 'high',
    pipelineId: 'sales'
  },
  {
    id: 3,
    title: 'Corporate Membership',
    contactName: 'Tech Solutions Ltd',
    contactEmail: 'hr@techsolutions.com',
    contactPhone: '+447555123456',
    value: 15000,
    stage: 'negotiation',
    probability: 45,
    expectedCloseDate: '2025-03-01',
    source: 'Cold Call',
    assignedTo: 'David Brown',
    lastActivity: '2025-01-03',
    activities: 8,
    type: 'corporate',
    priority: 'medium',
    pipelineId: 'sales'
  },
  {
    id: 4,
    title: 'New Member Onboarding',
    contactName: 'Emily Chen',
    contactEmail: 'emily.chen@email.com',
    contactPhone: '+447333456789',
    value: 99,
    stage: 'tour_scheduled',
    probability: 40,
    expectedCloseDate: '2025-01-25',
    source: 'Facebook Ads',
    assignedTo: 'Lisa Green',
    lastActivity: '2025-01-06',
    activities: 2,
    type: 'new_member',
    priority: 'medium',
    pipelineId: 'onboarding'
  },
  {
    id: 5,
    title: 'PT Assessment - James',
    contactName: 'James Anderson',
    contactEmail: 'james.anderson@email.com',
    contactPhone: '+447333789012',
    value: 800,
    stage: 'package_presented',
    probability: 70,
    expectedCloseDate: '2025-01-20',
    source: 'Existing Member',
    assignedTo: 'Emma Davis',
    lastActivity: '2025-01-02',
    activities: 4,
    type: 'coaching',
    priority: 'medium',
    pipelineId: 'pt'
  }
]

const stageColors: { [key: string]: string } = {
  // Sales Pipeline
  discovery: 'bg-blue-500',
  qualification: 'bg-yellow-500',
  proposal: 'bg-purple-500',
  negotiation: 'bg-orange-500',
  closed_won: 'bg-green-500',
  closed_lost: 'bg-red-500',
  // Onboarding Pipeline
  contacted: 'bg-blue-500',
  tour_scheduled: 'bg-indigo-500',
  tour_completed: 'bg-purple-500',
  trial_started: 'bg-orange-500',
  converted: 'bg-green-500',
  cancelled: 'bg-red-500',
  // PT Pipeline
  initial_contact: 'bg-blue-500',
  assessment: 'bg-indigo-500',
  package_presented: 'bg-purple-500',
  follow_up: 'bg-orange-500',
  signed: 'bg-green-500',
  declined: 'bg-red-500'
}

const stageNames: { [key: string]: string } = {
  // Sales Pipeline
  discovery: 'Discovery',
  qualification: 'Qualification',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
  // Onboarding Pipeline
  contacted: 'Contacted',
  tour_scheduled: 'Tour Scheduled',
  tour_completed: 'Tour Completed',
  trial_started: 'Trial Started',
  converted: 'Converted',
  cancelled: 'Cancelled',
  // PT Pipeline
  initial_contact: 'Initial Contact',
  assessment: 'Assessment',
  package_presented: 'Package Presented',
  follow_up: 'Follow Up',
  signed: 'Signed',
  declined: 'Declined'
}

interface OpportunitiesPageProps {
  userData?: any
}

export default function OpportunitiesPage({ userData }: OpportunitiesPageProps) {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'pipeline' | 'list' | 'create' | 'analytics' | 'import'>('pipeline')
  const [opportunities, setOpportunities] = useState(mockOpportunities)
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [pipelines, setPipelines] = useState(mockPipelines)
  const [selectedPipeline, setSelectedPipeline] = useState(mockPipelines[0])
  const [showPipelineDropdown, setShowPipelineDropdown] = useState(false)
  const [showCreatePipeline, setShowCreatePipeline] = useState(false)
  const [newPipelineName, setNewPipelineName] = useState('')
  const [draggedOpportunity, setDraggedOpportunity] = useState<any>(null)
  const [showPipelineSettings, setShowPipelineSettings] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState<any>(null)
  const [customStages, setCustomStages] = useState<string[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPipelineDropdown && !(event.target as Element).closest('.pipeline-dropdown')) {
        setShowPipelineDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPipelineDropdown])

  if (!mounted) {
    return (
      <DashboardLayout userData={userData}>
        <div className="container mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-48 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-96 mb-8"></div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const getStageOpportunities = (stage: string) => {
    return opportunities.filter(opp => 
      opp.pipelineId === selectedPipeline.id && opp.stage === stage
    )
  }

  const getTotalValue = (stage?: string) => {
    const opps = stage 
      ? getStageOpportunities(stage) 
      : opportunities.filter(opp => opp.pipelineId === selectedPipeline.id)
    return opps.reduce((sum, opp) => sum + opp.value, 0)
  }

  const getWeightedValue = () => {
    return opportunities
      .filter(opp => opp.pipelineId === selectedPipeline.id && !['closed_won', 'closed_lost', 'converted', 'cancelled', 'signed', 'declined'].includes(opp.stage))
      .reduce((sum, opp) => sum + (opp.value * opp.probability / 100), 0)
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <span className="text-red-400">🔴</span>
      case 'medium': return <span className="text-yellow-400">🟡</span>
      case 'low': return <span className="text-green-400">🟢</span>
      default: return <span className="text-gray-400">⚪</span>
    }
  }

  const handleDragStart = (e: React.DragEvent, opportunity: any) => {
    setDraggedOpportunity(opportunity)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, newStage: string) => {
    e.preventDefault()
    if (draggedOpportunity) {
      setOpportunities(prev => prev.map(opp => 
        opp.id === draggedOpportunity.id 
          ? { ...opp, stage: newStage }
          : opp
      ))
      setDraggedOpportunity(null)
    }
  }

  const createNewPipeline = () => {
    if (newPipelineName.trim()) {
      const newPipeline = {
        id: newPipelineName.toLowerCase().replace(/\s+/g, '_'),
        name: newPipelineName,
        stages: ['stage_1', 'stage_2', 'stage_3', 'stage_4', 'completed', 'cancelled']
      }
      setPipelines([...pipelines, newPipeline])
      setSelectedPipeline(newPipeline)
      setNewPipelineName('')
      setShowCreatePipeline(false)
    }
  }

  const renderPipelineView = () => (
    <div className="space-y-6">
      {/* Pipeline Header with Dropdown */}
      <div className="flex justify-between items-center">
        <div className="relative pipeline-dropdown">
          <button
            onClick={() => setShowPipelineDropdown(!showPipelineDropdown)}
            className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <span className="text-white font-medium">{selectedPipeline.name}</span>
            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
          </button>
          
          {showPipelineDropdown && (
            <div className="absolute z-10 mt-2 w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
              <div className="p-2">
                {pipelines.map(pipeline => (
                  <button
                    key={pipeline.id}
                    onClick={() => {
                      setSelectedPipeline(pipeline)
                      setShowPipelineDropdown(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-gray-700 transition-colors ${
                      selectedPipeline.id === pipeline.id ? 'bg-gray-700' : ''
                    }`}
                  >
                    <span className="text-white">{pipeline.name}</span>
                  </button>
                ))}
                <div className="border-t border-gray-700 mt-2 pt-2">
                  <button
                    onClick={() => {
                      setShowCreatePipeline(true)
                      setShowPipelineDropdown(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <FolderPlusIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-300">Create New Pipeline</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingPipeline(selectedPipeline)
                      setCustomStages([...selectedPipeline.stages])
                      setShowPipelineSettings(true)
                      setShowPipelineDropdown(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <SettingsIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-300">Pipeline Settings</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('import')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <UploadIcon className="h-4 w-4" />
            Import
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            New Opportunity
          </button>
        </div>
      </div>

      {/* Pipeline Settings Modal */}
      {showPipelineSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Pipeline Settings: {editingPipeline?.name}</h3>
              <button
                onClick={() => {
                  setShowPipelineSettings(false)
                  setEditingPipeline(null)
                  setCustomStages([])
                }}
                className="text-gray-400 hover:text-white"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Pipeline Name */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Pipeline Name</label>
                <input
                  type="text"
                  value={editingPipeline?.name || ''}
                  onChange={(e) => setEditingPipeline({ ...editingPipeline, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>

              {/* Pipeline Stages */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Pipeline Stages</label>
                <p className="text-xs text-gray-500 mb-4">Drag to reorder, click X to remove, or add new stages below</p>
                
                <div className="space-y-2 mb-4">
                  {customStages.map((stage, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <GripVerticalIcon className="h-5 w-5 text-gray-500 cursor-move" />
                      <input
                        type="text"
                        value={stageNames[stage] || stage}
                        onChange={(e) => {
                          const newStages = [...customStages]
                          const newStageName = e.target.value.toLowerCase().replace(/\s+/g, '_')
                          newStages[index] = newStageName
                          setCustomStages(newStages)
                          // Update stage name mapping
                          stageNames[newStageName] = e.target.value
                        }}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        placeholder="Stage name"
                      />
                      <div className={`w-8 h-8 rounded ${stageColors[stage] || 'bg-gray-500'}`}></div>
                      <button
                        onClick={() => {
                          const newStages = customStages.filter((_, i) => i !== index)
                          setCustomStages(newStages)
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <XCircleIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    const newStage = `stage_${customStages.length + 1}`
                    setCustomStages([...customStages, newStage])
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Stage
                </button>
              </div>

              {/* Stage Colors */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Stage Colors</label>
                <div className="grid grid-cols-2 gap-4">
                  {customStages.map((stage, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-gray-300 flex-1">{stageNames[stage] || stage}</span>
                      <select
                        value={stageColors[stage] || 'bg-gray-500'}
                        onChange={(e) => {
                          stageColors[stage] = e.target.value
                          // Force re-render
                          setCustomStages([...customStages])
                        }}
                        className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      >
                        <option value="bg-blue-500">Blue</option>
                        <option value="bg-green-500">Green</option>
                        <option value="bg-yellow-500">Yellow</option>
                        <option value="bg-orange-500">Orange</option>
                        <option value="bg-red-500">Red</option>
                        <option value="bg-purple-500">Purple</option>
                        <option value="bg-pink-500">Pink</option>
                        <option value="bg-indigo-500">Indigo</option>
                        <option value="bg-gray-500">Gray</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Win/Loss Conditions */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Win/Loss Stages</label>
                <p className="text-xs text-gray-500 mb-2">Select which stages represent won or lost opportunities</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Won Stages</label>
                    <div className="space-y-1">
                      {customStages.map(stage => (
                        <label key={stage} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={['closed_won', 'converted', 'signed'].includes(stage)}
                            onChange={(e) => {
                              // Update stage color to green if won
                              if (e.target.checked) {
                                stageColors[stage] = 'bg-green-500'
                              }
                              setCustomStages([...customStages])
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-300">{stageNames[stage] || stage}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Lost Stages</label>
                    <div className="space-y-1">
                      {customStages.map(stage => (
                        <label key={stage} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={['closed_lost', 'cancelled', 'declined'].includes(stage)}
                            onChange={(e) => {
                              // Update stage color to red if lost
                              if (e.target.checked) {
                                stageColors[stage] = 'bg-red-500'
                              }
                              setCustomStages([...customStages])
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-300">{stageNames[stage] || stage}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Delete Pipeline */}
              <div className="border-t border-gray-700 pt-4">
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete the ${editingPipeline?.name} pipeline?`)) {
                      const newPipelines = pipelines.filter(p => p.id !== editingPipeline?.id)
                      setPipelines(newPipelines)
                      if (newPipelines.length > 0) {
                        setSelectedPipeline(newPipelines[0])
                      }
                      setShowPipelineSettings(false)
                      setEditingPipeline(null)
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete Pipeline
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-700">
              <button
                onClick={() => {
                  // Save pipeline changes
                  const updatedPipeline = {
                    ...editingPipeline,
                    stages: customStages
                  }
                  setPipelines(pipelines.map(p => 
                    p.id === editingPipeline?.id ? updatedPipeline : p
                  ))
                  setSelectedPipeline(updatedPipeline)
                  setShowPipelineSettings(false)
                  setEditingPipeline(null)
                }}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowPipelineSettings(false)
                  setEditingPipeline(null)
                  setCustomStages([])
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Pipeline Modal */}
      {showCreatePipeline && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Pipeline</h3>
            <input
              type="text"
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              placeholder="Pipeline name"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={createNewPipeline}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreatePipeline(false)
                  setNewPipelineName('')
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Value</p>
              <p className="text-2xl font-bold text-white">£{getTotalValue().toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-500 rounded-lg">
              <DollarSignIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Weighted Value</p>
              <p className="text-2xl font-bold text-white">£{getWeightedValue().toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <TrendingUpIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Active Opps</p>
              <p className="text-2xl font-bold text-white">
                {opportunities.filter(opp => 
                  opp.pipelineId === selectedPipeline.id && 
                  !['closed_won', 'closed_lost', 'converted', 'cancelled', 'signed', 'declined'].includes(opp.stage)
                ).length}
              </p>
            </div>
            <div className="p-3 bg-purple-500 rounded-lg">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Win Rate</p>
              <p className="text-2xl font-bold text-white">
                {Math.round((opportunities.filter(opp => 
                  opp.pipelineId === selectedPipeline.id && 
                  ['closed_won', 'converted', 'signed'].includes(opp.stage)
                ).length / 
                  opportunities.filter(opp => 
                    opp.pipelineId === selectedPipeline.id &&
                    ['closed_won', 'closed_lost', 'converted', 'cancelled', 'signed', 'declined'].includes(opp.stage)
                  ).length) * 100) || 0}%
              </p>
            </div>
            <div className="p-3 bg-orange-500 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Kanban Board */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Pipeline Stages</h2>
          <button 
            onClick={() => {
              setEditingPipeline(selectedPipeline)
              setCustomStages([...selectedPipeline.stages])
              setShowPipelineSettings(true)
            }}
            className="text-gray-400 hover:text-white"
          >
            <SettingsIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 overflow-x-auto">
          {selectedPipeline.stages.map((stage) => {
            const stageOpps = getStageOpportunities(stage)
            return (
              <div 
                key={stage} 
                className="min-w-64"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
              >
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">{stageNames[stage] || stage}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-600 px-2 py-1 rounded">{stageOpps.length}</span>
                      <div className={`w-3 h-3 rounded-full ${stageColors[stage] || 'bg-gray-500'}`}></div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400 mb-4">
                    £{getTotalValue(stage).toLocaleString()}
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {stageOpps.map((opp) => (
                      <div 
                        key={opp.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, opp)}
                        className="bg-gray-600 rounded-lg p-3 cursor-move hover:bg-gray-500 transition-colors" 
                        onClick={() => setSelectedOpportunity(opp)}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <GripVerticalIcon className="h-3 w-3 text-gray-400" />
                          <h4 className="font-medium text-white text-sm flex-1">{opp.title}</h4>
                          {getPriorityIcon(opp.priority)}
                        </div>
                        <div className="text-sm text-gray-300 mb-2">{opp.contactName}</div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-green-400">£{opp.value.toLocaleString()}</span>
                          <span className="text-xs text-gray-400">{opp.probability}%</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                          <UserIcon className="h-3 w-3" />
                          <span>{opp.assignedTo}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  const renderImportView = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6">Import Opportunities</h2>
        
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-12 text-center">
          <UploadIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Upload CSV or Excel File</h3>
          <p className="text-gray-400 mb-6">
            Drag and drop your file here, or click to browse
          </p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg cursor-pointer inline-block"
          >
            Choose File
          </label>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white mb-4">Import Instructions</h3>
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-gray-300 mb-3">Your CSV/Excel file should include the following columns:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-1">
              <li>Contact Name (required)</li>
              <li>Email</li>
              <li>Phone</li>
              <li>Opportunity Title</li>
              <li>Value</li>
              <li>Stage</li>
              <li>Expected Close Date</li>
              <li>Source</li>
              <li>Assigned To</li>
              <li>Notes</li>
            </ul>
            <div className="mt-4">
              <button className="text-orange-400 hover:text-orange-300 text-sm">
                Download Sample Template
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderListView = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">All Opportunities</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FilterIcon className="h-4 w-4" />
              Filters
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              New Opportunity
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-700 rounded-lg mb-6">
            <select className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white">
              <option>All Pipelines</option>
              {pipelines.map(pipeline => (
                <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>
              ))}
            </select>
            <select className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white">
              <option>All Stages</option>
              {Object.entries(stageNames).map(([value, name]) => (
                <option key={value} value={value}>{name}</option>
              ))}
            </select>
            <select className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white">
              <option>All Priorities</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <input
              type="text"
              placeholder="Search opportunities..."
              className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white"
            />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-400">Opportunity</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Contact</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Value</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Stage</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Pipeline</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Expected Close</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Assigned To</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp) => (
                <tr key={opp.id} className="border-b border-gray-700 hover:bg-gray-700">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(opp.priority)}
                      <div>
                        <div className="font-medium text-white">{opp.title}</div>
                        <div className="text-sm text-gray-400">{opp.source}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-white">{opp.contactName}</div>
                      <div className="text-sm text-gray-400">{opp.contactEmail}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-semibold text-green-400">£{opp.value.toLocaleString()}</div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs text-white ${stageColors[opp.stage] || 'bg-gray-500'}`}>
                      {stageNames[opp.stage] || opp.stage}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-gray-300">
                      {pipelines.find(p => p.id === opp.pipelineId)?.name}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-gray-300">
                      {new Date(opp.expectedCloseDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-gray-300">{opp.assignedTo}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedOpportunity(opp)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button className="text-gray-400 hover:text-white">
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button className="text-red-400 hover:text-red-300">
                        <TrashIcon className="h-4 w-4" />
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

  const renderCreateOpportunity = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6">Create New Opportunity</h2>
        
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Opportunity Title</label>
              <input
                type="text"
                placeholder="e.g., Premium Membership Upgrade"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Pipeline</label>
              <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                {pipelines.map(pipeline => (
                  <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Contact/Company</label>
              <input
                type="text"
                placeholder="Contact name or company"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
              <input
                type="email"
                placeholder="contact@example.com"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Value (£)</label>
              <input
                type="number"
                placeholder="1200"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Stage</label>
              <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                {selectedPipeline.stages.slice(0, -2).map(stage => (
                  <option key={stage} value={stage}>{stageNames[stage] || stage}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Expected Close Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg"
            >
              Create Opportunity
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pipeline')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6">Sales Analytics</h2>
        
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUpIcon className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Advanced Analytics Coming Soon</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Detailed sales analytics including conversion rates, pipeline velocity, 
            forecasting, and performance metrics will be available soon.
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <DashboardLayout userData={userData}>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Sales Opportunities</h1>
          <p className="text-gray-400">Manage your sales pipeline and track opportunity progress</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'pipeline' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Pipeline View
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'list' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'import' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Import
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
        {activeTab === 'pipeline' && renderPipelineView()}
        {activeTab === 'list' && renderListView()}
        {activeTab === 'create' && renderCreateOpportunity()}
        {activeTab === 'import' && renderImportView()}
        {activeTab === 'analytics' && renderAnalytics()}

        {/* Opportunity Details Modal */}
        {selectedOpportunity && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">{selectedOpportunity.title}</h2>
                <button
                  onClick={() => setSelectedOpportunity(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Contact</p>
                    <p className="text-white">{selectedOpportunity.contactName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Value</p>
                    <p className="text-green-400 font-semibold">£{selectedOpportunity.value.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Stage</p>
                    <span className={`px-2 py-1 rounded-full text-xs text-white ${stageColors[selectedOpportunity.stage]}`}>
                      {stageNames[selectedOpportunity.stage]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Probability</p>
                    <p className="text-white">{selectedOpportunity.probability}%</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-700 pt-4">
                  <p className="text-sm text-gray-400 mb-2">Contact Information</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MailIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-white">{selectedOpportunity.contactEmail}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-white">{selectedOpportunity.contactPhone}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4" />
                    Call
                  </button>
                  <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <MailIcon className="h-4 w-4" />
                    Email
                  </button>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <MessageSquareIcon className="h-4 w-4" />
                    SMS
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}