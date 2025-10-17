'use client'

import { useState, useEffect } from 'react'
import { Wand2, Sparkles, RefreshCw, Copy, Save, Settings, Eye, EyeOff, Zap, Target, Brain } from 'lucide-react'

interface ContentGenerationConfig {
  contentType: 'email' | 'sms' | 'social_post' | 'ad_copy' | 'blog_post' | 'landing_page'
  tone: 'professional' | 'friendly' | 'casual' | 'urgent' | 'inspiring' | 'empathetic'
  length: 'short' | 'medium' | 'long'
  personalizationLevel: 'none' | 'basic' | 'advanced' | 'deep'
  includeEmojis: boolean
  includeCTA: boolean
  targetAudience?: string
  specificGoals?: string[]
}

interface AIContentGeneratorProps {
  value?: string
  onChange: (content: string) => void
  config?: Partial<ContentGenerationConfig>
  context?: {
    leadData?: Record<string, any>
    workflowType?: string
    organizationData?: Record<string, any>
    previousInteractions?: any[]
  }
  placeholder?: string
  height?: number
}

export function AIContentGenerator({
  value = '',
  onChange,
  config = {},
  context,
  placeholder = 'Generated content will appear here...',
  height = 200
}: AIContentGeneratorProps) {
  const [content, setContent] = useState(value)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationConfig, setGenerationConfig] = useState<ContentGenerationConfig>({
    contentType: 'email',
    tone: 'professional',
    length: 'medium',
    personalizationLevel: 'advanced',
    includeEmojis: false,
    includeCTA: true,
    ...config
  })
  const [prompt, setPrompt] = useState('')
  const [variations, setVariations] = useState<string[]>([])
  const [selectedVariation, setSelectedVariation] = useState<number>(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [generationHistory, setGenerationHistory] = useState<string[]>([])

  useEffect(() => {
    setContent(value)
  }, [value])

  const generateContent = async () => {
    if (!prompt.trim()) return
    
    setIsGenerating(true)
    try {
      // Mock AI generation - would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const mockVariations = [
        generateMockContent(prompt, generationConfig, 1),
        generateMockContent(prompt, generationConfig, 2),
        generateMockContent(prompt, generationConfig, 3)
      ]
      
      setVariations(mockVariations)
      setSelectedVariation(0)
      const newContent = mockVariations[0]
      setContent(newContent)
      onChange(newContent)
      
      // Add to history
      setGenerationHistory(prev => [newContent, ...prev.slice(0, 9)])
      
    } catch (error) {
      console.error('Content generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateMockContent = (prompt: string, config: ContentGenerationConfig, variant: number): string => {
    const templates = {
      email: [
        `Hi {{first_name}},\n\n${getPersonalizedOpener(variant)}\n\n${getMainContent(prompt, config, variant)}\n\n${config.includeCTA ? getCallToAction(config, variant) : ''}\n\nBest regards,\n{{sender_name}}`,
        `Hello {{first_name}}!\n\n${getPersonalizedOpener(variant)}\n\n${getMainContent(prompt, config, variant)}\n\n${config.includeCTA ? getCallToAction(config, variant) : ''}\n\nTalk soon,\n{{sender_name}}`,
        `Dear {{first_name}},\n\n${getPersonalizedOpener(variant)}\n\n${getMainContent(prompt, config, variant)}\n\n${config.includeCTA ? getCallToAction(config, variant) : ''}\n\nWarm regards,\n{{sender_name}}`
      ],
      sms: [
        `Hi {{first_name}}! ${getMainContent(prompt, config, variant)} ${config.includeCTA ? getCallToAction(config, variant) : ''}`,
        `Hey {{first_name}}, ${getMainContent(prompt, config, variant)} ${config.includeCTA ? getCallToAction(config, variant) : ''}`,
        `{{first_name}}, ${getMainContent(prompt, config, variant)} ${config.includeCTA ? getCallToAction(config, variant) : ''}`
      ]
    }
    
    const contentTemplates = templates[config.contentType] || templates.email
    return contentTemplates[variant - 1] || contentTemplates[0]
  }

  const getPersonalizedOpener = (variant: number): string => {
    const openers = [
      "I hope this message finds you well.",
      "I wanted to reach out personally to you.",
      "Thank you for your recent interest in our programs."
    ]
    return openers[variant - 1] || openers[0]
  }

  const getMainContent = (prompt: string, config: ContentGenerationConfig, variant: number): string => {
    const baseContent = `Based on your request: "${prompt}"`
    
    const variations = [
      `${baseContent}\n\nI've crafted this personalized message considering your specific interests and our conversation so far. Our team has noticed that clients like you typically see amazing results when they take this next step.`,
      `${baseContent}\n\nI wanted to share something exciting with you. Based on what you've told us about your goals and where you are in your fitness journey, I believe we have the perfect solution.`,
      `${baseContent}\n\nI've been thinking about our recent conversation, and I have some ideas that could really accelerate your progress. Many of our successful clients started exactly where you are right now.`
    ]
    
    return variations[variant - 1] || variations[0]
  }

  const getCallToAction = (config: ContentGenerationConfig, variant: number): string => {
    const ctas = [
      "Would you like to schedule a quick 15-minute call to discuss this further?",
      "Are you available for a brief conversation this week to explore your options?",
      "I'd love to show you exactly how this could work for your specific situation. When would be a good time to chat?"
    ]
    return ctas[variant - 1] || ctas[0]
  }

  const selectVariation = (index: number) => {
    setSelectedVariation(index)
    const selectedContent = variations[index]
    setContent(selectedContent)
    onChange(selectedContent)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content)
  }

  const regenerateContent = async () => {
    if (variations.length > 0) {
      await generateContent()
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-medium text-gray-900">AI Content Generator</h3>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700">
            <Sparkles className="w-3 h-3 mr-1" />
            Powered by AI
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Settings className="w-3 h-3 mr-1" />
            {showAdvanced ? 'Simple' : 'Advanced'}
          </button>
          {content && (
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </button>
          )}
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Content Type</label>
            <select
              value={generationConfig.contentType}
              onChange={(e) => setGenerationConfig({...generationConfig, contentType: e.target.value as any})}
              className="block w-full text-sm border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="social_post">Social Post</option>
              <option value="ad_copy">Ad Copy</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tone</label>
            <select
              value={generationConfig.tone}
              onChange={(e) => setGenerationConfig({...generationConfig, tone: e.target.value as any})}
              className="block w-full text-sm border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="casual">Casual</option>
              <option value="urgent">Urgent</option>
              <option value="inspiring">Inspiring</option>
              <option value="empathetic">Empathetic</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Length</label>
            <select
              value={generationConfig.length}
              onChange={(e) => setGenerationConfig({...generationConfig, length: e.target.value as any})}
              className="block w-full text-sm border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Personalization</label>
            <select
              value={generationConfig.personalizationLevel}
              onChange={(e) => setGenerationConfig({...generationConfig, personalizationLevel: e.target.value as any})}
              className="block w-full text-sm border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="none">None</option>
              <option value="basic">Basic</option>
              <option value="advanced">Advanced</option>
              <option value="deep">Deep AI</option>
            </select>
          </div>
        </div>

        {showAdvanced && (
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={generationConfig.includeEmojis}
                  onChange={(e) => setGenerationConfig({...generationConfig, includeEmojis: e.target.checked})}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="ml-2 text-sm text-gray-700">Include Emojis</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={generationConfig.includeCTA}
                  onChange={(e) => setGenerationConfig({...generationConfig, includeCTA: e.target.checked})}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="ml-2 text-sm text-gray-700">Include Call-to-Action</span>
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Target Audience</label>
                <input
                  type="text"
                  value={generationConfig.targetAudience || ''}
                  onChange={(e) => setGenerationConfig({...generationConfig, targetAudience: e.target.value})}
                  placeholder="e.g., Busy professionals, New gym members"
                  className="block w-full text-sm border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Specific Goals</label>
                <input
                  type="text"
                  placeholder="e.g., Book consultation, Download guide"
                  className="block w-full text-sm border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Context Display */}
      {context && (
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-center mb-2">
            <Target className="w-4 h-4 text-blue-600 mr-2" />
            <h4 className="text-sm font-medium text-blue-900">Available Context</h4>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
            {context.leadData && <div>Lead Data: {Object.keys(context.leadData).length} fields</div>}
            {context.workflowType && <div>Workflow: {context.workflowType}</div>}
            {context.organizationData && <div>Organization: Custom branding available</div>}
            {context.previousInteractions && <div>History: {context.previousInteractions.length} interactions</div>}
          </div>
        </div>
      )}

      {/* Prompt Input */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Describe the content you want to generate
        </label>
        <textarea
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
          rows={3}
          placeholder="e.g., Create a follow-up email for leads who downloaded our fitness guide but haven't booked a consultation. Focus on the benefits of personal training and include social proof."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        
        {/* Quick Prompts */}
        <div className="flex flex-wrap gap-2">
          {[
            'Welcome new member with workout tips',
            'Follow-up on missed appointment',
            'Promote new class with limited spots',
            'Ask for testimonial from satisfied client',
            'Re-engage inactive member'
          ].map((quickPrompt) => (
            <button
              key={quickPrompt}
              onClick={() => setPrompt(quickPrompt)}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              {quickPrompt}
            </button>
          ))}
        </div>

        <button
          onClick={generateContent}
          disabled={!prompt.trim() || isGenerating}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Generating...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Generate Content
            </>
          )}
        </button>
      </div>

      {/* Generated Variations */}
      {variations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">Generated Variations</h4>
            <button
              onClick={regenerateContent}
              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Regenerate
            </button>
          </div>
          
          <div className="flex space-x-2 mb-3">
            {variations.map((_, index) => (
              <button
                key={index}
                onClick={() => selectVariation(index)}
                className={`px-3 py-1 text-xs font-medium rounded-md ${
                  selectedVariation === index
                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                Variation {index + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content Display/Edit */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Generated Content
          {content && content !== value && (
            <span className="ml-2 text-xs text-orange-600">(Modified - click regenerate to reset)</span>
          )}
        </label>
        <textarea
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
          style={{ height: `${height}px` }}
          placeholder={placeholder}
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            onChange(e.target.value)
          }}
        />
        
        {/* Content Stats */}
        {content && (
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>Characters: {content.length}</span>
              <span>Words: {content.split(/\s+/).filter(word => word.length > 0).length}</span>
              <span>Variables: {(content.match(/\{\{[^}]+\}\}/g) || []).length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Generated
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Generation History */}
      {generationHistory.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-gray-600 hover:text-gray-800"
          >
            {showAdvanced ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            Generation History ({generationHistory.length})
          </button>
          
          {showAdvanced && (
            <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-3 bg-gray-50">
              {generationHistory.map((historyContent, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setContent(historyContent)
                    onChange(historyContent)
                  }}
                  className="block w-full text-left p-2 text-xs bg-white rounded border hover:bg-gray-50 truncate"
                >
                  {historyContent.substring(0, 100)}...
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}