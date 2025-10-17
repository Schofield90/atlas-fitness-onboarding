'use client';

import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Users, MousePointer, Clock, Target, AlertCircle, CheckCircle2, Zap, Activity } from 'lucide-react';

interface DashboardProps {
  pageId: string;
  pageName: string;
}

interface Metrics {
  totalSessions: number;
  uniqueVisitors: number;
  avgSessionDuration: number;
  avgScrollDepth: number;
  conversionRate: number;
  bounceRate: number;
  totalConversions: number;
  desktopSessions: number;
  mobileSessions: number;
  tabletSessions: number;
}

interface AnalysisIssue {
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  expectedImpact: string;
  priority: number;
  affectedElements?: string[];
}

interface AIAnalysis {
  issues: AnalysisIssue[];
  summary: string;
  overallScore: number;
  priorityRecommendations: AnalysisIssue[];
  behavioralInsights: Array<{
    pattern: string;
    description: string;
    userImpact: string;
    recommendation: string;
  }>;
  elementPerformance: Array<{
    selector: string;
    ctr: number;
    effectiveness: 'high' | 'medium' | 'low';
    recommendation: string;
  }>;
  segmentAnalysis: {
    desktop: { conversionRate: number; recommendation: string };
    mobile: { conversionRate: number; recommendation: string };
    tablet: { conversionRate: number; recommendation: string };
  };
}

export function LandingPageAnalyticsDashboard({ pageId, pageName }: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(7); // days

  useEffect(() => {
    loadMetrics();
    loadLatestAnalysis();
  }, [pageId, dateRange]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch aggregated metrics
      const response = await fetch(`/api/landing-pages/${pageId}/metrics?days=${dateRange}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load metrics');
      }

      const data = await response.json();
      setMetrics(data.data.metrics);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLatestAnalysis = async () => {
    try {
      const response = await fetch(`/api/landing-pages/${pageId}/ai-analyze`);

      if (response.ok) {
        const data = await response.json();
        if (data.data.insights && data.data.insights.length > 0) {
          const latest = data.data.insights[0];
          setAnalysis({
            issues: latest.issues || [],
            summary: latest.summary || '',
            overallScore: latest.overall_score || 0,
            priorityRecommendations: latest.priority_recommendations || [],
            behavioralInsights: latest.user_journey_insights || [],
            elementPerformance: latest.element_performance || [],
            segmentAnalysis: latest.segment_analysis || {},
          });
        }
      }
    } catch (err) {
      console.error('Failed to load analysis:', err);
    }
  };

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      setError(null);

      const response = await fetch(`/api/landing-pages/${pageId}/ai-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days: dateRange,
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
      setAnalysis(data.data.analysis);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
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

  const getEffectivenessColor = (effectiveness: string) => {
    switch (effectiveness) {
      case 'high':
        return 'text-green-600 bg-green-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
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
              Analytics tracking needs to be enabled for this landing page.
            </p>
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
        <div className="flex gap-2 items-center">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !metrics}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {analyzing ? 'Analyzing...' : 'Analyze with AI'}
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            icon={<Users className="w-5 h-5" />}
            label="Total Visitors"
            value={metrics.uniqueVisitors.toLocaleString()}
            subtitle={`${metrics.totalSessions.toLocaleString()} sessions`}
            trend={null}
          />
          <MetricCard
            icon={<Target className="w-5 h-5" />}
            label="Conversion Rate"
            value={`${metrics.conversionRate.toFixed(2)}%`}
            subtitle={`${metrics.totalConversions} conversions`}
            trend={metrics.conversionRate >= 3 ? 'up' : 'down'}
            trendValue={`Target: 3-7%`}
          />
          <MetricCard
            icon={<MousePointer className="w-5 h-5" />}
            label="Scroll Depth"
            value={`${metrics.avgScrollDepth.toFixed(1)}%`}
            trend={metrics.avgScrollDepth >= 60 ? 'up' : 'down'}
            trendValue={`Target: 60%+`}
          />
          <MetricCard
            icon={<Clock className="w-5 h-5" />}
            label="Avg Time"
            value={formatDuration(metrics.avgSessionDuration)}
            trend={metrics.avgSessionDuration >= 120 ? 'up' : 'down'}
            trendValue={`Target: 2m+`}
          />
        </div>
      )}

      {/* Device Breakdown */}
      {metrics && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Device Distribution</h3>
          <div className="grid grid-cols-3 gap-4">
            <DeviceCard
              device="Desktop"
              sessions={metrics.desktopSessions}
              percentage={(metrics.desktopSessions / metrics.totalSessions) * 100}
            />
            <DeviceCard
              device="Mobile"
              sessions={metrics.mobileSessions}
              percentage={(metrics.mobileSessions / metrics.totalSessions) * 100}
            />
            <DeviceCard
              device="Tablet"
              sessions={metrics.tabletSessions}
              percentage={(metrics.tabletSessions / metrics.totalSessions) * 100}
            />
          </div>
        </div>
      )}

      {/* AI Analysis Results */}
      {analysis && (
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
              <div className={`text-3xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                {analysis.overallScore}
              </div>
              <div className="text-sm text-gray-600">Health Score</div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-lg p-4 mb-4">
            <p className="text-gray-700">{analysis.summary}</p>
          </div>

          {/* Priority Recommendations */}
          {analysis.priorityRecommendations && analysis.priorityRecommendations.length > 0 && (
            <div className="space-y-3 mb-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-500" />
                Top Priority Issues
              </h4>
              {analysis.priorityRecommendations.map((issue, idx) => (
                <div
                  key={idx}
                  className={`bg-white rounded-lg p-4 border ${getSeverityColor(issue.severity)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs font-medium rounded uppercase">
                        {issue.severity}
                      </span>
                      <span className="font-medium text-gray-900">
                        {issue.type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-green-600">{issue.expectedImpact}</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{issue.description}</p>
                  <div className="flex items-start gap-2 bg-blue-50 rounded p-3">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-900">{issue.recommendation}</p>
                  </div>
                  {issue.affectedElements && issue.affectedElements.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      Affected: {issue.affectedElements.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Behavioral Insights */}
          {analysis.behavioralInsights && analysis.behavioralInsights.length > 0 && (
            <div className="space-y-3 mb-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-500" />
                User Behavior Patterns
              </h4>
              {analysis.behavioralInsights.map((insight, idx) => (
                <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="font-medium text-gray-900 mb-1">{insight.pattern}</div>
                  <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                  <div className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1 inline-block mb-2">
                    Impact: {insight.userImpact}
                  </div>
                  <p className="text-sm text-blue-900 bg-blue-50 rounded p-2">{insight.recommendation}</p>
                </div>
              ))}
            </div>
          )}

          {/* Element Performance */}
          {analysis.elementPerformance && analysis.elementPerformance.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Element Performance</h4>
              <div className="grid gap-2">
                {analysis.elementPerformance.slice(0, 5).map((el, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-xs text-gray-600">{el.selector}</code>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${getEffectivenessColor(el.effectiveness)}`}>
                          {el.effectiveness}
                        </span>
                        <span className="text-sm font-medium">{el.ctr.toFixed(1)}% CTR</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">{el.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!metrics && !error && (
        <div className="text-center py-12 text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No analytics data available yet.</p>
          <p className="text-sm mt-2">Data will appear once visitors interact with your landing page.</p>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  trend: 'up' | 'down' | null;
  trendValue?: string;
}

function MetricCard({ icon, label, value, subtitle, trend, trendValue }: MetricCardProps) {
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
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
      {trendValue && <div className="text-xs text-gray-500 mt-1">{trendValue}</div>}
    </div>
  );
}

function DeviceCard({ device, sessions, percentage }: { device: string; sessions: number; percentage: number }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-gray-900">{sessions.toLocaleString()}</div>
      <div className="text-sm text-gray-600">{device}</div>
      <div className="text-xs text-gray-500 mt-1">{percentage.toFixed(1)}%</div>
    </div>
  );
}
