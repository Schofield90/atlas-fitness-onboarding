# Enhanced AI Lead Processing System

## Overview

The Enhanced AI Lead Processing System provides real-time intelligent analysis of every lead interaction using both Claude AI and OpenAI. This "AI-first" system automatically analyzes sentiment, detects buying signals, predicts conversion likelihood, and generates actionable insights for the sales team.

## Key Features

### 🤖 Real-Time AI Analysis
- **Sentiment Analysis**: Detects emotional state and sentiment changes in real-time
- **Buying Signal Detection**: Identifies strong, medium, and weak buying signals
- **Urgency Assessment**: Scores urgency level from 1-10 for immediate follow-up
- **Conversion Likelihood**: Predicts probability of conversion with timeline
- **Communication Style Analysis**: Determines preferred communication approach

### ⚡ Multi-AI Integration
- **Claude AI**: Primary conversational analysis and deep insights
- **OpenAI GPT-4**: Structured data extraction and scoring
- **Fallback System**: Automatic fallback between services for reliability
- **Model Selection**: Uses appropriate models for speed vs. accuracy

### 🔄 Processing Modes
- **Real-Time Processing**: Instant analysis on message receipt (< 2 seconds)
- **Background Processing**: Deeper analysis for non-urgent insights
- **Bulk Processing**: Batch analysis for large lead databases
- **Scheduled Refresh**: Automatic updates for stale insights

### 📊 Comprehensive Insights
- **Pain Points & Motivations**: Identifies what drives the lead
- **Objections & Risk Factors**: Highlights potential deal blockers
- **Next Best Actions**: AI-recommended follow-up strategies
- **Best Contact Times**: Optimal timing for outreach
- **Interest Analysis**: Specific fitness interests and preferences

## System Architecture

### Core Components

1. **Enhanced Lead Processor** (`/app/lib/ai/enhanced-lead-processor.ts`)
   - Main processing engine
   - Combines Claude + OpenAI analysis
   - Caching layer for performance

2. **Real-Time Processor** (`/app/lib/ai/real-time-processor.ts`)
   - Fast message analysis
   - Urgent alert detection
   - Staff notification generation

3. **Background Processor** (`/app/lib/ai/background-processor.ts`)
   - Job queue management
   - Batch processing
   - Retry logic and error handling

4. **Webhook Integration** (`/app/api/webhooks/twilio/route.ts`)
   - Enhanced with AI processing
   - Non-blocking async analysis
   - Automatic lead scoring updates

### Database Schema

#### Core Tables
- `lead_ai_insights` - Stores all AI-generated insights with expiration
- `lead_scoring_factors` - Enhanced scoring with AI component
- `ai_processing_jobs` - Background job queue
- `real_time_processing_logs` - Real-time processing metrics
- `staff_notifications` - AI-generated alerts
- `tasks` - AI-generated follow-up tasks

## API Endpoints

### Core Processing APIs

#### Process Single Lead
```
POST /api/ai/process-lead
```
Triggers comprehensive AI analysis for a specific lead.

**Request Body:**
```json
{
  "leadId": "uuid",
  "forceRefresh": false,
  "useClaudeForAnalysis": true,
  "includeHistoricalData": true,
  "realTimeProcessing": false
}
```

**Response:**
```json
{
  "success": true,
  "leadId": "uuid",
  "analysis": {
    "buyingSignals": {
      "signals": ["urgent timeline", "budget confirmed"],
      "strength": "high",
      "confidence": 0.85,
      "explanation": "Lead expressed urgent need and confirmed budget"
    },
    "sentiment": {
      "overall": "positive",
      "confidence": 0.92,
      "indicators": ["excited tone", "multiple questions"],
      "emotionalState": ["motivated", "eager"]
    },
    "conversionLikelihood": {
      "percentage": 78,
      "confidence": 0.81,
      "timeline": "immediate",
      "urgencyLevel": 8
    },
    "interests": ["weight loss", "personal training"],
    "painPoints": ["lack of time", "previous gym disappointment"],
    "nextBestActions": [
      {
        "action": "Schedule consultation within 24 hours",
        "priority": "high",
        "timeframe": "immediate",
        "reasoning": "High urgency and strong buying signals"
      }
    ]
  },
  "processingTime": 2341,
  "aiModelsUsed": ["claude-3-sonnet", "gpt-4"]
}
```

#### Get Lead Insights
```
GET /api/ai/lead-insights/{leadId}
```
Retrieves cached AI insights for a lead.

#### Bulk Process Leads
```
POST /api/ai/bulk-process
```
Process multiple leads in batches.

**Request Body:**
```json
{
  "leadIds": ["uuid1", "uuid2"],
  "filters": {
    "status": ["new", "warm"],
    "scoreRange": { "min": 40, "max": 100 },
    "createdAfter": "2024-01-01"
  },
  "processingOptions": {
    "forceRefresh": false,
    "batchSize": 10
  }
}
```

#### System Monitoring
```
GET /api/ai/monitoring
```
Comprehensive system health and performance metrics.

#### Test System
```
POST /api/ai/test-system
```
Validates all AI system components.

## Real-Time Processing Flow

### Message Processing Pipeline

1. **Message Receipt** (Twilio Webhook)
   - Message logged to database
   - Conversation context updated
   - AI processing triggered asynchronously

2. **Real-Time Analysis** (< 2 seconds)
   - Sentiment analysis with Claude Haiku
   - Urgency detection
   - Buying signal identification
   - Staff notification generation

3. **Alert Generation**
   - Urgent alerts (≥8/10 urgency) → Immediate staff notification
   - High priority alerts → Task creation
   - Sentiment changes → Alert logging

4. **Background Processing Queue**
   - Deep analysis for high-urgency leads
   - Comprehensive insights generation
   - Lead score recalculation

### Staff Notification System

#### Urgency Levels
- **Urgent (9-10)**: Immediate phone call required
- **High (7-8)**: Follow-up within 2 hours
- **Medium (5-6)**: Follow-up within 24 hours
- **Low (1-4)**: Standard follow-up schedule

#### Notification Types
- **SMS to staff** (configurable)
- **Email alerts** (configurable)
- **In-app notifications**
- **Slack/Teams integration** (optional)

## Performance Optimization

### Caching Strategy
- **24-hour cache** for full analysis
- **2-hour cache** for real-time insights
- **Smart invalidation** on new interactions
- **Background refresh** for stale data

### Processing Optimization
- **Model Selection**: Fast models for real-time, accurate for deep analysis
- **Batch Processing**: Optimized for bulk operations
- **Connection Pooling**: Efficient AI service usage
- **Rate Limiting**: Prevents API quota exhaustion

### Monitoring & Alerting
- **Processing time tracking**
- **Error rate monitoring**
- **Success rate metrics**
- **Resource usage analysis**

## Configuration

### Environment Variables
```bash
# AI Services
ANTHROPIC_API_KEY=your_claude_api_key
OPENAI_API_KEY=your_openai_api_key

# Database
DATABASE_URL=your_database_url
DIRECT_URL=your_direct_database_url

# App Configuration
NEXT_PUBLIC_APP_URL=your_app_url
```

### AI Model Configuration
```javascript
// Real-time processing (speed prioritized)
CLAUDE_REAL_TIME_MODEL = 'claude-3-haiku-20240307'
OPENAI_REAL_TIME_MODEL = 'gpt-3.5-turbo'

// Deep analysis (accuracy prioritized)
CLAUDE_ANALYSIS_MODEL = 'claude-3-sonnet-20240229'
OPENAI_ANALYSIS_MODEL = 'gpt-4'
```

## Setup Instructions

### 1. Database Migration
```bash
# Apply the enhanced AI system migration
npm run supabase:migrate
```

### 2. Environment Configuration
Set up the required environment variables for AI services.

### 3. Background Processor
The background processor starts automatically but can be managed:

```javascript
import { backgroundProcessor } from '@/app/lib/ai/background-processor'

// Start background processing
backgroundProcessor.startProcessor(30000) // 30 second interval

// Stop background processing
backgroundProcessor.stopProcessor()
```

### 4. Test System
Validate the installation:

```bash
curl -X POST ${APP_URL}/api/ai/test-system \
  -H "Content-Type: application/json" \
  -d '{"testType": "comprehensive", "createTestData": true}'
```

## Usage Examples

### Trigger Lead Analysis
```javascript
// Process a single lead
const response = await fetch('/api/ai/process-lead', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    leadId: 'lead-uuid',
    forceRefresh: true
  })
})

const analysis = await response.json()
console.log('Conversion likelihood:', analysis.analysis.conversionLikelihood.percentage)
```

### Get Lead Insights
```javascript
// Get cached insights
const insights = await fetch(`/api/ai/lead-insights/${leadId}`)
const data = await insights.json()

console.log('Lead sentiment:', data.summary.sentiment)
console.log('Urgency level:', data.summary.urgencyLevel)
```

### Monitor System Health
```javascript
// Get system status
const monitoring = await fetch('/api/ai/monitoring')
const status = await monitoring.json()

console.log('System health:', status.health.overall)
console.log('Processing queue:', status.status.processingJobs.pending)
```

## Troubleshooting

### Common Issues

#### AI Services Not Responding
1. Check API keys in environment variables
2. Verify network connectivity to AI services
3. Check rate limiting and quotas
4. Review error logs in `ai_processing_errors` table

#### Slow Processing Times
1. Check AI service response times
2. Review database query performance
3. Verify caching is working correctly
4. Consider increasing background processor capacity

#### Missing Insights
1. Verify database migrations are applied
2. Check lead has recent interactions
3. Ensure AI services are configured correctly
4. Review processing job status

### Monitoring Queries

```sql
-- Check recent processing performance
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as messages,
  AVG(processing_time_ms) as avg_time,
  COUNT(*) FILTER (WHERE urgency_level >= 8) as urgent_count
FROM real_time_processing_logs 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;

-- Check AI processing job status
SELECT 
  status,
  COUNT(*) as count,
  AVG(processing_time_ms) as avg_time
FROM ai_processing_jobs 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Check error rates
SELECT 
  error_type,
  COUNT(*) as error_count,
  MAX(created_at) as last_occurrence
FROM ai_processing_errors 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY error_type;
```

## Best Practices

### Performance
- Use real-time processing only for urgent analysis
- Leverage caching for repeated requests
- Process in batches during off-peak hours
- Monitor and optimize slow queries

### Reliability
- Implement proper error handling and retries
- Use fallback AI services
- Monitor system health continuously
- Set up alerting for critical failures

### Security
- Secure AI API keys properly
- Implement rate limiting
- Audit AI processing logs
- Follow data privacy best practices

## Support & Maintenance

### Regular Tasks
- **Weekly**: Review processing performance metrics
- **Monthly**: Analyze AI accuracy and update prompts
- **Quarterly**: Review and optimize model selection
- **Annually**: Evaluate new AI services and features

### Scaling Considerations
- **High Volume**: Increase background processor instances
- **Multiple Regions**: Consider regional AI service deployment
- **Enterprise**: Implement dedicated AI service instances

For additional support or questions about the Enhanced AI Lead Processing System, refer to the monitoring dashboard at `/api/ai/monitoring` or run system tests at `/api/ai/test-system`.