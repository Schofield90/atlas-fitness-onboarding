# Data Import Success Metrics & Monitoring Framework

## Executive Dashboard Overview

### North Star Metrics

- **End-to-End Success Rate:** >90% (Currently: 58%)
- **Time to Value:** <5 minutes average (Currently: 7.8 minutes)
- **First-Attempt Success:** >85% (Currently: 68%)
- **Support Ticket Rate:** <1% (Currently: 2.3%)

## Comprehensive Metrics Framework

### 1. Funnel Performance Metrics

#### Stage-by-Stage Conversion Tracking

```sql
-- Daily funnel performance dashboard
WITH daily_funnel AS (
  SELECT
    DATE(timestamp) as date,
    metadata->>'sessionId' as session_id,
    MAX(CASE WHEN metadata->>'eventName' = 'migration_session_started' THEN 1 ELSE 0 END) as started,
    MAX(CASE WHEN metadata->>'eventName' = 'file_upload_completed' THEN 1 ELSE 0 END) as uploaded,
    MAX(CASE WHEN metadata->>'eventName' = 'ai_analysis_completed' THEN 1 ELSE 0 END) as analyzed,
    MAX(CASE WHEN metadata->>'eventName' = 'field_mapping_review_completed' THEN 1 ELSE 0 END) as mapped,
    MAX(CASE WHEN metadata->>'eventName' = 'data_import_completed' THEN 1 ELSE 0 END) as completed
  FROM analytics_events
  WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
    AND metadata->>'eventName' IN (
      'migration_session_started',
      'file_upload_completed',
      'ai_analysis_completed',
      'field_mapping_review_completed',
      'data_import_completed'
    )
  GROUP BY date, session_id
)
SELECT
  date,
  SUM(started) as sessions_started,
  SUM(uploaded) as files_uploaded,
  SUM(analyzed) as analysis_completed,
  SUM(mapped) as mappings_reviewed,
  SUM(completed) as imports_completed,
  -- Conversion rates
  ROUND(SUM(uploaded)::float / NULLIF(SUM(started), 0) * 100, 1) as upload_conversion,
  ROUND(SUM(analyzed)::float / NULLIF(SUM(uploaded), 0) * 100, 1) as analysis_conversion,
  ROUND(SUM(mapped)::float / NULLIF(SUM(analyzed), 0) * 100, 1) as mapping_conversion,
  ROUND(SUM(completed)::float / NULLIF(SUM(mapped), 0) * 100, 1) as import_conversion,
  -- End-to-end success rate
  ROUND(SUM(completed)::float / NULLIF(SUM(started), 0) * 100, 1) as overall_success_rate
FROM daily_funnel
GROUP BY date
ORDER BY date DESC
LIMIT 30;
```

#### Conversion Rate Alerting

```typescript
interface ConversionAlerts {
  // Stage-specific thresholds
  thresholds: {
    upload_conversion: { warning: 82; critical: 78 };
    analysis_conversion: { warning: 84; critical: 80 };
    mapping_conversion: { warning: 85; critical: 82 };
    import_conversion: { warning: 93; critical: 90 };
    overall_success: { warning: 55; critical: 50 };
  };

  // Alert configuration
  checkInterval: "15_minutes";
  minimumSampleSize: 20; // Don't alert on small samples

  // Notification channels
  channels: {
    slack: "#import-alerts";
    email: ["product@atlas.com", "engineering@atlas.com"];
    pagerDuty: "import-critical-issues";
  };
}

// Automated alerting query
const checkConversionRates = async (): Promise<void> => {
  const recentRates = await db.query(`
    SELECT
      ROUND(SUM(uploaded)::float / NULLIF(SUM(started), 0) * 100, 1) as upload_rate,
      ROUND(SUM(completed)::float / NULLIF(SUM(started), 0) * 100, 1) as success_rate,
      COUNT(*) as sample_size
    FROM daily_funnel
    WHERE date >= CURRENT_DATE - INTERVAL '4 hours'
  `);

  for (const [metric, value] of Object.entries(recentRates)) {
    const threshold = ConversionAlerts.thresholds[metric];
    if (value < threshold.critical) {
      await sendAlert(
        "critical",
        `${metric} dropped to ${value}%`,
        recentRates,
      );
    } else if (value < threshold.warning) {
      await sendAlert(
        "warning",
        `${metric} below warning threshold: ${value}%`,
        recentRates,
      );
    }
  }
};
```

### 2. User Experience Quality Metrics

#### Time-Based Performance Indicators

```sql
-- Performance timing analysis
WITH timing_metrics AS (
  SELECT
    metadata->>'sessionId' as session_id,
    -- Upload timing
    (metadata->>'uploadDuration')::int / 1000 as upload_seconds,
    -- Analysis timing
    (metadata->>'totalDuration')::int / 1000 as analysis_seconds,
    -- Mapping review timing
    (metadata->>'reviewDuration')::int / 1000 as mapping_seconds,
    -- Overall session timing
    (metadata->>'totalSessionDuration')::int / 1000 as total_seconds,
    -- Success indicator
    CASE WHEN metadata->>'finalStatus' = 'success' THEN 1 ELSE 0 END as is_success
  FROM analytics_events
  WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
    AND metadata->>'eventName' IN ('data_import_completed')
    AND metadata->>'uploadDuration' IS NOT NULL
)
SELECT
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE is_success = 1) as successful_sessions,

  -- Time percentiles for successful imports
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_seconds) FILTER (WHERE is_success = 1) as median_total_time,
  PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY total_seconds) FILTER (WHERE is_success = 1) as p90_total_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_seconds) FILTER (WHERE is_success = 1) as p95_total_time,

  -- Stage-specific medians
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY upload_seconds) FILTER (WHERE is_success = 1) as median_upload_time,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY analysis_seconds) FILTER (WHERE is_success = 1) as median_analysis_time,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY mapping_seconds) FILTER (WHERE is_success = 1) as median_mapping_time,

  -- Performance targets
  COUNT(*) FILTER (WHERE total_seconds <= 300 AND is_success = 1) as under_5_minutes,
  ROUND(COUNT(*) FILTER (WHERE total_seconds <= 300 AND is_success = 1) * 100.0 /
        NULLIF(COUNT(*) FILTER (WHERE is_success = 1), 0), 1) as pct_under_5_minutes
FROM timing_metrics;
```

#### User Satisfaction Tracking

```typescript
interface SatisfactionMetrics {
  // Post-completion survey tracking
  trackSatisfactionSurvey: {
    trigger: 'import_completion';
    questions: {
      overall_rating: 'How would you rate your import experience? (1-5 stars)';
      ease_of_use: 'How easy was the import process? (1-5)';
      speed_rating: 'How satisfied are you with the import speed? (1-5)';
      reliability: 'How reliable did the import feel? (1-5)';
      likelihood_to_recommend: 'How likely are you to recommend this tool? (0-10)';
    };
    timing: 'immediate_after_completion';
  };

  // NPS calculation
  calculateNPS: (responses: SurveyResponse[]) => {
    const scores = responses.map(r => r.likelihood_to_recommend);
    const promoters = scores.filter(s => s >= 9).length;
    const detractors = scores.filter(s => s <= 6).length;
    return ((promoters - detractors) / scores.length) * 100;
  };

  // Satisfaction trend monitoring
  dailySatisfactionTrend: `
    SELECT
      DATE(timestamp) as date,
      AVG((metadata->>'overall_rating')::float) as avg_rating,
      AVG((metadata->>'ease_of_use')::float) as avg_ease_score,
      AVG((metadata->>'speed_rating')::float) as avg_speed_score,
      COUNT(*) as response_count
    FROM analytics_events
    WHERE metadata->>'eventName' = 'satisfaction_survey_completed'
      AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY date
    ORDER BY date DESC
  `;
}
```

### 3. Data Quality & System Health Metrics

#### Import Success Rate Monitoring

```sql
-- Detailed import success analysis
WITH import_results AS (
  SELECT
    metadata->>'sessionId' as session_id,
    metadata->>'migrationJobId' as job_id,
    metadata->>'finalStatus' as status,
    (metadata->>'recordsProcessed')::int as records_processed,
    (metadata->>'recordsSuccessful')::int as records_successful,
    (metadata->>'recordsFailed')::int as records_failed,
    (metadata->>'totalDuration')::int as duration_ms,
    (metadata->>'errorCategories')::jsonb as error_categories,
    timestamp::date as import_date
  FROM analytics_events
  WHERE metadata->>'eventName' = 'data_import_completed'
    AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
),
quality_metrics AS (
  SELECT
    import_date,
    COUNT(*) as total_imports,
    COUNT(*) FILTER (WHERE status = 'success') as full_success,
    COUNT(*) FILTER (WHERE status = 'partial_success') as partial_success,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_imports,

    -- Success rates
    ROUND(COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*), 1) as success_rate,
    ROUND(COUNT(*) FILTER (WHERE status IN ('success', 'partial_success')) * 100.0 / COUNT(*), 1) as completion_rate,

    -- Data quality metrics
    AVG(records_successful::float / NULLIF(records_processed, 0)) as avg_record_success_rate,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY records_successful::float / NULLIF(records_processed, 0)) as median_record_success_rate,

    -- Performance metrics
    AVG(duration_ms / 1000.0 / 60.0) as avg_duration_minutes,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms / 1000.0 / 60.0) as p95_duration_minutes
  FROM import_results
  GROUP BY import_date
)
SELECT * FROM quality_metrics ORDER BY import_date DESC;
```

#### Error Pattern Analysis

```sql
-- Error categorization and trending
WITH error_analysis AS (
  SELECT
    DATE(timestamp) as date,
    jsonb_array_elements_text((metadata->>'errorCategories')::jsonb) as error_category,
    COUNT(*) as occurrences
  FROM analytics_events
  WHERE metadata->>'eventName' = 'data_import_completed'
    AND metadata->>'errorCategories' IS NOT NULL
    AND timestamp >= CURRENT_DATE - INTERVAL '14 days'
  GROUP BY date, error_category
)
SELECT
  error_category,
  SUM(occurrences) as total_occurrences,
  AVG(occurrences) as avg_daily_occurrences,
  ROUND(SUM(occurrences) * 100.0 / (SELECT SUM(occurrences) FROM error_analysis), 1) as error_percentage,
  STRING_AGG(DISTINCT date::text, ', ' ORDER BY date DESC) as recent_dates
FROM error_analysis
GROUP BY error_category
ORDER BY total_occurrences DESC;
```

### 4. Business Impact Metrics

#### Support & Operational Efficiency

```typescript
interface BusinessMetrics {
  // Support ticket correlation
  supportTicketTracking: {
    // Track support tickets generated from import sessions
    correlateTicketsToSessions: `
      WITH import_sessions AS (
        SELECT DISTINCT
          metadata->>'sessionId' as session_id,
          metadata->>'userId' as user_id,
          timestamp
        FROM analytics_events
        WHERE metadata->>'eventName' = 'migration_session_started'
          AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
      ),
      support_tickets AS (
        SELECT
          user_id,
          created_at,
          category,
          priority,
          CASE WHEN category IN ('import_issue', 'data_migration', 'file_upload') THEN 1 ELSE 0 END as is_import_related
        FROM support_tickets
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      )
      SELECT
        COUNT(DISTINCT is.session_id) as total_import_sessions,
        COUNT(DISTINCT st.user_id) FILTER (WHERE st.is_import_related = 1) as users_with_import_tickets,
        COUNT(*) FILTER (WHERE st.is_import_related = 1) as import_related_tickets,
        ROUND(COUNT(*) FILTER (WHERE st.is_import_related = 1) * 100.0 /
              COUNT(DISTINCT is.session_id), 2) as ticket_rate_percent
      FROM import_sessions is
      LEFT JOIN support_tickets st ON is.user_id = st.user_id
        AND st.created_at BETWEEN is.timestamp AND is.timestamp + INTERVAL '24 hours'
    `;

    // Support resolution time for import issues
    supportResolutionTracking: `
      SELECT
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as avg_resolution_hours,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as median_resolution_hours,
        COUNT(*) FILTER (WHERE resolved_at - created_at <= INTERVAL '2 hours') as resolved_within_2h,
        COUNT(*) FILTER (WHERE resolved_at - created_at <= INTERVAL '24 hours') as resolved_within_24h
      FROM support_tickets
      WHERE category IN ('import_issue', 'data_migration', 'file_upload')
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND resolved_at IS NOT NULL
    `;
  };

  // User retention and activation
  userActivationMetrics: {
    // Track users who successfully complete import and continue using the system
    postImportEngagement: `
      WITH successful_imports AS (
        SELECT DISTINCT
          metadata->>'userId' as user_id,
          timestamp as import_completion_date
        FROM analytics_events
        WHERE metadata->>'eventName' = 'data_import_completed'
          AND metadata->>'finalStatus' = 'success'
          AND timestamp >= CURRENT_DATE - INTERVAL '60 days'
      ),
      post_import_activity AS (
        SELECT
          si.user_id,
          si.import_completion_date,
          COUNT(*) as activities_30d
        FROM successful_imports si
        LEFT JOIN analytics_events ae ON ae.metadata->>'userId' = si.user_id
          AND ae.timestamp > si.import_completion_date
          AND ae.timestamp <= si.import_completion_date + INTERVAL '30 days'
          AND ae.type = 'pageview'
        GROUP BY si.user_id, si.import_completion_date
      )
      SELECT
        COUNT(*) as total_successful_imports,
        COUNT(*) FILTER (WHERE activities_30d > 0) as active_post_import,
        COUNT(*) FILTER (WHERE activities_30d >= 5) as engaged_post_import,
        ROUND(COUNT(*) FILTER (WHERE activities_30d > 0) * 100.0 / COUNT(*), 1) as activation_rate,
        ROUND(COUNT(*) FILTER (WHERE activities_30d >= 5) * 100.0 / COUNT(*), 1) as engagement_rate
      FROM post_import_activity
    `;

    // Time to value measurement
    timeToValueTracking: `
      WITH import_to_value AS (
        SELECT
          metadata->>'userId' as user_id,
          MIN(timestamp) FILTER (WHERE metadata->>'eventName' = 'migration_session_started') as import_start,
          MIN(timestamp) FILTER (WHERE metadata->>'eventName' = 'data_import_completed'
                                  AND metadata->>'finalStatus' = 'success') as import_complete,
          MIN(timestamp) FILTER (WHERE metadata->>'eventName' = 'first_client_interaction') as first_value
        FROM analytics_events
        WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY metadata->>'userId'
        HAVING MIN(timestamp) FILTER (WHERE metadata->>'eventName' = 'data_import_completed'
                                        AND metadata->>'finalStatus' = 'success') IS NOT NULL
      )
      SELECT
        COUNT(*) as users_with_successful_imports,
        COUNT(*) FILTER (WHERE first_value IS NOT NULL) as users_reaching_value,
        ROUND(COUNT(*) FILTER (WHERE first_value IS NOT NULL) * 100.0 / COUNT(*), 1) as value_realization_rate,
        AVG(EXTRACT(EPOCH FROM (first_value - import_complete)) / 86400) as avg_days_to_value,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (first_value - import_complete)) / 86400) as median_days_to_value
      FROM import_to_value
    `;
  };
}
```

## Guardrail Monitoring System

### 1. Real-time Health Checks

```typescript
interface GuardrailMonitoring {
  // Automated health checks every 5 minutes
  healthChecks: {
    systemPerformance: {
      query: `
        SELECT
          AVG((metadata->>'totalDuration')::int) as avg_analysis_time_ms,
          MAX((metadata->>'totalDuration')::int) as max_analysis_time_ms,
          COUNT(*) as analysis_count
        FROM analytics_events
        WHERE metadata->>'eventName' = 'ai_analysis_completed'
          AND timestamp >= NOW() - INTERVAL '1 hour'
      `,
      thresholds: {
        avg_analysis_time_ms: { warning: 180000, critical: 300000 }, // 3-5 minutes
        max_analysis_time_ms: { warning: 600000, critical: 900000 }  // 10-15 minutes
      }
    },

    errorRateSpike: {
      query: `
        SELECT
          COUNT(*) FILTER (WHERE metadata->>'finalStatus' = 'failed') as failed_imports,
          COUNT(*) as total_imports,
          ROUND(COUNT(*) FILTER (WHERE metadata->>'finalStatus' = 'failed') * 100.0 /
                NULLIF(COUNT(*), 0), 2) as failure_rate
        FROM analytics_events
        WHERE metadata->>'eventName' = 'data_import_completed'
          AND timestamp >= NOW() - INTERVAL '2 hours'
      `,
      thresholds: {
        failure_rate: { warning: 5.0, critical: 10.0 } // Percentage
      }
    },

    userSatisfactionDrop: {
      query: `
        SELECT
          AVG((metadata->>'overall_rating')::float) as avg_satisfaction,
          COUNT(*) as response_count
        FROM analytics_events
        WHERE metadata->>'eventName' = 'satisfaction_survey_completed'
          AND timestamp >= NOW() - INTERVAL '24 hours'
      `,
      thresholds: {
        avg_satisfaction: { warning: 4.0, critical: 3.5 } // Out of 5
      }
    }
  };

  // Alert dispatch system
  alertSystem: {
    async checkAndAlert(): Promise<void> {
      for (const [checkName, check] of Object.entries(this.healthChecks)) {
        const result = await db.query(check.query);

        for (const [metric, value] of Object.entries(result)) {
          const threshold = check.thresholds[metric];
          if (!threshold) continue;

          if (value >= threshold.critical) {
            await this.sendCriticalAlert(checkName, metric, value, threshold.critical);
          } else if (value >= threshold.warning) {
            await this.sendWarningAlert(checkName, metric, value, threshold.warning);
          }
        }
      }
    },

    async sendCriticalAlert(check: string, metric: string, value: number, threshold: number): Promise<void> {
      const alert = {
        severity: 'critical',
        message: `${check}.${metric} is ${value}, exceeding critical threshold of ${threshold}`,
        timestamp: new Date(),
        runbookUrl: `https://docs.atlas.com/runbooks/${check}`,
        dashboardUrl: `https://dashboard.atlas.com/imports/health`
      };

      await Promise.all([
        this.slackService.send('#alerts-critical', alert),
        this.pagerDutyService.trigger(alert),
        this.emailService.send('oncall@atlas.com', 'Critical Import Alert', alert)
      ]);
    }
  };
}
```

### 2. Automated Recovery Actions

```typescript
interface AutomatedRecovery {
  // Circuit breaker for import system
  circuitBreaker: {
    enabled: true,
    failureThreshold: 10,      // Open circuit after 10 consecutive failures
    timeoutMs: 60000,          // 1 minute timeout
    recoveryAttempts: 3,       // Try to close circuit 3 times

    async handleFailure(error: ImportError): Promise<void> {
      this.consecutiveFailures++;

      if (this.consecutiveFailures >= this.failureThreshold) {
        await this.openCircuit();
        await this.notifyTeam('Import circuit breaker opened due to consecutive failures');
      }
    },

    async openCircuit(): Promise<void> {
      this.state = 'open';
      this.lastFailureTime = Date.now();

      // Redirect users to maintenance page
      await this.featureFlagService.disable('data_import_enabled');

      // Schedule recovery attempt
      setTimeout(() => this.attemptRecovery(), this.timeoutMs);
    }
  };

  // Automatic scaling for high load
  loadBalancing: {
    async scaleProcessingCapacity(currentLoad: number): Promise<void> {
      const targetUtilization = 0.7; // 70% target utilization

      if (currentLoad > targetUtilization) {
        const scaleFactor = Math.ceil(currentLoad / targetUtilization);
        await this.queueService.scaleWorkers(scaleFactor);

        analytics.trackCustomEvent('auto_scaling_triggered', {
          currentLoad,
          scaleFactor,
          reason: 'high_import_volume'
        });
      }
    },

    async optimizeQueuePriority(): Promise<void> {
      // Prioritize smaller imports during high load
      const queueDepth = await this.queueService.getDepth();

      if (queueDepth > 50) {
        await this.queueService.updatePriorityRules({
          smallFiles: 'high',      // <1MB files
          mediumFiles: 'normal',   // 1-10MB files
          largeFiles: 'low'        // >10MB files
        });
      }
    }
  };
}
```

## Dashboard Implementation

### 1. Executive Summary Dashboard

```typescript
interface ExecutiveDashboard {
  // High-level KPIs
  kpis: {
    endToEndSuccessRate: {
      current: number;
      target: 90;
      trend: "up" | "down" | "stable";
      change: number; // Percentage points
    };
    averageTimeToCompletion: {
      current: number; // Minutes
      target: 5;
      trend: "up" | "down" | "stable";
      change: number; // Minutes
    };
    userSatisfaction: {
      current: number; // Out of 5
      target: 4.5;
      trend: "up" | "down" | "stable";
      change: number;
    };
    supportTicketRate: {
      current: number; // Percentage
      target: 1;
      trend: "up" | "down" | "stable";
      change: number;
    };
  };

  // Weekly trends
  weeklyTrends: {
    successRate: number[];
    completionTime: number[];
    userCount: number[];
    satisfaction: number[];
  };

  // Quick insights
  insights: string[]; // Generated automatically from data patterns
}
```

### 2. Operational Dashboard

```typescript
interface OperationalDashboard {
  // Real-time metrics (last 24 hours)
  realTimeMetrics: {
    activeImports: number;
    queueDepth: number;
    avgProcessingTime: number;
    errorRate: number;
    systemLoad: number;
  };

  // Funnel performance
  funnelMetrics: {
    stages: Array<{
      name: string;
      count: number;
      conversionRate: number;
      dropOffReasons: string[];
    }>;
  };

  // Error monitoring
  errorTracking: {
    topErrors: Array<{
      category: string;
      count: number;
      impact: "high" | "medium" | "low";
      trend: "increasing" | "stable" | "decreasing";
    }>;
  };

  // Performance monitoring
  performanceMetrics: {
    responseTime: { p50: number; p95: number; p99: number };
    throughput: { current: number; peak: number };
    resourceUtilization: { cpu: number; memory: number; storage: number };
  };
}
```

## Implementation Roadmap

### Phase 1: Core Metrics Infrastructure (Week 1-2)

- Set up funnel tracking queries
- Implement basic alerting system
- Create initial dashboard views
- Add guardrail monitoring

### Phase 2: Advanced Analytics (Week 3-4)

- Implement user satisfaction tracking
- Add business impact measurements
- Create automated insights generation
- Set up A/B test monitoring

### Phase 3: Optimization & Automation (Week 5-6)

- Add predictive analytics for capacity planning
- Implement automated recovery systems
- Create advanced visualization dashboards
- Set up comprehensive reporting

### Phase 4: Integration & Refinement (Week 7-8)

- Integrate with existing business intelligence tools
- Refine alert thresholds based on historical data
- Add custom metric creation capabilities
- Implement advanced anomaly detection

This comprehensive metrics framework provides the foundation for data-driven optimization of the import experience, with clear success criteria, proactive monitoring, and automated recovery mechanisms to ensure consistent user success.
