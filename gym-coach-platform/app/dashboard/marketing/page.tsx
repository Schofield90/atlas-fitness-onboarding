'use client'

import { useState } from 'react'
import { Plus, Mail, MessageSquare, Eye, Edit, Trash2, Copy, Send, Calendar, Users, TrendingUp, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Campaign {
  id: string
  name: string
  type: 'email' | 'sms'
  status: 'draft' | 'scheduled' | 'sent' | 'active'
  recipients: number
  openRate?: number
  clickRate?: number
  createdAt: string
  scheduledFor?: string
  template: string
}

interface Template {
  id: string
  name: string
  type: 'email' | 'sms'
  subject?: string
  content: string
  isDefault: boolean
}

const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Welcome Series - New Members',
    type: 'email',
    status: 'active',
    recipients: 45,
    openRate: 68,
    clickRate: 12,
    createdAt: '2024-01-15',
    template: 'welcome-email'
  },
  {
    id: '2',
    name: 'Class Reminder SMS',
    type: 'sms',
    status: 'scheduled',
    recipients: 120,
    createdAt: '2024-01-20',
    scheduledFor: '2024-01-22T09:00:00',
    template: 'class-reminder'
  },
  {
    id: '3',
    name: 'Monthly Newsletter',
    type: 'email',
    status: 'draft',
    recipients: 0,
    createdAt: '2024-01-21',
    template: 'newsletter'
  }
]

const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'Welcome Email',
    type: 'email',
    subject: 'Welcome to {{gym_name}}!',
    content: 'Hi {{first_name}},\n\nWelcome to our fitness community! We\'re excited to have you on board.',
    isDefault: true
  },
  {
    id: '2',
    name: 'Class Reminder',
    type: 'sms',
    content: 'Hi {{first_name}}! Reminder: You have {{class_name}} tomorrow at {{class_time}}. See you there!',
    isDefault: true
  },
  {
    id: '3',
    name: 'Monthly Newsletter',
    type: 'email',
    subject: '{{gym_name}} - This Month\'s Updates',
    content: 'Hi {{first_name}},\n\nHere are this month\'s updates and fitness tips...',
    isDefault: false
  }
]

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns)
  const [templates, setTemplates] = useState<Template[]>(mockTemplates)
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateCampaign = () => {
    setSelectedCampaign(null)
    setShowCampaignForm(true)
  }

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setShowCampaignForm(true)
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      setCampaigns(campaigns.filter(c => c.id !== campaignId))
    }
  }

  const handleDuplicateCampaign = (campaign: Campaign) => {
    const newCampaign: Campaign = {
      ...campaign,
      id: Date.now().toString(),
      name: `${campaign.name} (Copy)`,
      status: 'draft',
      recipients: 0,
      openRate: undefined,
      clickRate: undefined,
      createdAt: new Date().toISOString().split('T')[0]
    }
    setCampaigns([newCampaign, ...campaigns])
  }

  const handleCreateTemplate = () => {
    setSelectedTemplate(null)
    setShowTemplateForm(true)
  }

  const handleEditTemplate = (template: Template) => {
    setSelectedTemplate(template)
    setShowTemplateForm(true)
  }

  const handlePaidFeature = () => {
    setShowUpgradeDialog(true)
  }

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'sent':
        return 'bg-gray-100 text-gray-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing & Campaigns</h1>
          <p className="text-gray-600">Create and manage your marketing campaigns and templates</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleCreateCampaign} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-6">
          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns yet</h3>
                <p className="text-gray-600 text-center mb-4">
                  Create your first marketing campaign to engage with your members
                </p>
                <Button onClick={handleCreateCampaign} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-lg bg-blue-100">
                          {campaign.type === 'email' ? (
                            <Mail className="w-5 h-5 text-blue-600" />
                          ) : (
                            <MessageSquare className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <Badge className={getStatusColor(campaign.status)}>
                              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {campaign.recipients} recipients
                            </span>
                            <span className="text-sm text-gray-600">
                              Created {new Date(campaign.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {campaign.openRate && (
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-sm text-gray-600">
                                Open Rate: {campaign.openRate}%
                              </span>
                              <span className="text-sm text-gray-600">
                                Click Rate: {campaign.clickRate}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCampaign(campaign)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicateCampaign(campaign)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        {campaign.status === 'draft' && (
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
                          onClick={() => handleDeleteCampaign(campaign.id)}
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

        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Email & SMS Templates</h2>
              <p className="text-gray-600">Manage your reusable campaign templates</p>
            </div>
            <Button onClick={handleCreateTemplate} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>

          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 rounded-lg bg-purple-100">
                        {template.type === 'email' ? (
                          <Mail className="w-5 h-5 text-purple-600" />
                        ) : (
                          <MessageSquare className="w-5 h-5 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">
                            {template.type.toUpperCase()}
                          </Badge>
                          {template.isDefault && (
                            <Badge className="bg-green-100 text-green-800">
                              Default
                            </Badge>
                          )}
                        </div>
                        {template.subject && (
                          <p className="text-sm text-gray-600 mt-1">
                            Subject: {template.subject}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {}}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">+2 from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">64%</div>
                <p className="text-xs text-muted-foreground">+5% from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,234</div>
                <p className="text-xs text-muted-foreground">+18% from last month</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>
                Detailed analytics require a paid subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lock className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Feature</h3>
              <p className="text-gray-600 text-center mb-4">
                Upgrade to access detailed campaign analytics and performance metrics
              </p>
              <Button onClick={handlePaidFeature} className="bg-blue-600 hover:bg-blue-700">
                Upgrade Now
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Campaign Form Dialog */}
      <Dialog open={showCampaignForm} onOpenChange={setShowCampaignForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCampaign ? 'Edit Campaign' : 'Create New Campaign'}
            </DialogTitle>
            <DialogDescription>
              Set up your marketing campaign details and content
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                placeholder="Enter campaign name"
                defaultValue={selectedCampaign?.name}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="campaign-type">Campaign Type</Label>
              <Select defaultValue={selectedCampaign?.type || 'email'}>
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="template">Template</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="recipients">Target Audience</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  <SelectItem value="new">New Members (Last 30 days)</SelectItem>
                  <SelectItem value="active">Active Members</SelectItem>
                  <SelectItem value="inactive">Inactive Members</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="schedule">Schedule</Label>
              <Select defaultValue="now">
                <SelectTrigger>
                  <SelectValue placeholder="When to send" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="now">Send Now</SelectItem>
                  <SelectItem value="scheduled">Schedule for Later</SelectItem>
                  <SelectItem value="draft">Save as Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCampaignForm(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowCampaignForm(false)}>
              {selectedCampaign ? 'Update Campaign' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Form Dialog */}
      <Dialog open={showTemplateForm} onOpenChange={setShowTemplateForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              Create reusable templates for your campaigns
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="Enter template name"
                defaultValue={selectedTemplate?.name}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="template-type">Type</Label>
              <Select defaultValue={selectedTemplate?.type || 'email'}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="template-subject">Subject Line (Email only)</Label>
              <Input
                id="template-subject"
                placeholder="Enter email subject"
                defaultValue={selectedTemplate?.subject}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="template-content">Content</Label>
              <Textarea
                id="template-content"
                placeholder="Enter your message content"
                className="min-h-[120px]"
                defaultValue={selectedTemplate?.content}
              />
              <p className="text-xs text-gray-600">
                Use variables like {'{{first_name}}'}, {'{{gym_name}}'}, {'{{class_name}}'} for personalization
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateForm(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowTemplateForm(false)}>
              {selectedTemplate ? 'Update Template' : 'Create Template'}
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
              Upgrade to unlock advanced marketing features including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Unlimited campaigns</li>
              <li>Advanced analytics and reporting</li>
              <li>A/B testing</li>
              <li>Automated campaign sequences</li>
              <li>Premium templates</li>
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