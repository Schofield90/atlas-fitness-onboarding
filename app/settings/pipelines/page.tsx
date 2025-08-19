'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import { 
  GitBranch, 
  Plus, 
  GripVertical, 
  Edit2, 
  Trash2, 
  ChevronRight,
  UserPlus,
  Calendar,
  Dumbbell,
  CreditCard,
  X
} from 'lucide-react'

interface PipelineStage {
  id: string
  name: string
  order: number
  color: string
  icon: string
}

interface Pipeline {
  id: string
  name: string
  description: string
  stages: PipelineStage[]
  type: 'sales' | 'membership' | 'custom'
  is_default: boolean
}

export default function PipelineSettingsPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null)
  const [showAddPipeline, setShowAddPipeline] = useState(false)
  const [draggedStage, setDraggedStage] = useState<PipelineStage | null>(null)
  const supabase = createClient()

  // Default gym sales stages
  const defaultStages: PipelineStage[] = [
    { id: '1', name: 'Lead Captured', order: 0, color: 'bg-gray-500', icon: 'UserPlus' },
    { id: '2', name: 'Contacted', order: 1, color: 'bg-blue-500', icon: 'Phone' },
    { id: '3', name: 'Tour Scheduled', order: 2, color: 'bg-yellow-500', icon: 'Calendar' },
    { id: '4', name: 'Tour Completed', order: 3, color: 'bg-purple-500', icon: 'Eye' },
    { id: '5', name: 'Trial Session', order: 4, color: 'bg-orange-500', icon: 'Dumbbell' },
    { id: '6', name: 'Joined', order: 5, color: 'bg-green-500', icon: 'CreditCard' },
    { id: '7', name: 'Lost', order: 6, color: 'bg-red-500', icon: 'X' }
  ]

  // Membership pipeline stages
  const membershipStages: PipelineStage[] = [
    { id: '1', name: 'Trial Member', order: 0, color: 'bg-yellow-500', icon: 'UserPlus' },
    { id: '2', name: 'Active Member', order: 1, color: 'bg-green-500', icon: 'Dumbbell' },
    { id: '3', name: 'At Risk', order: 2, color: 'bg-orange-500', icon: 'AlertTriangle' },
    { id: '4', name: 'Cancelled', order: 3, color: 'bg-red-500', icon: 'X' },
    { id: '5', name: 'Win Back', order: 4, color: 'bg-purple-500', icon: 'RefreshCw' }
  ]

  const [newPipeline, setNewPipeline] = useState({
    name: '',
    description: '',
    type: 'sales' as 'sales' | 'membership' | 'custom'
  })

  useEffect(() => {
    fetchPipelines()
  }, [])

  // Loading timeout to prevent infinite spinners
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Loading timeout - forcing loading to stop')
        setLoading(false)
      }
    }, 5000) // 5 second timeout
    
    return () => clearTimeout(timeout)
  }, [loading])

  const fetchPipelines = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get organization
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      // Fetch pipelines
      const { data: pipelineData } = await supabase
        .from('pipelines')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .order('created_at', { ascending: true })

      if (pipelineData && pipelineData.length > 0) {
        setPipelines(pipelineData)
        setSelectedPipeline(pipelineData.find(p => p.is_default) || pipelineData[0])
      } else {
        // Create default pipeline
        const defaultPipeline: Pipeline = {
          id: 'default',
          name: 'Sales Pipeline',
          description: 'Default gym sales pipeline',
          stages: defaultStages,
          type: 'sales',
          is_default: true
        }
        setPipelines([defaultPipeline])
        setSelectedPipeline(defaultPipeline)
      }
    } catch (error) {
      setLoading(false)
      console.error('Error fetching pipelines:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePipeline = async () => {
    if (!newPipeline.name) {
      alert('Please enter a pipeline name')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      // Select default stages based on type
      const stages = newPipeline.type === 'membership' ? membershipStages : defaultStages

      const { data, error } = await supabase
        .from('pipelines')
        .insert({
          organization_id: userOrg.organization_id,
          name: newPipeline.name,
          description: newPipeline.description,
          type: newPipeline.type,
          stages: stages,
          is_default: pipelines.length === 0
        })
        .select()
        .single()

      if (error) throw error

      setPipelines([...pipelines, data])
      setNewPipeline({ name: '', description: '', type: 'sales' })
      setShowAddPipeline(false)
      alert('Pipeline created successfully!')
    } catch (error) {
      setLoading(false)
      console.error('Error creating pipeline:', error)
      alert('Failed to create pipeline')
    }
  }

  const handleUpdateStage = async (stageId: string, updates: Partial<PipelineStage>) => {
    if (!selectedPipeline) return

    const updatedStages = selectedPipeline.stages.map(stage =>
      stage.id === stageId ? { ...stage, ...updates } : stage
    )

    const updatedPipeline = { ...selectedPipeline, stages: updatedStages }
    
    try {
      const { error } = await supabase
        .from('pipelines')
        .update({ stages: updatedStages })
        .eq('id', selectedPipeline.id)

      if (error) throw error

      setPipelines(pipelines.map(p => p.id === selectedPipeline.id ? updatedPipeline : p))
      setSelectedPipeline(updatedPipeline)
      setEditingStage(null)
    } catch (error) {
      setLoading(false)
      console.error('Error updating stage:', error)
      alert('Failed to update stage')
    }
  }

  const handleAddStage = async () => {
    if (!selectedPipeline) return

    const newStage: PipelineStage = {
      id: Date.now().toString(),
      name: 'New Stage',
      order: selectedPipeline.stages.length,
      color: 'bg-gray-500',
      icon: 'Flag'
    }

    const updatedStages = [...selectedPipeline.stages, newStage]
    const updatedPipeline = { ...selectedPipeline, stages: updatedStages }

    try {
      const { error } = await supabase
        .from('pipelines')
        .update({ stages: updatedStages })
        .eq('id', selectedPipeline.id)

      if (error) throw error

      setPipelines(pipelines.map(p => p.id === selectedPipeline.id ? updatedPipeline : p))
      setSelectedPipeline(updatedPipeline)
      setEditingStage(newStage)
    } catch (error) {
      setLoading(false)
      console.error('Error adding stage:', error)
      alert('Failed to add stage')
    }
  }

  const handleDeleteStage = async (stageId: string) => {
    if (!selectedPipeline) return
    if (!confirm('Are you sure you want to delete this stage?')) return

    const updatedStages = selectedPipeline.stages
      .filter(stage => stage.id !== stageId)
      .map((stage, index) => ({ ...stage, order: index }))

    const updatedPipeline = { ...selectedPipeline, stages: updatedStages }

    try {
      const { error } = await supabase
        .from('pipelines')
        .update({ stages: updatedStages })
        .eq('id', selectedPipeline.id)

      if (error) throw error

      setPipelines(pipelines.map(p => p.id === selectedPipeline.id ? updatedPipeline : p))
      setSelectedPipeline(updatedPipeline)
    } catch (error) {
      setLoading(false)
      console.error('Error deleting stage:', error)
      alert('Failed to delete stage')
    }
  }

  const handleDragStart = (stage: PipelineStage) => {
    setDraggedStage(stage)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetStage: PipelineStage) => {
    e.preventDefault()
    if (!draggedStage || !selectedPipeline || draggedStage.id === targetStage.id) return

    const stages = [...selectedPipeline.stages]
    const draggedIndex = stages.findIndex(s => s.id === draggedStage.id)
    const targetIndex = stages.findIndex(s => s.id === targetStage.id)

    // Remove dragged stage
    stages.splice(draggedIndex, 1)
    // Insert at new position
    stages.splice(targetIndex, 0, draggedStage)
    // Update order numbers
    const reorderedStages = stages.map((stage, index) => ({ ...stage, order: index }))

    const updatedPipeline = { ...selectedPipeline, stages: reorderedStages }

    try {
      const { error } = await supabase
        .from('pipelines')
        .update({ stages: reorderedStages })
        .eq('id', selectedPipeline.id)

      if (error) throw error

      setPipelines(pipelines.map(p => p.id === selectedPipeline.id ? updatedPipeline : p))
      setSelectedPipeline(updatedPipeline)
    } catch (error) {
      setLoading(false)
      console.error('Error reordering stages:', error)
    }

    setDraggedStage(null)
  }

  const getStageIcon = (iconName: string) => {
    const icons: { [key: string]: any } = {
      UserPlus: <UserPlus className="h-4 w-4" />,
      Calendar: <Calendar className="h-4 w-4" />,
      Dumbbell: <Dumbbell className="h-4 w-4" />,
      CreditCard: <CreditCard className="h-4 w-4" />,
      X: <X className="h-4 w-4" />
    }
    return icons[iconName] || <ChevronRight className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading pipelines...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsHeader 
        title="Pipeline Management"
        description="Customize your sales and membership pipelines"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline List */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Pipelines</h2>
            <button
              onClick={() => setShowAddPipeline(true)}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            {pipelines.map((pipeline) => (
              <button
                key={pipeline.id}
                onClick={() => setSelectedPipeline(pipeline)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedPipeline?.id === pipeline.id
                    ? 'bg-gray-700 border border-blue-500'
                    : 'bg-gray-700/50 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{pipeline.name}</div>
                    <div className="text-xs text-gray-400">{pipeline.stages.length} stages</div>
                  </div>
                  {pipeline.is_default && (
                    <span className="text-xs px-2 py-1 bg-blue-900 text-blue-300 rounded">
                      Default
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Stage Editor */}
        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6">
          {selectedPipeline ? (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-2">{selectedPipeline.name}</h2>
                <p className="text-sm text-gray-400">{selectedPipeline.description}</p>
              </div>

              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-300">Pipeline Stages</h3>
                <button
                  onClick={handleAddStage}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  + Add Stage
                </button>
              </div>

              <div className="space-y-2">
                {selectedPipeline.stages.sort((a, b) => a.order - b.order).map((stage) => (
                  <div
                    key={stage.id}
                    draggable
                    onDragStart={() => handleDragStart(stage)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage)}
                    className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg cursor-move hover:bg-gray-600 transition-colors"
                  >
                    <GripVertical className="h-4 w-4 text-gray-500" />
                    
                    <div className={`p-2 rounded ${stage.color}`}>
                      {getStageIcon(stage.icon)}
                    </div>

                    {editingStage?.id === stage.id ? (
                      <input
                        type="text"
                        value={editingStage.name}
                        onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })}
                        onBlur={() => handleUpdateStage(stage.id, { name: editingStage.name })}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateStage(stage.id, { name: editingStage.name })
                          }
                        }}
                        className="flex-1 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white"
                        autoFocus
                      />
                    ) : (
                      <span className="flex-1 text-white">{stage.name}</span>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingStage(stage)}
                        className="p-1 hover:bg-gray-600 rounded"
                      >
                        <Edit2 className="h-3 w-3 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteStage(stage.id)}
                        className="p-1 hover:bg-gray-600 rounded"
                      >
                        <Trash2 className="h-3 w-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Stage Colors</h4>
                <div className="flex gap-2">
                  {['bg-gray-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500', 'bg-purple-500'].map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded ${color}`}
                      onClick={() => {
                        if (editingStage) {
                          handleUpdateStage(editingStage.id, { color })
                        }
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Click Edit on a stage, then select a color
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              Select a pipeline to customize stages
            </div>
          )}
        </div>
      </div>

      {/* Add Pipeline Modal */}
      {showAddPipeline && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-white mb-4">Create New Pipeline</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Pipeline Name *
                </label>
                <input
                  type="text"
                  value={newPipeline.name}
                  onChange={(e) => setNewPipeline({ ...newPipeline, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="e.g., Personal Training Sales"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Description
                </label>
                <textarea
                  value={newPipeline.description}
                  onChange={(e) => setNewPipeline({ ...newPipeline, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  rows={2}
                  placeholder="Describe this pipeline..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Pipeline Type
                </label>
                <select
                  value={newPipeline.type}
                  onChange={(e) => setNewPipeline({ ...newPipeline, type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="sales">Sales Pipeline</option>
                  <option value="membership">Membership Pipeline</option>
                  <option value="custom">Custom Pipeline</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose a template to start with pre-configured stages
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreatePipeline}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Pipeline
              </button>
              <button
                onClick={() => setShowAddPipeline(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}