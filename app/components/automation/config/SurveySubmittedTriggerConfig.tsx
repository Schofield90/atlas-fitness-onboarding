'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Plus, X, ClipboardList, BarChart3, AlertCircle, Star, ThumbsUp, ThumbsDown } from 'lucide-react'

interface SurveySubmittedTriggerConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

interface Survey {
  id: string
  name: string
  type: 'nps' | 'csat' | 'feedback' | 'rating' | 'custom'
  status: 'active' | 'inactive' | 'draft'
  responsesCount: number
  questions: SurveyQuestion[]
}

interface SurveyQuestion {
  id: string
  text: string
  type: 'rating' | 'multiple_choice' | 'text' | 'nps' | 'scale'
  required: boolean
  options?: string[]
  scale?: { min: number; max: number }
}

export default function SurveySubmittedTriggerConfig({ config, onChange, organizationId }: SurveySubmittedTriggerConfigProps) {
  const [triggerName, setTriggerName] = useState(config.name || 'Survey Submitted Trigger')
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [filters, setFilters] = useState(config.filters || {
    surveyId: 'any', // 'any', specific survey id
    surveyType: 'any', // 'any', 'nps', 'csat', 'feedback', 'rating', 'custom'
    completionStatus: 'any', // 'any', 'complete', 'partial', 'abandoned'
    responseScore: 'any', // 'any', 'high', 'medium', 'low', 'custom_range'
    customScoreMin: 0,
    customScoreMax: 10,
    npsCategory: 'any', // 'any', 'promoter', 'passive', 'detractor'
    csatRating: 'any', // 'any', '1', '2', '3', '4', '5'
    hasTextResponse: 'any', // 'any', 'with_text', 'without_text'
    textSentiment: 'any', // 'any', 'positive', 'negative', 'neutral'
    responseTime: 'any', // 'any', 'fast', 'medium', 'slow' (time to complete)
    questionResponses: [] // array of { questionId, operator, value } for specific question answers
  })
  const [additionalFilters, setAdditionalFilters] = useState(config.additionalFilters || [])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (config.name) {
      setTriggerName(config.name)
    }
  }, [])

  useEffect(() => {
    loadAvailableSurveys()
  }, [organizationId])

  const loadAvailableSurveys = async () => {
    try {
      setLoading(true)
      
      // Load available surveys
      const surveysResponse = await fetch('/api/surveys')
      if (surveysResponse.ok) {
        const surveysData = await surveysResponse.json()
        if (surveysData.surveys) {
          setSurveys(surveysData.surveys.map((survey: any) => ({
            id: survey.id,
            name: survey.name,
            type: survey.type || 'custom',
            status: survey.status || 'active',
            responsesCount: survey.responses_count || 0,
            questions: survey.questions?.map((question: any) => ({
              id: question.id,
              text: question.text,
              type: question.type || 'text',
              required: question.required || false,
              options: question.options || [],
              scale: question.scale || { min: 1, max: 5 }
            })) || []
          })))
        }
      } else {
        // Default surveys if API is not available
        setSurveys([
          {
            id: 'nps_survey',
            name: 'Customer Satisfaction NPS',
            type: 'nps',
            status: 'active',
            responsesCount: 0,
            questions: [
              {
                id: 'nps_score',
                text: 'How likely are you to recommend us to a friend?',
                type: 'nps',
                required: true,
                scale: { min: 0, max: 10 }
              },
              {
                id: 'nps_feedback',
                text: 'What could we do to improve?',
                type: 'text',
                required: false
              }
            ]
          },
          {
            id: 'csat_survey',
            name: 'Service Rating Survey',
            type: 'csat',
            status: 'active',
            responsesCount: 0,
            questions: [
              {
                id: 'service_rating',
                text: 'How would you rate our service?',
                type: 'rating',
                required: true,
                scale: { min: 1, max: 5 }
              }
            ]
          }
        ])
      }
    } catch (error) {
      console.error('Error loading surveys:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onChange({ ...config, filters: newFilters })
  }

  const addQuestionResponseFilter = () => {
    const selectedSurvey = getSelectedSurvey()
    if (!selectedSurvey || selectedSurvey.questions.length === 0) return

    const newQuestionResponse = {
      id: Date.now().toString(),
      questionId: selectedSurvey.questions[0].id,
      operator: 'equals',
      value: ''
    }
    
    const currentResponses = filters.questionResponses || []
    handleFilterChange('questionResponses', [...currentResponses, newQuestionResponse])
  }

  const updateQuestionResponseFilter = (id: string, updates: any) => {
    const currentResponses = filters.questionResponses || []
    const updated = currentResponses.map((f: any) => f.id === id ? { ...f, ...updates } : f)
    handleFilterChange('questionResponses', updated)
  }

  const removeQuestionResponseFilter = (id: string) => {
    const currentResponses = filters.questionResponses || []
    const updated = currentResponses.filter((f: any) => f.id !== id)
    handleFilterChange('questionResponses', updated)
  }

  const addAdditionalFilter = () => {
    const newFilter = {
      id: Date.now().toString(),
      field: 'response.created_at',
      operator: 'greater_than',
      value: ''
    }
    setAdditionalFilters([...additionalFilters, newFilter])
    onChange({ ...config, additionalFilters: [...additionalFilters, newFilter] })
  }

  const updateAdditionalFilter = (id: string, updates: any) => {
    const updated = additionalFilters.map((f: any) => f.id === id ? { ...f, ...updates } : f)
    setAdditionalFilters(updated)
    onChange({ ...config, additionalFilters: updated })
  }

  const removeAdditionalFilter = (id: string) => {
    const updated = additionalFilters.filter((f: any) => f.id !== id)
    setAdditionalFilters(updated)
    onChange({ ...config, additionalFilters: updated })
  }

  const getSelectedSurvey = () => {
    return surveys.find(survey => survey.id === filters.surveyId)
  }

  const getSurveyTypeDisplay = (type: string) => {
    switch (type) {
      case 'nps': return 'Net Promoter Score (NPS)'
      case 'csat': return 'Customer Satisfaction (CSAT)'
      case 'feedback': return 'Feedback Survey'
      case 'rating': return 'Rating Survey'
      case 'custom': return 'Custom Survey'
      default: return type
    }
  }

  const getQuestionById = (questionId: string) => {
    const selectedSurvey = getSelectedSurvey()
    return selectedSurvey?.questions.find(q => q.id === questionId)
  }

  if (loading) {
    return <div className="p-4 text-center">Loading survey configuration...</div>
  }

  return (
    <div className="space-y-6">
      {/* Trigger Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
          WORKFLOW TRIGGER NAME
        </label>
        <input
          type="text"
          value={triggerName}
          onChange={(e) => {
            setTriggerName(e.target.value)
            onChange({ ...config, name: e.target.value })
          }}
          placeholder="Enter trigger name"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Survey Configuration */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
            SURVEY SUBMISSION TRIGGER SETTINGS
          </label>
          <p className="text-sm text-gray-500 mb-4">
            Configure when to trigger based on survey submissions and responses
          </p>
        </div>

        {/* Surveys Display */}
        {surveys.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Surveys Created
            </h3>
            <p className="text-gray-600 mb-4">
              You need to create surveys before you can use survey submission triggers.
            </p>
            <a
              href="/surveys"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Survey
            </a>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <ClipboardList className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">
                {surveys.length} surveys available for triggers
              </span>
            </div>
          </div>
        )}

        {surveys.length > 0 && (
          <>
            {/* Survey Selection */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specific survey
                </label>
                <div className="relative">
                  <select
                    value={filters.surveyId}
                    onChange={(e) => handleFilterChange('surveyId', e.target.value)}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="any">Any survey</option>
                    {surveys.map(survey => (
                      <option key={survey.id} value={survey.id}>
                        {survey.name} ({getSurveyTypeDisplay(survey.type)})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex-1">
                <div className={`px-4 py-3 rounded-lg block text-center ${
                  filters.surveyId !== 'any' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {getSelectedSurvey()?.name || 'Any'}
                  {getSelectedSurvey() && (
                    <div className="text-xs mt-1">
                      {getSelectedSurvey()!.responsesCount} responses
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Survey Type Filter */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Survey type
                </label>
                <div className="relative">
                  <select
                    value={filters.surveyType}
                    onChange={(e) => handleFilterChange('surveyType', e.target.value)}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="any">Any survey type</option>
                    <option value="nps">NPS Surveys</option>
                    <option value="csat">CSAT Surveys</option>
                    <option value="feedback">Feedback Surveys</option>
                    <option value="rating">Rating Surveys</option>
                    <option value="custom">Custom Surveys</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex-1">
                <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
                  {filters.surveyType === 'any' ? 'Any' : getSurveyTypeDisplay(filters.surveyType)}
                </span>
              </div>
            </div>

            {/* Completion Status Filter */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Completion status
                </label>
                <div className="relative">
                  <select
                    value={filters.completionStatus}
                    onChange={(e) => handleFilterChange('completionStatus', e.target.value)}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="any">Any completion status</option>
                    <option value="complete">Fully completed</option>
                    <option value="partial">Partially completed</option>
                    <option value="abandoned">Abandoned (not completed)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex-1">
                <span className={`px-4 py-3 rounded-lg block text-center capitalize ${
                  filters.completionStatus === 'complete' ? 'bg-green-100 text-green-700' :
                  filters.completionStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                  filters.completionStatus === 'abandoned' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {filters.completionStatus === 'any' ? 'Any' : filters.completionStatus}
                </span>
              </div>
            </div>

            {/* NPS Category Filter (only for NPS surveys) */}
            {(filters.surveyType === 'nps' || filters.surveyId !== 'any' && getSelectedSurvey()?.type === 'nps') && (
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    NPS Category
                  </label>
                  <div className="relative">
                    <select
                      value={filters.npsCategory}
                      onChange={(e) => handleFilterChange('npsCategory', e.target.value)}
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="any">Any NPS category</option>
                      <option value="promoter">Promoters (9-10)</option>
                      <option value="passive">Passives (7-8)</option>
                      <option value="detractor">Detractors (0-6)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex-1">
                  <span className={`px-4 py-3 rounded-lg block text-center capitalize ${
                    filters.npsCategory === 'promoter' ? 'bg-green-100 text-green-700' :
                    filters.npsCategory === 'passive' ? 'bg-yellow-100 text-yellow-700' :
                    filters.npsCategory === 'detractor' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {filters.npsCategory === 'any' ? 'Any' : filters.npsCategory}
                  </span>
                </div>
              </div>
            )}

            {/* CSAT Rating Filter (only for CSAT surveys) */}
            {(filters.surveyType === 'csat' || filters.surveyId !== 'any' && getSelectedSurvey()?.type === 'csat') && (
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CSAT Rating
                  </label>
                  <div className="relative">
                    <select
                      value={filters.csatRating}
                      onChange={(e) => handleFilterChange('csatRating', e.target.value)}
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="any">Any rating</option>
                      <option value="5">5 stars (Excellent)</option>
                      <option value="4">4 stars (Good)</option>
                      <option value="3">3 stars (Average)</option>
                      <option value="2">2 stars (Poor)</option>
                      <option value="1">1 star (Very Poor)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex-1">
                  <span className={`px-4 py-3 rounded-lg block text-center flex items-center justify-center ${
                    filters.csatRating === '5' ? 'bg-green-100 text-green-700' :
                    filters.csatRating === '4' ? 'bg-blue-100 text-blue-700' :
                    filters.csatRating === '3' ? 'bg-yellow-100 text-yellow-700' :
                    filters.csatRating === '2' ? 'bg-orange-100 text-orange-700' :
                    filters.csatRating === '1' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {filters.csatRating !== 'any' && (
                      <div className="flex items-center">
                        {Array.from({ length: parseInt(filters.csatRating) }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-current mr-1" />
                        ))}
                      </div>
                    )}
                    {filters.csatRating === 'any' ? 'Any rating' : `${filters.csatRating} stars`}
                  </span>
                </div>
              </div>
            )}

            {/* Response Score Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Response score
                  </label>
                  <div className="relative">
                    <select
                      value={filters.responseScore}
                      onChange={(e) => handleFilterChange('responseScore', e.target.value)}
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="any">Any score</option>
                      <option value="high">High scores</option>
                      <option value="medium">Medium scores</option>
                      <option value="low">Low scores</option>
                      <option value="custom_range">Custom range</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex-1">
                  <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
                    {filters.responseScore === 'any' ? 'Any' : 
                     filters.responseScore === 'custom_range' ? 'Custom' : 
                     filters.responseScore}
                  </span>
                </div>
              </div>

              {filters.responseScore === 'custom_range' && (
                <div className="ml-0 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum score
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={filters.customScoreMin}
                      onChange={(e) => handleFilterChange('customScoreMin', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum score
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={filters.customScoreMax}
                      onChange={(e) => handleFilterChange('customScoreMax', parseInt(e.target.value) || 10)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Text Response Filter */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text responses
                </label>
                <div className="relative">
                  <select
                    value={filters.hasTextResponse}
                    onChange={(e) => handleFilterChange('hasTextResponse', e.target.value)}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="any">Any text response status</option>
                    <option value="with_text">With text responses</option>
                    <option value="without_text">Without text responses</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex-1">
                <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
                  {filters.hasTextResponse === 'any' ? 'Any' : 
                   filters.hasTextResponse === 'with_text' ? 'With text' :
                   filters.hasTextResponse === 'without_text' ? 'Without text' :
                   'Any'}
                </span>
              </div>
            </div>

            {/* Text Sentiment Filter (only when has text responses) */}
            {filters.hasTextResponse === 'with_text' && (
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text sentiment
                  </label>
                  <div className="relative">
                    <select
                      value={filters.textSentiment}
                      onChange={(e) => handleFilterChange('textSentiment', e.target.value)}
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="any">Any sentiment</option>
                      <option value="positive">Positive sentiment</option>
                      <option value="neutral">Neutral sentiment</option>
                      <option value="negative">Negative sentiment</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex-1">
                  <span className={`px-4 py-3 rounded-lg block text-center capitalize flex items-center justify-center ${
                    filters.textSentiment === 'positive' ? 'bg-green-100 text-green-700' :
                    filters.textSentiment === 'negative' ? 'bg-red-100 text-red-700' :
                    filters.textSentiment === 'neutral' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {filters.textSentiment === 'positive' && <ThumbsUp className="w-4 h-4 mr-2" />}
                    {filters.textSentiment === 'negative' && <ThumbsDown className="w-4 h-4 mr-2" />}
                    {filters.textSentiment === 'any' ? 'Any' : filters.textSentiment}
                  </span>
                </div>
              </div>
            )}

            {/* Response Time Filter */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Response time
                </label>
                <div className="relative">
                  <select
                    value={filters.responseTime}
                    onChange={(e) => handleFilterChange('responseTime', e.target.value)}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="any">Any response time</option>
                    <option value="fast">Fast (&lt; 2 minutes)</option>
                    <option value="medium">Medium (2-10 minutes)</option>
                    <option value="slow">Slow (&gt; 10 minutes)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex-1">
                <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
                  {filters.responseTime === 'any' ? 'Any' : filters.responseTime}
                </span>
              </div>
            </div>

            {/* Question Response Filters (only for specific survey) */}
            {filters.surveyId !== 'any' && getSelectedSurvey() && getSelectedSurvey()!.questions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Specific question responses
                  </label>
                  <button
                    type="button"
                    onClick={addQuestionResponseFilter}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add condition
                  </button>
                </div>

                {(filters.questionResponses || []).map((questionResponse: any) => (
                  <div key={questionResponse.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <select
                      value={questionResponse.questionId}
                      onChange={(e) => updateQuestionResponseFilter(questionResponse.id, { questionId: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {getSelectedSurvey()!.questions.map(question => (
                        <option key={question.id} value={question.id}>{question.text}</option>
                      ))}
                    </select>
                    
                    <select
                      value={questionResponse.operator}
                      onChange={(e) => updateQuestionResponseFilter(questionResponse.id, { operator: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="equals">equals</option>
                      <option value="not_equals">not equals</option>
                      <option value="contains">contains</option>
                      <option value="greater_than">greater than</option>
                      <option value="less_than">less than</option>
                      <option value="is_empty">is empty</option>
                      <option value="is_not_empty">is not empty</option>
                    </select>
                    
                    <input
                      type="text"
                      value={questionResponse.value}
                      onChange={(e) => updateQuestionResponseFilter(questionResponse.id, { value: e.target.value })}
                      placeholder="Value"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    
                    <button
                      type="button"
                      onClick={() => removeQuestionResponseFilter(questionResponse.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Additional Filters */}
            {additionalFilters.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Additional Filters</label>
                {additionalFilters.map((filter: any) => (
                  <div key={filter.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <select
                      value={filter.field}
                      onChange={(e) => updateAdditionalFilter(filter.id, { field: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="response.created_at">Response Date</option>
                      <option value="response.completion_time">Completion Time</option>
                      <option value="response.ip_address">IP Address</option>
                      <option value="response.user_agent">User Agent</option>
                      <option value="survey.name">Survey Name</option>
                      <option value="contact.name">Contact Name</option>
                      <option value="contact.email">Contact Email</option>
                    </select>
                    
                    <select
                      value={filter.operator}
                      onChange={(e) => updateAdditionalFilter(filter.id, { operator: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="equals">equals</option>
                      <option value="not_equals">not equals</option>
                      <option value="contains">contains</option>
                      <option value="starts_with">starts with</option>
                      <option value="ends_with">ends with</option>
                      <option value="greater_than">greater than</option>
                      <option value="less_than">less than</option>
                    </select>
                    
                    <input
                      type="text"
                      value={filter.value}
                      onChange={(e) => updateAdditionalFilter(filter.id, { value: e.target.value })}
                      placeholder="Value"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    
                    <button
                      type="button"
                      onClick={() => removeAdditionalFilter(filter.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add More Filters */}
            <button
              type="button"
              onClick={addAdditionalFilter}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
            >
              <Plus className="w-5 h-5 mr-1" />
              Add filters
            </button>
          </>
        )}
      </div>
    </div>
  )
}