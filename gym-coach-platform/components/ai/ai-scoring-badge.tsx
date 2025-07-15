import { Brain, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AIAnalysis } from '@/types/database'

interface AIScoringBadgeProps {
  score: number
  analysis?: AIAnalysis | null
  size?: 'sm' | 'md' | 'lg'
  showDetails?: boolean
  className?: string
}

export function AIScoringBadge({ 
  score, 
  analysis, 
  size = 'md', 
  showDetails = false, 
  className 
}: AIScoringBadgeProps) {
  const analysisData = analysis as any
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100 border-green-200'
    if (score >= 60) return 'text-blue-600 bg-blue-100 border-blue-200'
    if (score >= 40) return 'text-yellow-600 bg-yellow-100 border-yellow-200'
    if (score >= 20) return 'text-orange-600 bg-orange-100 border-orange-200'
    return 'text-red-600 bg-red-100 border-red-200'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    if (score >= 20) return 'Poor'
    return 'Very Poor'
  }

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-1'
      case 'lg':
        return 'text-base px-4 py-2'
      default:
        return 'text-sm px-3 py-1.5'
    }
  }

  const hasAIAnalysis = analysisData && Object.keys(analysisData).length > 0

  if (!showDetails) {
    return (
      <div className={cn(
        'inline-flex items-center rounded-full border font-medium',
        getScoreColor(score),
        getSizeClasses(size),
        className
      )}>
        {hasAIAnalysis && <Brain className="w-3 h-3 mr-1" />}
        {score}/100
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Score Badge */}
      <div className={cn(
        'inline-flex items-center rounded-full border font-medium',
        getScoreColor(score),
        getSizeClasses(size)
      )}>
        {hasAIAnalysis && <Brain className="w-3 h-3 mr-1" />}
        {score}/100
        <span className="ml-1 text-xs">({getScoreLabel(score)})</span>
      </div>

      {/* AI Analysis Details */}
      {hasAIAnalysis && analysisData && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">AI Analysis</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={cn(
                'text-xs px-2 py-1 rounded-full font-medium',
                analysisData.qualification === 'high' ? 'bg-green-100 text-green-700' :
                analysisData.qualification === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              )}>
                {analysisData.qualification.toUpperCase()}
              </span>
              <span className="text-xs text-gray-500">
                {analysisData.confidence}% confidence
              </span>
            </div>
          </div>

          {analysisData.next_best_action && (
            <div className="flex items-center space-x-2">
              <Zap className="w-3 h-3 text-orange-500" />
              <span className="text-xs text-gray-700">
                Next: {analysisData.next_best_action.replace(/_/g, ' ')}
              </span>
            </div>
          )}

          {analysisData.conversion_probability !== undefined && (
            <div className="text-xs text-gray-600">
              Conversion probability: {analysisData.conversion_probability}%
            </div>
          )}

          {analysisData.urgency && (
            <div className={cn(
              'text-xs px-2 py-1 rounded inline-block',
              analysisData.urgency === 'high' ? 'bg-red-100 text-red-700' :
              analysisData.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            )}>
              {analysisData.urgency.toUpperCase()} URGENCY
            </div>
          )}

          {analysisData.reasoning && (
            <div className="text-xs text-gray-600 italic">
              &ldquo;{analysisData.reasoning}&rdquo;
            </div>
          )}

          {analysisData.insights && analysisData.insights.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-700">Key Insights:</div>
              <ul className="space-y-0.5">
                {analysisData.insights.slice(0, 3).map((insight: string, index: number) => (
                  <li key={index} className="text-xs text-gray-600 flex items-start">
                    <span className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysisData.recommended_actions && analysisData.recommended_actions.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-700">Recommended Actions:</div>
              <ul className="space-y-0.5">
                {analysisData.recommended_actions.slice(0, 2).map((action: string, index: number) => (
                  <li key={index} className="text-xs text-blue-600 flex items-start">
                    <span className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysisData.recommended_timeline && (
            <div className="text-xs text-gray-500 text-right">
              Timeline: {analysisData.recommended_timeline}
            </div>
          )}
        </div>
      )}
    </div>
  )
}