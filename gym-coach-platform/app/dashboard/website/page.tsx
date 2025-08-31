'use client'

import { useState } from 'react'
import { Plus, Eye, Edit, Code, Globe, Upload, Settings, Copy, ExternalLink, Palette, Layout, Type, Lock } from 'lucide-react'
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

interface Form {
  id: string
  name: string
  description: string
  type: 'contact' | 'lead' | 'survey' | 'booking' | 'custom'
  status: 'active' | 'inactive'
  submissions: number
  createdAt: string
  fields: FormField[]
  embedCode: string
}

interface FormField {
  id: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio'
  label: string
  required: boolean
  placeholder?: string
  options?: string[]
}

interface WebsiteSetting {
  key: string
  label: string
  value: string
  type: 'text' | 'textarea' | 'color' | 'select' | 'switch'
  options?: string[]
}

const mockForms: Form[] = [
  {
    id: '1',
    name: 'Contact Form',
    description: 'Main contact form for website visitors',
    type: 'contact',
    status: 'active',
    submissions: 45,
    createdAt: '2024-01-15',
    fields: [
      { id: '1', type: 'text', label: 'Full Name', required: true },
      { id: '2', type: 'email', label: 'Email Address', required: true },
      { id: '3', type: 'phone', label: 'Phone Number', required: false },
      { id: '4', type: 'textarea', label: 'Message', required: true }
    ],
    embedCode: '<iframe src="https://example.com/forms/1" width="100%" height="500"></iframe>'
  },
  {
    id: '2',
    name: 'Free Trial Form',
    description: 'Lead capture form for free trial offers',
    type: 'lead',
    status: 'active',
    submissions: 89,
    createdAt: '2024-01-10',
    fields: [
      { id: '1', type: 'text', label: 'First Name', required: true },
      { id: '2', type: 'email', label: 'Email', required: true },
      { id: '3', type: 'select', label: 'Fitness Goal', required: true, options: ['Weight Loss', 'Muscle Gain', 'General Fitness'] }
    ],
    embedCode: '<iframe src="https://example.com/forms/2" width="100%" height="400"></iframe>'
  },
  {
    id: '3',
    name: 'Class Booking Form',
    description: 'Allow visitors to book fitness classes',
    type: 'booking',
    status: 'inactive',
    submissions: 12,
    createdAt: '2024-01-20',
    fields: [
      { id: '1', type: 'text', label: 'Name', required: true },
      { id: '2', type: 'email', label: 'Email', required: true },
      { id: '3', type: 'select', label: 'Class Type', required: true, options: ['Yoga', 'HIIT', 'Strength Training'] }
    ],
    embedCode: '<iframe src="https://example.com/forms/3" width="100%" height="450"></iframe>'
  }
]

const mockWebsiteSettings: WebsiteSetting[] = [
  { key: 'gym_name', label: 'Gym Name', value: 'Atlas Fitness', type: 'text' },
  { key: 'tagline', label: 'Tagline', value: 'Transform Your Life', type: 'text' },
  { key: 'primary_color', label: 'Primary Color', value: '#3B82F6', type: 'color' },
  { key: 'description', label: 'Gym Description', value: 'Premium fitness facility with state-of-the-art equipment', type: 'textarea' },
  { key: 'phone', label: 'Phone Number', value: '(555) 123-4567', type: 'text' },
  { key: 'email', label: 'Contact Email', value: 'info@atlasfitness.com', type: 'text' },
  { key: 'address', label: 'Address', value: '123 Fitness Street, City, State 12345', type: 'text' },
  { key: 'booking_enabled', label: 'Online Booking', value: 'true', type: 'switch' }
]

export default function WebsitePage() {
  const [forms, setForms] = useState<Form[]>(mockForms)
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSetting[]>(mockWebsiteSettings)
  const [showFormBuilder, setShowFormBuilder] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showEmbedDialog, setShowEmbedDialog] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleCreateForm = () => {
    setSelectedForm(null)
    setShowFormBuilder(true)
  }

  const handleEditForm = (form: Form) => {
    setSelectedForm(form)
    setShowFormBuilder(true)
  }

  const handleDeleteForm = async (formId: string) => {
    if (confirm('Are you sure you want to delete this form?')) {
      setForms(forms.filter(f => f.id !== formId))
    }
  }

  const handleGetEmbedCode = (form: Form) => {
    setSelectedForm(form)
    setShowEmbedDialog(true)
  }

  const handleToggleFormStatus = (formId: string) => {
    setForms(forms.map(f => 
      f.id === formId 
        ? { ...f, status: f.status === 'active' ? 'inactive' : 'active' as 'active' | 'inactive' }
        : f
    ))
  }

  const handleFileUpload = () => {
    setShowUpgradeDialog(true)
  }

  const handlePaidFeature = () => {
    setShowUpgradeDialog(true)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // Would show a toast notification in real app
  }

  const getFormTypeColor = (type: Form['type']) => {
    switch (type) {
      case 'contact':
        return 'bg-blue-100 text-blue-800'
      case 'lead':
        return 'bg-green-100 text-green-800'
      case 'survey':
        return 'bg-purple-100 text-purple-800'
      case 'booking':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: Form['status']) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Website & Forms</h1>
          <p className="text-gray-600">Manage your website forms and settings</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowSettingsDialog(true)} variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Website Settings
          </Button>
          <Button onClick={handleCreateForm} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Form
          </Button>
        </div>
      </div>

      <Tabs defaultValue="forms" className="space-y-6">
        <TabsList>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="uploads">File Uploads</TabsTrigger>
          <TabsTrigger value="website">Website Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="forms" className="space-y-6">
          {forms.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Layout className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No forms yet</h3>
                <p className="text-gray-600 text-center mb-4">
                  Create your first form to start collecting information from website visitors
                </p>
                <Button onClick={handleCreateForm} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Form
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {forms.map((form) => (
                <Card key={form.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <Layout className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{form.name}</h3>
                          <p className="text-gray-600 text-sm mt-1">{form.description}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <Badge className={getFormTypeColor(form.type)}>
                              {form.type.charAt(0).toUpperCase() + form.type.slice(1)}
                            </Badge>
                            <Badge className={getStatusColor(form.status)}>
                              {form.status}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {form.submissions} submissions
                            </span>
                            <span className="text-sm text-gray-600">
                              {form.fields.length} fields
                            </span>
                            <span className="text-sm text-gray-600">
                              Created {new Date(form.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch 
                          checked={form.status === 'active'}
                          onCheckedChange={() => handleToggleFormStatus(form.id)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGetEmbedCode(form)}
                        >
                          <Code className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditForm(form)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteForm(form.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Layout className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="uploads" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>File Upload Management</CardTitle>
              <CardDescription>
                Manage images, documents, and other files for your website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Files</h3>
                <p className="text-gray-600 mb-4">
                  Drag and drop files here or click to browse
                </p>
                <Button onClick={handleFileUpload} className="bg-blue-600 hover:bg-blue-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Files
                </Button>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Recent Uploads</h4>
                <div className="text-center py-8 text-gray-600">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No files uploaded yet</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="website" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Website Preview</CardTitle>
              <CardDescription>
                Preview how your website will look with current settings
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Globe className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Website Preview</h3>
              <p className="text-gray-600 text-center mb-4">
                Website preview functionality requires a paid subscription
              </p>
              <Button onClick={handlePaidFeature} className="bg-blue-600 hover:bg-blue-700">
                <ExternalLink className="w-4 h-4 mr-2" />
                Upgrade to Preview
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Builder Dialog */}
      <Dialog open={showFormBuilder} onOpenChange={setShowFormBuilder}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedForm ? 'Edit Form' : 'Create New Form'}
            </DialogTitle>
            <DialogDescription>
              Build your form by adding and configuring fields
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="form-name">Form Name</Label>
                <Input
                  id="form-name"
                  placeholder="Enter form name"
                  defaultValue={selectedForm?.name}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="form-description">Description</Label>
                <Textarea
                  id="form-description"
                  placeholder="Brief description of the form"
                  defaultValue={selectedForm?.description}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="form-type">Form Type</Label>
                <Select defaultValue={selectedForm?.type || 'contact'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select form type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contact">Contact Form</SelectItem>
                    <SelectItem value="lead">Lead Capture</SelectItem>
                    <SelectItem value="survey">Survey</SelectItem>
                    <SelectItem value="booking">Booking Form</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Form Fields</Label>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Field
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {(selectedForm?.fields || []).map((field, index) => (
                    <div key={field.id} className="border border-gray-200 rounded p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{field.label}</p>
                          <p className="text-sm text-gray-600 capitalize">{field.type} field</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {field.required && (
                            <Badge variant="outline" className="text-xs">Required</Badge>
                          )}
                          <Button variant="ghost" size="sm">
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Preview</Label>
                <Card className="mt-2">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold mb-4">
                      {selectedForm?.name || 'Form Preview'}
                    </h3>
                    <div className="space-y-3">
                      {(selectedForm?.fields || [
                        { id: '1', type: 'text', label: 'Name', required: true },
                        { id: '2', type: 'email', label: 'Email', required: true },
                        { id: '3', type: 'textarea', label: 'Message', required: false }
                      ]).map((field) => (
                        <div key={field.id}>
                          <Label className="text-sm">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          {field.type === 'textarea' ? (
                            <Textarea placeholder={field.placeholder} className="mt-1" />
                          ) : field.type === 'select' ? (
                            <Select>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select an option" />
                              </SelectTrigger>
                              <SelectContent>
                                {(field.options || ['Option 1', 'Option 2']).map((option) => (
                                  <SelectItem key={option} value={option.toLowerCase().replace(' ', '-')}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input 
                              type={field.type} 
                              placeholder={field.placeholder} 
                              className="mt-1"
                            />
                          )}
                        </div>
                      ))}
                      <Button className="w-full mt-4">Submit</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormBuilder(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowFormBuilder(false)}>
              {selectedForm ? 'Update Form' : 'Create Form'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Website Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Website Settings</DialogTitle>
            <DialogDescription>
              Configure your gym's website appearance and information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid gap-4">
              {websiteSettings.map((setting) => (
                <div key={setting.key} className="grid gap-2">
                  <Label htmlFor={setting.key}>{setting.label}</Label>
                  {setting.type === 'text' && (
                    <Input
                      id={setting.key}
                      defaultValue={setting.value}
                    />
                  )}
                  {setting.type === 'textarea' && (
                    <Textarea
                      id={setting.key}
                      defaultValue={setting.value}
                    />
                  )}
                  {setting.type === 'color' && (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="color"
                        id={setting.key}
                        defaultValue={setting.value}
                        className="w-16 h-10"
                      />
                      <Input
                        defaultValue={setting.value}
                        className="flex-1"
                      />
                    </div>
                  )}
                  {setting.type === 'switch' && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={setting.key}
                        defaultChecked={setting.value === 'true'}
                      />
                      <Label htmlFor={setting.key} className="text-sm">
                        {setting.value === 'true' ? 'Enabled' : 'Disabled'}
                      </Label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowSettingsDialog(false)}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embed Code Dialog */}
      <Dialog open={showEmbedDialog} onOpenChange={setShowEmbedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed Code</DialogTitle>
            <DialogDescription>
              Copy this code to embed the form on your website
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Embed Code</Label>
                <div className="relative mt-2">
                  <Textarea
                    value={selectedForm?.embedCode || ''}
                    readOnly
                    className="pr-12 font-mono text-sm"
                    rows={3}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(selectedForm?.embedCode || '')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Direct Link</Label>
                <div className="relative mt-2">
                  <Input
                    value={`https://example.com/forms/${selectedForm?.id}`}
                    readOnly
                    className="pr-12"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1/2 right-2 transform -translate-y-1/2"
                    onClick={() => copyToClipboard(`https://example.com/forms/${selectedForm?.id}`)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowEmbedDialog(false)}>
              Close
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
              Upgrade to unlock advanced website features including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>File upload management</li>
              <li>Website preview and customization</li>
              <li>Advanced form builder</li>
              <li>Custom domain integration</li>
              <li>SEO optimization tools</li>
              <li>Analytics tracking</li>
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