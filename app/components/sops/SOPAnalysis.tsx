'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/app/components/ui/Card'
import { Button } from '@/app/components/ui/Button'
import { Badge } from '@/app/components/ui/Badge'
import { SOPWithDetails, SOPAnalysisResult, SOPSearchResult } from '@/app/lib/types/sop'

interface SOPAnalysisProps {
  sop: SOPWithDetails
  onNavigateToSOP: (sopId: string) => void
}

export function SOPAnalysis({ sop, onNavigateToSOP }: SOPAnalysisProps) {
  const [analysis, setAnalysis] = useState<SOPAnalysisResult | null>(null)
  const [relatedSOPs, setRelatedSOPs] = useState<SOPSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)

  useEffect(() => {
    if (sop.ai_summary) {
      // If we have AI summary, create analysis object from existing data
      setAnalysis({
        summary: sop.ai_summary,
        key_points: [], // Would need to extract from content
        complexity_score: 5, // Default
        related_sops: sop.related_sops || [],
        suggested_tags: sop.tags || [],
        training_recommendations: {
          required: sop.training_required,
          difficulty: 'intermediate',
          estimated_time_minutes: 30
        }
      })
    }
    
    fetchRelatedSOPs()
  }, [sop.id])

  const fetchRelatedSOPs = async () => {
    try {
      const response = await fetch(`/api/sops/search?sopId=${sop.id}&limit=5`)
      if (response.ok) {
        const data = await response.json()
        setRelatedSOPs(data.similar_sops || [])
      }
    } catch (error) {
      console.error('Error fetching related SOPs:', error)
    }
  }

  const performAnalysis = async () => {
    setReanalyzing(true)
    try {
      const response = await fetch('/api/sops/analyze', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sopId: sop.id,
          updateEmbedding: true 
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAnalysis(data.analysis)
        
        // Refresh related SOPs
        await fetchRelatedSOPs()
      } else {
        throw new Error('Failed to analyze SOP')
      }
    } catch (error) {
      console.error('Error analyzing SOP:', error)
      alert('Failed to analyze SOP. Please try again.')
    } finally {
      setReanalyzing(false)
    }
  }

  const getComplexityColor = (score: number) => {
    if (score <= 3) return 'bg-green-100 text-green-800'
    if (score <= 6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getComplexityLabel = (score: number) => {
    if (score <= 3) return 'Simple'
    if (score <= 6) return 'Moderate'
    return 'Complex'
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!analysis && !sop.ai_summary) {
    return (
      <Card className="p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a9 9 0 117.072 0l-.548.547A3.374 3.374 0 0014.846 21H9.154a3.374 3.374 0 00-2.872-1.24l-.548-.547z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">AI Analysis Available</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Generate AI-powered insights for this SOP including complexity analysis, 
          key points extraction, and training recommendations.
        </p>
        <Button 
          onClick={performAnalysis}
          disabled={reanalyzing}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {reanalyzing ? 'Analyzing...' : 'Analyze with AI'}
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">AI Analysis</h3>
          <p className="text-gray-600 mt-1">
            AI-generated insights and recommendations for this SOP
          </p>
        </div>
        <Button 
          onClick={performAnalysis}
          disabled={reanalyzing}
          variant="outline"
          size="sm"
        >
          {reanalyzing ? 'Re-analyzing...' : 'Re-analyze'}
        </Button>
      </div>

      {/* Summary */}
      {analysis?.summary && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">Summary</h4>
          <p className="text-gray-700 leading-relaxed">
            {analysis.summary}
          </p>
        </Card>
      )}

      {/* Key Points */}
      {analysis?.key_points && analysis.key_points.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Key Points</h4>
          <ul className="space-y-2">
            {analysis.key_points.map((point, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mt-0.5">
                  {index + 1}
                </div>
                <span className="text-gray-700">{point}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Complexity Score */}
        {analysis?.complexity_score && (
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {analysis.complexity_score}/10
            </div>
            <Badge className={getComplexityColor(analysis.complexity_score)}>
              {getComplexityLabel(analysis.complexity_score)}
            </Badge>
            <p className="text-sm text-gray-600 mt-2">Complexity Score</p>
          </Card>
        )}

        {/* Training Difficulty */}
        {analysis?.training_recommendations && (
          <Card className="p-6 text-center">
            <div className="text-lg font-semibold text-gray-900 mb-2">
              <Badge className={getDifficultyColor(analysis.training_recommendations.difficulty)}>
                {analysis.training_recommendations.difficulty}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">Training Difficulty</p>
            {analysis.training_recommendations.estimated_time_minutes && (
              <p className="text-xs text-gray-500 mt-1">
                ~{analysis.training_recommendations.estimated_time_minutes} minutes
              </p>
            )}
          </Card>
        )}

        {/* Training Required */}
        <Card className="p-6 text-center">
          <div className="text-lg font-semibold mb-2">
            {sop.training_required || analysis?.training_recommendations?.required ? (
              <Badge className="bg-purple-100 text-purple-800">Required</Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-800">Optional</Badge>
            )}
          </div>
          <p className="text-sm text-gray-600">Training Status</p>
        </Card>
      </div>

      {/* Suggested Tags */}
      {analysis?.suggested_tags && analysis.suggested_tags.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Suggested Tags</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.suggested_tags.map((tag, index) => (
              <Badge key={index} className="bg-blue-100 text-blue-800">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-3">
            These tags can help categorize and make this SOP more discoverable
          </p>
        </Card>
      )}

      {/* Related SOPs */}
      {relatedSOPs.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Related SOPs ({relatedSOPs.length})
          </h4>
          <div className="space-y-3">
            {relatedSOPs.map((result, index) => (
              <div
                key={result.sop.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => onNavigateToSOP(result.sop.id)}
              >
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-gray-900 truncate">
                    {result.sop.title}
                  </h5>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600">
                      {result.sop.category}
                    </span>
                    <Badge className="text-xs">
                      {Math.round(result.similarity_score * 100)}% similar
                    </Badge>
                  </div>
                </div>
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Training Recommendations */}
      {analysis?.training_recommendations && (
        <Card className="p-6 bg-purple-50 border-purple-200">
          <div className="flex items-center gap-2 mb-4">
            <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h4 className="text-lg font-semibold text-purple-900">
              Training Recommendations
            </h4>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-purple-800">Training Required:</span>
              <Badge className={analysis.training_recommendations.required ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}>
                {analysis.training_recommendations.required ? 'Yes' : 'No'}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-purple-800">Difficulty Level:</span>
              <Badge className={getDifficultyColor(analysis.training_recommendations.difficulty)}>
                {analysis.training_recommendations.difficulty}
              </Badge>
            </div>
            
            {analysis.training_recommendations.estimated_time_minutes && (
              <div className="flex justify-between items-center">
                <span className="text-purple-800">Estimated Time:</span>
                <span className="text-purple-700 font-medium">
                  {analysis.training_recommendations.estimated_time_minutes} minutes
                </span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}