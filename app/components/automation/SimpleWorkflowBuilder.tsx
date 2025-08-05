'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  NodeProps
} from 'reactflow'
// ReactFlow styles are imported globally to avoid SSR issues

// Simple trigger node component
const TriggerNode = ({ data }: NodeProps) => {
  return (
    <div className="bg-orange-600 text-white p-4 rounded-lg shadow-lg min-w-[200px]">
      <div className="font-bold mb-2">{data.label}</div>
      <div className="text-sm opacity-80">{data.description}</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  )
}

// Simple action node component  
const ActionNode = ({ data }: NodeProps) => {
  return (
    <div className="bg-blue-600 text-white p-4 rounded-lg shadow-lg min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="font-bold mb-2">{data.label}</div>
      <div className="text-sm opacity-80">{data.description}</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  )
}

// Simple condition node component
const ConditionNode = ({ data }: NodeProps) => {
  return (
    <div className="bg-purple-600 text-white p-4 rounded-lg shadow-lg min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="font-bold mb-2">{data.label}</div>
      <div className="text-sm opacity-80">{data.description}</div>
      <Handle type="source" position={Position.Right} className="w-3 h-3" id="yes" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" id="no" />
    </div>
  )
}

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode
}

// Available node templates
const nodeTemplates = [
  {
    type: 'trigger',
    label: 'New Lead',
    description: 'When a new lead is created',
    category: 'Triggers'
  },
  {
    type: 'trigger',
    label: 'Form Submitted',
    description: 'When a form is submitted',
    category: 'Triggers'
  },
  {
    type: 'action',
    label: 'Send Email',
    description: 'Send an email to the lead',
    category: 'Actions'
  },
  {
    type: 'action',
    label: 'Send SMS',
    description: 'Send an SMS message',
    category: 'Actions'
  },
  {
    type: 'action',
    label: 'Send WhatsApp',
    description: 'Send a WhatsApp message',
    category: 'Actions'
  },
  {
    type: 'action',
    label: 'Add Tag',
    description: 'Add a tag to the lead',
    category: 'Actions'
  },
  {
    type: 'condition',
    label: 'If/Else',
    description: 'Conditional branching',
    category: 'Logic'
  },
  {
    type: 'action',
    label: 'Wait',
    description: 'Wait for a specified time',
    category: 'Actions'
  }
]

export default function SimpleWorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedCategory, setSelectedCategory] = useState('Triggers')
  const [nodeIdCounter, setNodeIdCounter] = useState(1)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [availableForms, setAvailableForms] = useState<any[]>([])
  const [leadSources, setLeadSources] = useState<any[]>([])
  const [emailTemplates, setEmailTemplates] = useState<any[]>([])
  const [availableTags, setAvailableTags] = useState<any[]>([])
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])

  // Fetch configuration data on mount
  useEffect(() => {
    const fetchConfigData = async () => {
      try {
        setLoadingConfig(true)
        
        // Fetch forms
        const formsResponse = await fetch('/api/workflow-config/forms')
        const formsData = await formsResponse.json()
        if (formsData.success) {
          setAvailableForms(formsData.forms)
        }
        
        // Fetch lead sources
        const sourcesResponse = await fetch('/api/workflow-config/lead-sources')
        const sourcesData = await sourcesResponse.json()
        if (sourcesData.success) {
          setLeadSources(sourcesData.sources)
        }
        
        // Fetch email templates
        const templatesResponse = await fetch('/api/workflow-config/email-templates')
        const templatesData = await templatesResponse.json()
        if (templatesData.success) {
          setEmailTemplates(templatesData.templates)
        }
        
        // Fetch tags
        const tagsResponse = await fetch('/api/workflow-config/tags')
        const tagsData = await tagsResponse.json()
        if (tagsData.success) {
          setAvailableTags(tagsData.tags)
        }
      } catch (error) {
        console.error('Error fetching workflow config:', error)
      } finally {
        setLoadingConfig(false)
      }
    }
    
    fetchConfigData()
  }, [])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onDragStart = (event: React.DragEvent, nodeTemplate: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeTemplate))
    event.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const reactFlowBounds = event.currentTarget.getBoundingClientRect()
      const templateData = event.dataTransfer.getData('application/reactflow')

      if (templateData) {
        const template = JSON.parse(templateData)
        const position = {
          x: event.clientX - reactFlowBounds.left - 100,
          y: event.clientY - reactFlowBounds.top - 40
        }

        const newNode: Node = {
          id: `node_${nodeIdCounter}`,
          type: template.type,
          position,
          data: { 
            label: template.label,
            description: template.description 
          }
        }

        setNodes((nds) => nds.concat(newNode))
        setNodeIdCounter((c) => c + 1)
      }
    },
    [nodeIdCounter, setNodes]
  )

  const deleteSelectedElements = useCallback(() => {
    setNodes((nds) => nds.filter((node) => !node.selected))
    setEdges((eds) => eds.filter((edge) => !edge.selected))
  }, [setNodes, setEdges])

  const categories = [...new Set(nodeTemplates.map(t => t.category))]

  return (
    <div className="h-full flex bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 p-4 overflow-y-auto">
        <h3 className="text-white font-bold mb-4">Workflow Nodes</h3>
        
        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded text-sm ${
                selectedCategory === cat 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Node templates */}
        <div className="space-y-2">
          {nodeTemplates
            .filter(t => t.category === selectedCategory)
            .map((template, index) => (
              <div
                key={index}
                className="bg-gray-700 p-3 rounded cursor-move hover:bg-gray-600 transition-colors"
                draggable
                onDragStart={(e) => onDragStart(e, template)}
              >
                <div className="text-white font-medium">{template.label}</div>
                <div className="text-gray-400 text-sm">{template.description}</div>
              </div>
            ))}
        </div>

        <div className="mt-6 text-gray-400 text-sm">
          <p className="mb-2">💡 Tips:</p>
          <ul className="space-y-1 text-xs">
            <li>• Drag nodes to the canvas</li>
            <li>• Click nodes to configure settings</li>
            <li>• Connect nodes by dragging handles</li>
            <li>• Select and press Delete to remove</li>
          </ul>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button
            onClick={() => setShowAIAssistant(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            AI Assistant
          </button>
          <button
            onClick={async () => {
              const workflowName = prompt('Enter workflow name:')
              if (!workflowName) return
              
              try {
                // Extract trigger configuration
                const triggerNode = nodes.find(n => n.type === 'trigger');
                let triggerType = 'manual';
                let triggerConfig = {};
                
                if (triggerNode) {
                  switch (triggerNode.data.label) {
                    case 'New Lead':
                      triggerType = 'lead_created';
                      triggerConfig = {
                        source: triggerNode.data.source || 'all'
                      };
                      break;
                    case 'Form Submitted':
                      triggerType = 'form_submitted';
                      triggerConfig = {
                        formId: triggerNode.data.formId || 'all',
                        formType: triggerNode.data.formType,
                        formCategory: triggerNode.data.formCategory,
                        pageId: triggerNode.data.pageId,
                        pageName: triggerNode.data.pageName
                      };
                      break;
                  }
                }
                
                const response = await fetch('/api/workflows', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: workflowName,
                    description: 'Created with workflow builder',
                    nodes,
                    edges,
                    status: 'draft',
                    trigger_type: triggerType,
                    trigger_config: triggerConfig
                  })
                })
                
                if (response.ok) {
                  const saved = await response.json()
                  alert(`Workflow "${workflowName}" saved successfully!`)
                  window.location.href = '/automations'
                } else {
                  alert('Failed to save workflow')
                }
              } catch (error) {
                console.error('Save error:', error)
                alert('Error saving workflow')
              }
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
          >
            Save Workflow
          </button>
          <button
            onClick={deleteSelectedElements}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
          >
            Delete Selected
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={(event, node) => {
            setSelectedNode(node)
            setShowSettings(true)
          }}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-900"
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* Settings Panel */}
      {showSettings && selectedNode && (
        <div className="absolute right-0 top-0 w-96 h-full bg-gray-800 shadow-xl z-20 overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Node Settings</h3>
              <button
                onClick={() => {
                  setShowSettings(false)
                  setSelectedNode(null)
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Node Info */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Node Type</label>
                <div className="bg-gray-700 px-4 py-2 rounded-lg">
                  <p className="text-white font-medium">{selectedNode.data.label}</p>
                  <p className="text-gray-400 text-sm">{selectedNode.data.description}</p>
                </div>
              </div>

              {/* Trigger-specific settings */}
              {selectedNode.type === 'trigger' && selectedNode.data.label === 'New Lead' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Lead Source</label>
                  <select 
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    onChange={(e) => {
                      const updatedNodes = nodes.map(node => {
                        if (node.id === selectedNode.id) {
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              source: e.target.value
                            }
                          }
                        }
                        return node
                      })
                      setNodes(updatedNodes)
                    }}
                    value={selectedNode.data.source || 'all'}
                  >
                    {loadingConfig ? (
                      <option>Loading sources...</option>
                    ) : (
                      leadSources.map(source => (
                        <option key={source.id} value={source.id}>
                          {source.name}
                          {source.hasData && ` (${source.count} leads)`}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {selectedNode.type === 'trigger' && selectedNode.data.label === 'Form Submitted' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Select Form</label>
                  {!loadingConfig && availableForms.length === 1 && availableForms[0].category === 'All Forms' && (
                    <div className="mb-3 p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg">
                      <p className="text-sm text-yellow-400">
                        No forms found. Create forms in the Forms section or connect Facebook to import lead forms.
                      </p>
                    </div>
                  )}
                  <select 
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    onChange={(e) => {
                      const formId = e.target.value;
                      let formData = null;
                      
                      // Find the selected form details
                      for (const category of availableForms) {
                        const form = category.items.find((f: any) => f.id === formId);
                        if (form) {
                          formData = {
                            ...form,
                            category: category.category
                          };
                          break;
                        }
                      }
                      
                      const updatedNodes = nodes.map(node => {
                        if (node.id === selectedNode.id) {
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              formId: e.target.value,
                              formName: e.target.options[e.target.selectedIndex].text,
                              formType: formData?.type,
                              formCategory: formData?.category,
                              pageId: formData?.pageId,
                              pageName: formData?.pageName
                            }
                          }
                        }
                        return node
                      })
                      setNodes(updatedNodes)
                    }}
                    value={selectedNode.data.formId || ''}
                  >
                    <option value="">Select a form...</option>
                    {loadingConfig ? (
                      <option>Loading forms...</option>
                    ) : (
                      availableForms.map(category => (
                        <optgroup key={category.category} label={category.category}>
                          {category.items.map((form: any) => (
                            <option key={form.id} value={form.id}>
                              {form.name}
                              {form.description && ` - ${form.description}`}
                            </option>
                          ))}
                        </optgroup>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Action-specific settings */}
              {selectedNode.type === 'action' && selectedNode.data.label === 'Send Email' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email Template</label>
                    <select 
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      onChange={(e) => {
                        const updatedNodes = nodes.map(node => {
                          if (node.id === selectedNode.id) {
                            return {
                              ...node,
                              data: {
                                ...node.data,
                                templateId: e.target.value
                              }
                            }
                          }
                          return node
                        })
                        setNodes(updatedNodes)
                      }}
                      value={selectedNode.data.templateId || ''}
                    >
                      <option value="">Select template...</option>
                      {loadingConfig ? (
                        <option>Loading templates...</option>
                      ) : (
                        emailTemplates.map(template => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Subject Line</label>
                    <input
                      type="text"
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter email subject..."
                      value={selectedNode.data.subject || ''}
                      onChange={(e) => {
                        const updatedNodes = nodes.map(node => {
                          if (node.id === selectedNode.id) {
                            return {
                              ...node,
                              data: {
                                ...node.data,
                                subject: e.target.value
                              }
                            }
                          }
                          return node
                        })
                        setNodes(updatedNodes)
                      }}
                    />
                  </div>
                </>
              )}

              {selectedNode.type === 'action' && selectedNode.data.label === 'Send SMS' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">SMS Message</label>
                  <textarea
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={4}
                    placeholder="Enter SMS message..."
                    value={selectedNode.data.message || ''}
                    onChange={(e) => {
                      const updatedNodes = nodes.map(node => {
                        if (node.id === selectedNode.id) {
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              message: e.target.value
                            }
                          }
                        }
                        return node
                      })
                      setNodes(updatedNodes)
                    }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {(selectedNode.data.message || '').length}/160 characters
                  </p>
                </div>
              )}

              {selectedNode.type === 'action' && selectedNode.data.label === 'Send WhatsApp' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">WhatsApp Message</label>
                  <textarea
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={4}
                    placeholder="Enter WhatsApp message..."
                    value={selectedNode.data.message || ''}
                    onChange={(e) => {
                      const updatedNodes = nodes.map(node => {
                        if (node.id === selectedNode.id) {
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              message: e.target.value
                            }
                          }
                        }
                        return node
                      })
                      setNodes(updatedNodes)
                    }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    You can use variables like {'{first_name}'} and {'{gym_name}'}
                  </p>
                </div>
              )}

              {selectedNode.type === 'action' && selectedNode.data.label === 'Wait' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Wait Duration</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Duration"
                      min="1"
                      value={selectedNode.data.duration || ''}
                      onChange={(e) => {
                        const updatedNodes = nodes.map(node => {
                          if (node.id === selectedNode.id) {
                            return {
                              ...node,
                              data: {
                                ...node.data,
                                duration: e.target.value
                              }
                            }
                          }
                          return node
                        })
                        setNodes(updatedNodes)
                      }}
                    />
                    <select 
                      className="bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      value={selectedNode.data.unit || 'minutes'}
                      onChange={(e) => {
                        const updatedNodes = nodes.map(node => {
                          if (node.id === selectedNode.id) {
                            return {
                              ...node,
                              data: {
                                ...node.data,
                                unit: e.target.value
                              }
                            }
                          }
                          return node
                        })
                        setNodes(updatedNodes)
                      }}
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedNode.type === 'action' && selectedNode.data.label === 'Add Tag' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Select or Create Tag</label>
                  <select 
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 mb-2"
                    onChange={(e) => {
                      const updatedNodes = nodes.map(node => {
                        if (node.id === selectedNode.id) {
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              tag: e.target.value
                            }
                          }
                        }
                        return node
                      })
                      setNodes(updatedNodes)
                    }}
                    value={selectedNode.data.tag || ''}
                  >
                    <option value="">Select a tag...</option>
                    {loadingConfig ? (
                      <option>Loading tags...</option>
                    ) : (
                      <>
                        <optgroup label="Lead Status">
                          {availableTags
                            .filter(tag => ['hot-lead', 'warm-lead', 'cold-lead'].includes(tag.value))
                            .map(tag => (
                              <option key={tag.value} value={tag.value}>
                                {tag.label}
                                {tag.count > 0 && ` (${tag.count} leads)`}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Common Tags">
                          {availableTags
                            .filter(tag => !['hot-lead', 'warm-lead', 'cold-lead'].includes(tag.value))
                            .map(tag => (
                              <option key={tag.value} value={tag.value}>
                                {tag.label}
                                {tag.count > 0 && ` (${tag.count} leads)`}
                              </option>
                            ))}
                        </optgroup>
                      </>
                    )}
                  </select>
                  <input
                    type="text"
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Or type a new tag..."
                    value={selectedNode.data.customTag || ''}
                    onChange={(e) => {
                      const updatedNodes = nodes.map(node => {
                        if (node.id === selectedNode.id) {
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              customTag: e.target.value,
                              tag: e.target.value.toLowerCase().replace(/\s+/g, '-')
                            }
                          }
                        }
                        return node
                      })
                      setNodes(updatedNodes)
                    }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Tags help categorize and segment your leads
                  </p>
                </div>
              )}

              {selectedNode.type === 'condition' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Condition</label>
                  <select 
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 mb-2"
                    value={selectedNode.data.field || ''}
                    onChange={(e) => {
                      const updatedNodes = nodes.map(node => {
                        if (node.id === selectedNode.id) {
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              field: e.target.value
                            }
                          }
                        }
                        return node
                      })
                      setNodes(updatedNodes)
                    }}
                  >
                    <option value="">Select field...</option>
                    <option value="email">Email</option>
                    <option value="tag">Tag</option>
                    <option value="source">Lead Source</option>
                    <option value="score">Lead Score</option>
                  </select>
                  
                  <select 
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 mb-2"
                    value={selectedNode.data.operator || ''}
                    onChange={(e) => {
                      const updatedNodes = nodes.map(node => {
                        if (node.id === selectedNode.id) {
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              operator: e.target.value
                            }
                          }
                        }
                        return node
                      })
                      setNodes(updatedNodes)
                    }}
                  >
                    <option value="">Select operator...</option>
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                    <option value="greater">Greater than</option>
                    <option value="less">Less than</option>
                  </select>
                  
                  <input
                    type="text"
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Value"
                    value={selectedNode.data.value || ''}
                    onChange={(e) => {
                      const updatedNodes = nodes.map(node => {
                        if (node.id === selectedNode.id) {
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              value: e.target.value
                            }
                          }
                        }
                        return node
                      })
                      setNodes(updatedNodes)
                    }}
                  />
                </div>
              )}

              {/* Save button */}
              <button
                onClick={() => {
                  setShowSettings(false)
                  setSelectedNode(null)
                }}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Modal */}
      {showAIAssistant && (
        <div className="absolute inset-0 bg-black bg-opacity-50 z-30 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  AI Workflow Assistant
                </h2>
                <button
                  onClick={() => {
                    setShowAIAssistant(false)
                    setAiPrompt('')
                    setAiSuggestions([])
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Describe your workflow
                </label>
                <textarea
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={4}
                  placeholder="E.g., 'When a new lead comes in from Facebook, wait 5 minutes, then send a welcome SMS, and if they don't respond within 1 hour, send a follow-up email'"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
              </div>

              {/* Quick Templates */}
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">Quick Templates:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAiPrompt('Create a welcome sequence for new leads with SMS and email follow-ups')}
                    className="text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-colors"
                  >
                    👋 Welcome Sequence
                  </button>
                  <button
                    onClick={() => setAiPrompt('Build a lead nurturing campaign with multiple touchpoints over 7 days')}
                    className="text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-colors"
                  >
                    📈 Lead Nurturing
                  </button>
                  <button
                    onClick={() => setAiPrompt('Set up appointment reminders 24 hours and 1 hour before scheduled time')}
                    className="text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-colors"
                  >
                    📅 Appointment Reminders
                  </button>
                  <button
                    onClick={() => setAiPrompt('Create a re-engagement workflow for inactive leads after 30 days')}
                    className="text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-colors"
                  >
                    🔄 Re-engagement
                  </button>
                </div>
              </div>

              {/* AI Suggestions */}
              {aiSuggestions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-2">AI Suggestions:</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {aiSuggestions.map((suggestion, index) => (
                      <div key={index} className="p-3 bg-gray-700 rounded-lg text-sm text-gray-300">
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (!aiPrompt.trim()) return
                    
                    setAiLoading(true)
                    try {
                      const response = await fetch('/api/ai/workflow-assistant', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: aiPrompt })
                      })
                      
                      if (response.ok) {
                        const data = await response.json()
                        if (data.workflow) {
                          // Apply the AI-generated workflow
                          setNodes(data.workflow.nodes || [])
                          setEdges(data.workflow.edges || [])
                          setShowAIAssistant(false)
                          setAiPrompt('')
                        }
                        if (data.suggestions) {
                          setAiSuggestions(data.suggestions)
                        }
                      }
                    } catch (error) {
                      console.error('AI Assistant error:', error)
                      alert('Failed to get AI suggestions. Please try again.')
                    } finally {
                      setAiLoading(false)
                    }
                  }}
                  disabled={!aiPrompt.trim() || aiLoading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {aiLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Building Workflow...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Workflow
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAIAssistant(false)
                    setAiPrompt('')
                    setAiSuggestions([])
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}