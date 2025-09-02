import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAILS = ['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk'];

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const { format } = await request.json();

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

    if (format === 'pdf') {
      const pdfBuffer = await generatePDF(briefData.data);
      
      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="weekly-brief-${new Date().toISOString().split('T')[0]}.pdf"`
        }
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });

  } catch (error) {
    console.error('Error exporting brief:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generatePDF(briefData: any): Promise<Buffer> {
  // Simple HTML to PDF conversion - in production, you might want to use libraries like puppeteer or jsPDF
  const htmlContent = generateHTMLReport(briefData);
  
  // For now, return a simple text-based PDF simulation
  // In production, implement proper PDF generation
  const pdfContent = `
Weekly Executive Brief - ${new Date().toLocaleDateString()}

=== KEY PERFORMANCE INDICATORS ===
Monthly Recurring Revenue: $${briefData.kpis.mrr.current.toLocaleString()}
Change: ${briefData.kpis.mrr.change > 0 ? '+' : ''}${briefData.kpis.mrr.change.toFixed(1)}%

Churn Rate: ${briefData.kpis.churn.current.toFixed(1)}%
Change: ${briefData.kpis.churn.change > 0 ? '+' : ''}${briefData.kpis.churn.change.toFixed(1)}%

New Signups: ${briefData.kpis.newSignups.current}
Change: ${briefData.kpis.newSignups.change > 0 ? '+' : ''}${briefData.kpis.newSignups.change.toFixed(1)}%

Active Users: ${briefData.kpis.activeUsers.current.toLocaleString()}
Change: ${briefData.kpis.activeUsers.change > 0 ? '+' : ''}${briefData.kpis.activeUsers.change.toFixed(1)}%

=== REVENUE SUMMARY ===
Total Revenue: $${briefData.revenue.total.toLocaleString()}
Growth: ${briefData.revenue.growth.toFixed(1)}%
Forecast: $${briefData.revenue.forecast.toLocaleString()}

=== TOP PERFORMING TENANTS ===
${briefData.tenants.topPerforming.map((tenant: any) => 
  `${tenant.name}: $${tenant.revenue} revenue (${tenant.growth.toFixed(1)}% growth)`
).join('\n')}

=== AT-RISK TENANTS ===
${briefData.tenants.atRisk.map((tenant: any) => 
  `${tenant.name}: ${tenant.issue} (${tenant.severity} severity)`
).join('\n')}

=== INTEGRATION HEALTH ===
Overall Status: ${briefData.integrations.overall}
${briefData.integrations.services.map((service: any) => 
  `${service.name}: ${service.status} (${service.uptime}% uptime)`
).join('\n')}

=== ACTION ITEMS ===
${briefData.actionItems.map((item: any) => 
  `${item.title}
  Owner: ${item.owner}
  Priority: ${item.priority}
  Status: ${item.status}
  Deadline: ${new Date(item.deadline).toLocaleDateString()}
`).join('\n')}

Generated on: ${new Date().toISOString()}
`;

  return Buffer.from(pdfContent, 'utf-8');
}

function generateHTMLReport(briefData: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Weekly Executive Brief</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #8b5cf6; }
    h2 { color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
    .kpi-card { background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .kpi-value { font-size: 24px; font-weight: bold; color: #111827; }
    .kpi-change { font-size: 14px; color: #6b7280; }
    .positive { color: #10b981; }
    .negative { color: #ef4444; }
  </style>
</head>
<body>
  <h1>Weekly Executive Brief</h1>
  <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
  
  <h2>Key Performance Indicators</h2>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-value">$${briefData.kpis.mrr.current.toLocaleString()}</div>
      <div>Monthly Recurring Revenue</div>
      <div class="kpi-change ${briefData.kpis.mrr.change >= 0 ? 'positive' : 'negative'}">
        ${briefData.kpis.mrr.change > 0 ? '+' : ''}${briefData.kpis.mrr.change.toFixed(1)}%
      </div>
    </div>
    <!-- Add other KPI cards here -->
  </div>
  
  <h2>Top Performing Tenants</h2>
  <ul>
    ${briefData.tenants.topPerforming.map((tenant: any) => 
      `<li>${tenant.name}: $${tenant.revenue} revenue (${tenant.growth.toFixed(1)}% growth)</li>`
    ).join('')}
  </ul>
  
  <!-- Add other sections -->
</body>
</html>
`;
}