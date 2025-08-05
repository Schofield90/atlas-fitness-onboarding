import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/client';

export async function GET() {
  try {
    const supabase = createClient();
    
    // Get the organization ID (using hardcoded for now due to auth issues)
    const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
    
    // Get unique lead sources from the database
    const { data: leads, error } = await supabase
      .from('leads')
      .select('source')
      .eq('organization_id', organizationId)
      .not('source', 'is', null);

    if (error) {
      console.error('Error fetching lead sources:', error);
    }

    // Get unique sources
    const uniqueSources = [...new Set(leads?.map(lead => lead.source) || [])];
    
    // Define all available sources
    const allSources = [
      { id: 'all', name: 'All Sources', description: 'Trigger for leads from any source' },
      { id: 'website', name: 'Website Form', description: 'Leads from your website forms' },
      { id: 'facebook', name: 'Facebook Lead Ad', description: 'Leads from Facebook ads' },
      { id: 'instagram', name: 'Instagram', description: 'Leads from Instagram' },
      { id: 'walk-in', name: 'Walk-in', description: 'In-person walk-in leads' },
      { id: 'referral', name: 'Referral', description: 'Referred by existing members' },
      { id: 'phone', name: 'Phone Call', description: 'Leads from phone inquiries' },
      { id: 'email', name: 'Email', description: 'Leads from email inquiries' },
      { id: 'whatsapp', name: 'WhatsApp', description: 'Leads from WhatsApp messages' },
      { id: 'google', name: 'Google Ads', description: 'Leads from Google advertising' }
    ];

    // Mark which sources are actually in use
    const sourcesWithData = allSources.map(source => ({
      ...source,
      hasData: uniqueSources.includes(source.id),
      count: leads?.filter(lead => lead.source === source.id).length || 0
    }));

    return NextResponse.json({
      success: true,
      sources: sourcesWithData,
      summary: {
        totalSources: sourcesWithData.length,
        activeSources: sourcesWithData.filter(s => s.hasData).length,
        uniqueSourcesInDatabase: uniqueSources.length
      }
    });

  } catch (error) {
    console.error('Error in workflow config lead sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead sources', details: error.message },
      { status: 500 }
    );
  }
}