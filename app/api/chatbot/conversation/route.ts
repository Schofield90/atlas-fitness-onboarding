import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getUserAndOrganization } from '@/app/lib/auth-utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ConversationContext {
  organization_id: string;
  user_id: string;
  context_type: 'ai_dashboard' | 'customer_support' | 'general';
  conversation_history: ChatMessage[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, context, conversation_id } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get or create conversation context
    let conversationHistory: ChatMessage[] = [];
    
    if (conversation_id) {
      const { data: existingConversation } = await supabase
        .from('ai_conversations')
        .select('messages, context')
        .eq('id', conversation_id)
        .eq('organization_id', organization.id)
        .single();

      if (existingConversation) {
        conversationHistory = existingConversation.messages || [];
      }
    }

    // Add user message to history
    const userMessage: ChatMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString()
    };

    conversationHistory.push(userMessage);

    // Generate AI response based on context and organization data
    const aiResponse = await generateAIResponse(
      supabase,
      organization.id,
      message,
      context,
      conversationHistory
    );

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    };

    conversationHistory.push(assistantMessage);

    // Save or update conversation
    let savedConversationId = conversation_id;

    if (conversation_id) {
      // Update existing conversation
      await supabase
        .from('ai_conversations')
        .update({
          messages: conversationHistory,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation_id)
        .eq('organization_id', organization.id);
    } else {
      // Create new conversation
      const { data: newConversation } = await supabase
        .from('ai_conversations')
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          context_type: context || 'general',
          messages: conversationHistory,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      savedConversationId = newConversation?.id;
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
      conversation_id: savedConversationId,
      message_count: conversationHistory.length
    });

  } catch (error) {
    console.error('Error processing chatbot conversation:', error);
    return NextResponse.json({ 
      error: 'Failed to process conversation',
      response: 'I apologize, but I encountered an error processing your request. Please try again.'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const conversationId = url.searchParams.get('conversation_id');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (conversationId) {
      // Get specific conversation
      const { data: conversation, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('organization_id', organization.id)
        .single();

      if (error || !conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      return NextResponse.json({ conversation });
    }

    // Get conversation list
    const { data: conversations, error, count } = await supabase
      .from('ai_conversations')
      .select('id, context_type, created_at, updated_at, messages')
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    // Format conversations with summary
    const formattedConversations = (conversations || []).map(conv => ({
      id: conv.id,
      context_type: conv.context_type,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      message_count: conv.messages?.length || 0,
      last_message: conv.messages?.[conv.messages.length - 1]?.content.substring(0, 100) + '...' || '',
      last_message_role: conv.messages?.[conv.messages.length - 1]?.role || 'user'
    }));

    return NextResponse.json({
      conversations: formattedConversations,
      total: count,
      has_more: (count || 0) > offset + limit
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateAIResponse(
  supabase: any,
  organizationId: string,
  message: string,
  context: string,
  conversationHistory: ChatMessage[]
): Promise<string> {
  const lowerMessage = message.toLowerCase();

  // Get organization data for context
  const organizationData = await getOrganizationContext(supabase, organizationId);

  // Handle different types of queries
  if (lowerMessage.includes('revenue') || lowerMessage.includes('income') || lowerMessage.includes('money')) {
    return generateRevenueResponse(organizationData);
  }

  if (lowerMessage.includes('customer') || lowerMessage.includes('member')) {
    return generateCustomerResponse(organizationData);
  }

  if (lowerMessage.includes('class') || lowerMessage.includes('booking') || lowerMessage.includes('session')) {
    return generateClassResponse(organizationData);
  }

  if (lowerMessage.includes('staff') || lowerMessage.includes('employee') || lowerMessage.includes('instructor')) {
    return generateStaffResponse(organizationData);
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('how') || lowerMessage.includes('?')) {
    return generateHelpResponse();
  }

  if (lowerMessage.includes('performance') || lowerMessage.includes('analytics') || lowerMessage.includes('metrics')) {
    return generatePerformanceResponse(organizationData);
  }

  // Default response with suggestions
  return `I can help you analyze your gym's performance and data. Here are some things you can ask me about:

📊 **Performance & Analytics**
- "How is my revenue this month?"
- "What are my most popular classes?"
- "Show me customer engagement metrics"

👥 **Customer Insights**
- "How many active members do I have?"
- "Who are my at-risk customers?"
- "What's my customer retention rate?"

📅 **Class & Booking Analysis**
- "Which classes have the highest attendance?"
- "What are my peak booking hours?"
- "How is my class capacity utilization?"

👨‍💼 **Staff Management**
- "How many staff members do I have?"
- "What's our staff utilization rate?"

What would you like to know about your gym?`;
}

async function getOrganizationContext(supabase: any, organizationId: string): Promise<any> {
  try {
    // Get basic organization stats
    const [
      { count: totalCustomers },
      { count: totalStaff },
      { count: totalClasses },
      { data: recentBookings },
      { data: recentPayments }
    ] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('org_id', organizationId).eq('status', 'customer'),
      supabase.from('staff').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active'),
      supabase.from('class_sessions').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
      supabase.from('bookings').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(100),
      supabase.from('payment_transactions').select('*').eq('organization_id', organizationId).eq('status', 'succeeded').order('created_at', { ascending: false }).limit(100)
    ]);

    return {
      totalCustomers: totalCustomers || 0,
      totalStaff: totalStaff || 0,
      totalClasses: totalClasses || 0,
      recentBookings: recentBookings || [],
      recentPayments: recentPayments || []
    };
  } catch (error) {
    console.error('Error fetching organization context:', error);
    return {
      totalCustomers: 0,
      totalStaff: 0,
      totalClasses: 0,
      recentBookings: [],
      recentPayments: []
    };
  }
}

function generateRevenueResponse(data: any): string {
  const thisMonth = new Date();
  thisMonth.setDate(1);
  
  const monthlyRevenue = data.recentPayments
    .filter((payment: any) => new Date(payment.created_at) >= thisMonth)
    .reduce((sum: number, payment: any) => sum + (payment.amount_pennies || 0), 0);

  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  lastMonth.setDate(1);

  const lastMonthEnd = new Date(thisMonth);
  const lastMonthRevenue = data.recentPayments
    .filter((payment: any) => {
      const date = new Date(payment.created_at);
      return date >= lastMonth && date < lastMonthEnd;
    })
    .reduce((sum: number, payment: any) => sum + (payment.amount_pennies || 0), 0);

  const change = lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;
  const trend = change > 0 ? '📈' : change < 0 ? '📉' : '➖';

  return `💰 **Revenue Analysis**

**This Month:** £${(monthlyRevenue / 100).toFixed(2)}
**Last Month:** £${(lastMonthRevenue / 100).toFixed(2)}
**Change:** ${trend} ${change > 0 ? '+' : ''}${change.toFixed(1)}%

**Total Payments:** ${data.recentPayments.length} transactions
**Average Transaction:** £${data.recentPayments.length > 0 ? ((monthlyRevenue / data.recentPayments.length) / 100).toFixed(2) : '0.00'}

${change > 10 ? '🎉 Great growth this month!' : change < -10 ? '⚠️ Revenue is down - consider reviewing your pricing or marketing strategy.' : '✅ Revenue is stable.'}`;
}

function generateCustomerResponse(data: any): string {
  const activeCustomers = data.totalCustomers;
  const recentBookings = data.recentBookings.length;
  
  return `👥 **Customer Overview**

**Total Active Customers:** ${activeCustomers}
**Recent Bookings:** ${recentBookings} in the last period
**Average Bookings per Customer:** ${activeCustomers > 0 ? (recentBookings / activeCustomers).toFixed(1) : '0'}

**Customer Engagement:**
${recentBookings > activeCustomers ? '🔥 High engagement - customers are booking multiple classes!' : 
  recentBookings > (activeCustomers * 0.5) ? '✅ Good engagement levels' : 
  '⚠️ Low engagement - consider running retention campaigns'}

**Recommendations:**
- Track customer attendance patterns
- Implement loyalty programs for frequent attendees
- Re-engage inactive customers with special offers`;
}

function generateClassResponse(data: any): string {
  const totalClasses = data.totalClasses;
  const totalBookings = data.recentBookings.length;
  
  const utilizationRate = totalClasses > 0 ? ((totalBookings / (totalClasses * 20)) * 100) : 0; // Assuming avg 20 capacity

  return `📅 **Class & Booking Analysis**

**Total Classes:** ${totalClasses}
**Recent Bookings:** ${totalBookings}
**Estimated Utilization:** ${utilizationRate.toFixed(1)}%

**Performance:**
${utilizationRate > 80 ? '🔥 Excellent class utilization!' : 
  utilizationRate > 50 ? '✅ Good booking levels' : 
  '⚠️ Low utilization - consider optimizing your schedule'}

**Recommendations:**
- Analyze peak booking times
- Consider adding more popular class types
- Review class capacity and instructor assignments
- Implement waitlist system for high-demand classes`;
}

function generateStaffResponse(data: any): string {
  const totalStaff = data.totalStaff;
  const totalClasses = data.totalClasses;
  const staffUtilization = totalStaff > 0 ? (totalClasses / (totalStaff * 10)) * 100 : 0; // Rough calculation

  return `👨‍💼 **Staff Overview**

**Total Active Staff:** ${totalStaff}
**Staff Utilization:** ${staffUtilization.toFixed(1)}%

**Status:**
${staffUtilization > 80 ? '⚠️ High utilization - consider hiring more staff' : 
  staffUtilization > 50 ? '✅ Good staff utilization' : 
  '💡 Staff capacity available for more classes'}

**Management Tips:**
- Track individual instructor performance
- Monitor staff scheduling efficiency
- Consider cross-training staff for flexibility
- Implement staff feedback systems`;
}

function generatePerformanceResponse(data: any): string {
  const metrics = {
    customers: data.totalCustomers,
    staff: data.totalStaff,
    classes: data.totalClasses,
    bookings: data.recentBookings.length,
    revenue: data.recentPayments.reduce((sum: number, p: any) => sum + (p.amount_pennies || 0), 0)
  };

  return `📊 **Performance Dashboard**

**Key Metrics:**
- **Customers:** ${metrics.customers}
- **Staff:** ${metrics.staff}  
- **Classes:** ${metrics.classes}
- **Recent Bookings:** ${metrics.bookings}
- **Revenue:** £${(metrics.revenue / 100).toFixed(2)}

**Quick Insights:**
- Customer-to-Staff Ratio: ${metrics.staff > 0 ? (metrics.customers / metrics.staff).toFixed(1) : 'N/A'}:1
- Bookings per Class: ${metrics.classes > 0 ? (metrics.bookings / metrics.classes).toFixed(1) : 'N/A'}
- Revenue per Customer: £${metrics.customers > 0 ? ((metrics.revenue / metrics.customers) / 100).toFixed(2) : '0.00'}

**Overall Health:** ${metrics.customers > 50 && metrics.bookings > 100 ? '🟢 Excellent' : 
  metrics.customers > 20 && metrics.bookings > 50 ? '🟡 Good' : '🟠 Needs Attention'}`;
}

function generateHelpResponse(): string {
  return `🤖 **AI Assistant Help**

I'm here to help you understand your gym's performance! Here's what I can analyze for you:

**📊 Analytics & Reports**
- Revenue trends and forecasting
- Customer engagement metrics
- Class attendance patterns
- Staff utilization rates

**💡 Insights & Recommendations**
- Performance optimization tips
- Customer retention strategies
- Operational efficiency suggestions
- Growth opportunities

**❓ How to Ask Questions**
- Use natural language - I understand context!
- Ask about specific metrics: "revenue", "customers", "classes"
- Request comparisons: "this month vs last month"
- Seek recommendations: "how to improve retention"

**Examples:**
- "What's my best performing class?"
- "Show me revenue trends"
- "How can I reduce customer churn?"
- "What are my peak hours?"

Just ask me anything about your gym's data and I'll provide insights!`;
}