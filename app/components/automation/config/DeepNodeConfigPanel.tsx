'use client'

import { useState, useEffect } from 'react'
import { X, Settings, Sparkles, Code, Zap, Shield, BarChart3, HelpCircle, ChevronDown, ChevronRight, Search, Filter, Copy, Save, RefreshCw, AlertTriangle } from 'lucide-react'
import { EmailSelector } from '../fields/EmailSelector'
import { AIContentGenerator } from '../fields/AIContentGenerator'
import { SmartFormBuilder } from '../fields/SmartFormBuilder'
import type { AdvancedWorkflowNode, AdvancedNodeData, ConfigSection, ConfigField } from '../../../lib/types/advanced-automation'

interface DeepNodeConfigPanelProps {
  node: AdvancedWorkflowNode | null
  isOpen: boolean
  onClose: () => void
  onSave: (nodeData: AdvancedNodeData) => void
  organizationId: string
}

export function DeepNodeConfigPanel({
  node,
  isOpen,
  onClose,
  onSave,
  organizationId
}: DeepNodeConfigPanelProps) {
  const [activeSection, setActiveSection] = useState<string>('primary')
  const [nodeData, setNodeData] = useState<AdvancedNodeData | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isValidating, setIsValidating] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, any>>({})

  useEffect(() => {
    if (node) {
      setNodeData(node.data)
      setActiveSection('primary')
      setIsDirty(false)
      loadAISuggestions()
    }
  }, [node])

  const loadAISuggestions = async () => {
    if (!node) return
    
    // Mock AI suggestions - would be replaced with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const suggestions = {
      configuration_optimization: [
        'Consider enabling caching for better performance',
        'Add retry logic for improved reliability',
        'Configure rate limiting to prevent API overload'
      ],
      field_suggestions: {
        email_template: 'Try using more personalization tokens',
        subject_line: 'Shorter subject lines perform better on mobile',
        send_time: 'Tuesday 10-11 AM shows highest engagement'
      }
    }
    
    setAiSuggestions(suggestions)
  }

  const handleFieldChange = (fieldId: string, value: any) => {
    if (!nodeData) return
    
    setNodeData(prev => {
      if (!prev) return prev
      
      const newData = {
        ...prev,
        config: {
          ...prev.config,
          [fieldId]: value
        }
      }
      
      return newData
    })
    
    setIsDirty(true)
    
    // Clear validation error for this field
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldId]
        return newErrors
      })
    }
  }

  const handleAdvancedConfigChange = (section: string, key: string, value: any) => {
    if (!nodeData) return
    
    setNodeData(prev => {
      if (!prev) return prev
      
      return {
        ...prev,
        advancedConfig: {
          ...prev.advancedConfig,
          [section]: {
            ...prev.advancedConfig[section],
            [key]: value
          }
        }
      }
    })
    
    setIsDirty(true)
  }

  const validateConfiguration = async (): Promise<boolean> => {
    if (!nodeData) return false
    
    setIsValidating(true)
    const errors: Record<string, string> = {}
    
    // Validate required fields
    nodeData.validationRules.forEach(rule => {
      if (rule.type === 'required') {
        const value = nodeData.config[rule.field]
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          errors[rule.field] = rule.errorMessage
        }
      }
    })
    
    // Validate field formats
    nodeData.validationRules.forEach(rule => {
      if (rule.type === 'format') {
        const value = nodeData.config[rule.field]
        if (value && rule.config.pattern) {
          const regex = new RegExp(rule.config.pattern)
          if (!regex.test(value)) {
            errors[rule.field] = rule.errorMessage
          }
        }
      }
    })
    
    setValidationErrors(errors)
    setIsValidating(false)
    
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!nodeData) return
    
    const isValid = await validateConfiguration()
    if (!isValid) return
    
    onSave(nodeData)
    setIsDirty(false)
  }

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const renderField = (field: ConfigField) => {
    const value = nodeData?.config[field.id]
    const error = validationErrors[field.id]
    const hasAISuggestion = aiSuggestions.field_suggestions?.[field.id]

    switch (field.type) {
      case 'text':
        return (
          <div className="space-y-1">
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                error 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
            {hasAISuggestion && (
              <div className="flex items-center justify-between p-2 bg-purple-50 border border-purple-200 rounded-md text-sm">
                <div className="flex items-center">
                  <Sparkles className="w-4 h-4 text-purple-600 mr-1" />
                  <span className="text-purple-700">{hasAISuggestion}</span>
                </div>
                <button
                  onClick={() => handleFieldChange(field.id, hasAISuggestion)}
                  className="text-purple-600 hover:text-purple-800 font-medium"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        )

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              error 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
          />
        )

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              error 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
          >
            <option value="">Select an option</option>
            {field.validation?.options?.map((option: any) => (
              <option key={option.value || option} value={option.value || option}>
                {option.label || option}
              </option>
            ))}
          </select>
        )

      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">{field.description}</span>
          </div>
        )

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value) || 0)}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              error 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
          />
        )

      case 'email_selector':
        return (
          <EmailSelector
            value={value}
            onChange={(template) => handleFieldChange(field.id, template)}
            aiAssistance={field.aiAssistance?.enabled}
            organizationId={organizationId}
            context={{
              trigger: nodeData?.actionType,
              workflowType: 'automation'
            }}
          />
        )

      case 'ai_content_generator':
        return (
          <AIContentGenerator
            value={value}
            onChange={(content) => handleFieldChange(field.id, content)}
            config={{ contentType: 'email' }}
            context={{
              leadData: { first_name: 'John', company: 'Acme Inc' },
              workflowType: 'lead_nurture'
            }}
          />
        )

      case 'smart_form':
        return (
          <SmartFormBuilder
            value={value}
            onChange={(config) => handleFieldChange(field.id, config)}
            aiAssistance={true}
            context={{
              formType: 'lead_capture',
              industry: 'fitness'
            }}
          />
        )

      case 'code':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">JavaScript Code</span>
              <button className="text-xs text-blue-600 hover:text-blue-800">
                <Code className="w-3 h-3 inline mr-1" />
                Format
              </button>
            </div>
            <textarea
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder || '// Enter your code here'}
              rows={8}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-mono focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        )
    }
  }

  const renderSection = (section: ConfigSection) => {
    const isCollapsed = collapsedSections.has(section.id)
    const filteredFields = section.fields.filter(field =>
      searchQuery === '' ||
      field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (filteredFields.length === 0 && searchQuery !== '') {
      return null
    }

    return (
      <div key={section.id} className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection(section.id)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <div className="flex items-center">
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-500 mr-2" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500 mr-2" />
            )}
            <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
            {section.description && (
              <HelpCircle className="w-4 h-4 text-gray-400 ml-2" />
            )}
          </div>
          {filteredFields.some(field => validationErrors[field.id]) && (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          )}
        </button>

        {!isCollapsed && (
          <div className="px-4 pb-4 space-y-4">
            {section.description && (
              <p className="text-sm text-gray-600">{section.description}</p>
            )}
            
            {filteredFields.map(field => (
              <div key={field.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    {field.label}
                    {field.validation?.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  {field.aiAssistance?.enabled && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI
                    </span>
                  )}
                </div>
                
                {field.description && (
                  <p className="text-xs text-gray-500">{field.description}</p>
                )}
                
                {renderField(field)}
                
                {validationErrors[field.id] && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    {validationErrors[field.id]}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!isOpen || !node || !nodeData) {
    return null
  }

  const sections = nodeData.uiConfig.configPanel.sections
  const filteredSections = sections.filter(section =>
    searchQuery === '' ||
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.fields.some(field =>
      field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Settings className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Configure {nodeData.label}
              </h2>
              <p className="text-sm text-gray-600">
                {nodeData.description || 'Configure this node\'s settings and behavior'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {isDirty && (
              <span className="text-sm text-orange-600 font-medium">
                Unsaved changes
              </span>
            )}
            <button
              onClick={() => loadAISuggestions()}
              className="inline-flex items-center px-3 py-2 border border-purple-300 shadow-sm text-sm font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100"
              disabled={isValidating}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              AI Suggestions
            </button>
            <button
              onClick={handleSave}
              disabled={isValidating || !isDirty}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? (
                <>
                  <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Validating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* AI Suggestions Banner */}
        {aiSuggestions.configuration_optimization?.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b">
            <div className="flex items-start">
              <Sparkles className="w-5 h-5 text-purple-600 mr-2 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-purple-900 mb-1">
                  AI Configuration Suggestions
                </h4>
                <div className="space-y-1">
                  {aiSuggestions.configuration_optimization.slice(0, 2).map((suggestion: string, index: number) => (
                    <p key={index} className="text-sm text-purple-700">• {suggestion}</p>
                  ))}
                </div>
              </div>
              <button className="text-sm text-purple-600 hover:text-purple-800 font-medium">
                View All
              </button>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Search configuration options..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCollapsedSections(new Set())}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Expand All
              </button>
              <button
                onClick={() => setCollapsedSections(new Set(sections.map(s => s.id)))}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {filteredSections.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Search className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No matching configuration options</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search query or clear the search to see all options.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-3 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              filteredSections.map(renderSection)
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            {Object.keys(validationErrors).length > 0 && (
              <span className="flex items-center text-sm text-red-600">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {Object.keys(validationErrors).length} validation error(s)
              </span>
            )}
            
            {node.optimizationHints && node.optimizationHints.length > 0 && (
              <span className="flex items-center text-sm text-blue-600">
                <Zap className="w-4 h-4 mr-1" />
                {node.optimizationHints.length} optimization suggestion(s)
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(nodeData.config, null, 2))
              }}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Config
            </button>
            
            <button
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSave}
              disabled={isValidating || !isDirty}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? (
                <>
                  <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Validating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save & Close
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}