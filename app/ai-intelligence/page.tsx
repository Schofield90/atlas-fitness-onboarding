'use client';

import React, { useState, useEffect } from 'react';
import { 
  Brain, TrendingUp, Users, Target, MessageSquare, 
  BarChart3, PieChart, Activity, AlertCircle, 
  RefreshCw, Zap, Eye, Settings, ChevronRight 
} from 'lucide-react';
import DashboardLayout from '@/app/components/DashboardLayout';
import { createClient } from '@/app/lib/supabase/client';

interface AIInsights {
  lead_scoring: {
    total_leads: number;
    high_priority: number;
    conversion_predictions: number;
    recent_scores: any[];
  };
  churn_prediction: {
    at_risk_customers: number;
    medium_risk: number;
    low_risk: number;
    retention_recommendations: string[];
  };
  revenue_forecasting: {
    next_month_prediction: number;
    confidence: number;
    trend: 'up' | 'down' | 'stable';
    factors: string[];
  };
  customer_insights: {
    total_customers: number;
    most_active_segment: string;
    engagement_score: number;
    recommendations: string[];
  };
  operational_insights: {
    peak_hours: string;
    popular_classes: string[];
    staff_utilization: number;
    capacity_optimization: string[];
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

type TabType = 'overview' | 'insights' | 'chat' | 'settings';

export default function AIIntelligencePage() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiInsights, setAIInsights] = useState<AIInsights | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchOrganization();
  }, []);

  useEffect(() => {
    if (organizationId) {
      loadAIInsights();
    }
  }, [organizationId]);

  const fetchOrganization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (userOrg) {
        setOrganizationId(userOrg.organization_id);
      } else {
        setError('No organization found');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching organization:', err);
      setError('Failed to get organization');
      setLoading(false);
    }
  };

  const loadAIInsights = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/ai/insights?organization_id=${organizationId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load AI insights');
      }

      const data = await response.json();
      setAIInsights(data.insights);
    } catch (error) {
      console.error('Error loading AI insights:', error);
      
      // Provide demo data as fallback
      const demoInsights: AIInsights = {
        lead_scoring: {
          total_leads: 47,
          high_priority: 12,
          conversion_predictions: 8,
          recent_scores: []
        },
        churn_prediction: {
          at_risk_customers: 5,
          medium_risk: 12,
          low_risk: 28,
          retention_recommendations: [
            'Send personalized check-in messages to at-risk members',
            'Offer discounted personal training sessions',
            'Create targeted retention email campaigns'
          ]
        },
        revenue_forecasting: {
          next_month_prediction: 8500,
          confidence: 0.83,
          trend: 'up',
          factors: [
            'Increased membership signups this month',
            'Strong retention in premium memberships',
            'New class offerings showing high demand'
          ]
        },
        customer_insights: {
          total_customers: 156,
          most_active_segment: 'Premium Members',
          engagement_score: 0.74,
          recommendations: [
            'Focus marketing on 25-35 age demographic',
            'Expand evening class schedules',
            'Consider launching nutrition coaching program'
          ]
        },
        operational_insights: {
          peak_hours: '6-8 PM',
          popular_classes: ['HIIT Training', 'Yoga Flow', 'Strength Training'],
          staff_utilization: 0.68,
          capacity_optimization: [
            'Add more equipment during peak hours',
            'Consider expanding facility space',
            'Optimize class scheduling for better distribution'
          ]
        }
      };
      
      setAIInsights(demoInsights);
      setError('AI insights temporarily unavailable. Showing sample data for demonstration.');
    } finally {
      setLoading(false);
    }
  };

  const refreshInsights = async () => {
    setRefreshing(true);
    try {
      // Trigger AI processing
      await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          organization_id: organizationId,
          refresh: true 
        })
      });

      // Reload insights
      await loadAIInsights();
    } catch (error) {
      console.error('Error refreshing insights:', error);
      setError('Failed to refresh insights');
    } finally {
      setRefreshing(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/ai/chatbot/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          message: chatInput,
          context: 'ai_dashboard'
        })
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString()
        };

        setChatMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userData={null}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading AI Intelligence...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userData={null}>
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-purple-600 to-orange-600 rounded-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">AI Intelligence</h1>
                <p className="text-gray-400 mt-1">Advanced analytics and automated insights for your gym</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={refreshInsights}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-yellow-300 font-medium mb-1">Demo Mode Active</div>
                  <div className="text-yellow-200 text-sm mb-3">{error}</div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setError(null);
                        loadAIInsights();
                      }}
                      className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-yellow-100 rounded text-sm transition-colors"
                    >
                      Retry Connection
                    </button>
                    <span className="text-yellow-300 text-sm">or continue exploring with demo data</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg mb-6">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart3 },
              { key: 'insights', label: 'AI Insights', icon: Eye },
              { key: 'chat', label: 'AI Assistant', icon: MessageSquare },
              { key: 'settings', label: 'Settings', icon: Settings }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as TabType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === key
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && aiInsights && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 rounded-lg p-6 border border-blue-700">
                  <div className="flex items-center gap-3 mb-2">
                    <Target className="w-5 h-5 text-blue-400" />
                    <span className="text-blue-400 text-sm font-medium">Lead Scoring</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {aiInsights.lead_scoring.high_priority}
                  </div>
                  <div className="text-blue-300 text-sm">High priority leads</div>
                </div>

                <div className="bg-gradient-to-r from-red-900/50 to-red-800/50 rounded-lg p-6 border border-red-700">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 text-sm font-medium">Churn Risk</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {aiInsights.churn_prediction.at_risk_customers}
                  </div>
                  <div className="text-red-300 text-sm">At-risk customers</div>
                </div>

                <div className="bg-gradient-to-r from-green-900/50 to-green-800/50 rounded-lg p-6 border border-green-700">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 text-sm font-medium">Revenue Forecast</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    £{(aiInsights.revenue_forecasting.next_month_prediction / 100).toFixed(0)}
                  </div>
                  <div className="text-green-300 text-sm">Next month prediction</div>
                </div>

                <div className="bg-gradient-to-r from-purple-900/50 to-purple-800/50 rounded-lg p-6 border border-purple-700">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    <span className="text-purple-400 text-sm font-medium">Engagement</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {Math.round(aiInsights.customer_insights.engagement_score * 100)}%
                  </div>
                  <div className="text-purple-300 text-sm">Customer engagement</div>
                </div>
              </div>

              {/* Insights Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Insights */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Revenue Intelligence
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Next Month Forecast</span>
                      <span className="text-white font-semibold">
                        £{(aiInsights.revenue_forecasting.next_month_prediction / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Confidence Level</span>
                      <span className="text-green-400 font-semibold">
                        {Math.round(aiInsights.revenue_forecasting.confidence * 100)}%
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-700">
                      <p className="text-gray-400 text-sm mb-2">Key Factors:</p>
                      <ul className="space-y-1">
                        {aiInsights.revenue_forecasting.factors.slice(0, 3).map((factor, index) => (
                          <li key={index} className="text-gray-300 text-sm flex items-center gap-2">
                            <div className="w-1 h-1 bg-orange-400 rounded-full" />
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Customer Insights */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    Customer Intelligence
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total Customers</span>
                      <span className="text-white font-semibold">
                        {aiInsights.customer_insights.total_customers}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Most Active Segment</span>
                      <span className="text-blue-400 font-semibold">
                        {aiInsights.customer_insights.most_active_segment}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-700">
                      <p className="text-gray-400 text-sm mb-2">AI Recommendations:</p>
                      <ul className="space-y-1">
                        {aiInsights.customer_insights.recommendations.slice(0, 3).map((rec, index) => (
                          <li key={index} className="text-gray-300 text-sm flex items-center gap-2">
                            <Zap className="w-3 h-3 text-orange-400" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Operational Insights */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-400" />
                    Operational Intelligence
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Peak Hours</span>
                      <span className="text-white font-semibold">
                        {aiInsights.operational_insights.peak_hours}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Staff Utilization</span>
                      <span className="text-purple-400 font-semibold">
                        {Math.round(aiInsights.operational_insights.staff_utilization * 100)}%
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-700">
                      <p className="text-gray-400 text-sm mb-2">Popular Classes:</p>
                      <ul className="space-y-1">
                        {aiInsights.operational_insights.popular_classes.slice(0, 3).map((cls, index) => (
                          <li key={index} className="text-gray-300 text-sm flex items-center gap-2">
                            <div className="w-1 h-1 bg-purple-400 rounded-full" />
                            {cls}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Churn Prevention */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    Churn Prevention
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-red-400 font-bold">{aiInsights.churn_prediction.at_risk_customers}</div>
                        <div className="text-xs text-gray-400">High Risk</div>
                      </div>
                      <div>
                        <div className="text-yellow-400 font-bold">{aiInsights.churn_prediction.medium_risk}</div>
                        <div className="text-xs text-gray-400">Medium Risk</div>
                      </div>
                      <div>
                        <div className="text-green-400 font-bold">{aiInsights.churn_prediction.low_risk}</div>
                        <div className="text-xs text-gray-400">Low Risk</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-700">
                      <p className="text-gray-400 text-sm mb-2">Retention Actions:</p>
                      <ul className="space-y-1">
                        {aiInsights.churn_prediction.retention_recommendations.slice(0, 3).map((rec, index) => (
                          <li key={index} className="text-gray-300 text-sm flex items-center gap-2">
                            <ChevronRight className="w-3 h-3 text-red-400" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 h-[600px] flex flex-col">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-orange-400" />
                  AI Assistant
                </h3>
                <p className="text-gray-400 text-sm">Ask questions about your gym's performance and get AI-powered insights</p>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Start a conversation with your AI assistant</p>
                    <p className="text-sm mt-1">Try asking: "What are my top performing classes?"</p>
                  </div>
                )}

                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700 text-gray-300 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-400"></div>
                        <span className="text-sm">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-700">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Ask about your gym's performance..."
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    disabled={chatLoading}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={chatLoading || !chatInput.trim()}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI Insights Tab */}
          {activeTab === 'insights' && aiInsights && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  Advanced AI Analysis
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Lead Scoring Deep Dive */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Lead Scoring Intelligence</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">High-Value Leads</span>
                        <span className="text-green-400 font-semibold">{aiInsights.lead_scoring.high_priority}</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div className="bg-green-400 h-2 rounded-full" style={{ width: `${(aiInsights.lead_scoring.high_priority / aiInsights.lead_scoring.total_leads) * 100}%` }}></div>
                      </div>
                      <p className="text-gray-300 text-sm">AI identifies {aiInsights.lead_scoring.conversion_predictions} leads with 85%+ conversion probability</p>
                    </div>
                  </div>
                  
                  {/* Churn Prevention Insights */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Churn Prevention AI</h4>
                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      <div>
                        <div className="text-red-400 font-bold text-lg">{aiInsights.churn_prediction.at_risk_customers}</div>
                        <div className="text-xs text-gray-400">High Risk</div>
                      </div>
                      <div>
                        <div className="text-yellow-400 font-bold text-lg">{aiInsights.churn_prediction.medium_risk}</div>
                        <div className="text-xs text-gray-400">Medium Risk</div>
                      </div>
                      <div>
                        <div className="text-green-400 font-bold text-lg">{aiInsights.churn_prediction.low_risk}</div>
                        <div className="text-xs text-gray-400">Stable</div>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm">AI suggests proactive outreach for {aiInsights.churn_prediction.at_risk_customers} members this week</p>
                  </div>
                </div>
                
                {/* AI Recommendations */}
                <div className="mt-6 bg-gradient-to-r from-purple-900/30 to-orange-900/30 rounded-lg p-4 border border-purple-700/30">
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-400" />
                    AI Action Recommendations
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-purple-300 font-medium mb-2">Revenue Growth</h5>
                      <ul className="space-y-1">
                        {aiInsights.revenue_forecasting.factors.slice(0, 2).map((factor, index) => (
                          <li key={index} className="text-gray-300 text-sm flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-orange-300 font-medium mb-2">Member Retention</h5>
                      <ul className="space-y-1">
                        {aiInsights.churn_prediction.retention_recommendations.slice(0, 2).map((rec, index) => (
                          <li key={index} className="text-gray-300 text-sm flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
              <div className="text-gray-400">
                <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">AI Settings</h3>
                <p className="mb-6">Configure AI processing preferences and data sources.</p>
                <div className="max-w-md mx-auto text-left bg-gray-700 rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Auto-refresh insights</span>
                      <div className="w-10 h-6 bg-orange-600 rounded-full p-1">
                        <div className="w-4 h-4 bg-white rounded-full transform translate-x-4 transition-transform"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Email notifications</span>
                      <div className="w-10 h-6 bg-gray-600 rounded-full p-1">
                        <div className="w-4 h-4 bg-white rounded-full transition-transform"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Advanced analytics</span>
                      <div className="w-10 h-6 bg-orange-600 rounded-full p-1">
                        <div className="w-4 h-4 bg-white rounded-full transform translate-x-4 transition-transform"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}