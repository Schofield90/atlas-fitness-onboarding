'use client'

import { useState } from 'react'
import { Plus, Eye, Edit, Trash2, Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

interface LandingPage {
  id: string
  name: string
  description: string
  status: 'published' | 'draft'
  visits: number
  conversions: number
  createdAt: string
  url: string
}

const mockLandingPages: LandingPage[] = [
  {
    id: '1',
    name: 'Fitness Transformation Challenge',
    description: 'Landing page for our 30-day fitness challenge program',
    status: 'published',
    visits: 1250,
    conversions: 87,
    createdAt: '2024-01-15',
    url: '/landing/fitness-challenge'
  },
  {
    id: '2',
    name: 'Personal Training Consultation',
    description: 'Book a free consultation with our certified trainers',
    status: 'draft',
    visits: 0,
    conversions: 0,
    createdAt: '2024-01-20',
    url: '/landing/pt-consultation'
  }
]

export default function LandingPagesPage() {
  const [landingPages, setLandingPages] = useState<LandingPage[]>(mockLandingPages)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newPageName, setNewPageName] = useState('')
  const [newPageDescription, setNewPageDescription] = useState('')
  const router = useRouter()

  const handleCreatePage = () => {
    if (!newPageName.trim()) return
    
    const newPage: LandingPage = {
      id: Date.now().toString(),
      name: newPageName,
      description: newPageDescription,
      status: 'draft',
      visits: 0,
      conversions: 0,
      createdAt: new Date().toISOString().split('T')[0],
      url: `/landing/${newPageName.toLowerCase().replace(/\s+/g, '-')}`
    }
    
    setLandingPages([...landingPages, newPage])
    setNewPageName('')
    setNewPageDescription('')
    setShowCreateDialog(false)
    
    // Navigate to builder
    router.push(`/dashboard/landing-pages/builder/${newPage.id}`)
  }

  const handleEditPage = (id: string) => {
    router.push(`/dashboard/landing-pages/builder/${id}`)
  }

  const handleDeletePage = (id: string) => {
    setLandingPages(landingPages.filter(page => page.id !== id))
  }

  const handleDuplicatePage = (page: LandingPage) => {
    const duplicatedPage: LandingPage = {
      ...page,
      id: Date.now().toString(),
      name: `${page.name} (Copy)`,
      status: 'draft',
      visits: 0,
      conversions: 0,
      createdAt: new Date().toISOString().split('T')[0]
    }
    
    setLandingPages([...landingPages, duplicatedPage])
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Landing Pages</h1>
          <p className="text-gray-600 mt-1">
            Create and manage landing pages to drive conversions
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Landing Page
        </Button>
      </div>

      {landingPages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No landing pages yet</h3>
            <p className="text-gray-600 text-center mb-4">
              Create your first landing page to start capturing leads and driving conversions
            </p>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Landing Page
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {landingPages.map((page) => (
            <Card key={page.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{page.name}</h3>
                      <Badge className={getStatusColor(page.status)}>
                        {page.status}
                      </Badge>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{page.description}</p>
                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                      <span>{page.visits} visits</span>
                      <span>{page.conversions} conversions</span>
                      <span>Created {new Date(page.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {page.status === 'published' && (
                      <Button variant="ghost" size="sm" title="View Live">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" title="Preview">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEditPage(page.id)}
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDuplicatePage(page)}
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeletePage(page.id)}
                      className="text-red-600 hover:text-red-700"
                      title="Delete"
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

      {/* Create Landing Page Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Landing Page</DialogTitle>
            <DialogDescription>
              Create a new landing page to capture leads and drive conversions
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="page-name">Page Name</Label>
              <Input
                id="page-name"
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                placeholder="e.g., Fitness Challenge Sign-up"
              />
            </div>
            
            <div>
              <Label htmlFor="page-description">Description (Optional)</Label>
              <Input
                id="page-description"
                value={newPageDescription}
                onChange={(e) => setNewPageDescription(e.target.value)}
                placeholder="Brief description of the landing page purpose"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePage}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!newPageName.trim()}
            >
              Create & Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}