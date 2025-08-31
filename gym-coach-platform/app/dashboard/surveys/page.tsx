'use client'

import { useState } from 'react'
import { Plus, Eye, Edit, Copy, Trash2, Send, BarChart3, Users, MessageSquare, CheckCircle, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'

interface Survey {
  id: string
  title: string
  description: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  responses: number
  totalQuestions: number
  createdAt: string
  completionRate: number
  type: 'satisfaction' | 'feedback' | 'onboarding' | 'custom'
}

interface Question {
  id: string
  type: 'multiple-choice' | 'text' | 'rating' | 'yes-no'
  question: string
  required: boolean
  options?: string[]
}

const mockSurveys: Survey[] = [
  {
    id: '1',
    title: 'New Member Onboarding Survey',
    description: 'Gather information about new member goals and preferences',
    status: 'active',
    responses: 23,
    totalQuestions: 8,
    createdAt: '2024-01-10',
    completionRate: 87,
    type: 'onboarding'
  },
  {
    id: '2',
    title: 'Monthly Satisfaction Survey',
    description: 'Monthly check-in with member satisfaction',
    status: 'active',
    responses: 156,
    totalQuestions: 5,
    createdAt: '2024-01-01',
    completionRate: 72,
    type: 'satisfaction'
  },
  {
    id: '3',
    title: 'Class Feedback Survey',
    description: 'Feedback on our group fitness classes',
    status: 'draft',
    responses: 0,
    totalQuestions: 6,
    createdAt: '2024-01-20',
    completionRate: 0,
    type: 'feedback'
  }
]

const mockResponses = [
  {
    id: '1',
    surveyId: '1',
    respondent: 'John D.',
    completedAt: '2024-01-22T10:30:00',
    responses: {
      'q1': 'Lose weight',
      'q2': '5',
      'q3': 'Morning',
      'q4': 'Cardio, Strength training'
    }
  },
  {
    id: '2',
    surveyId: '1',
    respondent: 'Sarah M.',
    completedAt: '2024-01-22T14:15:00',
    responses: {
      'q1': 'Build muscle',
      'q2': '4',
      'q3': 'Evening',
      'q4': 'Strength training, Yoga'
    }
  }
]

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>(mockSurveys)
  const [showSurveyForm, setShowSurveyForm] = useState(false)
  const [showSurveyWizard, setShowSurveyWizard] = useState(false)
  const [showResponseViewer, setShowResponseViewer] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null)
  const [wizardStep, setWizardStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateSurvey = () => {
    setSelectedSurvey(null)
    setShowSurveyWizard(true)
    setWizardStep(1)
  }

  const handleEditSurvey = (survey: Survey) => {
    if (survey.status !== 'draft') {
      setShowUpgradeDialog(true)
      return
    }
    setSelectedSurvey(survey)
    setShowSurveyForm(true)
  }

  const handleDuplicateSurvey = (survey: Survey) => {
    setShowUpgradeDialog(true)
  }

  const handleDeleteSurvey = async (surveyId: string) => {
    if (confirm('Are you sure you want to delete this survey? This action cannot be undone.')) {
      setSurveys(surveys.filter(s => s.id !== surveyId))
    }
  }

  const handleViewResponses = (survey: Survey) => {
    setSelectedSurvey(survey)
    setShowResponseViewer(true)
  }

  const handlePaidFeature = () => {
    setShowUpgradeDialog(true)
  }

  const getStatusColor = (status: Survey['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-gray-100 text-gray-800'
      case 'draft':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: Survey['type']) => {
    switch (type) {
      case 'satisfaction':
        return <BarChart3 className="w-5 h-5 text-blue-600" />
      case 'feedback':
        return <MessageSquare className="w-5 h-5 text-green-600" />
      case 'onboarding':
        return <Users className="w-5 h-5 text-purple-600" />
      default:
        return <CheckCircle className="w-5 h-5 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Surveys & Feedback</h1>
          <p className="text-gray-600">Create surveys to gather member feedback and insights</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleCreateSurvey} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Survey
          </Button>
        </div>
      </div>

      <Tabs defaultValue="surveys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="surveys">All Surveys</TabsTrigger>
          <TabsTrigger value="responses">Recent Responses</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="surveys" className="space-y-6">
          {surveys.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No surveys yet</h3>
                <p className="text-gray-600 text-center mb-4">
                  Create your first survey to start collecting feedback from your members
                </p>
                <Button onClick={handleCreateSurvey} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Survey
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {surveys.map((survey) => (
                <Card key={survey.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-lg bg-gray-50">
                          {getTypeIcon(survey.type)}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{survey.title}</h3>
                          <p className="text-gray-600 text-sm mt-1">{survey.description}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <Badge className={getStatusColor(survey.status)}>
                              {survey.status.charAt(0).toUpperCase() + survey.status.slice(1)}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {survey.responses} responses
                            </span>
                            <span className="text-sm text-gray-600">
                              {survey.totalQuestions} questions
                            </span>
                            <span className="text-sm text-gray-600">
                              {survey.completionRate}% completion rate
                            </span>
                            <span className="text-sm text-gray-600">
                              Created {new Date(survey.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewResponses(survey)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditSurvey(survey)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicateSurvey(survey)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        {survey.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handlePaidFeature}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSurvey(survey.id)}
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
        </TabsContent>

        <TabsContent value="responses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Survey Responses</CardTitle>
              <CardDescription>
                Latest feedback from your members
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mockResponses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No responses yet</h3>
                  <p className="text-gray-600 text-center">
                    Responses will appear here once members start completing your surveys
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {mockResponses.map((response) => (
                    <div key={response.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{response.respondent}</h4>
                          <p className="text-sm text-gray-600">
                            Survey: {surveys.find(s => s.id === response.surveyId)?.title}
                          </p>
                        </div>
                        <span className="text-sm text-gray-600">
                          {new Date(response.completedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(response.responses).map(([question, answer]) => (
                          <div key={question} className="text-sm">
                            <span className="text-gray-600">Response: </span>
                            <span className="text-gray-900">{answer}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Surveys</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{surveys.length}</div>
                <p className="text-xs text-muted-foreground">+2 this month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {surveys.reduce((total, survey) => total + survey.responses, 0)}
                </div>
                <p className="text-xs text-muted-foreground">+45 this week</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Completion Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(surveys.reduce((total, survey) => total + survey.completionRate, 0) / surveys.length)}%
                </div>
                <p className="text-xs text-muted-foreground">+3% from last month</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Analytics</CardTitle>
              <CardDescription>
                Advanced survey analytics require a paid subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lock className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Feature</h3>
              <p className="text-gray-600 text-center mb-4">
                Upgrade to access detailed survey analytics, response exports, and advanced reporting
              </p>
              <Button onClick={handlePaidFeature} className="bg-blue-600 hover:bg-blue-700">
                Upgrade Now
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Survey Creation Wizard */}
      <Dialog open={showSurveyWizard} onOpenChange={setShowSurveyWizard}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Survey - Step {wizardStep} of 3</DialogTitle>
            <DialogDescription>
              {wizardStep === 1 && "Set up your survey basics"}
              {wizardStep === 2 && "Add your survey questions"}
              {wizardStep === 3 && "Review and publish"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="survey-title">Survey Title</Label>
                  <Input
                    id="survey-title"
                    placeholder="Enter survey title"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="survey-description">Description</Label>
                  <Textarea
                    id="survey-description"
                    placeholder="Brief description of your survey"
                    className="min-h-[80px]"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="survey-type">Survey Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select survey type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="satisfaction">Member Satisfaction</SelectItem>
                      <SelectItem value="feedback">Feedback Collection</SelectItem>
                      <SelectItem value="onboarding">New Member Onboarding</SelectItem>
                      <SelectItem value="custom">Custom Survey</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Survey Questions</h3>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Question
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <Card className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <Label>Question 1</Label>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Input placeholder="Enter your question" />
                      <div className="flex items-center justify-between">
                        <Select defaultValue="multiple-choice">
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                            <SelectItem value="text">Text Response</SelectItem>
                            <SelectItem value="rating">Rating Scale</SelectItem>
                            <SelectItem value="yes-no">Yes/No</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center space-x-2">
                          <Switch id="required-1" />
                          <Label htmlFor="required-1" className="text-sm">Required</Label>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Review Your Survey</h3>
                <Card className="p-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-gray-600">Title</Label>
                      <p className="font-medium">Sample Survey Title</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Description</Label>
                      <p className="text-sm text-gray-700">Sample survey description</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Questions</Label>
                      <p className="text-sm text-gray-700">1 question configured</p>
                    </div>
                  </div>
                </Card>
                
                <div className="space-y-3">
                  <Label>Publishing Options</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="radio" id="save-draft" name="publish" value="draft" defaultChecked />
                      <Label htmlFor="save-draft">Save as Draft</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="radio" id="publish-now" name="publish" value="active" />
                      <Label htmlFor="publish-now">Publish Immediately</Label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {wizardStep > 1 && (
              <Button variant="outline" onClick={() => setWizardStep(wizardStep - 1)}>
                Previous
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowSurveyWizard(false)}>
              Cancel
            </Button>
            {wizardStep < 3 ? (
              <Button onClick={() => setWizardStep(wizardStep + 1)}>
                Next
              </Button>
            ) : (
              <Button onClick={() => setShowSurveyWizard(false)}>
                Create Survey
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Response Viewer */}
      <Dialog open={showResponseViewer} onOpenChange={setShowResponseViewer}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSurvey?.title} - Responses</DialogTitle>
            <DialogDescription>
              View and analyze survey responses
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{selectedSurvey?.responses || 0}</div>
                  <p className="text-sm text-gray-600">Total Responses</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{selectedSurvey?.completionRate || 0}%</div>
                  <p className="text-sm text-gray-600">Completion Rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{selectedSurvey?.totalQuestions || 0}</div>
                  <p className="text-sm text-gray-600">Questions</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {mockResponses.filter(r => r.surveyId === selectedSurvey?.id).map((response) => (
                <Card key={response.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold">{response.respondent}</h4>
                      <span className="text-sm text-gray-600">
                        {new Date(response.completedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(response.responses).map(([question, answer]) => (
                        <div key={question} className="border-l-4 border-blue-500 pl-3">
                          <p className="text-sm text-gray-600">Question {question.replace('q', '')}</p>
                          <p className="text-gray-900">{answer}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponseViewer(false)}>
              Close
            </Button>
            <Button onClick={handlePaidFeature}>
              Export Responses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Required</DialogTitle>
            <DialogDescription>
              This feature requires a paid subscription to access.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-600 mb-4">
              Upgrade to unlock advanced survey features including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Edit active surveys</li>
              <li>Duplicate surveys</li>
              <li>Advanced question types</li>
              <li>Response exports and analytics</li>
              <li>Automated survey distribution</li>
              <li>Custom branding</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Maybe Later
            </Button>
            <Button onClick={() => setShowUpgradeDialog(false)}>
              Upgrade Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}