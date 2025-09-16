export interface AnalyticsEvent {
  id: string;
  type:
    | "pageview"
    | "click"
    | "scroll"
    | "form_submit"
    | "custom"
    | "migration";
  timestamp: string;
  sessionId: string;
  visitorId: string;
  path: string;
  referrer: string;
  device: string;
  browser: string;
  os: string;
  screenResolution: string;
  viewport: string;
  metadata?: Record<string, any>;
}

// Migration-specific event types
export interface MigrationEvent extends Omit<AnalyticsEvent, "type"> {
  type: "migration";
  migrationSessionId: string;
  migrationJobId?: string;
  eventName: string;
  stage:
    | "session_start"
    | "upload"
    | "analysis"
    | "mapping"
    | "import"
    | "completion";
  variant?: string; // For A/B testing
}

export interface AnalyticsOverview {
  totalPageViews: number;
  uniqueVisitors: number;
  totalClicks: number;
  avgSessionDuration: string;
  bounceRate: number;
  conversionRate: number;
}

export interface DailyMetric {
  date: string;
  pageviews: number;
  visitors: number;
  clicks: number;
}

export interface HourlyMetric {
  hour: string;
  visits: number;
}

export interface PageMetric {
  path: string;
  views: number;
  avgTime: string;
}

export interface ReferrerMetric {
  referrer: string;
  count: number;
  percentage: number;
}

export interface DeviceMetric {
  device: string;
  count: number;
  percentage: number;
}

export interface BrowserMetric {
  browser: string;
  count: number;
}

export interface ClickTarget {
  target: string;
  count: number;
}

export interface ScrollDepth {
  depth: string;
  percentage: number;
}

export interface ExitPage {
  path: string;
  exits: number;
  rate: number;
}

export interface CurrentPage {
  path: string;
  users: number;
}

export interface RecentEvent {
  timestamp: string;
  type: string;
  path: string;
  device: string;
}

// Migration funnel metrics
export interface MigrationFunnelMetrics {
  sessionsStarted: number;
  filesUploaded: number;
  analysisCompleted: number;
  mappingsReviewed: number;
  importsCompleted: number;
  overallSuccessRate: number;
  stageConversionRates: {
    uploadConversion: number;
    analysisConversion: number;
    mappingConversion: number;
    importConversion: number;
  };
}

// Migration performance metrics
export interface MigrationPerformanceMetrics {
  avgUploadTime: number;
  avgAnalysisTime: number;
  avgMappingTime: number;
  avgTotalTime: number;
  successRate: number;
  errorRate: number;
  abandonmentRate: number;
}

// A/B test result tracking
export interface ABTestResults {
  experimentName: string;
  variant: string;
  participants: number;
  conversions: number;
  conversionRate: number;
  statisticalSignificance: boolean;
  confidenceInterval: [number, number];
}

export interface AnalyticsData {
  overview: AnalyticsOverview;
  trends: {
    daily: DailyMetric[];
    hourly: HourlyMetric[];
  };
  traffic: {
    topPages: PageMetric[];
    topReferrers: ReferrerMetric[];
    deviceBreakdown: DeviceMetric[];
    browserBreakdown: BrowserMetric[];
  };
  engagement: {
    clickTargets: ClickTarget[];
    scrollDepth: ScrollDepth[];
    exitPages: ExitPage[];
  };
  realtime: {
    activeUsers: number;
    currentPages: CurrentPage[];
    recentEvents: RecentEvent[];
  };
}
