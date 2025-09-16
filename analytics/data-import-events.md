# Data Import Analytics - Event Schema & Implementation

## Overview

Comprehensive analytics framework for GoTeamUp to Atlas Fitness CRM data migration experience, designed to optimize user success rates and minimize friction for non-technical gym owners.

## Event Schema Design

### Core Import Journey Events

#### 1. Import Session Started

```typescript
event: 'migration_session_started'
properties: {
  sessionId: string,           // Unique session identifier
  userId: string,              // User ID
  organizationId: string,      // Organization ID
  sourceSystem: 'goteamup',    // Migration source
  entryPoint: 'direct_nav' | 'dashboard_cta' | 'settings_nav' | 'onboarding',
  timestamp: Date,
  userContext: {
    accountAge: number,        // Days since account creation
    previousAttempts: number,  // Previous failed migration attempts
    techSavviness: 'low' | 'medium' | 'high', // Inferred from behavior
    organizationSize: 'small' | 'medium' | 'large'
  }
}
```

#### 2. File Upload Events

```typescript
// File upload initiated
event: 'file_upload_started'
properties: {
  sessionId: string,
  uploadMethod: 'drag_drop' | 'click_select',
  fileCount: number,
  timestamp: Date
}

// Individual file validated
event: 'file_validated'
properties: {
  sessionId: string,
  fileName: string,
  fileSize: number,           // Bytes
  fileType: string,           // MIME type
  isValid: boolean,
  validationErrors: string[], // If invalid
  uploadDuration: number,     // Milliseconds
  timestamp: Date
}

// Upload completed
event: 'file_upload_completed'
properties: {
  sessionId: string,
  totalFiles: number,
  validFiles: number,
  totalSizeBytes: number,
  uploadDuration: number,
  timestamp: Date
}
```

#### 3. AI Analysis Events

```typescript
// Analysis started
event: 'ai_analysis_started'
properties: {
  sessionId: string,
  migrationJobId: string,
  fileCount: number,
  totalRecords: number,       // Estimated from file analysis
  timestamp: Date
}

// Analysis progress
event: 'ai_analysis_progress'
properties: {
  sessionId: string,
  migrationJobId: string,
  progressPercentage: number,
  currentStage: 'parsing' | 'field_detection' | 'mapping' | 'validation',
  elapsedTime: number,        // Milliseconds
  timestamp: Date
}

// Analysis completed
event: 'ai_analysis_completed'
properties: {
  sessionId: string,
  migrationJobId: string,
  totalDuration: number,      // Milliseconds
  fieldsDetected: number,
  mappingsGenerated: number,
  averageConfidence: number,  // 0-1
  recommendationsCount: number,
  dataQualityScore: number,   // 0-1
  timestamp: Date
}
```

#### 4. Field Mapping Events

```typescript
// Mapping review started
event: 'field_mapping_review_started'
properties: {
  sessionId: string,
  migrationJobId: string,
  totalMappings: number,
  highConfidenceMappings: number, // >0.8 confidence
  timestamp: Date
}

// Mapping modified by user
event: 'field_mapping_modified'
properties: {
  sessionId: string,
  sourceField: string,
  originalTargetField: string,
  newTargetField: string,
  originalConfidence: number,
  mappingMethod: 'ai_suggestion' | 'manual_override' | 'user_created',
  timestamp: Date
}

// Mapping review completed
event: 'field_mapping_review_completed'
properties: {
  sessionId: string,
  totalMappings: number,
  userModifications: number,
  reviewDuration: number,     // Milliseconds
  finalConfidenceScore: number,
  timestamp: Date
}
```

#### 5. Import Execution Events

```typescript
// Import started
event: 'data_import_started'
properties: {
  sessionId: string,
  migrationJobId: string,
  estimatedRecords: number,
  batchSize: number,
  importSettings: {
    skipDuplicates: boolean,
    validateData: boolean,
    createBackup: boolean
  },
  timestamp: Date
}

// Import progress
event: 'data_import_progress'
properties: {
  sessionId: string,
  migrationJobId: string,
  recordsProcessed: number,
  recordsSuccessful: number,
  recordsFailed: number,
  progressPercentage: number,
  currentTable: string,
  elapsedTime: number,
  timestamp: Date
}

// Import completed
event: 'data_import_completed'
properties: {
  sessionId: string,
  migrationJobId: string,
  totalDuration: number,      // Milliseconds
  finalStatus: 'success' | 'partial_success' | 'failed',
  recordsProcessed: number,
  recordsSuccessful: number,
  recordsFailed: number,
  errorCategories: string[],  // ['validation', 'duplicate', 'system']
  successRate: number,        // 0-1
  timestamp: Date
}
```

#### 6. User Experience Events

```typescript
// User drop-off
event: 'migration_abandoned'
properties: {
  sessionId: string,
  abandonmentStage: 'upload' | 'analysis' | 'mapping' | 'review' | 'import',
  timeSpent: number,          // Milliseconds
  lastAction: string,
  abandonment_reason?: 'timeout' | 'navigation' | 'error' | 'unknown',
  progressMade: number,       // 0-1
  timestamp: Date
}

// Help/support accessed
event: 'migration_help_accessed'
properties: {
  sessionId: string,
  helpType: 'template_download' | 'documentation' | 'support_chat' | 'video_tutorial',
  currentStage: string,
  timestamp: Date
}

// Error encountered
event: 'migration_error_encountered'
properties: {
  sessionId: string,
  errorType: 'upload_error' | 'analysis_error' | 'mapping_error' | 'import_error',
  errorCode: string,
  errorMessage: string,
  isRecoverable: boolean,
  userAction: 'retry' | 'abandon' | 'seek_help',
  timestamp: Date
}
```

### Success Metrics Events

#### 7. Milestone Events

```typescript
// First successful upload
event: 'migration_milestone_first_upload'
properties: {
  sessionId: string,
  timeToFirstUpload: number,  // Milliseconds from session start
  attemptCount: number,
  timestamp: Date
}

// Analysis completed under 5 minutes
event: 'migration_milestone_fast_analysis'
properties: {
  sessionId: string,
  analysisDuration: number,   // Milliseconds
  timestamp: Date
}

// High confidence mapping achieved
event: 'migration_milestone_high_confidence'
properties: {
  sessionId: string,
  averageConfidence: number,
  timestamp: Date
}

// Import completion
event: 'migration_milestone_import_complete'
properties: {
  sessionId: string,
  totalSessionDuration: number,
  endToEndDuration: number,   // Upload to completion
  finalSuccessRate: number,
  timestamp: Date
}
```

## Implementation Examples

### 1. Analytics Client Extension

```typescript
// Extend existing analytics client with migration-specific methods
import { analytics } from "@/app/lib/analytics/client";

class MigrationAnalytics {
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  trackSessionStart(entryPoint: string, userContext: any) {
    analytics.trackCustomEvent("migration_session_started", {
      sessionId: this.sessionId,
      entryPoint,
      userContext,
      timestamp: new Date(),
    });
  }

  trackFileUpload(method: "drag_drop" | "click_select", fileCount: number) {
    analytics.trackCustomEvent("file_upload_started", {
      sessionId: this.sessionId,
      uploadMethod: method,
      fileCount,
      timestamp: new Date(),
    });
  }

  trackFileValidation(file: File, isValid: boolean, errors: string[] = []) {
    analytics.trackCustomEvent("file_validated", {
      sessionId: this.sessionId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isValid,
      validationErrors: errors,
      timestamp: new Date(),
    });
  }

  trackAnalysisProgress(jobId: string, progress: number, stage: string) {
    analytics.trackCustomEvent("ai_analysis_progress", {
      sessionId: this.sessionId,
      migrationJobId: jobId,
      progressPercentage: progress,
      currentStage: stage,
      timestamp: new Date(),
    });
  }

  trackMappingModification(
    sourceField: string,
    oldTarget: string,
    newTarget: string,
  ) {
    analytics.trackCustomEvent("field_mapping_modified", {
      sessionId: this.sessionId,
      sourceField,
      originalTargetField: oldTarget,
      newTargetField: newTarget,
      mappingMethod: "manual_override",
      timestamp: new Date(),
    });
  }

  trackAbandonment(stage: string, reason?: string) {
    analytics.trackCustomEvent("migration_abandoned", {
      sessionId: this.sessionId,
      abandonmentStage: stage,
      timeSpent: Date.now() - this.sessionStartTime,
      abandonment_reason: reason,
      timestamp: new Date(),
    });
  }

  private generateSessionId(): string {
    return `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const migrationAnalytics = new MigrationAnalytics();
```

### 2. Component Integration Example

```typescript
// In MigrationWizard.tsx - Add analytics calls
const handleFileUpload = useCallback(async (files: FileList) => {
  // Track upload start
  migrationAnalytics.trackFileUpload("click_select", files.length);

  setIsLoading(true);
  setError("");

  try {
    const uploads: FileUpload[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let isValid = true;
      let errors: string[] = [];

      // Validate file
      if (file.size > 100 * 1024 * 1024) {
        isValid = false;
        errors.push("File too large (max 100MB)");
      }

      if (!validFileTypes.includes(file.type)) {
        isValid = false;
        errors.push("Invalid file type");
      }

      // Track validation result
      migrationAnalytics.trackFileValidation(file, isValid, errors);

      if (!isValid) {
        throw new Error(`File ${file.name}: ${errors.join(", ")}`);
      }

      const preview = await generateFilePreview(file);
      uploads.push({ file, preview });
    }

    setUploadedFiles(uploads);

    // Track successful upload completion
    analytics.trackCustomEvent("file_upload_completed", {
      sessionId: migrationAnalytics.sessionId,
      totalFiles: uploads.length,
      validFiles: uploads.length,
      totalSizeBytes: uploads.reduce((sum, u) => sum + u.file.size, 0),
      timestamp: new Date(),
    });
  } catch (err) {
    migrationAnalytics.trackError("upload_error", err.message);
  } finally {
    setIsLoading(false);
  }
}, []);
```

## Validation Queries

### 1. Success Rate Analysis

```sql
-- Migration success rate by week
SELECT
  DATE_TRUNC('week', timestamp) as week,
  COUNT(*) as total_attempts,
  COUNT(*) FILTER (WHERE metadata->>'finalStatus' = 'success') as successful,
  ROUND(
    COUNT(*) FILTER (WHERE metadata->>'finalStatus' = 'success') * 100.0 / COUNT(*),
    2
  ) as success_rate_percent
FROM analytics_events
WHERE type = 'custom'
  AND metadata->>'eventName' = 'data_import_completed'
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY week
ORDER BY week;
```

### 2. Drop-off Analysis

```sql
-- Funnel drop-off rates by stage
WITH funnel_stages AS (
  SELECT
    session_id,
    MAX(CASE WHEN metadata->>'eventName' = 'migration_session_started' THEN 1 ELSE 0 END) as started,
    MAX(CASE WHEN metadata->>'eventName' = 'file_upload_completed' THEN 1 ELSE 0 END) as uploaded,
    MAX(CASE WHEN metadata->>'eventName' = 'ai_analysis_completed' THEN 1 ELSE 0 END) as analyzed,
    MAX(CASE WHEN metadata->>'eventName' = 'field_mapping_review_completed' THEN 1 ELSE 0 END) as reviewed,
    MAX(CASE WHEN metadata->>'eventName' = 'data_import_completed' THEN 1 ELSE 0 END) as completed
  FROM analytics_events
  WHERE type = 'custom'
    AND timestamp >= NOW() - INTERVAL '7 days'
    AND metadata->>'sessionId' IS NOT NULL
  GROUP BY metadata->>'sessionId'
)
SELECT
  SUM(started) as started_sessions,
  SUM(uploaded) as uploaded_files,
  SUM(analyzed) as completed_analysis,
  SUM(reviewed) as reviewed_mappings,
  SUM(completed) as completed_imports,
  ROUND(SUM(uploaded) * 100.0 / NULLIF(SUM(started), 0), 2) as upload_conversion,
  ROUND(SUM(analyzed) * 100.0 / NULLIF(SUM(uploaded), 0), 2) as analysis_conversion,
  ROUND(SUM(reviewed) * 100.0 / NULLIF(SUM(analyzed), 0), 2) as review_conversion,
  ROUND(SUM(completed) * 100.0 / NULLIF(SUM(reviewed), 0), 2) as import_conversion
FROM funnel_stages;
```

### 3. Performance Metrics

```sql
-- Average time spent at each stage
SELECT
  'File Upload' as stage,
  AVG((metadata->>'uploadDuration')::numeric / 1000) as avg_seconds,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (metadata->>'uploadDuration')::numeric / 1000) as median_seconds
FROM analytics_events
WHERE type = 'custom'
  AND metadata->>'eventName' = 'file_upload_completed'
  AND timestamp >= NOW() - INTERVAL '7 days'

UNION ALL

SELECT
  'AI Analysis',
  AVG((metadata->>'totalDuration')::numeric / 1000),
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (metadata->>'totalDuration')::numeric / 1000)
FROM analytics_events
WHERE type = 'custom'
  AND metadata->>'eventName' = 'ai_analysis_completed'
  AND timestamp >= NOW() - INTERVAL '7 days';
```
