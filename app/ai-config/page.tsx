'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import Button from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger } from './components'
import { MessageSquare, Brain, TestTube, BarChart3, Save, Plus, Trash2 } from 'lucide-react'

export default function AIConfigPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState('training')
  const [isLoading, setIsLoading] = useState(false)
  const [knowledge, setKnowledge] = useState<any[]>([])
  const [testMessages, setTestMessages] = useState<{role: string, content: string}[]>([])
  const [testInput, setTestInput] = useState('')

  // Load existing knowledge
  useEffect(() => {
    loadKnowledge()
  }, [])

  const loadKnowledge = async () => {
    const { data, error } = await supabase
      .from('knowledge')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setKnowledge(data)
    }
  }

  // Training interface
  const TrainingTab = () => {
    const [newKnowledge, setNewKnowledge] = useState({
      type: 'faq',
      content: '',
      metadata: {}
    })

    const addKnowledge = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('knowledge')
        .insert([newKnowledge])
        .select()

      if (data) {
        setKnowledge([...knowledge, ...data])
        setNewKnowledge({ type: 'faq', content: '', metadata: {} })
      }
      setIsLoading(false)
    }

    const deleteKnowledge = async (id: string) => {
      const { error } = await supabase
        .from('knowledge')
        .delete()
        .eq('id', id)

      if (!error) {
        setKnowledge(knowledge.filter(k => k.id !== id))
      }
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Add Training Data</CardTitle>
            <CardDescription>
              Teach your AI how to respond to specific topics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={newKnowledge.type}
                onChange={(e) => setNewKnowledge({...newKnowledge, type: e.target.value})}
                className="w-full p-2 border rounded-lg"
              >
                <option value="faq">FAQ</option>
                <option value="sop">Standard Operating Procedure</option>
                <option value="pricing">Pricing</option>
                <option value="policies">Policies</option>
                <option value="services">Services</option>
                <option value="schedule">Schedule</option>
                <option value="style">Communication Style</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Content</label>
              <textarea
                value={newKnowledge.content}
                onChange={(e) => setNewKnowledge({...newKnowledge, content: e.target.value})}
                placeholder="Enter the knowledge content..."
                className="w-full p-2 border rounded-lg h-32"
              />
            </div>

            <Button 
              onClick={addKnowledge} 
              disabled={!newKnowledge.content || isLoading}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Knowledge
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Knowledge Base</CardTitle>
            <CardDescription>
              {knowledge.length} items in your knowledge base
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {knowledge.map((item) => (
                <div key={item.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded mb-1">
                      {item.type}
                    </span>
                    <p className="text-sm text-gray-700">{item.content}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteKnowledge(item.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Conversation Flow Builder
  const FlowBuilderTab = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Conversation Flows</CardTitle>
            <CardDescription>
              Define how your AI should guide conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border-2 border-dashed rounded-lg">
                <h4 className="font-medium mb-2">Lead Qualification Flow</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center">1</div>
                    <p>Ask about fitness goals</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center">2</div>
                    <p>Understand current fitness level</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center">3</div>
                    <p>Identify obstacles/concerns</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center">4</div>
                    <p>Offer trial booking</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border-2 border-dashed rounded-lg">
                <h4 className="font-medium mb-2">Objection Handling Flow</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center">1</div>
                    <p>Acknowledge concern</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center">2</div>
                    <p>Provide value proposition</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center">3</div>
                    <p>Share social proof</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center">4</div>
                    <p>Create urgency with offer</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Test Chat Interface
  const TestChatTab = () => {
    const sendTestMessage = async () => {
      if (!testInput.trim()) return

      // Add user message
      const userMessage = { role: 'user', content: testInput }
      setTestMessages([...testMessages, userMessage])
      setTestInput('')
      setIsLoading(true)

      // Get AI response
      try {
        const response = await fetch('/api/ai/test-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: testInput })
        })

        const data = await response.json()
        if (data.response) {
          setTestMessages(prev => [...prev, { role: 'assistant', content: data.response }])
        }
      } catch (error) {
        console.error('Test chat error:', error)
      }
      setIsLoading(false)
    }

    return (
      <div className="space-y-6">
        <Card className="h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle>Test Your AI</CardTitle>
            <CardDescription>
              Have a conversation with your AI to test its responses
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto mb-4 p-4 border rounded-lg bg-gray-50">
              {testMessages.length === 0 ? (
                <p className="text-center text-gray-500">Start a conversation to test your AI...</p>
              ) : (
                <div className="space-y-4">
                  {testMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendTestMessage()}
                placeholder="Type a message..."
                className="flex-1 p-2 border rounded-lg"
                disabled={isLoading}
              />
              <Button onClick={sendTestMessage} disabled={isLoading}>
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Analytics Tab
  const AnalyticsTab = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Response Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">95%</p>
              <p className="text-sm text-gray-600">Successfully handled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Booking Conversions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">32%</p>
              <p className="text-sm text-gray-600">Leads booked trials</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Avg Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">1.2s</p>
              <p className="text-sm text-gray-600">Lightning fast</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Common Topics</CardTitle>
            <CardDescription>What people ask about most</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Pricing</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{width: '80%'}}></div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Class Schedule</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{width: '65%'}}></div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Trial Booking</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{width: '55%'}}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/dashboard')}
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">AI Configuration</h1>
        <p className="text-gray-600 mt-2">Train and customize your AI assistant</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="training" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Training
          </TabsTrigger>
          <TabsTrigger value="flows" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Flows
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            Test
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="training">
          <TrainingTab />
        </TabsContent>

        <TabsContent value="flows">
          <FlowBuilderTab />
        </TabsContent>

        <TabsContent value="test">
          <TestChatTab />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}