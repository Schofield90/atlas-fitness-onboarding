'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Bot,
  Save,
  Sparkles,
  Book,
  ArrowLeft,
  TestTube,
  Loader2,
} from 'lucide-react';

interface BaselineAgent {
  id?: string;
  name: string;
  description: string;
  system_prompt: string;
  model_provider: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  allowed_tools: string[];
  is_baseline?: boolean;
  is_template?: boolean;
}

interface TrainingFeedback {
  id: string;
  user_message: string;
  ai_response: string;
  preferred_response: string;
  feedback_category: string;
  created_at: string;
}

/**
 * Baseline Agent Editor
 * Super admin only - used to perfect the core lead nurturing agent
 * that serves as foundation for gym-specific agents
 */
export default function BaselineAgentEditorPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [agent, setAgent] = useState<BaselineAgent>({
    name: 'Lead Nurture Agent',
    description: 'Baseline agent for lead nurturing and conversion',
    system_prompt: '',
    model_provider: 'anthropic',
    model_name: 'claude-3-5-sonnet-20241022',
    temperature: 0.8,
    max_tokens: 2048,
    allowed_tools: [],
  });

  const [trainingData, setTrainingData] = useState<TrainingFeedback[]>([]);
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'training' | 'test'>('editor');

  // Check super admin access
  useEffect(() => {
    checkSuperAdminAccess();
  }, []);

  const checkSuperAdminAccess = async () => {
    try {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        router.push('/signin');
        return;
      }

      const isSuperAdmin =
        user.email === 'sam@gymleadhub.co.uk' ||
        user.email?.endsWith('@gymleadhub.co.uk') ||
        user.email?.endsWith('@atlas-gyms.co.uk');

      if (!isSuperAdmin) {
        router.push('/');
        return;
      }

      setUser(user);
      await Promise.all([fetchBaselineAgent(), fetchTrainingData()]);
    } catch (error) {
      console.error('Error checking super admin access:', error);
      router.push('/signin');
    } finally {
      setLoading(false);
    }
  };

  const fetchBaselineAgent = async () => {
    try {
      const response = await fetch('/api/admin/baseline-agent');
      if (!response.ok) throw new Error('Failed to fetch baseline agent');

      const { success, data } = await response.json();
      if (success && data.agent) {
        setAgent(data.agent);
      }
    } catch (error) {
      console.error('Error fetching baseline agent:', error);
    }
  };

  const fetchTrainingData = async () => {
    try {
      const response = await fetch('/api/admin/baseline-agent/training');
      if (!response.ok) throw new Error('Failed to fetch training data');

      const { success, data } = await response.json();
      if (success && data.feedbacks) {
        setTrainingData(data.feedbacks);
      }
    } catch (error) {
      console.error('Error fetching training data:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/baseline-agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agent),
      });

      if (!response.ok) throw new Error('Failed to save baseline agent');

      const { success, message } = await response.json();
      if (success) {
        alert(message || 'Baseline agent saved successfully!');
        await fetchBaselineAgent();
      }
    } catch (error) {
      console.error('Error saving baseline agent:', error);
      alert('Failed to save baseline agent');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testMessage.trim()) {
      alert('Please enter a test message');
      return;
    }

    setTesting(true);
    setTestResponse('');

    try {
      const response = await fetch('/api/admin/baseline-agent/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testMessage,
          agent_config: agent,
        }),
      });

      if (!response.ok) throw new Error('Test failed');

      const { success, data } = await response.json();
      if (success && data.message) {
        setTestResponse(data.message);
      }
    } catch (error) {
      console.error('Error testing agent:', error);
      setTestResponse('Error: Failed to test agent');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading baseline agent editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/ai-chat-agents')}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                  <Sparkles className="h-8 w-8 text-orange-500" />
                  Baseline Agent Editor
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Perfect the core lead nurturing agent that powers all gym-specific agents
                </p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Baseline
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'editor'
                  ? 'border-orange-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Bot className="h-4 w-4 inline mr-2" />
              Agent Configuration
            </button>
            <button
              onClick={() => setActiveTab('training')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'training'
                  ? 'border-orange-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Book className="h-4 w-4 inline mr-2" />
              Training Data ({trainingData.length})
            </button>
            <button
              onClick={() => setActiveTab('test')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'test'
                  ? 'border-orange-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <TestTube className="h-4 w-4 inline mr-2" />
              Test Agent
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'editor' && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={agent.name}
                    onChange={(e) => setAgent({ ...agent, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={agent.description}
                    onChange={(e) => setAgent({ ...agent, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* System Prompt */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">System Prompt</h2>
              <div className="mb-4 bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  💡 <strong>Tip:</strong> This prompt defines the agent's personality, behavior, and expertise.
                  Include conversation flow, objection handling, and tone guidelines.
                </p>
              </div>
              <textarea
                value={agent.system_prompt}
                onChange={(e) => setAgent({ ...agent, system_prompt: e.target.value })}
                rows={20}
                placeholder="Enter the system prompt that defines how the agent behaves..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
              />
            </div>

            {/* Model Configuration */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Model Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Provider
                  </label>
                  <select
                    value={agent.model_provider}
                    onChange={(e) => setAgent({ ...agent, model_provider: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="anthropic">Anthropic</option>
                    <option value="openai">OpenAI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Model
                  </label>
                  <select
                    value={agent.model_name}
                    onChange={(e) => setAgent({ ...agent, model_name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {agent.model_provider === 'anthropic' ? (
                      <>
                        <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                        <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                        <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                      </>
                    ) : (
                      <>
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4o-mini">GPT-4o Mini</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Temperature ({agent.temperature})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={agent.temperature}
                    onChange={(e) => setAgent({ ...agent, temperature: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Higher = more creative, Lower = more focused
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    value={agent.max_tokens}
                    onChange={(e) => setAgent({ ...agent, max_tokens: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'training' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Training Data</h2>
              <p className="text-gray-400 mb-6">
                Review feedback examples that can be used to improve the baseline agent's responses.
              </p>

              {trainingData.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Book className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                  <p>No training data available yet.</p>
                  <p className="text-sm mt-2">Training examples will appear here as feedback is collected.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {trainingData.map((feedback) => (
                    <div key={feedback.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-300 rounded">
                          {feedback.feedback_category}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(feedback.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-gray-400 font-medium mb-1">User Message:</p>
                          <p className="text-white">{feedback.user_message}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-medium mb-1">AI Response:</p>
                          <p className="text-red-300">{feedback.ai_response}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-medium mb-1">Preferred Response:</p>
                          <p className="text-green-300">{feedback.preferred_response}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'test' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Test Agent</h2>
              <p className="text-gray-400 mb-6">
                Send a test message to see how the baseline agent responds with current configuration.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Test Message
                  </label>
                  <textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    rows={4}
                    placeholder="Enter a message to test the agent (e.g., 'I'm interested in joining your gym')"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <button
                  onClick={handleTest}
                  disabled={testing || !testMessage.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"
                >
                  {testing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4" />
                      Test Agent
                    </>
                  )}
                </button>

                {testResponse && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Agent Response
                    </label>
                    <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                      <p className="text-white whitespace-pre-wrap">{testResponse}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
