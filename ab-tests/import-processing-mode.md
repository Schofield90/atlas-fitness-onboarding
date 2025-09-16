# A/B Test: Real-time vs Background Import Processing

## Test Overview

**Hypothesis:** Background processing with email notification reduces user anxiety and abandonment during long import operations, while maintaining engagement through progress updates.

**Expected Impact:** 8-15% reduction in abandonment during import execution
**Primary Metric:** Import stage abandonment rate (currently 7%)
**Secondary Focus:** Overall user satisfaction and perceived reliability
**Test Duration:** 4 weeks to capture various file sizes and complexities

## Test Variants

### Variant A: Background Processing with Notifications (Treatment)

**Asynchronous processing** - User can continue using the system while import runs

**User Flow:**

1. User reviews final import settings and clicks "Start Import"
2. Import begins in background with unique job ID
3. User receives immediate confirmation with estimated completion time
4. User can navigate away or continue using the system
5. Real-time progress updates via WebSocket (optional monitoring)
6. Email notification when import completes (success/failure)
7. In-app notification when user returns to the system

**UX Elements:**

- "Import started successfully" confirmation message
- Persistent navigation bar indicator showing active import
- Optional "Monitor Progress" floating widget
- Email notification with import summary
- Dashboard widget showing import status
- Mobile-friendly progress notifications

**Analytics Implementation:**

```typescript
// Track background import experience
const trackBackgroundImportStart = (jobId: string, estimatedTime: number) => {
  analytics.trackCustomEvent("background_import_started", {
    sessionId: migrationAnalytics.sessionId,
    importJobId: jobId,
    variant: "background_processing",
    estimatedDurationMinutes: Math.ceil(estimatedTime / 60000),
    userNavigatedAway: false, // Will update if user leaves
    timestamp: new Date(),
  });
};

// Track user behavior during background processing
const trackUserEngagement = (action: string, importJobId: string) => {
  analytics.trackCustomEvent("background_import_engagement", {
    sessionId: migrationAnalytics.sessionId,
    importJobId,
    userAction: action, // 'navigate_away', 'monitor_progress', 'check_status'
    timeFromStart: Date.now() - importStartTime,
    variant: "background_processing",
    timestamp: new Date(),
  });
};

// Track notification effectiveness
const trackNotificationInteraction = (
  notificationType: "email" | "in_app" | "push",
  action: string,
) => {
  analytics.trackCustomEvent("import_notification_interaction", {
    notificationType,
    action, // 'received', 'opened', 'clicked_view_results'
    importJobId,
    variant: "background_processing",
    timestamp: new Date(),
  });
};
```

**Implementation Architecture:**

```typescript
interface BackgroundImportService {
  // Start background job
  async startImport(jobId: string, userId: string): Promise<ImportJobStatus> {
    const job = await this.queueService.enqueue('data_import', {
      jobId,
      userId,
      priority: 'normal',
      retryAttempts: 3
    });

    // Send immediate confirmation
    await this.notificationService.sendImportStarted(userId, {
      jobId,
      estimatedCompletion: job.estimatedCompletionTime,
      monitoringUrl: `/imports/${jobId}/status`
    });

    return job;
  }

  // WebSocket progress updates
  setupProgressSocket(jobId: string, userId: string) {
    const socket = this.websocketService.createRoom(`import_${jobId}`);

    socket.join(userId);
    socket.emit('import_progress_init', {
      jobId,
      currentStatus: 'processing',
      estimatedCompletion: this.getEstimatedCompletion(jobId)
    });

    return socket;
  }

  // Email notification system
  async sendCompletionNotification(userId: string, result: ImportResult) {
    const emailTemplate = result.status === 'success'
      ? 'import_success_notification'
      : 'import_failure_notification';

    await this.emailService.send(userId, emailTemplate, {
      importSummary: result.summary,
      viewResultsUrl: `/imports/${result.jobId}/results`,
      supportUrl: '/support'
    });
  }
}
```

### Variant B: Real-time Processing with Active Waiting (Control)

**Current implementation** - User waits on page while import processes

**User Flow:**

1. User reviews settings and clicks "Start Import"
2. Import begins immediately with real-time progress indicator
3. User remains on import page watching progress
4. Real-time updates show records processed, errors, completion percentage
5. Import completes with immediate results display
6. User can view detailed results or continue to dashboard

**UX Elements:**

- Full-screen progress indicator with animated states
- Real-time counter of records processed
- Live error count with expandable details
- Estimated time remaining
- "Import in Progress" lock screen
- Immediate results display upon completion

## Experiment Design

### Randomization Strategy

- **Traffic Split:** 50/50 between variants
- **Assignment Method:** User ID hash-based for consistency across sessions
- **Stratification:** By estimated import duration (<2 mins, 2-5 mins, >5 mins)

```typescript
const getImportProcessingVariant = (
  userId: string,
  estimatedDuration: number,
): "background" | "realtime" => {
  const hash = hashUserId(userId);

  // Slightly favor background for longer imports
  const threshold = estimatedDuration > 300000 ? 0.55 : 0.5; // 5+ minutes
  const variant = hash % 100 < threshold * 100 ? "background" : "realtime";

  analytics.trackCustomEvent("import_processing_experiment_assigned", {
    userId,
    variant,
    estimatedDurationMs: estimatedDuration,
    experimentName: "import_processing_mode",
    timestamp: new Date(),
  });

  return variant;
};
```

### Sample Size Calculation

- **Current abandonment rate:** 7%
- **Minimum detectable effect:** 2% absolute reduction (7% → 5%)
- **Statistical power:** 80%
- **Significance level:** 95%
- **Required sample size:** ~460 users per variant (920 total)
- **Expected runtime:** 4-5 weeks at current import volume

### Success Metrics

#### Primary Success Metrics

- **Import Stage Abandonment Rate:** % of users who abandon during import execution
- **Import Completion Rate:** % of started imports that complete (success or handled failure)

#### Secondary Metrics

- **User Satisfaction:** Post-import survey rating (1-5 stars)
- **Perceived Reliability:** Survey question "How reliable did the import feel?"
- **System Engagement:** Activities performed during background processing
- **Support Ticket Rate:** % of imports that generate support requests

#### Behavioral Metrics

- **Session Continuation:** % of users who navigate to other pages during import
- **Progress Monitoring:** % of users who actively monitor background imports
- **Notification Engagement:** Email open rates and click-through rates
- **Return Behavior:** Time to return and check import results

#### Technical Performance Metrics

- **Server Resource Usage:** CPU/memory utilization during imports
- **Queue Processing Time:** Time from job creation to completion
- **Error Recovery:** Success rate of retry mechanisms

### Guardrail Metrics

- **Import Success Rate:** Must maintain >98% technical success rate
- **Data Accuracy:** No degradation in import data quality
- **System Performance:** No increase in overall system response times
- **Notification Delivery:** >95% successful delivery of completion notifications

## Implementation Plan

### Phase 1: Background Processing Infrastructure (Week 1)

**Job Queue System:**

```typescript
// Enhanced job queue for background processing
interface ImportJobQueue {
  async enqueue(importData: ImportJobData): Promise<JobHandle> {
    const job = {
      id: generateJobId(),
      userId: importData.userId,
      organizationId: importData.organizationId,
      priority: this.calculatePriority(importData),
      payload: importData,
      status: 'queued',
      createdAt: new Date(),
      estimatedDuration: this.estimateProcessingTime(importData)
    };

    await this.jobStore.save(job);
    await this.eventBus.publish('job.queued', job);

    return {
      jobId: job.id,
      estimatedCompletion: new Date(Date.now() + job.estimatedDuration)
    };
  }

  // Smart priority calculation
  private calculatePriority(data: ImportJobData): 'high' | 'normal' | 'low' {
    const fileSize = data.totalFileSize;
    const recordCount = data.estimatedRecords;

    // Prioritize smaller imports for faster turnaround
    if (fileSize < 1024 * 1024 && recordCount < 1000) return 'high';
    if (fileSize < 10 * 1024 * 1024 && recordCount < 5000) return 'normal';
    return 'low';
  }

  // Progress tracking with detailed stages
  async updateProgress(jobId: string, progress: JobProgress) {
    await this.jobStore.updateProgress(jobId, progress);

    // Real-time WebSocket notification
    await this.websocketService.broadcast(`import_${jobId}`, 'progress_update', {
      progress: progress.percentage,
      stage: progress.currentStage,
      recordsProcessed: progress.recordsProcessed,
      estimatedTimeRemaining: progress.estimatedTimeRemaining
    });

    // Track progress for analytics
    analytics.trackCustomEvent('import_progress_update', {
      jobId,
      progressPercentage: progress.percentage,
      currentStage: progress.currentStage,
      variant: 'background_processing'
    });
  }
}
```

**Notification System:**

```typescript
interface NotificationService {
  // Multi-channel notification delivery
  async sendImportStarted(userId: string, details: ImportStartedDetails) {
    const user = await this.userService.getUser(userId);

    // In-app notification
    await this.inAppService.create(userId, {
      type: 'import_started',
      title: 'Import Started Successfully',
      message: `Your data import is processing. Estimated completion: ${details.estimatedCompletion}`,
      actionUrl: details.monitoringUrl
    });

    // Email notification (if user preference enabled)
    if (user.preferences.emailNotifications?.importUpdates) {
      await this.emailService.send(userId, 'import_started', {
        estimatedCompletion: details.estimatedCompletion,
        monitorUrl: details.monitoringUrl
      });
    }

    // Push notification for mobile users
    if (user.devices?.length > 0) {
      await this.pushService.send(userId, {
        title: 'Data Import Started',
        body: 'Your import is processing in the background.',
        data: { jobId: details.jobId, type: 'import_started' }
      });
    }
  }

  async sendImportCompleted(userId: string, result: ImportResult) {
    const successRate = result.recordsSuccessful / result.totalRecords;
    const isSuccess = result.status === 'success' && successRate > 0.95;

    // Email with detailed results
    await this.emailService.send(userId,
      isSuccess ? 'import_success' : 'import_completed_with_issues',
      {
        summary: this.generateImportSummary(result),
        viewResultsUrl: `/imports/${result.jobId}/results`,
        supportUrl: isSuccess ? null : '/support'
      }
    );

    // In-app notification with action button
    await this.inAppService.create(userId, {
      type: isSuccess ? 'import_success' : 'import_warning',
      title: isSuccess ? 'Import Completed Successfully!' : 'Import Completed with Issues',
      message: this.generateNotificationMessage(result),
      actionUrl: `/imports/${result.jobId}/results`,
      priority: isSuccess ? 'normal' : 'high'
    });
  }
}
```

### Phase 2: User Interface Implementation (Week 2)

**Background Processing Interface:**

```typescript
const BackgroundImportInterface: React.FC<ImportProps> = ({ onImportStart }) => {
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const [showProgressMonitor, setShowProgressMonitor] = useState(false);

  const handleStartImport = async () => {
    try {
      const job = await startBackgroundImport(migrationJobId);
      setImportJob(job);

      // Show success confirmation
      toast.success(
        <ImportStartedToast
          jobId={job.jobId}
          estimatedCompletion={job.estimatedCompletion}
          onMonitorClick={() => setShowProgressMonitor(true)}
        />
      );

      // Navigate to dashboard or allow user to choose
      showNavigationOptions();

    } catch (error) {
      toast.error('Failed to start import. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Import confirmation UI */}
      <Card>
        <CardHeader>
          <CardTitle>Ready to Import</CardTitle>
          <CardDescription>
            Your data will be processed in the background. You can continue using the system or monitor progress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Import Summary</h4>
                <p className="text-sm text-gray-600">
                  {estimatedRecords} records from {fileCount} files
                </p>
                <p className="text-sm text-gray-600">
                  Estimated time: {formatDuration(estimatedDuration)}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">What happens next?</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Import processes in background</li>
                  <li>• You'll receive progress updates</li>
                  <li>• Email notification when complete</li>
                  <li>• Results available in your dashboard</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={handleStartImport}
                disabled={isStarting}
                className="flex-1"
              >
                {isStarting ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Starting Import...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Background Import
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => setPreferRealtime(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Watch Progress Live
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optional progress monitor */}
      {showProgressMonitor && importJob && (
        <ProgressMonitorWidget
          jobId={importJob.jobId}
          onClose={() => setShowProgressMonitor(false)}
          onNavigateToResults={() => router.push(`/imports/${importJob.jobId}`)}
        />
      )}

      {/* Navigation options after import starts */}
      <NavigationSuggestions
        onDashboard={() => router.push('/dashboard')}
        onSettings={() => router.push('/settings')}
        onMonitor={() => setShowProgressMonitor(true)}
      />
    </div>
  );
};
```

**Progress Monitor Widget:**

```typescript
const ProgressMonitorWidget: React.FC<ProgressProps> = ({ jobId, onClose }) => {
  const { progress, stage, error } = useImportProgress(jobId);
  const [isMinimized, setIsMinimized] = useState(false);

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border p-3 min-w-64">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Import: {progress}%</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(false)}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
        <div className="mt-2">
          <Progress value={progress} className="h-2" />
        </div>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Import Progress</CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Current stage:</span>
            <Badge variant="outline">{stage}</Badge>
          </div>

          <Progress value={progress} className="h-3" />

          <div className="flex items-center justify-between text-sm">
            <span>{progress}% complete</span>
            <span className="text-gray-500">{estimatedTimeRemaining}</span>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
```

### Phase 3: Analytics & Monitoring (Week 3)

**Abandonment Detection:**

```sql
-- Track abandonment patterns by variant
WITH import_sessions AS (
  SELECT
    metadata->>'sessionId' as session_id,
    metadata->>'variant' as variant,
    metadata->>'importJobId' as job_id,
    MIN(timestamp) as import_started,
    MAX(timestamp) as last_activity,
    MAX(CASE WHEN metadata->>'eventName' = 'data_import_completed' THEN timestamp END) as completed_at,
    MAX(CASE WHEN metadata->>'userAction' = 'navigate_away' THEN timestamp END) as navigated_away_at
  FROM analytics_events
  WHERE metadata->>'experimentName' = 'import_processing_mode'
    AND timestamp >= NOW() - INTERVAL '7 days'
  GROUP BY session_id, variant, job_id
),
abandonment_analysis AS (
  SELECT
    *,
    CASE
      WHEN completed_at IS NOT NULL THEN 'completed'
      WHEN navigated_away_at IS NOT NULL AND completed_at IS NULL THEN 'abandoned_after_navigation'
      WHEN EXTRACT(EPOCH FROM (NOW() - import_started)) > 1800 AND completed_at IS NULL THEN 'abandoned_timeout'
      ELSE 'in_progress'
    END as outcome
  FROM import_sessions
)
SELECT
  variant,
  COUNT(*) as total_imports,
  COUNT(*) FILTER (WHERE outcome = 'completed') as completed,
  COUNT(*) FILTER (WHERE outcome LIKE 'abandoned%') as abandoned,
  ROUND(COUNT(*) FILTER (WHERE outcome LIKE 'abandoned%') * 100.0 / COUNT(*), 1) as abandonment_rate,
  AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, last_activity) - import_started)) / 60) as avg_duration_minutes
FROM abandonment_analysis
GROUP BY variant;
```

**User Engagement Analysis:**

```sql
-- Background processing engagement metrics
WITH background_engagement AS (
  SELECT
    metadata->>'sessionId' as session_id,
    metadata->>'importJobId' as job_id,
    COUNT(*) FILTER (WHERE metadata->>'userAction' = 'navigate_away') as navigation_events,
    COUNT(*) FILTER (WHERE metadata->>'userAction' = 'monitor_progress') as monitoring_events,
    COUNT(*) FILTER (WHERE metadata->>'userAction' = 'check_status') as status_checks,
    MAX(CASE WHEN metadata->>'userAction' = 'navigate_away' THEN 1 ELSE 0 END) as did_navigate_away,
    MIN(timestamp) as first_event,
    MAX(timestamp) as last_event
  FROM analytics_events
  WHERE metadata->>'eventName' = 'background_import_engagement'
    AND timestamp >= NOW() - INTERVAL '7 days'
  GROUP BY session_id, job_id
)
SELECT
  COUNT(*) as total_background_imports,
  AVG(navigation_events) as avg_navigation_events,
  AVG(monitoring_events) as avg_monitoring_events,
  SUM(did_navigate_away) as users_who_navigated_away,
  ROUND(SUM(did_navigate_away) * 100.0 / COUNT(*), 1) as navigation_rate,
  AVG(EXTRACT(EPOCH FROM (last_event - first_event)) / 60) as avg_engagement_duration_minutes
FROM background_engagement;
```

**Notification Effectiveness:**

```sql
-- Email notification performance
SELECT
  metadata->>'notificationType' as notification_type,
  COUNT(*) FILTER (WHERE metadata->>'action' = 'received') as sent,
  COUNT(*) FILTER (WHERE metadata->>'action' = 'opened') as opened,
  COUNT(*) FILTER (WHERE metadata->>'action' = 'clicked_view_results') as clicked,
  ROUND(
    COUNT(*) FILTER (WHERE metadata->>'action' = 'opened') * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE metadata->>'action' = 'received'), 0), 1
  ) as open_rate,
  ROUND(
    COUNT(*) FILTER (WHERE metadata->>'action' = 'clicked_view_results') * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE metadata->>'action' = 'opened'), 0), 1
  ) as click_through_rate
FROM analytics_events
WHERE metadata->>'eventName' = 'import_notification_interaction'
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY notification_type;
```

### Phase 4: Results Analysis & Decision Framework (Week 4+)

**Statistical Analysis:**

```typescript
interface ImportProcessingResults {
  variant: "background" | "realtime";
  totalImports: number;
  completedImports: number;
  abandonedImports: number;
  abandonmentRate: number;
  averageSatisfactionScore: number;
  averageCompletionTime: number;
  supportTicketRate: number;
}

const analyzeExperimentResults = (
  backgroundResults: ImportProcessingResults,
  realtimeResults: ImportProcessingResults,
): ExperimentConclusion => {
  // Primary metric: abandonment rate reduction
  const abandonmentImprovement =
    realtimeResults.abandonmentRate - backgroundResults.abandonmentRate;

  // Statistical significance test
  const significance = calculateProportionTest(
    backgroundResults.abandonedImports,
    backgroundResults.totalImports,
    realtimeResults.abandonedImports,
    realtimeResults.totalImports,
  );

  // Practical significance threshold
  const practicalThreshold = 0.02; // 2% absolute improvement

  return {
    primaryMetricImprovement: abandonmentImprovement,
    statisticallySignificant: significance.pValue < 0.05,
    practicallySignificant:
      Math.abs(abandonmentImprovement) >= practicalThreshold,
    recommendation: getRecommendation(
      abandonmentImprovement,
      significance,
      backgroundResults,
      realtimeResults,
    ),
    confidenceLevel: 1 - significance.pValue,
    sampleSizeAdequate:
      backgroundResults.totalImports >= 400 &&
      realtimeResults.totalImports >= 400,
  };
};
```

## Risk Mitigation

### Technical Risks

- **Queue System Failure:** Fallback to synchronous processing if queue unavailable
- **Notification Delivery Issues:** Multiple delivery channels with retry logic
- **WebSocket Connection Problems:** Graceful degradation to polling updates

**Mitigation Code:**

```typescript
// Robust background import with fallback
const startImportWithFallback = async (
  jobData: ImportData,
): Promise<ImportResult> => {
  try {
    // Attempt background processing
    return await backgroundImportService.start(jobData);
  } catch (queueError) {
    console.warn(
      "Background queue unavailable, falling back to synchronous processing",
      queueError,
    );

    // Fallback to real-time processing
    analytics.trackCustomEvent("import_fallback_triggered", {
      originalVariant: "background",
      fallbackReason: queueError.message,
      jobId: jobData.jobId,
    });

    return await realtimeImportService.start(jobData);
  }
};
```

### User Experience Risks

- **Notification Overload:** Intelligent notification throttling and user preferences
- **Progress Anxiety:** Clear messaging about background processing benefits
- **Result Discovery:** Multiple pathways to find completed import results

### Business Risks

- **Support Load:** Enhanced self-service tools for import status checking
- **User Confusion:** Clear onboarding and help documentation for new flow
- **Adoption Resistance:** Gradual rollout with user feedback collection

## Success Criteria & Decision Matrix

### Ship Background Processing If:

- Abandonment rate reduced by ≥2% with statistical significance
- User satisfaction maintained or improved (≥4.3/5)
- No increase in support ticket rate
- Technical infrastructure performs reliably (>99% job completion)

### Iterate Background Processing If:

- 1-2% abandonment improvement with positive user feedback
- Clear user preference signals from qualitative feedback
- Technical performance is solid but user experience needs refinement

### Keep Real-time Processing If:

- <1% abandonment improvement or negative impact
- User satisfaction decreases significantly
- Technical reliability concerns
- Increased support burden outweighs benefits

### Long-term Success Metrics (6 months post-launch):

- **Sustained Abandonment Reduction:** Maintain lower abandonment rates
- **User Preference:** >70% of users prefer background processing
- **System Scalability:** Background processing handles 5x concurrent imports
- **Support Efficiency:** 25% reduction in import-related support tickets
