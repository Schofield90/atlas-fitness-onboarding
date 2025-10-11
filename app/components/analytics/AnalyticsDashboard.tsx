'use client';

import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, TrendingDown, ExternalLink, AlertCircle, CheckCircle2, Clock, Users, MousePointer } from 'lucide-react';

interface Analytics {
  sessions: number;
  avgDuration: number;
  scrollDepth: number;
  conversionRate: number;
  bounceRate: number;
}

interface AIIssue {
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  expectedImpact: string;
  priority: number;
}

interface AIInsights {
  issues: AIIssue[];
  summary: string;
  overallScore: number;
  priorityRecommendations: AIIssue[];
}

interface AnalyticsDashboardProps {
  pageId: string;
  pageName: string;
}

export function AnalyticsDashboard({ pageId, pageName }: AnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [clarityUrls, setClarityUrls] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [pageId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load analytics data
      const analyticsRes = await fetch(`/api/landing-pages/${pageId}/analytics`);
      if (!analyticsRes.ok) {
        const errorData = await analyticsRes.json();
        throw new Error(errorData.error || 'Failed to load analytics');
      }

      const analyticsData = await analyticsRes.json();

      // Load Clarity setup status
      const clarityRes = await fetch(`/api/landing-pages/${pageId}/clarity-setup`);
      if (clarityRes.ok) {
        const clarityData = await clarityRes.json();
        setClarityUrls(clarityData.data.clarityUrls);
      }

      // Get latest analytics
      if (analyticsData.data.analytics?.length > 0) {
        const latest = analyticsData.data.analytics[0];
        setAnalytics({
          sessions: latest.total_sessions,
          avgDuration: latest.avg_session_duration,
          scrollDepth: parseFloat(latest.scroll_depth_avg || 0),
          conversionRate: parseFloat(latest.conversion_rate || 0),
          bounceRate: parseFloat(latest.bounce_rate || 0),
        });
      }

      // Get latest insights
      if (analyticsData.data.latestInsights) {
        const insightsData = analyticsData.data.latestInsights;
        setInsights({
          issues: insightsData.issues || [],
          summary: insightsData.summary || '',
          overallScore: insightsData.overall_score || 0,
          priorityRecommendations: insightsData.priority_recommendations || [],
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      setError(null);

      const response = await fetch(`/api/landing-pages/${pageId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: 'fitness',
          pageType: 'landing',
          targetAction: 'sign-up',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze');
      }

      const data = await response.json();
      setInsights(data.data.insights);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error && error.includes('not enabled')) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900">Analytics Not Enabled</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Enable Microsoft Clarity tracking to start collecting analytics data.
            </p>
            <button className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
              Set Up Clarity
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{pageName}</h2>
          <p className="text-sm text-gray-500 mt-1">Analytics Dashboard</p>
        </div>
        <div className="flex gap-2">
          {clarityUrls && (
            <a
              href={clarityUrls.dashboard}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View in Clarity
            </a>
          )}
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !analytics}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {analyzing ? 'Analyzing...' : 'Analyze with AI'}
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            icon={<Users className="w-5 h-5" />}
            label="Total Sessions"
            value={analytics.sessions.toLocaleString()}
            trend={null}
          />
          <MetricCard
            icon={<MousePointer className="w-5 h-5" />}
            label="Scroll Depth"
            value={`${analytics.scrollDepth.toFixed(1)}%`}
            trend={analytics.scrollDepth >= 60 ? 'up' : 'down'}
            trendValue={`Target: 60%`}
          />
          <MetricCard
            icon={<Clock className="w-5 h-5" />}
            label="Avg Time"
            value={formatDuration(analytics.avgDuration)}
            trend={analytics.avgDuration >= 120 ? 'up' : 'down'}
            trendValue={`Target: 2m`}
          />
          <MetricCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Conversion"
            value={`${analytics.conversionRate.toFixed(2)}%`}
            trend={analytics.conversionRate >= 3 ? 'up' : 'down'}
            trendValue={`Target: 3-7%`}
          />
        </div>
      )}

      {/* AI Insights */}
      {insights && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">AI Insights</h3>
                <p className="text-sm text-gray-600">Powered by Claude Sonnet 4.5</p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${getScoreColor(insights.overallScore)}`}>
                {insights.overallScore}
              </div>
              <div className="text-sm text-gray-600">Health Score</div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-lg p-4 mb-4">
            <p className="text-gray-700">{insights.summary}</p>
          </div>

          {/* Priority Recommendations */}
          {insights.priorityRecommendations.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Top Priority Issues</h4>
              {insights.priorityRecommendations.map((issue, idx) => (
                <div
                  key={idx}
                  className={`bg-white rounded-lg p-4 border ${getSeverityColor(issue.severity)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs font-medium rounded">
                        {issue.severity.toUpperCase()}
                      </span>
                      <span className="font-medium text-gray-900">{issue.type.replace(/_/g, ' ').toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-medium text-green-600">{issue.expectedImpact}</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{issue.description}</p>
                  <div className="flex items-start gap-2 bg-blue-50 rounded p-3">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-900">{issue.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!analytics && !error && (
        <div className="text-center py-12 text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No analytics data available yet.</p>
          <p className="text-sm mt-2">Clarity will start collecting data within 2-3 hours of setup.</p>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: 'up' | 'down' | null;
  trendValue?: string;
}

function MetricCard({ icon, label, value, trend, trendValue }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-gray-600">{icon}</div>
        {trend && (
          <div className={`flex items-center gap-1 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
      {trendValue && <div className="text-xs text-gray-500 mt-1">{trendValue}</div>}
    </div>
  );
}
