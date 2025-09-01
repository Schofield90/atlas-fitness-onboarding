'use client'

import { useState } from 'react'
import { X, Plus, Settings, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormSubmittedTriggerConfig } from './FormSubmittedTriggerConfig'
import dynamic from 'next/dynamic'

const ScheduleTriggerConfig = dynamic(() => import('./ScheduleTriggerConfig').then(mod => mod.ScheduleTriggerConfig), { 
  ssr: false,
  loading: () => <div>Loading schedule configuration...</div> 
})
import { WebhookTriggerConfig } from './WebhookTriggerConfig'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface AutomationNode {
  id: string
  type: 'trigger' | 'action'
  actionType: string
  data: Record<string, any>
}

interface AutomationBuilderProps {
  isOpen: boolean
  onClose: () => void
  automation?: {
    id: string
    name: string
    description: string
    nodes: AutomationNode[]
  }
}

const triggerTypes = [
  { value: 'webhook', label: 'Webhook', description: 'Trigger when external systems send HTTP requests to your endpoint' },
  { value: 'website_form', label: 'Website Form Submitted', description: 'Trigger when a website form is submitted' },
  { value: 'new_lead', label: 'New Lead Created', description: 'Trigger when a new lead is added to the system' },
  { value: 'schedule', label: 'Scheduled Time', description: 'Trigger at specific times or intervals' },
  { value: 'client_checkin', label: 'Client Check-in', description: 'Trigger when a client checks in' }
]

// Generic trigger config component for unsupported trigger types
function GenericTriggerConfig({ triggerType, onSave, onCancel }: { 
  triggerType: string
  onSave?: () => void
  onCancel?: () => void
}) {
  const trigger = triggerTypes.find(t => t.value === triggerType)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          <span>Trigger Configuration</span>
        </CardTitle>
        <CardDescription>
          Configuration for this trigger type is not yet available
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-orange-900 mb-2">
            {trigger?.label || 'Unknown Trigger Type'}
          </h4>
          <p className="text-sm text-orange-800">
            {trigger?.description || 'This trigger type requires additional configuration that is not yet implemented.'}
          </p>
        </div>
        
        <div className="text-center py-8 text-gray-600">
          <Settings className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Configuration Coming Soon</h3>
          <p className="text-gray-600">
            Advanced configuration for this trigger type is under development.
          </p>
        </div>

        {(onSave || onCancel) && (
          <div className="flex justify-end space-x-3 pt-4 border-t">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {onSave && (
              <Button
                onClick={onSave}
                disabled={true}
                className="bg-gray-400 cursor-not-allowed"
                data-testid="save-generic-trigger"
              >
                Save Configuration
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AutomationBuilder({ isOpen, onClose, automation }: AutomationBuilderProps) {
  const [automationName, setAutomationName] = useState(automation?.name || '')
  const [automationDescription, setAutomationDescription] = useState(automation?.description || '')
  const [nodes, setNodes] = useState<AutomationNode[]>(automation?.nodes || [])
  const [selectedTriggerType, setSelectedTriggerType] = useState<string>('')
  const [showTriggerConfig, setShowTriggerConfig] = useState(false)

  if (!isOpen) return null

  const handleAddTrigger = () => {
    if (!selectedTriggerType) return
    
    const newTrigger: AutomationNode = {
      id: `trigger-${Date.now()}`,
      type: 'trigger',
      actionType: selectedTriggerType,
      data: {}
    }
    
    setNodes([newTrigger])
    setShowTriggerConfig(true)
  }

  const handleSaveTriggerConfig = (data: Record<string, any>) => {
    setNodes(nodes.map(node => 
      node.type === 'trigger' 
        ? { ...node, data }
        : node
    ))
    setShowTriggerConfig(false)
  }

  const handleSaveAutomation = () => {
    // In real app, this would save to API
    console.log('Saving automation:', {
      name: automationName,
      description: automationDescription,
      nodes
    })
    onClose()
  }

  const currentTrigger = nodes.find(n => n.type === 'trigger')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full h-[90vh] flex flex-col" data-testid="automation-builder">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">
            {automation ? 'Edit Automation' : 'Create New Automation'}
          </h2>
          <Button variant="ghost" onClick={onClose} data-testid="close-builder">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Automation Details</CardTitle>
              <CardDescription>Basic information about your automation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="automation-name">Name</Label>
                <Input
                  id="automation-name"
                  value={automationName}
                  onChange={(e) => setAutomationName(e.target.value)}
                  placeholder="Enter automation name"
                  data-testid="automation-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="automation-description">Description</Label>
                <Input
                  id="automation-description"
                  value={automationDescription}
                  onChange={(e) => setAutomationDescription(e.target.value)}
                  placeholder="Brief description of what this automation does"
                  data-testid="automation-description-input"
                />
              </div>
            </CardContent>
          </Card>

          {/* Trigger Selection */}
          {!showTriggerConfig && (
            <Card>
              <CardHeader>
                <CardTitle>Choose Trigger</CardTitle>
                <CardDescription>Select what will start this automation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Trigger Type</Label>
                  <Select onValueChange={setSelectedTriggerType} data-testid="trigger-type-select">
                    <SelectTrigger>
                      <SelectValue placeholder="Select a trigger type" />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerTypes.map((trigger) => (
                        <SelectItem key={trigger.value} value={trigger.value}>
                          <div>
                            <div className="font-medium">{trigger.label}</div>
                            <div className="text-sm text-gray-600">{trigger.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedTriggerType && (
                  <Button
                    onClick={handleAddTrigger}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="configure-trigger-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Configure Trigger
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Trigger Configuration */}
          {showTriggerConfig && currentTrigger && (
            <div data-testid="trigger-configuration">
              {currentTrigger.actionType === 'webhook' ? (
                <WebhookTriggerConfig
                  workflowId={automation?.id || 'new-workflow'}
                  nodeId={currentTrigger.id}
                  value={currentTrigger.data.webhookConfig || {}}
                  onChange={(webhookConfig) => {
                    setNodes(nodes.map(node =>
                      node.id === currentTrigger.id
                        ? { ...node, data: { ...node.data, webhookConfig } }
                        : node
                    ))
                  }}
                  onSave={() => setShowTriggerConfig(false)}
                  onCancel={() => setShowTriggerConfig(false)}
                />
              ) : currentTrigger.actionType === 'website_form' ? (
                <FormSubmittedTriggerConfig
                  value={currentTrigger.data.selectedForms || []}
                  onChange={(selectedForms) => {
                    setNodes(nodes.map(node =>
                      node.id === currentTrigger.id
                        ? { ...node, data: { ...node.data, selectedForms } }
                        : node
                    ))
                  }}
                  onSave={() => setShowTriggerConfig(false)}
                  onCancel={() => setShowTriggerConfig(false)}
                />
              ) : currentTrigger.actionType === 'schedule' ? (
                <ScheduleTriggerConfig
                  value={currentTrigger.data?.schedule}
                  onChange={(schedule) => {
                    setNodes(nodes.map(node =>
                      node.id === currentTrigger.id
                        ? { ...node, data: { ...node.data, schedule } }
                        : node
                    ))
                  }}
                  onSave={() => setShowTriggerConfig(false)}
                  onCancel={() => setShowTriggerConfig(false)}
                />
              ) : (
                <GenericTriggerConfig
                  triggerType={currentTrigger.actionType}
                  onSave={() => setShowTriggerConfig(false)}
                  onCancel={() => setShowTriggerConfig(false)}
                />
              )}
            </div>
          )}

          {/* Actions Section */}
          {currentTrigger && !showTriggerConfig && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Define what happens when the trigger fires</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-600">
                  <Plus className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Add Actions</h3>
                  <p className="text-gray-600 mb-4">
                    Actions define what happens when your trigger fires
                  </p>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Action
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveAutomation}
            disabled={!automationName || !currentTrigger}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            data-testid="save-automation"
          >
            Save Automation
          </Button>
        </div>
      </div>
    </div>
  )
}