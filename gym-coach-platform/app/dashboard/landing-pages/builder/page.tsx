'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Eye, Save, Settings, Smartphone, Monitor, Tablet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface PageElement {
  id: string
  type: 'header' | 'hero' | 'form' | 'text' | 'image' | 'cta'
  content: any
  styles: any
}

export default function LandingPageBuilderPage() {
  const router = useRouter()
  const [elements, setElements] = useState<PageElement[]>([])
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')

  const addElement = (type: PageElement['type']) => {
    const newElement: PageElement = {
      id: Date.now().toString(),
      type,
      content: getDefaultContent(type),
      styles: getDefaultStyles(type)
    }
    
    setElements([...elements, newElement])
    setSelectedElement(newElement.id)
  }

  const getDefaultContent = (type: PageElement['type']) => {
    switch (type) {
      case 'header':
        return {
          title: 'Your Gym Name',
          logo: null,
          navigation: ['Home', 'About', 'Services', 'Contact']
        }
      case 'hero':
        return {
          title: 'Transform Your Body, Transform Your Life',
          subtitle: 'Join thousands who have achieved their fitness goals with our proven programs',
          ctaText: 'Start Your Journey',
          backgroundImage: null
        }
      case 'form':
        return {
          title: 'Get Started Today',
          fields: [
            { name: 'name', label: 'Full Name', type: 'text', required: true },
            { name: 'email', label: 'Email Address', type: 'email', required: true },
            { name: 'phone', label: 'Phone Number', type: 'tel', required: false }
          ],
          submitText: 'Sign Me Up'
        }
      case 'text':
        return {
          content: '<p>Add your content here...</p>'
        }
      case 'image':
        return {
          src: null,
          alt: 'Image description',
          caption: ''
        }
      case 'cta':
        return {
          title: 'Ready to Get Started?',
          subtitle: 'Join our community today',
          buttonText: 'Get Started Now',
          buttonLink: '#'
        }
      default:
        return {}
    }
  }

  const getDefaultStyles = (type: PageElement['type']) => {
    return {
      padding: '20px',
      margin: '0px',
      backgroundColor: '#ffffff',
      textAlign: 'left',
      fontSize: '16px',
      color: '#333333'
    }
  }

  const removeElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id))
    if (selectedElement === id) {
      setSelectedElement(null)
    }
  }

  const renderElement = (element: PageElement) => {
    const isSelected = selectedElement === element.id
    
    return (
      <div
        key={element.id}
        className={`relative border-2 ${isSelected ? 'border-blue-500' : 'border-gray-200'} rounded-lg p-4 mb-4 cursor-pointer hover:border-gray-300`}
        onClick={() => setSelectedElement(element.id)}
      >
        {renderElementContent(element)}
        {isSelected && (
          <div className="absolute top-2 right-2 flex space-x-1">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                removeElement(element.id)
              }}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        )}
      </div>
    )
  }

  const renderElementContent = (element: PageElement) => {
    switch (element.type) {
      case 'header':
        return (
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded">
            <div className="font-bold text-lg">{element.content.title}</div>
            <nav className="flex space-x-4">
              {element.content.navigation.map((item: string, index: number) => (
                <span key={index} className="text-sm text-gray-600">{item}</span>
              ))}
            </nav>
          </div>
        )
      case 'hero':
        return (
          <div className="bg-blue-600 text-white p-8 rounded text-center">
            <h1 className="text-3xl font-bold mb-4">{element.content.title}</h1>
            <p className="text-lg mb-6">{element.content.subtitle}</p>
            <Button className="bg-white text-blue-600 hover:bg-gray-100">
              {element.content.ctaText}
            </Button>
          </div>
        )
      case 'form':
        return (
          <div className="bg-gray-50 p-6 rounded">
            <h3 className="text-xl font-semibold mb-4">{element.content.title}</h3>
            <div className="space-y-4">
              {element.content.fields.map((field: any, index: number) => (
                <div key={index}>
                  <label className="block text-sm font-medium mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    className="w-full p-2 border rounded"
                    placeholder={field.label}
                    disabled
                  />
                </div>
              ))}
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                {element.content.submitText}
              </Button>
            </div>
          </div>
        )
      case 'text':
        return (
          <div 
            className="prose"
            dangerouslySetInnerHTML={{ __html: element.content.content }}
          />
        )
      case 'image':
        return (
          <div className="text-center">
            <div className="bg-gray-200 h-48 rounded flex items-center justify-center mb-2">
              <span className="text-gray-500">Image Placeholder</span>
            </div>
            {element.content.caption && (
              <p className="text-sm text-gray-600">{element.content.caption}</p>
            )}
          </div>
        )
      case 'cta':
        return (
          <div className="bg-blue-50 p-6 rounded text-center">
            <h3 className="text-xl font-semibold mb-2">{element.content.title}</h3>
            <p className="text-gray-600 mb-4">{element.content.subtitle}</p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              {element.content.buttonText}
            </Button>
          </div>
        )
      default:
        return <div>Unknown element type</div>
    }
  }

  const getViewportClass = () => {
    switch (viewMode) {
      case 'mobile':
        return 'max-w-sm'
      case 'tablet':
        return 'max-w-2xl'
      case 'desktop':
        return 'max-w-full'
      default:
        return 'max-w-full'
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/landing-pages')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Landing Pages
            </Button>
            <h1 className="text-xl font-semibold">Landing Page Builder</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Viewport Toggle */}
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('desktop')}
              >
                <Monitor className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'tablet' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('tablet')}
              >
                <Tablet className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('mobile')}
              >
                <Smartphone className="w-4 h-4" />
              </Button>
            </div>
            
            <Button variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r p-6">
          <Tabs defaultValue="elements" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="elements">Elements</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="elements" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">Add Elements</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => addElement('header')}
                  >
                    <Plus className="w-4 h-4 mb-1" />
                    <span className="text-xs">Add Header</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => addElement('hero')}
                  >
                    <Plus className="w-4 h-4 mb-1" />
                    <span className="text-xs">Hero Section</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => addElement('form')}
                  >
                    <Plus className="w-4 h-4 mb-1" />
                    <span className="text-xs">Form</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => addElement('text')}
                  >
                    <Plus className="w-4 h-4 mb-1" />
                    <span className="text-xs">Text</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => addElement('image')}
                  >
                    <Plus className="w-4 h-4 mb-1" />
                    <span className="text-xs">Image</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => addElement('cta')}
                  >
                    <Plus className="w-4 h-4 mb-1" />
                    <span className="text-xs">Call to Action</span>
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">Page Settings</h3>
                <p className="text-sm text-gray-600">
                  Select an element to edit its properties
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 p-6">
          <div className={`mx-auto bg-white rounded-lg shadow-sm ${getViewportClass()}`}>
            <div className="p-6">
              {elements.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Start building your landing page
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Add elements from the sidebar to create your landing page
                  </p>
                  <Button
                    onClick={() => addElement('header')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Header
                  </Button>
                </div>
              ) : (
                <div>
                  {elements.map(renderElement)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}