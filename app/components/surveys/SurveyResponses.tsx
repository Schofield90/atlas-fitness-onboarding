'use client'

import { useState, useEffect } from 'react'
import { 
  UserIcon, CalendarIcon, ClockIcon, CheckCircleIcon,
  XCircleIcon, MessageSquareIcon, StarIcon, FilterIcon,
  DownloadIcon, ChevronRightIcon
} from 'lucide-react'

interface SurveyResponse {
  id: string
  respondentName: string
  respondentEmail: string
  submittedAt: string
  completionTime: string
  status: 'completed' | 'partial' | 'abandoned'
  score?: number
  answers: {
    question: string
    type: 'text' | 'rating' | 'multiple_choice' | 'checkbox'
    answer: string | number | string[]
  }[]
  sentiment?: 'positive' | 'neutral' | 'negative'
}

interface SurveyResponsesProps {
  surveyId?: string
  surveyName?: string
}

export default function SurveyResponses({ surveyId, surveyName = 'Customer Satisfaction Survey' }: SurveyResponsesProps) {
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null)
  const [filters, setFilters] = useState({
    status: 'all',
    sentiment: 'all',
    dateRange: '7d'
  })

  useEffect(() => {
    fetchResponses()
  }, [surveyId, filters])

  const fetchResponses = async () => {
    try {
      setLoading(true)
      // Use mock data for now
      setResponses(generateMockResponses())
      setLoading(false)
    } catch (error) {
      console.error('Error fetching responses:', error)
      setResponses(generateMockResponses())
      setLoading(false)
    }
  }

  const generateMockResponses = (): SurveyResponse[] => [
    {
      id: '1',
      respondentName: 'Alice Johnson',
      respondentEmail: 'alice@example.com',
      submittedAt: '2025-08-27T10:30:00',
      completionTime: '5m 23s',
      status: 'completed',
      score: 4.5,
      sentiment: 'positive',
      answers: [
        { question: 'Overall satisfaction', type: 'rating', answer: 5 },
        { question: 'How likely are you to recommend us?', type: 'rating', answer: 4 },
        { question: 'What did you like most?', type: 'text', answer: 'Great facilities and friendly staff' },
        { question: 'Areas for improvement', type: 'text', answer: 'More parking spaces would be helpful' },
        { question: 'Which services do you use?', type: 'checkbox', answer: ['Gym', 'Classes', 'Personal Training'] }
      ]
    },
    {
      id: '2',
      respondentName: 'Bob Smith',
      respondentEmail: 'bob@example.com',
      submittedAt: '2025-08-27T09:15:00',
      completionTime: '3m 45s',
      status: 'completed',
      score: 3.5,
      sentiment: 'neutral',
      answers: [
        { question: 'Overall satisfaction', type: 'rating', answer: 3 },
        { question: 'How likely are you to recommend us?', type: 'rating', answer: 4 },
        { question: 'What did you like most?', type: 'text', answer: 'Good equipment variety' },
        { question: 'Areas for improvement', type: 'text', answer: 'Equipment maintenance could be better' },
        { question: 'Which services do you use?', type: 'checkbox', answer: ['Gym'] }
      ]
    },
    {
      id: '3',
      respondentName: 'Carol Davis',
      respondentEmail: 'carol@example.com',
      submittedAt: '2025-08-26T16:20:00',
      completionTime: '7m 12s',
      status: 'completed',
      score: 5,
      sentiment: 'positive',
      answers: [
        { question: 'Overall satisfaction', type: 'rating', answer: 5 },
        { question: 'How likely are you to recommend us?', type: 'rating', answer: 5 },
        { question: 'What did you like most?', type: 'text', answer: 'Amazing personal trainers and results!' },
        { question: 'Areas for improvement', type: 'text', answer: 'Nothing, everything is perfect!' },
        { question: 'Which services do you use?', type: 'checkbox', answer: ['Personal Training', 'Nutrition'] }
      ]
    },
    {
      id: '4',
      respondentName: 'David Wilson',
      respondentEmail: 'david@example.com',
      submittedAt: '2025-08-26T14:00:00',
      completionTime: '2m 30s',
      status: 'partial',
      sentiment: 'negative',
      answers: [
        { question: 'Overall satisfaction', type: 'rating', answer: 2 },
        { question: 'How likely are you to recommend us?', type: 'rating', answer: 2 }
      ]
    }
  ]

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-500'
      case 'neutral': return 'text-yellow-500'
      case 'negative': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />
      case 'partial':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />
      case 'abandoned':
        return <XCircleIcon className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const exportResponses = () => {
    console.log('Exporting survey responses...')
    alert('Exporting survey responses to CSV')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  const filteredResponses = responses.filter(response => {
    if (filters.status !== 'all' && response.status !== filters.status) return false
    if (filters.sentiment !== 'all' && response.sentiment !== filters.sentiment) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Survey Responses</h2>
          <p className="text-gray-400 mt-1">{surveyName}</p>
        </div>
        <button
          onClick={exportResponses}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <DownloadIcon className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <FilterIcon className="h-5 w-5 text-gray-400" />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="bg-gray-700 text-white px-3 py-1 rounded"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="partial">Partial</option>
            <option value="abandoned">Abandoned</option>
          </select>
          <select
            value={filters.sentiment}
            onChange={(e) => setFilters({ ...filters, sentiment: e.target.value })}
            className="bg-gray-700 text-white px-3 py-1 rounded"
          >
            <option value="all">All Sentiment</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
            className="bg-gray-700 text-white px-3 py-1 rounded"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Responses Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response List */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Response List ({filteredResponses.length})
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredResponses.map((response) => (
              <button
                key={response.id}
                onClick={() => setSelectedResponse(response)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedResponse?.id === response.id
                    ? 'bg-gray-700 border-orange-500'
                    : 'bg-gray-750 border-gray-600 hover:bg-gray-700'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-white">{response.respondentName}</span>
                  </div>
                  {getStatusIcon(response.status)}
                </div>
                <div className="text-sm text-gray-400 space-y-1">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-3 w-3" />
                    {new Date(response.submittedAt).toLocaleString()}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-3 w-3" />
                      {response.completionTime}
                    </div>
                    {response.sentiment && (
                      <span className={`text-xs font-medium ${getSentimentColor(response.sentiment)}`}>
                        {response.sentiment}
                      </span>
                    )}
                  </div>
                </div>
                {response.score && (
                  <div className="flex items-center gap-1 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon
                        key={i}
                        className={`h-3 w-3 ${
                          i < Math.floor(response.score!)
                            ? 'text-yellow-500 fill-current'
                            : 'text-gray-600'
                        }`}
                      />
                    ))}
                    <span className="text-xs text-gray-400 ml-1">{response.score}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Response Details */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Response Details</h3>
          {selectedResponse ? (
            <div className="space-y-4">
              {/* Respondent Info */}
              <div className="border-b border-gray-700 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-white">{selectedResponse.respondentName}</p>
                    <p className="text-sm text-gray-400">{selectedResponse.respondentEmail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedResponse.status)}
                    <span className="text-sm text-gray-300">{selectedResponse.status}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  <p>Submitted: {new Date(selectedResponse.submittedAt).toLocaleString()}</p>
                  <p>Time taken: {selectedResponse.completionTime}</p>
                </div>
              </div>

              {/* Answers */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {selectedResponse.answers.map((answer, index) => (
                  <div key={index} className="border-b border-gray-700 pb-3">
                    <p className="text-sm font-medium text-gray-400 mb-1">{answer.question}</p>
                    {answer.type === 'rating' ? (
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <StarIcon
                            key={i}
                            className={`h-4 w-4 ${
                              i < (answer.answer as number)
                                ? 'text-yellow-500 fill-current'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                        <span className="text-white ml-2">{answer.answer}/5</span>
                      </div>
                    ) : answer.type === 'checkbox' ? (
                      <div className="flex flex-wrap gap-2">
                        {(answer.answer as string[]).map((item, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-700 rounded text-sm text-white">
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white">{answer.answer}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex-1">
                  Send Follow-up
                </button>
                <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex-1">
                  Add Note
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <MessageSquareIcon className="h-12 w-12 mx-auto mb-3 text-gray-600" />
              <p>Select a response to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}