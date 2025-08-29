# AI Intelligence Guide

The AI Intelligence module provides advanced analytics and automated insights with fallback mechanisms and demo data capabilities.

## Quick Start

Navigate to `/ai-intelligence` to access AI-powered analytics, insights, and an intelligent chatbot assistant.

## Fallback System

### Organization Fetch Fallback
The module implements a graceful fallback system when organization data cannot be retrieved:

```typescript
const fetchOrganization = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (userOrg) {
      setOrganizationId(userOrg.organization_id);
    } else {
      setError('No organization found');
      setLoading(false);
    }
  } catch (err) {
    console.error('Error fetching organization:', err);
    setError('Failed to get organization');
    setLoading(false);
  }
};
```

### AI Insights API Fallback
When the AI insights API fails, the system provides clear error messaging:

```typescript
const loadAIInsights = async () => {
  try {
    setError(null);
    const response = await fetch(`/api/ai/insights?organization_id=${organizationId}`);
    
    if (!response.ok) {
      throw new Error('Failed to load AI insights');
    }

    const data = await response.json();
    setAIInsights(data.insights);
  } catch (error) {
    console.error('Error loading AI insights:', error);
    setError('Failed to load AI insights');
  } finally {
    setLoading(false);
  }
};
```

## Demo Insights System

### AIInsights Data Structure
The system expects comprehensive insights data with the following structure:

```typescript
interface AIInsights {
  lead_scoring: {
    total_leads: number;
    high_priority: number;
    conversion_predictions: number;
    recent_scores: any[];
  };
  churn_prediction: {
    at_risk_customers: number;
    medium_risk: number;
    low_risk: number;
    retention_recommendations: string[];
  };
  revenue_forecasting: {
    next_month_prediction: number;
    confidence: number;
    trend: 'up' | 'down' | 'stable';
    factors: string[];
  };
  customer_insights: {
    total_customers: number;
    most_active_segment: string;
    engagement_score: number;
    recommendations: string[];
  };
  operational_insights: {
    peak_hours: string;
    popular_classes: string[];
    staff_utilization: number;
    capacity_optimization: string[];
  };
}
```

### Demo Data Features
When demo data is enabled via feature flags:

#### Lead Scoring Analytics
- **High Priority Leads**: Visual count with blue gradient styling
- **Conversion Predictions**: Algorithm-based lead quality scoring
- **Recent Scores**: Historical scoring data for trend analysis

#### Churn Prediction
- **Risk Segmentation**: At-risk, medium-risk, and low-risk customer categories
- **Retention Recommendations**: AI-generated action items for customer retention
- **Visual Risk Indicators**: Color-coded risk levels (red, yellow, green)

#### Revenue Forecasting  
- **Next Month Prediction**: Financial forecast with confidence percentage
- **Trend Analysis**: Up, down, or stable trend indicators
- **Key Factors**: Contributing elements to revenue predictions

#### Customer Intelligence
- **Total Customers**: Complete customer count
- **Active Segments**: Most engaged customer demographics  
- **Engagement Score**: Overall customer engagement percentage
- **AI Recommendations**: Actionable insights for customer management

#### Operational Intelligence
- **Peak Hours**: Busiest gym times for resource optimization
- **Popular Classes**: Most attended class types
- **Staff Utilization**: Staff efficiency percentage
- **Capacity Optimization**: Suggestions for better resource allocation

## Feature Flag Integration

### `aiIntelligenceFallback`
- **Default**: `true`
- **Purpose**: Enables demo data option when organization fetch fails
- **Effect**: Shows demo insights instead of error-only state

### Demo Data Indicators
When using demo data, the system provides clear visual indicators:
- **Color-coded Cards**: Gradient backgrounds for different insight types
- **Demo Badges**: Clear labeling when showing sample data
- **Professional Messaging**: Explains demo mode without breaking experience

## AI Assistant Chat

### Chat Functionality
The module includes an AI-powered chat interface:

```typescript
const sendChatMessage = async () => {
  if (!chatInput.trim() || chatLoading) return;

  const userMessage: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: chatInput,
    timestamp: new Date().toISOString()
  };

  setChatMessages(prev => [...prev, userMessage]);
  setChatInput('');
  setChatLoading(true);

  try {
    const response = await fetch('/api/ai/chatbot/conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization_id: organizationId,
        message: chatInput,
        context: 'ai_dashboard'
      })
    });

    const data = await response.json();

    if (response.ok) {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } else {
      throw new Error(data.error || 'Failed to get AI response');
    }
  } catch (error) {
    console.error('Error sending chat message:', error);
    const errorMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'Sorry, I encountered an error processing your request. Please try again.',
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, errorMessage]);
  } finally {
    setChatLoading(false);
  }
};
```

### Chat Features
- **Real-time Messaging**: Instant communication with AI assistant
- **Context Awareness**: Chat includes organization and dashboard context
- **Error Recovery**: Graceful error handling with helpful messages
- **Typing Indicators**: Visual feedback during AI processing
- **Message History**: Persistent conversation within session

## User Interface Components

### Tab Navigation
Four main tabs provide organized access to features:
- **Overview**: Main dashboard with key insights cards
- **AI Insights**: Detailed analytics (coming soon placeholder)
- **AI Assistant**: Interactive chat interface
- **Settings**: Configuration options (coming soon placeholder)

### Refresh Functionality
- **Manual Refresh**: User-triggered data refresh with loading indicators
- **API Integration**: Calls refresh endpoint to update insights
- **Visual Feedback**: Spinning refresh icon during updates

### Error States
- **Authentication Errors**: "Not authenticated" messaging
- **Organization Errors**: "No organization found" with clear explanation
- **API Errors**: "Failed to load AI insights" with error details
- **Network Errors**: Graceful handling of connection issues

## What to Expect

### When AI Intelligence Works
- **Rich Analytics**: Comprehensive business intelligence across all metrics
- **Actionable Insights**: AI-generated recommendations for business improvement
- **Interactive Chat**: Conversational interface for querying business data
- **Real-time Updates**: Fresh insights via manual refresh functionality

### When APIs Fail (Fallback Mode)
- **Demo Data Display**: Sample insights showing interface capabilities
- **Error Messaging**: Clear explanation of current limitations
- **Partial Functionality**: Chat may still work depending on endpoint availability
- **Graceful Degradation**: UI remains functional with sample data

### Coming Soon Features
- **Advanced Insights Tab**: Deeper analytics and trend analysis
- **Settings Configuration**: AI model preferences and notification settings
- **Predictive Analytics**: Advanced forecasting and scenario modeling
- **Custom Dashboards**: User-configurable insight displays

## Troubleshooting

### "Not authenticated" Error
1. Verify user is properly logged in
2. Check authentication token validity
3. Ensure session is active and not expired
4. Try logging out and back in

### "No organization found" Error
1. Verify user has organization association in database
2. Check user_organizations table for proper relationships
3. Ensure organization_id is correctly set
4. Contact administrator for organization access

### AI Insights Loading Fails
1. Check `/api/ai/insights` endpoint availability
2. Verify organization_id parameter is being sent
3. Check network connectivity and API response status
4. Review server logs for detailed error information

### Chat Not Responding
1. Verify `/api/ai/chatbot/conversation` endpoint is available
2. Check if organization_id is properly set
3. Ensure chat input is not empty
4. Try refreshing the page and attempting again

### Refresh Button Not Working
1. Check if refresh API endpoint is accessible
2. Verify organization context is properly maintained
3. Ensure network connectivity for API calls
4. Look for JavaScript errors in browser console