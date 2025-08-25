'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/app/components/DashboardLayout'
import { 
  Zap, 
  Clock, 
  MessageSquare, 
  Calendar, 
  Target, 
  Users,
  TrendingUp,
  Heart,
  Mail,
  Phone,
  Star,
  ArrowRight
} from 'lucide-react'

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'lead-generation' | 'retention' | 'sales' | 'support' | 'marketing'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedSetupTime: number // in minutes
  features: string[]
  icon: React.ReactNode
  popular?: boolean
}

export default function WorkflowTemplatesPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])

  useEffect(() => {
    const storedData = localStorage.getItem('gymleadhub_trial_data')
    if (storedData) {
      setUserData(JSON.parse(storedData))
    }

    // Load templates
    setTemplates([
      {
        id: 'lead-welcome',
        name: 'New Lead Welcome Sequence',
        description: 'Automatically welcome new leads with personalized messages and schedule follow-ups to maximize conversion rates.',
        category: 'lead-generation',
        difficulty: 'beginner',
        estimatedSetupTime: 15,
        features: ['Instant welcome message', 'Follow-up sequence', 'Lead qualification', 'CRM integration'],
        icon: <MessageSquare className="h-6 w-6" />,
        popular: true
      },
      {
        id: 'trial-nurture',
        name: 'Free Trial Nurturing Campaign',
        description: 'Guide trial members through their journey with timely tips, check-ins, and conversion prompts.',
        category: 'retention',
        difficulty: 'intermediate',
        estimatedSetupTime: 25,
        features: ['Welcome onboarding', 'Progress tracking', 'Conversion reminders', 'Success stories'],
        icon: <TrendingUp className="h-6 w-6" />,
        popular: true
      },
      {
        id: 'appointment-reminders',
        name: 'Appointment Reminder System',
        description: 'Reduce no-shows with automated reminders sent via SMS and email before scheduled sessions.',
        category: 'support',
        difficulty: 'beginner',
        estimatedSetupTime: 10,
        features: ['24hr reminder', '1hr reminder', 'SMS & Email', 'Rescheduling links'],
        icon: <Calendar className="h-6 w-6" />
      },
      {
        id: 'membership-renewal',
        name: 'Membership Renewal Campaign',
        description: 'Automatically target members before renewal with personalized offers and retention incentives.',
        category: 'retention',
        difficulty: 'intermediate',
        estimatedSetupTime: 30,
        features: ['Renewal notifications', 'Personalized offers', 'Payment reminders', 'Win-back campaigns'],
        icon: <Heart className="h-6 w-6" />
      },
      {
        id: 'lead-qualification',
        name: 'AI Lead Qualification Bot',
        description: 'Qualify leads automatically with intelligent questions and route them to the right team members.',
        category: 'lead-generation',
        difficulty: 'advanced',
        estimatedSetupTime: 45,
        features: ['AI-powered questions', 'Lead scoring', 'Team routing', 'Priority flagging'],
        icon: <Target className="h-6 w-6" />,
        popular: true
      },
      {
        id: 'referral-program',
        name: 'Member Referral Program',
        description: 'Automate referral tracking, rewards distribution, and thank you messages to boost word-of-mouth.',
        category: 'marketing',
        difficulty: 'intermediate',
        estimatedSetupTime: 35,
        features: ['Referral tracking', 'Reward automation', 'Thank you messages', 'Progress updates'],
        icon: <Users className="h-6 w-6" />
      },
      {
        id: 'feedback-collection',
        name: 'Post-Workout Feedback System',
        description: 'Collect member feedback after sessions to improve services and identify satisfaction trends.',
        category: 'support',
        difficulty: 'beginner',
        estimatedSetupTime: 20,
        features: ['Automated surveys', 'Rating collection', 'Feedback analysis', 'Response alerts'],
        icon: <Star className="h-6 w-6" />
      },
      {
        id: 'birthday-campaign',
        name: 'Birthday & Anniversary Campaigns',
        description: 'Celebrate member milestones with personalized messages and special offers to boost loyalty.',
        category: 'marketing',
        difficulty: 'beginner',
        estimatedSetupTime: 15,
        features: ['Birthday greetings', 'Anniversary messages', 'Special offers', 'Milestone tracking'],
        icon: <Heart className="h-6 w-6" />
      },
      {
        id: 'class-booking',
        name: 'Class Booking Notifications',
        description: 'Notify members about available classes, waitlist updates, and booking confirmations.',
        category: 'support',
        difficulty: 'intermediate',
        estimatedSetupTime: 25,
        features: ['Class availability alerts', 'Waitlist notifications', 'Booking confirmations', 'Cancellation handling'],
        icon: <Calendar className="h-6 w-6" />
      }
    ])
  }, [])

  const categories = [
    { id: 'all', name: 'All Templates', count: templates.length },
    { id: 'lead-generation', name: 'Lead Generation', count: templates.filter(t => t.category === 'lead-generation').length },
    { id: 'retention', name: 'Member Retention', count: templates.filter(t => t.category === 'retention').length },
    { id: 'support', name: 'Member Support', count: templates.filter(t => t.category === 'support').length },
    { id: 'marketing', name: 'Marketing', count: templates.filter(t => t.category === 'marketing').length },
    { id: 'sales', name: 'Sales', count: templates.filter(t => t.category === 'sales').length }
  ]

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory)

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400 bg-green-400/10'
      case 'intermediate': return 'text-yellow-400 bg-yellow-400/10'
      case 'advanced': return 'text-red-400 bg-red-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'lead-generation': return <Target className="h-4 w-4" />
      case 'retention': return <Heart className="h-4 w-4" />
      case 'support': return <MessageSquare className="h-4 w-4" />
      case 'marketing': return <TrendingUp className="h-4 w-4" />
      case 'sales': return <Zap className="h-4 w-4" />
      default: return <Zap className="h-4 w-4" />
    }
  }

  const handleUseTemplate = (template: WorkflowTemplate) => {
    // In a real implementation, this would create a new workflow from the template
    alert(`Creating workflow from template: ${template.name}\n\nThis will open the workflow builder with pre-configured nodes and settings.`)
    router.push(`/automations/builder/new?template=${template.id}`)
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Restricted</h1>
          <p className="text-gray-300 mb-8">Please sign up to access workflow templates.</p>
          <button 
            onClick={() => router.push('/signup')}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Start Free Trial
          </button>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout userData={userData}>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Workflow Templates</h1>
              <p className="text-gray-300">Start with proven automation templates designed for gyms and fitness businesses</p>
            </div>
            <button 
              onClick={() => router.push('/automations/builder/new')}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
            >
              <Zap className="h-4 w-4" />
              Build from Scratch
            </button>
          </div>

          {/* Popular Templates Banner */}
          <div className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-orange-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-orange-400" />
              <span className="font-medium text-white">Popular Templates</span>
            </div>
            <p className="text-gray-300 text-sm">
              Get started faster with our most successful automation templates, used by hundreds of gyms worldwide.
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {category.id !== 'all' && getCategoryIcon(category.id)}
                <span>{category.name}</span>
                <span className="bg-gray-600 text-xs px-2 py-1 rounded-full">
                  {category.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
              {template.popular && (
                <div className="bg-orange-500 text-white text-xs font-medium px-3 py-1 rounded-t-lg">
                  Most Popular
                </div>
              )}
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-orange-500/20 p-3 rounded-lg">
                    {template.icon}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getDifficultyColor(template.difficulty)}`}>
                      {template.difficulty}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">{template.name}</h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-3">{template.description}</p>

                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    <Clock className="h-4 w-4" />
                    <span>{template.estimatedSetupTime} min setup</span>
                  </div>
                  
                  <div className="space-y-1">
                    {template.features.slice(0, 3).map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                        <span>{feature}</span>
                      </div>
                    ))}
                    {template.features.length > 3 && (
                      <div className="text-sm text-gray-500">
                        +{template.features.length - 3} more features
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Use Template
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => alert(`Template Preview: ${template.name}\n\nThis would show a detailed preview of the workflow structure, nodes, and configuration options.`)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Preview
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No templates found</h3>
            <p className="text-gray-400">Try selecting a different category or create a custom workflow.</p>
          </div>
        )}

        {/* Custom Template CTA */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 mt-8 text-center">
          <h3 className="text-xl font-semibold text-white mb-2">Need Something Custom?</h3>
          <p className="text-gray-400 mb-6">
            Can't find the perfect template? Create a custom workflow tailored to your specific business needs.
          </p>
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => router.push('/automations/builder/new')}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Build Custom Workflow
            </button>
            <button 
              onClick={() => alert('🤝 Custom Template Request\n\nOur team can help create custom templates for your specific needs.\n\nContact: support@atlasfitness.com')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Request Custom Template
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}