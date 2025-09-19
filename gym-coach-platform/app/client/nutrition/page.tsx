"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

interface Question {
  id: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'multiselect';
  question: string;
  options?: string[];
  required: boolean;
  category: string;
}

interface Response {
  questionId: string;
  value: string | string[];
}

interface NutritionProfile {
  responses: Response[];
  askedQuestions: string[];
  completeness: number;
  lastUpdated: string;
}

const INITIAL_QUESTIONS: Question[] = [
  {
    id: 'age',
    type: 'number',
    question: 'What is your age?',
    required: true,
    category: 'basic'
  },
  {
    id: 'weight',
    type: 'number',
    question: 'What is your current weight (kg)?',
    required: true,
    category: 'basic'
  },
  {
    id: 'height',
    type: 'number',
    question: 'What is your height (cm)?',
    required: true,
    category: 'basic'
  },
  {
    id: 'goal',
    type: 'select',
    question: 'What is your primary fitness goal?',
    options: ['Weight Loss', 'Muscle Gain', 'Maintain Weight', 'Athletic Performance', 'General Health'],
    required: true,
    category: 'basic'
  },
  {
    id: 'activity_level',
    type: 'select',
    question: 'How would you describe your activity level?',
    options: ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Extremely Active'],
    required: true,
    category: 'basic'
  }
];

export default function NutritionQuestionnaire() {
  const [profile, setProfile] = useState<NutritionProfile>({
    responses: [],
    askedQuestions: [],
    completeness: 0,
    lastUpdated: new Date().toISOString()
  });

  const [currentQuestions, setCurrentQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [responses, setResponses] = useState<Record<string, string | string[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; title: string; description: string } | null>(null);

  // Load existing profile on mount
  useEffect(() => {
    loadExistingProfile();
  }, []);

  // Auto-dismiss success messages after 5 seconds
  useEffect(() => {
    if (alertMessage && alertMessage.type === 'success') {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  // Calculate accuracy percentage based on answered questions vs total potential questions
  const calculateAccuracy = () => {
    const answeredQuestions = Object.keys(responses).length;

    // Define question categories and their weights for comprehensive nutrition planning
    const questionCategories = {
      basic: 5,        // Age, weight, height, goal, activity level
      dietary: 8,      // Food preferences, restrictions, eating patterns
      lifestyle: 6,    // Sleep, stress, work schedule, cooking habits
      health: 4,       // Medical conditions, medications, supplements
      preferences: 2   // Food likes/dislikes, meal timing preferences
    };

    const totalPotentialQuestions = Object.values(questionCategories).reduce((sum, count) => sum + count, 0);

    // Calculate weighted accuracy based on question importance
    let weightedScore = 0;
    let maxWeightedScore = 0;

    // Count basic questions (higher weight)
    const basicQuestions = ['age', 'weight', 'height', 'goal', 'activity_level'];
    const answeredBasic = basicQuestions.filter(q => responses[q]).length;
    weightedScore += (answeredBasic / basicQuestions.length) * 40; // 40% for basic info
    maxWeightedScore += 40;

    // Count additional questions (moderate weight)
    const additionalAnswered = Math.max(0, answeredQuestions - basicQuestions.length);
    const additionalPossible = totalPotentialQuestions - basicQuestions.length;
    if (additionalPossible > 0) {
      weightedScore += (additionalAnswered / additionalPossible) * 60; // 60% for additional info
      maxWeightedScore += 60;
    }

    const percentage = maxWeightedScore > 0 ? (weightedScore / maxWeightedScore) * 100 : 0;
    return Math.round(Math.min(percentage, 100));
  };

  const loadExistingProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/client/nutrition/profile');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const existingProfile = data.data.profile_data as NutritionProfile;
          setProfile(existingProfile);

          // Convert responses array to object for easier handling
          const responseObj: Record<string, string | string[]> = {};
          existingProfile.responses.forEach(r => {
            responseObj[r.questionId] = r.value;
          });
          setResponses(responseObj);

          // Filter out already asked questions
          const remainingQuestions = INITIAL_QUESTIONS.filter(
            q => !existingProfile.askedQuestions.includes(q.id)
          );
          setCurrentQuestions(remainingQuestions);
        }
      }
    } catch (error) {
      console.error('Failed to load nutrition profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (questionId: string, value: string | string[]) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const generateAdaptiveQuestions = async () => {
    try {
      setIsGeneratingQuestions(true);

      const contextData = {
        responses: Object.entries(responses).map(([questionId, value]) => ({
          questionId,
          value
        })),
        askedQuestions: [...profile.askedQuestions, ...currentQuestions.map(q => q.id)]
      };

      const response = await fetch('/api/client/nutrition/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contextData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      if (data.success && data.data.questions) {
        const newQuestions = data.data.questions as Question[];
        setCurrentQuestions(prev => [...prev, ...newQuestions]);

        setAlertMessage({
          type: 'success',
          title: 'New questions generated!',
          description: `Added ${newQuestions.length} personalized questions to improve your nutrition plan.`
        });
      }
    } catch (error) {
      console.error('Failed to generate adaptive questions:', error);
      setAlertMessage({
        type: 'error',
        title: 'Error',
        description: 'Failed to generate new questions. Please try again.'
      });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const saveResponses = async () => {
    try {
      setIsSaving(true);

      const responseArray = Object.entries(responses).map(([questionId, value]) => ({
        questionId,
        value
      }));

      const updatedProfile: NutritionProfile = {
        responses: responseArray,
        askedQuestions: [...profile.askedQuestions, ...currentQuestions.map(q => q.id)],
        completeness: calculateAccuracy(),
        lastUpdated: new Date().toISOString()
      };

      const response = await fetch('/api/client/nutrition/save-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profileData: updatedProfile }),
      });

      if (!response.ok) {
        throw new Error('Failed to save responses');
      }

      setProfile(updatedProfile);

      setAlertMessage({
        type: 'success',
        title: 'Responses saved!',
        description: 'Your nutrition profile has been updated successfully.'
      });
    } catch (error) {
      console.error('Failed to save responses:', error);
      setAlertMessage({
        type: 'error',
        title: 'Error',
        description: 'Failed to save your responses. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderQuestion = (question: Question) => {
    const value = responses[question.id] || '';

    switch (question.type) {
      case 'text':
        return (
          <Input
            id={question.id}
            value={value as string}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            required={question.required}
          />
        );

      case 'number':
        return (
          <Input
            id={question.id}
            type="number"
            value={value as string}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            required={question.required}
          />
        );

      case 'textarea':
        return (
          <Textarea
            id={question.id}
            value={value as string}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            required={question.required}
          />
        );

      case 'select':
        return (
          <Select
            value={value as string}
            onValueChange={(val) => handleInputChange(question.id, val)}
            required={question.required}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return null;
    }
  };

  const accuracy = calculateAccuracy();
  const answeredQuestions = Object.keys(responses).length;
  const hasUnansweredQuestions = currentQuestions.some(q => !responses[q.id] && q.required);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Nutrition Assessment</h1>
        <p className="text-muted-foreground">
          Help us create a personalized nutrition plan by answering these questions.
          Our AI will generate more specific questions based on your responses.
        </p>
      </div>

      {/* Alert Messages */}
      {alertMessage && (
        <Alert className={alertMessage.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          {alertMessage.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          <AlertTitle className={alertMessage.type === 'error' ? 'text-red-800' : 'text-green-800'}>
            {alertMessage.title}
          </AlertTitle>
          <AlertDescription className={alertMessage.type === 'error' ? 'text-red-700' : 'text-green-700'}>
            {alertMessage.description}
          </AlertDescription>
        </Alert>
      )}

      {/* Accuracy Display */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Profile Accuracy</h3>
              <p className="text-sm text-muted-foreground">
                {answeredQuestions} questions answered
              </p>
            </div>
            <Badge variant={accuracy >= 80 ? "default" : accuracy >= 50 ? "secondary" : "outline"}>
              {accuracy}% Complete
            </Badge>
          </div>
          <Progress value={accuracy} className="mb-4" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {accuracy >= 80 ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-orange-500" />
            )}
            {accuracy >= 80
              ? "Great! Your profile is comprehensive enough for a detailed nutrition plan."
              : "Answer more questions to get a more accurate and personalized nutrition plan."
            }
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      {currentQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Questionnaire</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentQuestions.map((question) => (
              <div key={question.id} className="space-y-2">
                <Label htmlFor={question.id} className="text-base">
                  {question.question}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {renderQuestion(question)}
              </div>
            ))}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={saveResponses}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Responses'
                )}
              </Button>

              <Button
                variant="outline"
                onClick={generateAdaptiveQuestions}
                disabled={isGeneratingQuestions || hasUnansweredQuestions}
                className="flex items-center gap-2"
              >
                {isGeneratingQuestions ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Make Plan More Accurate
                  </>
                )}
              </Button>
            </div>

            {hasUnansweredQuestions && (
              <p className="text-sm text-muted-foreground">
                Please answer all required questions before generating new ones.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {answeredQuestions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Responses Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {Object.entries(responses).map(([questionId, value]) => {
                const question = [...INITIAL_QUESTIONS, ...currentQuestions].find(q => q.id === questionId);
                if (!question) return null;

                return (
                  <div key={questionId} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">{question.question}</span>
                    <span className="text-muted-foreground">
                      {Array.isArray(value) ? value.join(', ') : value}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}