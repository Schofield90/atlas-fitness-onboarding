'use client'

import { useState } from 'react'
import { Plus, Play, Pause, Edit, Trash2, Settings, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AutomationBuilder } from '@/components/automations/AutomationBuilder'

// Basic automation types
interface AutomationNode {
  id: string
  type: 'trigger' | 'action'
  actionType: string
  data: Record<string, any>
  position: { x: number; y: number }
}

interface Automation {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'draft'
  nodes: AutomationNode[]
  createdAt: string
  lastModified: string
  executions: number
}

const mockAutomations: Automation[] = [
  {
    id: '1',
    name: 'Welcome New Leads',
    description: 'Send welcome email when someone submits contact form',
    status: 'active',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        actionType: 'website_form',
        data: { selectedForms: ['1', '2'] },
        position: { x: 100, y: 100 }
      },
      {
        id: 'action-1',
        type: 'action',
        actionType: 'send_email',
        data: { template: 'welcome', delay: 0 },
        position: { x: 300, y: 100 }
      }
    ],
    createdAt: '2024-01-15',
    lastModified: '2024-01-20',
    executions: 25
  }
]

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>(mockAutomations)
  const [showBuilder, setShowBuilder] = useState(false)
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null)

  const handleCreateAutomation = () => {
    setSelectedAutomation(null)
    setShowBuilder(true)
  }

  const handleEditAutomation = (automation: Automation) => {
    setSelectedAutomation(automation)
    setShowBuilder(true)
  }

  const handleToggleStatus = (automationId: string) => {
    setAutomations(automations.map(a => 
      a.id === automationId 
        ? { ...a, status: a.status === 'active' ? 'inactive' : 'active' as 'active' | 'inactive' }
        : a
    ))
  }

  const handleDeleteAutomation = (automationId: string) => {
    if (confirm('Are you sure you want to delete this automation?')) {
      setAutomations(automations.filter(a => a.id !== automationId))
    }
  }

  const getStatusColor = (status: Automation['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automations</h1>
          <p className="text-gray-600">Automate your gym's workflows and processes</p>
        </div>
        <Button onClick={handleCreateAutomation} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Automation
        </Button>
      </div>

      {automations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No automations yet</h3>
            <p className="text-gray-600 text-center mb-4">
              Create your first automation to start streamlining your gym's processes
            </p>
            <Button onClick={handleCreateAutomation} className="bg-blue-600 hover:bg-blue-700" data-testid="create-automation-btn">
              <Plus className="w-4 h-4 mr-2" />
              Create Automation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {automations.map((automation) => (
            <Card key={automation.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Zap className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{automation.name}</h3>
                      <p className="text-gray-600 text-sm mt-1">{automation.description}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <Badge className={getStatusColor(automation.status)}>
                          {automation.status}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {automation.nodes.length} steps
                        </span>
                        <span className="text-sm text-gray-600">
                          {automation.executions} executions
                        </span>
                        <span className="text-sm text-gray-600">
                          Modified {new Date(automation.lastModified).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(automation.id)}
                      className={automation.status === 'active' ? 'text-orange-600' : 'text-green-600'}
                    >
                      {automation.status === 'active' ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditAutomation(automation)}
                      data-testid={`edit-automation-${automation.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAutomation(automation.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AutomationBuilder
        isOpen={showBuilder}
        onClose={() => setShowBuilder(false)}
        automation={selectedAutomation || undefined}
      />
    </div>
  )
}