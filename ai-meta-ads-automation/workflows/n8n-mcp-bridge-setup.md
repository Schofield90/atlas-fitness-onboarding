
# n8n Setup Instructions for MCP Bridge

## 1. Import Updated Workflows

Import these updated workflow files into n8n:
- daily-analysis-mcp-bridge.json
- real-time-alerts-mcp-bridge.json

## 2. Configure HTTP Request Nodes

All HTTP Request nodes should be configured with:

**URL:** http://localhost:3000/mcp
**Method:** POST
**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-Request-ID": "={{$node.uuid()}}"
}
```

## 3. Test Individual Nodes

### Get All Ad Accounts
```json
{
  "action": "get_all_ad_accounts",
  "request_id": "={{$node.uuid()}}",
  "limit": 25
}
```

### Get Campaign Insights
```json
{
  "action": "get_campaign_insights",
  "request_id": "={{$node.uuid()}}",
  "account_id": "act_123456789",
  "time_ranges": ["yesterday"],
  "level": "campaign"
}
```

### Generate AI Analysis
```json
{
  "action": "generate_ai_analysis",
  "request_id": "={{$node.uuid()}}",
  "performance_data": {
    "accounts": [...],
    "summary": {...}
  },
  "analysis_type": "daily"
}
```

## 4. Error Handling

Add error handling to each HTTP Request node:

**On Error:** Continue
**Error Output:** Include error details

## 5. Activate Workflows

1. Ensure MCP Bridge Service is running on port 3000
2. Test individual nodes first
3. Activate the workflows
4. Monitor the logs for any issues

## 6. Monitoring

- Check MCP Bridge logs: tail -f /Users/samschofield/mcp-bridge/logs/mcp-bridge.log
- Check n8n execution logs
- Monitor health endpoint: http://localhost:3000/health
