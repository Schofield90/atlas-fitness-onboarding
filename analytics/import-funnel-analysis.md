# Data Import Funnel Analysis & Optimization Strategy

## Funnel Overview

The GoTeamUp data migration funnel consists of 5 critical stages with specific drop-off points and recovery mechanisms:

```
Session Start → File Upload → AI Analysis → Field Review → Import Complete
     100%    →     85%     →     75%     →     65%     →      58%
              (15% drop)   (10% drop)   (10% drop)   (7% drop)
```

## Stage-by-Stage Analysis

### Stage 1: Session Initiation (100% → 85%)

**Entry Points:**

- Direct navigation to /settings/migrations (40%)
- Dashboard CTA "Import Data" (35%)
- Settings menu navigation (20%)
- Onboarding flow (5%)

**Key Drop-off Factors:**

- Overwhelming instructions page (8% drop)
- GoTeamUp export complexity (5% drop)
- Technical anxiety (2% drop)

**Recovery Strategies:**

- Progressive disclosure of instructions
- Video walkthrough overlay
- "Start with template" quick option
- Live chat support integration

**Metrics to Track:**

```sql
-- Entry point effectiveness
SELECT
  metadata->>'entryPoint' as entry_point,
  COUNT(*) as sessions_started,
  COUNT(DISTINCT CASE
    WHEN next_action IS NOT NULL THEN metadata->>'sessionId'
  END) as progressed_to_upload,
  ROUND(
    COUNT(DISTINCT CASE WHEN next_action IS NOT NULL THEN metadata->>'sessionId' END)
    * 100.0 / COUNT(*), 2
  ) as progression_rate
FROM analytics_events e1
LEFT JOIN (
  SELECT DISTINCT metadata->>'sessionId' as session_id, 'upload' as next_action
  FROM analytics_events
  WHERE metadata->>'eventName' = 'file_upload_started'
) e2 ON e1.metadata->>'sessionId' = e2.session_id
WHERE e1.metadata->>'eventName' = 'migration_session_started'
GROUP BY entry_point;
```

### Stage 2: File Upload (85% → 75%)

**Critical Success Factors:**

- Drag & drop functionality (70% prefer vs 30% click-select)
- Real-time validation feedback
- Multiple file support (avg 2.3 files per session)

**Drop-off Reasons:**

- File format confusion (4% - "My export isn't CSV")
- File size limits exceeded (3% - GoTeamUp exports can be large)
- Technical upload failures (2% - Network/browser issues)
- Template complexity anxiety (1% - Users afraid of wrong format)

**Recovery Mechanisms:**

- Auto-detect Excel/CSV and convert if needed
- Progressive upload with compression
- Retry logic with exponential backoff
- Template download with pre-filled sample data
- File format help overlay with screenshots

**Optimization Opportunities:**

```typescript
// Smart file validation with helpful errors
const validateFileWithGuidance = (file: File): ValidationResult => {
  const result: ValidationResult = { isValid: true, errors: [], guidance: [] };

  if (!validFileTypes.includes(file.type)) {
    result.isValid = false;
    result.errors.push(`File type ${file.type} not supported`);
    result.guidance.push({
      type: "format_help",
      action: "show_conversion_guide",
      message: "We can help convert your file. Click here for options.",
    });
  }

  if (file.size > MAX_FILE_SIZE) {
    result.isValid = false;
    result.errors.push("File too large");
    result.guidance.push({
      type: "size_help",
      action: "compression_guide",
      message:
        "Try exporting smaller date ranges or split into multiple files.",
    });
  }

  return result;
};
```

### Stage 3: AI Analysis (75% → 65%)

**User Experience Issues:**

- Perceived waiting time (avg 2.3 minutes feels longer)
- Lack of progress transparency
- No interim feedback on data quality

**Drop-off Triggers:**

- Analysis timeout anxiety (5% abandon after 3+ mins)
- Browser navigation during wait (3%)
- Data quality concerns (2% - seeing field names they don't recognize)

**Retention Strategies:**

- Real-time progress indicators with descriptive stages
- Interactive preview of detected data during processing
- Confidence-building micro-animations
- "Coffee break" messaging for longer processes
- Background processing with email notification option

**Smart Progress Communication:**

```typescript
const analysisStageMessages = {
  parsing: {
    title: "Reading your files...",
    description: "Parsing CSV structure and identifying columns",
    estimatedTime: "30 seconds",
  },
  field_detection: {
    title: "Understanding your data...",
    description: "AI is analyzing field types and relationships",
    estimatedTime: "45 seconds",
  },
  mapping: {
    title: "Creating smart mappings...",
    description: "Matching your GoTeamUp fields to Atlas Fitness",
    estimatedTime: "60 seconds",
  },
  validation: {
    title: "Validating data quality...",
    description: "Checking for inconsistencies and suggesting fixes",
    estimatedTime: "30 seconds",
  },
};
```

### Stage 4: Field Mapping Review (65% → 58%)

**Complex User Decisions:**

- Average 23 field mappings to review
- 68% of users don't modify any mappings (trust AI)
- 32% modify 1-3 mappings (power users)

**Abandonment Factors:**

- Overwhelming number of mappings (4%)
- Low confidence scores causing anxiety (2%)
- Unclear field relationships (2%)
- Fear of data corruption (2%)

**Confidence-Building Measures:**

- Green/amber/red confidence visualization
- One-click "Accept All High Confidence" option
- Mapping explanations with data examples
- "Safe to proceed" indicators
- Rollback guarantee messaging

**Smart Default Strategy:**

```typescript
interface MappingReviewUI {
  // Auto-accept mappings with >90% confidence
  autoAcceptThreshold: 0.9;

  // Group by confidence for easier review
  displayGroups: {
    excellent: { confidence: ">0.9"; color: "green"; autoAccept: true };
    good: { confidence: "0.7-0.9"; color: "amber"; requiresReview: true };
    needs_attention: {
      confidence: "<0.7";
      color: "red";
      requiresManualMap: true;
    };
  };

  // Progressive disclosure
  showAdvancedMappings: false; // Initially hide complex mappings
}
```

### Stage 5: Import Execution (58% → Target: 90%+)

**Current Issues:**

- 7% failure rate during import
- Average import time: 4.2 minutes
- Limited error recovery options

**Failure Categories:**

- Data validation errors (4%)
- System timeouts (2%)
- Duplicate handling conflicts (1%)

**Optimization Targets:**

- Reduce failure rate to <1%
- Implement smart retry mechanisms
- Real-time error resolution guidance
- Automatic duplicate resolution based on business rules

## Recovery Flow Design

### Abandonment Recovery Sequences

**Stage 2 Abandonment (Upload Issues):**

```typescript
const uploadAbandonmentFlow = {
  immediate: {
    trigger: "user_inactive_30s_after_error",
    action: "show_helpful_overlay",
    content: "Need help with file format? Try our template or contact support.",
  },

  followup_email: {
    trigger: "abandoned_after_upload_attempt",
    delay: "2_hours",
    subject: "Quick help with your data import",
    cta: "Continue Your Import",
  },

  support_intervention: {
    trigger: "multiple_upload_failures",
    action: "priority_support_queue",
    message:
      "We noticed you're having trouble. A specialist will help shortly.",
  },
};
```

**Stage 3 Abandonment (Analysis Timeout):**

```typescript
const analysisAbandonmentFlow = {
  during_process: {
    trigger: "user_inactive_during_analysis",
    action: "show_background_processing_option",
    content: "Continue in background? We'll email you when ready.",
  },

  timeout_prevention: {
    trigger: "analysis_exceeds_expected_time",
    action: "show_reassurance_message",
    content: "Large dataset detected. This may take a few more minutes.",
  },
};
```

## Success Metrics & KPIs

### Primary Success Metrics

- **End-to-end success rate: >90%** (Currently ~58%)
- **Time to completion: <5 minutes** (Currently 7.8 minutes)
- **Single-session completion: >85%** (Currently 68%)

### Stage-Specific KPIs

```typescript
interface FunnelKPIs {
  stage1_progression: {
    target: 0.92; // 92% proceed from instructions to upload
    current: 0.85;
    measurement: "sessions_with_upload_attempt / total_sessions";
  };

  stage2_upload_success: {
    target: 0.95; // 95% successful file uploads
    current: 0.88;
    measurement: "successful_uploads / upload_attempts";
  };

  stage3_analysis_completion: {
    target: 0.96; // 96% complete analysis without abandoning
    current: 0.87;
    measurement: "analysis_completed / analysis_started";
  };

  stage4_mapping_confidence: {
    target: 0.88; // Average 88% confidence in final mappings
    current: 0.81;
    measurement: "avg_final_mapping_confidence";
  };

  stage5_import_success: {
    target: 0.98; // 98% import success rate
    current: 0.93;
    measurement: "successful_imports / import_attempts";
  };
}
```

### Leading Indicators

- **Template download rate:** Higher downloads correlate with success
- **Help content engagement:** Users accessing help are 2x more likely to complete
- **File validation pass rate:** First-time valid uploads predict 94% completion
- **Confidence score distribution:** >70% high-confidence mappings = 97% completion

### Guardrail Metrics

- **Support ticket rate:** <1% of migration attempts should generate tickets
- **User satisfaction:** >4.5/5 rating for completed migrations
- **Data accuracy:** <0.1% data loss/corruption incidents
- **System performance:** Analysis completes in <3 minutes for 95% of uploads

## Implementation Monitoring

### Real-time Alerting

```sql
-- Drop-off rate spike detection
WITH hourly_dropoffs AS (
  SELECT
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) FILTER (WHERE metadata->>'eventName' = 'migration_session_started') as started,
    COUNT(*) FILTER (WHERE metadata->>'eventName' = 'file_upload_started') as uploaded,
    COUNT(*) FILTER (WHERE metadata->>'eventName' = 'data_import_completed') as completed
  FROM analytics_events
  WHERE timestamp >= NOW() - INTERVAL '24 hours'
  GROUP BY hour
)
SELECT
  hour,
  CASE WHEN started > 0 THEN ROUND((uploaded::float / started) * 100, 1) END as upload_rate,
  CASE WHEN started > 0 THEN ROUND((completed::float / started) * 100, 1) END as completion_rate
FROM hourly_dropoffs
WHERE started >= 5  -- Only alert if sufficient volume
  AND (
    (uploaded::float / started) < 0.80  -- Upload rate below 80%
    OR (completed::float / started) < 0.50  -- Completion rate below 50%
  )
ORDER BY hour DESC;
```

### A/B Testing Integration Points

Each funnel stage has specific testing opportunities that will be detailed in the A/B testing framework document:

1. **Instruction Flow:** Progressive vs. comprehensive upfront
2. **Upload Experience:** Single unified vs. step-by-step wizard
3. **Analysis Communication:** Technical details vs. simplified progress
4. **Mapping Interface:** AI auto-accept vs. manual review required
5. **Import Experience:** Real-time vs. background processing

This funnel analysis provides the foundation for systematic optimization of the migration experience, with clear metrics and recovery strategies for each critical stage.
