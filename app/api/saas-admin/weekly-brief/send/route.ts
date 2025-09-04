import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

const ADMIN_EMAILS = ['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk'];

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check authorization
    if (!ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the latest weekly brief
    const { data: briefData, error: briefError } = await supabase
      .from('weekly_briefs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (briefError || !briefData) {
      return NextResponse.json({ error: 'No brief data available' }, { status: 404 });
    }

    // Send email
    const emailContent = generateEmailHTML(briefData.data);
    
    const msg = {
      to: ADMIN_EMAILS,
      from: 'sam@gymleadhub.co.uk',
      subject: `Weekly Executive Brief - ${new Date().toLocaleDateString()}`,
      html: emailContent,
      text: generateEmailText(briefData.data)
    };

    await sgMail.send(msg);

    // Log the email send
    await supabase
      .from('email_logs')
      .insert({
        type: 'weekly_brief',
        recipients: ADMIN_EMAILS,
        subject: msg.subject,
        sent_at: new Date().toISOString(),
        status: 'sent'
      });

    return NextResponse.json({
      success: true,
      message: 'Weekly brief sent successfully'
    });

  } catch (error) {
    console.error('Error sending weekly brief email:', error);
    
    // Log the error
    try {
      await supabase
        .from('email_logs')
        .insert({
          type: 'weekly_brief',
          recipients: ADMIN_EMAILS,
          subject: `Weekly Executive Brief - ${new Date().toLocaleDateString()}`,
          sent_at: new Date().toISOString(),
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        });
    } catch (logError) {
      console.error('Error logging email failure:', logError);
    }

    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

function generateEmailHTML(briefData: any): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Executive Brief</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f8f9fa;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .header p {
      margin: 10px 0 0 0;
      opacity: 0.9;
      font-size: 16px;
    }
    .content {
      padding: 30px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .kpi-card {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    .kpi-value {
      font-size: 24px;
      font-weight: 700;
      color: #212529;
      margin-bottom: 5px;
    }
    .kpi-label {
      font-size: 14px;
      color: #6c757d;
      margin-bottom: 10px;
    }
    .kpi-change {
      font-size: 12px;
      font-weight: 600;
    }
    .positive { color: #28a745; }
    .negative { color: #dc3545; }
    .section {
      margin: 40px 0;
    }
    .section h2 {
      color: #8b5cf6;
      font-size: 20px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e9ecef;
    }
    .tenant-list {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
    }
    .tenant-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .tenant-item:last-child {
      border-bottom: none;
    }
    .severity-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .severity-high { background: #f8d7da; color: #721c24; }
    .severity-medium { background: #fff3cd; color: #856404; }
    .severity-low { background: #d1ecf1; color: #0c5460; }
    .footer {
      background: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      color: #6c757d;
      font-size: 12px;
    }
    .action-item {
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 10px;
    }
    .action-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .priority-high { color: #dc3545; }
    .priority-medium { color: #ffc107; }
    .priority-low { color: #28a745; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Weekly Executive Brief</h1>
      <p>${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}</p>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>📊 Key Performance Indicators</h2>
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-value">${formatCurrency(briefData.kpis.mrr.current)}</div>
            <div class="kpi-label">Monthly Recurring Revenue</div>
            <div class="kpi-change ${briefData.kpis.mrr.change >= 0 ? 'positive' : 'negative'}">
              ${formatPercent(briefData.kpis.mrr.change)} from last week
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-value">${briefData.kpis.churn.current.toFixed(1)}%</div>
            <div class="kpi-label">Churn Rate</div>
            <div class="kpi-change ${briefData.kpis.churn.change <= 0 ? 'positive' : 'negative'}">
              ${formatPercent(briefData.kpis.churn.change)} from last week
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-value">${briefData.kpis.newSignups.current}</div>
            <div class="kpi-label">New Signups</div>
            <div class="kpi-change ${briefData.kpis.newSignups.change >= 0 ? 'positive' : 'negative'}">
              ${formatPercent(briefData.kpis.newSignups.change)} from last week
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-value">${briefData.kpis.activeUsers.current.toLocaleString()}</div>
            <div class="kpi-label">Active Users</div>
            <div class="kpi-change ${briefData.kpis.activeUsers.change >= 0 ? 'positive' : 'negative'}">
              ${formatPercent(briefData.kpis.activeUsers.change)} from last week
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>🏆 Top Performing Tenants</h2>
        <div class="tenant-list">
          ${briefData.tenants.topPerforming.map((tenant: any) => `
            <div class="tenant-item">
              <div>
                <strong>${tenant.name}</strong><br>
                <small>${formatCurrency(tenant.revenue)} revenue</small>
              </div>
              <div class="positive">+${tenant.growth.toFixed(1)}%</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="section">
        <h2>⚠️ At-Risk Tenants</h2>
        <div class="tenant-list">
          ${briefData.tenants.atRisk.map((tenant: any) => `
            <div class="tenant-item">
              <div>
                <strong>${tenant.name}</strong><br>
                <small>${tenant.issue}</small>
              </div>
              <span class="severity-badge severity-${tenant.severity}">${tenant.severity}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="section">
        <h2>🔧 Integration Health</h2>
        <div class="tenant-list">
          ${briefData.integrations.services.map((service: any) => `
            <div class="tenant-item">
              <div>
                <strong>${service.name}</strong><br>
                <small>${service.uptime.toFixed(1)}% uptime</small>
              </div>
              <div style="color: ${service.status === 'up' ? '#28a745' : service.status === 'degraded' ? '#ffc107' : '#dc3545'}">
                ${service.status.toUpperCase()}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="section">
        <h2>✅ Action Items</h2>
        ${briefData.actionItems.map((item: any) => `
          <div class="action-item">
            <div class="action-header">
              <strong>${item.title}</strong>
              <span class="priority-${item.priority}">${item.priority.toUpperCase()}</span>
            </div>
            <div style="font-size: 14px; color: #6c757d;">
              Owner: ${item.owner} | 
              Deadline: ${new Date(item.deadline).toLocaleDateString()} | 
              Status: ${item.status.replace('_', ' ')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="footer">
      <p>This automated report was generated on ${new Date().toISOString()}</p>
      <p>Atlas Fitness Platform - SaaS Admin Dashboard</p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateEmailText(briefData: any): string {
  return `
WEEKLY EXECUTIVE BRIEF - ${new Date().toLocaleDateString()}

KEY PERFORMANCE INDICATORS
==========================
Monthly Recurring Revenue: $${briefData.kpis.mrr.current.toLocaleString()} (${briefData.kpis.mrr.change > 0 ? '+' : ''}${briefData.kpis.mrr.change.toFixed(1)}%)
Churn Rate: ${briefData.kpis.churn.current.toFixed(1)}% (${briefData.kpis.churn.change > 0 ? '+' : ''}${briefData.kpis.churn.change.toFixed(1)}%)
New Signups: ${briefData.kpis.newSignups.current} (${briefData.kpis.newSignups.change > 0 ? '+' : ''}${briefData.kpis.newSignups.change.toFixed(1)}%)
Active Users: ${briefData.kpis.activeUsers.current.toLocaleString()} (${briefData.kpis.activeUsers.change > 0 ? '+' : ''}${briefData.kpis.activeUsers.change.toFixed(1)}%)

TOP PERFORMING TENANTS
======================
${briefData.tenants.topPerforming.map((tenant: any) => 
  `${tenant.name}: $${tenant.revenue} revenue (+${tenant.growth.toFixed(1)}% growth)`
).join('\n')}

AT-RISK TENANTS
===============
${briefData.tenants.atRisk.map((tenant: any) => 
  `${tenant.name}: ${tenant.issue} (${tenant.severity} severity)`
).join('\n')}

INTEGRATION HEALTH
==================
${briefData.integrations.services.map((service: any) => 
  `${service.name}: ${service.status.toUpperCase()} (${service.uptime.toFixed(1)}% uptime)`
).join('\n')}

ACTION ITEMS
============
${briefData.actionItems.map((item: any) => 
  `${item.title}
  Owner: ${item.owner}
  Priority: ${item.priority.toUpperCase()}
  Status: ${item.status.replace('_', ' ')}
  Deadline: ${new Date(item.deadline).toLocaleDateString()}
`).join('\n')}

Generated on: ${new Date().toISOString()}
Atlas Fitness Platform - SaaS Admin Dashboard
  `;
}