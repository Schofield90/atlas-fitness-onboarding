'use client'

import { useState } from 'react'
import { Plus, Eye, Edit, Copy, Trash2, Search, Filter, BookOpen, Clock, User, Tag, Star, Archive, CheckSquare, FileText, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface SOP {
  id: string
  title: string
  description: string
  category: string
  tags: string[]
  status: 'active' | 'draft' | 'archived'
  createdBy: string
  createdAt: string
  lastUpdated: string
  version: string
  steps: SOPStep[]
  estimatedTime: number
  difficulty: 'easy' | 'medium' | 'hard'
  views: number
}

interface SOPStep {
  id: string
  title: string
  description: string
  order: number
  required: boolean
  estimatedTime?: number
  attachments?: string[]
}

const mockSOPs: SOP[] = [
  {
    id: '1',
    title: 'New Member Onboarding Process',
    description: 'Complete guide for onboarding new gym members',
    category: 'Member Management',
    tags: ['onboarding', 'members', 'orientation'],
    status: 'active',
    createdBy: 'John Smith',
    createdAt: '2024-01-10',
    lastUpdated: '2024-01-20',
    version: '2.1',
    estimatedTime: 45,
    difficulty: 'easy',
    views: 142,
    steps: [
      {
        id: '1',
        title: 'Welcome and Documentation',
        description: 'Greet the new member and collect required paperwork',
        order: 1,
        required: true,
        estimatedTime: 10
      },
      {
        id: '2',
        title: 'Facility Tour',
        description: 'Conduct comprehensive tour of all gym facilities',
        order: 2,
        required: true,
        estimatedTime: 15
      },
      {
        id: '3',
        title: 'Equipment Demonstration',
        description: 'Show how to use key equipment safely',
        order: 3,
        required: true,
        estimatedTime: 20
      }
    ]
  },
  {
    id: '2',
    title: 'Equipment Maintenance Checklist',
    description: 'Daily maintenance procedures for gym equipment',
    category: 'Maintenance',
    tags: ['maintenance', 'equipment', 'safety'],
    status: 'active',
    createdBy: 'Sarah Johnson',
    createdAt: '2024-01-05',
    lastUpdated: '2024-01-15',
    version: '1.3',
    estimatedTime: 30,
    difficulty: 'medium',
    views: 87,
    steps: [
      {
        id: '1',
        title: 'Visual Inspection',
        description: 'Check all equipment for visible damage or wear',
        order: 1,
        required: true,
        estimatedTime: 10
      },
      {
        id: '2',
        title: 'Cleaning and Sanitizing',
        description: 'Clean and sanitize all equipment surfaces',
        order: 2,
        required: true,
        estimatedTime: 15
      },
      {
        id: '3',
        title: 'Documentation',
        description: 'Log maintenance activities and any issues found',
        order: 3,
        required: true,
        estimatedTime: 5
      }
    ]
  },
  {
    id: '3',
    title: 'Emergency Response Protocol',
    description: 'Step-by-step guide for handling medical emergencies',
    category: 'Safety',
    tags: ['emergency', 'safety', 'medical'],
    status: 'active',
    createdBy: 'Mike Davis',
    createdAt: '2024-01-01',
    lastUpdated: '2024-01-18',
    version: '3.0',
    estimatedTime: 60,
    difficulty: 'hard',
    views: 203,
    steps: [
      {
        id: '1',
        title: 'Assess the Situation',
        description: 'Quickly evaluate the emergency and ensure scene safety',
        order: 1,
        required: true,
        estimatedTime: 2
      },
      {
        id: '2',
        title: 'Call for Help',
        description: 'Contact emergency services and gym management',
        order: 2,
        required: true,
        estimatedTime: 3
      },
      {
        id: '3',
        title: 'Provide First Aid',
        description: 'Administer appropriate first aid if trained',
        order: 3,
        required: true,
        estimatedTime: 15
      }
    ]
  },
  {
    id: '4',
    title: 'Class Schedule Management',
    description: 'How to manage and update fitness class schedules',
    category: 'Operations',
    tags: ['classes', 'scheduling', 'management'],
    status: 'draft',
    createdBy: 'Emily Wilson',
    createdAt: '2024-01-22',
    lastUpdated: '2024-01-22',
    version: '1.0',
    estimatedTime: 25,
    difficulty: 'easy',
    views: 15,
    steps: [
      {
        id: '1',
        title: 'Review Current Schedule',
        description: 'Analyze current class schedule and attendance patterns',
        order: 1,
        required: true,
        estimatedTime: 10
      },
      {
        id: '2',
        title: 'Update Schedule',
        description: 'Make necessary changes to optimize class offerings',
        order: 2,
        required: true,
        estimatedTime: 15
      }
    ]
  }
]

const categories = ['All', 'Member Management', 'Maintenance', 'Safety', 'Operations', 'Training']

export default function SOPsPage() {
  const [sops, setSOPs] = useState<SOP[]>(mockSOPs)
  const [showSOPForm, setShowSOPForm] = useState(false)
  const [showSOPDetail, setShowSOPDetail] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [selectedSOP, setSelectedSOP] = useState<SOP | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [isLoading, setIsLoading] = useState(false)

  const filteredSOPs = sops.filter(sop => {
    const matchesSearch = sop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sop.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sop.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === 'All' || sop.category === selectedCategory
    const matchesStatus = selectedStatus === 'all' || sop.status === selectedStatus
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  const handleCreateSOP = () => {
    setSelectedSOP(null)
    setShowSOPForm(true)
  }

  const handleEditSOP = (sop: SOP) => {
    setSelectedSOP(sop)
    setShowSOPForm(true)
  }

  const handleViewSOP = (sop: SOP) => {
    setSelectedSOP(sop)
    setShowSOPDetail(true)
    // Increment view count
    setSOPs(sops.map(s => s.id === sop.id ? { ...s, views: s.views + 1 } : s))
  }

  const handleDeleteSOP = async (sopId: string) => {
    if (confirm('Are you sure you want to delete this SOP?')) {
      setSOPs(sops.filter(s => s.id !== sopId))
    }
  }

  const handleDuplicateSOP = (sop: SOP) => {
    const newSOP: SOP = {
      ...sop,
      id: Date.now().toString(),
      title: `${sop.title} (Copy)`,
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0],
      version: '1.0',
      views: 0
    }
    setSOPs([newSOP, ...sops])
  }

  const handleArchiveSOP = (sopId: string) => {
    setSOPs(sops.map(s => 
      s.id === sopId 
        ? { ...s, status: s.status === 'archived' ? 'active' : 'archived' as 'active' | 'archived' }
        : s
    ))
  }

  const handlePaidFeature = () => {
    setShowUpgradeDialog(true)
  }

  const getStatusColor = (status: SOP['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'archived':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyColor = (difficulty: SOP['difficulty']) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'hard':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Standard Operating Procedures</h1>
          <p className="text-gray-600">Create and manage your gym's SOPs and processes</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleCreateSOP} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create SOP
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search SOPs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* SOPs Grid */}
      {filteredSOPs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm || selectedCategory !== 'All' || selectedStatus !== 'all' 
                ? 'No SOPs match your filters' 
                : 'No SOPs yet'
              }
            </h3>
            <p className="text-gray-600 text-center mb-4">
              {searchTerm || selectedCategory !== 'All' || selectedStatus !== 'all'
                ? 'Try adjusting your search terms or filters'
                : 'Create your first SOP to standardize your gym operations'
              }
            </p>
            {!searchTerm && selectedCategory === 'All' && selectedStatus === 'all' && (
              <Button onClick={handleCreateSOP} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create SOP
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSOPs.map((sop) => (
            <Card key={sop.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600" 
                          onClick={() => handleViewSOP(sop)}>
                        {sop.title}
                      </h3>
                      <Badge className={getStatusColor(sop.status)}>
                        {sop.status.charAt(0).toUpperCase() + sop.status.slice(1)}
                      </Badge>
                      <Badge className={getDifficultyColor(sop.difficulty)}>
                        {sop.difficulty.charAt(0).toUpperCase() + sop.difficulty.slice(1)}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{sop.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {sop.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{sop.createdBy}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{sop.estimatedTime} min</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span>{sop.views} views</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CheckSquare className="w-4 h-4" />
                        <span>{sop.steps.length} steps</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FileText className="w-4 h-4" />
                        <span>v{sop.version}</span>
                      </div>
                      <span>Updated {new Date(sop.lastUpdated).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewSOP(sop)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditSOP(sop)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicateSOP(sop)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleArchiveSOP(sop.id)}
                      className={sop.status === 'archived' ? 'text-green-600' : 'text-gray-600'}
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSOP(sop.id)}
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

      {/* SOP Form Dialog */}
      <Dialog open={showSOPForm} onOpenChange={setShowSOPForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSOP ? 'Edit SOP' : 'Create New SOP'}
            </DialogTitle>
            <DialogDescription>
              {selectedSOP ? 'Update your SOP details and steps' : 'Create a new standard operating procedure'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sop-title">Title</Label>
                <Input
                  id="sop-title"
                  placeholder="Enter SOP title"
                  defaultValue={selectedSOP?.title}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="sop-category">Category</Label>
                <Select defaultValue={selectedSOP?.category}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c !== 'All').map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sop-description">Description</Label>
              <Textarea
                id="sop-description"
                placeholder="Brief description of the SOP"
                defaultValue={selectedSOP?.description}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sop-difficulty">Difficulty</Label>
                <Select defaultValue={selectedSOP?.difficulty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="sop-time">Est. Time (minutes)</Label>
                <Input
                  id="sop-time"
                  type="number"
                  placeholder="30"
                  defaultValue={selectedSOP?.estimatedTime}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="sop-status">Status</Label>
                <Select defaultValue={selectedSOP?.status || 'draft'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sop-tags">Tags</Label>
              <Input
                id="sop-tags"
                placeholder="Enter tags separated by commas"
                defaultValue={selectedSOP?.tags.join(', ')}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>SOP Steps</Label>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Step
                </Button>
              </div>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {(selectedSOP?.steps || []).map((step, index) => (
                  <Card key={step.id} className="p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium">Step {index + 1}: {step.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                        {step.estimatedTime && (
                          <p className="text-xs text-gray-500 mt-1">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {step.estimatedTime} min
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {step.required && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                        <Button variant="ghost" size="sm">
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSOPForm(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowSOPForm(false)}>
              {selectedSOP ? 'Update SOP' : 'Create SOP'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SOP Detail Dialog */}
      <Dialog open={showSOPDetail} onOpenChange={setShowSOPDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <span>{selectedSOP?.title}</span>
              <Badge className={selectedSOP ? getStatusColor(selectedSOP.status) : ''}>
                {selectedSOP?.status.charAt(0).toUpperCase() + selectedSOP?.status.slice(1)}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {selectedSOP?.description}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSOP && (
            <div className="py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedSOP.estimatedTime}</div>
                  <div className="text-xs text-gray-600">Minutes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedSOP.steps.length}</div>
                  <div className="text-xs text-gray-600">Steps</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{selectedSOP.views}</div>
                  <div className="text-xs text-gray-600">Views</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">v{selectedSOP.version}</div>
                  <div className="text-xs text-gray-600">Version</div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">SOP Steps</h3>
                <div className="space-y-4">
                  {selectedSOP.steps.map((step, index) => (
                    <Card key={step.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-2">
                              {step.title}
                              {step.required && (
                                <Badge variant="outline" className="ml-2 text-xs">Required</Badge>
                              )}
                            </h4>
                            <p className="text-gray-700 mb-2">{step.description}</p>
                            {step.estimatedTime && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Clock className="w-4 h-4 mr-1" />
                                <span>Estimated time: {step.estimatedTime} minutes</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category:</span>
                      <span>{selectedSOP.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Difficulty:</span>
                      <Badge className={getDifficultyColor(selectedSOP.difficulty)}>
                        {selectedSOP.difficulty}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created by:</span>
                      <span>{selectedSOP.createdBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span>{new Date(selectedSOP.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last updated:</span>
                      <span>{new Date(selectedSOP.lastUpdated).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedSOP.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSOPDetail(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowSOPDetail(false)
              if (selectedSOP) handleEditSOP(selectedSOP)
            }}>
              Edit SOP
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
              Upgrade to unlock advanced SOP features including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Advanced SOP templates</li>
              <li>Version control and approval workflows</li>
              <li>Staff completion tracking</li>
              <li>Automated reminders and notifications</li>
              <li>Performance analytics</li>
              <li>Custom fields and attachments</li>
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