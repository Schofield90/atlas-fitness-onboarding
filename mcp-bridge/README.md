# MCP Bridge Service

A Node.js HTTP service that acts as a bridge between n8n workflows and Claude's Meta MCP capabilities. This service receives HTTP requests from n8n, forwards them to Claude via MCP, and returns processed Meta Ads data for automation workflows.

## 🏗️ Architecture

```
n8n Workflow → HTTP Request → MCP Bridge Service → Claude MCP Server → Meta Ads API
                                    ↓
n8n Workflow ← Processed Data ← MCP Bridge Service ← Claude Response ← Meta Ads Data
```

## 🚀 Features

- **HTTP REST API** for n8n integration
- **MCP Client** for Claude communication
- **Data Processing** for Meta Ads performance analysis
- **Error Handling** with retry mechanisms
- **Rate Limiting** and caching
- **Comprehensive Logging** and monitoring
- **Health Checks** and status endpoints
- **Docker Support** for easy deployment

## 📋 Requirements

- Node.js 18+
- Running Claude MCP server
- Access to Meta Ads API via MCP
- Redis (optional, for enhanced caching)

## 🛠️ Installation

### 1. Clone and Setup
```bash
git clone <repository-url>
cd mcp-bridge
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start the Service
```bash
# Development
npm run dev

# Production
npm start

# Docker
docker-compose up -d
```

## 🔧 Configuration

### Environment Variables

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# MCP Configuration
MCP_SERVER_URL=ws://localhost:8080
MCP_TIMEOUT=30000
MCP_MAX_RETRIES=3

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/mcp-bridge.log

# Meta Ads Thresholds
CPL_WARNING_THRESHOLD=25
CPL_CRITICAL_THRESHOLD=40
SPEND_WARNING_THRESHOLD=100
SPEND_CRITICAL_THRESHOLD=200
CTR_WARNING_THRESHOLD=0.8
CTR_CRITICAL_THRESHOLD=0.5
```

## 📡 API Endpoints

### POST /mcp
Main MCP endpoint for all operations.

#### Get All Ad Accounts
```json
{
  "action": "get_all_ad_accounts",
  "request_id": "uuid-here",
  "limit": 25
}
```

**Response:**
```json
{
  "success": true,
  "accounts": [
    {
      "id": "act_123456789",
      "name": "Gym Name",
      "account_status": 1,
      "currency": "GBP",
      "amount_spent": "1234567"
    }
  ],
  "request_id": "uuid-here",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### Get Campaign Insights
```json
{
  "action": "get_campaign_insights",
  "request_id": "uuid-here",
  "account_id": "act_123456789",
  "time_ranges": ["yesterday", "last_3d", "last_5d"],
  "level": "campaign",
  "fields": ["campaign_id", "campaign_name", "spend", "impressions"]
}
```

**Response:**
```json
{
  "success": true,
  "insights": {
    "yesterday": {
      "campaigns": [
        {
          "campaign_id": "campaign_123",
          "campaign_name": "Women January",
          "spend": 62.50,
          "leads": 5,
          "costPerLead": 12.50,
          "ctr": 1.5,
          "issues": [],
          "severity": "good"
        }
      ],
      "account_metrics": {
        "totalSpend": 62.50,
        "totalLeads": 5,
        "averageCPL": 12.50,
        "healthScore": 85
      }
    }
  },
  "trends": {
    "totalSpend": {
      "direction": "increasing",
      "severity": "neutral"
    }
  },
  "request_id": "uuid-here",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### Generate AI Analysis
```json
{
  "action": "generate_ai_analysis",
  "request_id": "uuid-here",
  "performance_data": {
    "accounts": [...],
    "summary": {...}
  },
  "analysis_type": "daily",
  "context": {
    "business_type": "gym",
    "target_market": "uk"
  }
}
```

**Response:**
```json
{
  "success": true,
  "analysis_type": "daily",
  "raw_analysis": "## EXECUTIVE SUMMARY\n\nOverall performance shows...",
  "recommendations": [
    "Pause Campaign X due to high CPL",
    "Increase budget for Campaign Y"
  ],
  "priority_actions": [
    {
      "action": "Reduce audience size for Campaign Z",
      "urgency": "high",
      "estimated_impact": "high"
    }
  ],
  "budget_suggestions": [
    "Reallocate 30% budget from underperforming campaigns"
  ],
  "confidence_score": 0.85,
  "request_id": "uuid-here",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### GET /health
Health check endpoint returning service status.

### GET /docs
API documentation with examples.

### POST /mcp/bulk
Bulk operations for multiple accounts.

### DELETE /mcp/cache
Clear the internal cache.

## 🔌 n8n Integration

### HTTP Request Node Configuration
```javascript
// URL
http://localhost:3000/mcp

// Method
POST

// Headers
{
  "Content-Type": "application/json",
  "X-Request-ID": "{{$node.uuid()}}"
}

// Body
{
  "action": "get_all_ad_accounts",
  "request_id": "{{$node.uuid()}}",
  "limit": 25
}
```

### Processing Response in n8n
```javascript
// Function Node to process MCP Bridge response
const response = $input.first().json;

if (response.success) {
  // Process accounts data
  const accounts = response.accounts;
  
  // Transform for n8n workflow
  return accounts.map(account => ({
    json: {
      account_id: account.id,
      account_name: account.name,
      status: account.account_status,
      currency: account.currency,
      spend: account.amount_spent
    }
  }));
} else {
  throw new Error(`MCP Bridge Error: ${response.message}`);
}
```

## 🔄 Data Processing

### Performance Metrics Calculated
- **Cost Per Lead (CPL)**: Spend divided by leads
- **Click-Through Rate (CTR)**: Clicks divided by impressions
- **Conversion Rate**: Leads divided by clicks
- **Health Score**: Overall campaign performance (0-100)

### Issue Detection
- **High CPL**: >£25 warning, >£40 critical
- **No Leads**: Spend >£100 with 0 leads
- **Low CTR**: <0.8% warning, <0.5% critical
- **High Frequency**: >3 (ad fatigue indicator)

### Trend Analysis
- Performance comparison across time periods
- Direction indicators (increasing/decreasing/stable)
- Severity assessment (neutral/warning/critical)

## 🐳 Docker Deployment

### Single Container
```bash
docker build -t mcp-bridge .
docker run -p 3000:3000 --env-file .env mcp-bridge
```

### Docker Compose
```bash
docker-compose up -d
```

Includes:
- MCP Bridge Service
- Redis for caching
- Nginx for load balancing
- Health checks and monitoring

## 🔧 Development

### Running Tests
```bash
npm test
npm run test:watch
npm run test:coverage
```

### Linting
```bash
npm run lint
npm run lint:fix
```

### Debugging
```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Enable verbose MCP logging
VERBOSE=true npm run dev
```

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Cache Statistics
```bash
curl http://localhost:3000/mcp/cache/stats
```

### Logs
```bash
# View logs
tail -f logs/mcp-bridge.log

# Error logs
tail -f logs/error.log
```

## 🔍 Troubleshooting

### Common Issues

#### MCP Connection Failed
```bash
# Check MCP server status
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"action": "get_all_ad_accounts", "request_id": "test-123"}'
```

#### Rate Limit Exceeded
```bash
# Check rate limit status
curl http://localhost:3000/mcp/cache/stats
```

#### High Memory Usage
```bash
# Clear cache
curl -X DELETE http://localhost:3000/mcp/cache
```

### Error Codes
- **400**: Bad Request (validation error)
- **429**: Too Many Requests (rate limited)
- **500**: Internal Server Error (MCP/processing error)
- **503**: Service Unavailable (MCP disconnected)

## 📈 Performance

### Benchmarks
- **Response Time**: <5s for account data, <30s for AI analysis
- **Throughput**: 100 requests per 15 minutes
- **Memory Usage**: <512MB under normal load
- **Cache Hit Rate**: >80% for repeated requests

### Optimization Tips
1. **Use caching** for frequently requested data
2. **Batch requests** using bulk endpoints
3. **Implement pagination** for large datasets
4. **Monitor rate limits** and implement backoff

## 🔒 Security

### Rate Limiting
- 100 requests per 15 minutes per IP
- Configurable windows and limits
- Automatic retry-after headers

### Input Validation
- Joi schema validation
- Request size limits (1MB)
- SQL injection prevention
- XSS protection

### Error Handling
- No sensitive data in error responses
- Structured error logging
- Graceful degradation

## 🚀 Production Deployment

### Prerequisites
1. **Claude MCP Server** running and accessible
2. **Meta Ads API** access configured
3. **Redis** for production caching (optional)
4. **Load balancer** for high availability

### Deployment Checklist
- [ ] Environment variables configured
- [ ] MCP server connection tested
- [ ] Health checks configured
- [ ] Logging setup verified
- [ ] Monitoring alerts configured
- [ ] Backup strategy implemented

### Scaling
- **Horizontal**: Multiple instances behind load balancer
- **Vertical**: Increase CPU/memory for heavy AI processing
- **Caching**: Redis cluster for distributed caching
- **Database**: For persistent storage of historical data

## 📚 API Reference

### Request Headers
```
Content-Type: application/json
X-Request-ID: uuid (optional)
```

### Response Format
```json
{
  "success": boolean,
  "data": object,
  "error": string,
  "message": string,
  "request_id": string,
  "timestamp": string
}
```

### Error Response
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Invalid account_id format",
  "details": [...],
  "request_id": "uuid",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Built for production-ready n8n and Claude MCP integration**