import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/client';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = createClient();
    
    // Get the organization ID (using hardcoded for now due to auth issues)
    const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
    
    // Get forms from database
    const { data: dbForms, error: dbError } = await supabase
      .from('forms')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error('Error fetching forms:', dbError);
    }

    const forms = [];
    
    // Add database forms
    if (dbForms && dbForms.length > 0) {
      forms.push({
        category: 'Website Forms',
        items: dbForms.map(form => ({
          id: form.id,
          name: form.name,
          type: 'website',
          description: form.description || 'Website form',
          fieldCount: form.fields ? form.fields.length : 0,
          createdAt: form.created_at
        }))
      });
    }

    // Check if Facebook is connected
    const cookieStore = await cookies();
    const fbToken = cookieStore.get('fb_token_data');
    
    if (fbToken?.value) {
      try {
        // Fetch Facebook pages
        const pagesResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/facebook/pages`);
        const pagesData = await pagesResponse.json();
        
        if (pagesData.success && pagesData.pages) {
          // For each page, fetch lead forms
          for (const page of pagesData.pages) {
            if (page.hasLeadAccess) {
              const formsResponse = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/facebook/lead-forms?pageId=${page.id}`
              );
              const formsData = await formsResponse.json();
              
              if (formsData.success && formsData.forms && formsData.forms.length > 0) {
                forms.push({
                  category: `Facebook - ${page.name}`,
                  items: formsData.forms.map((form: any) => ({
                    id: form.id,
                    name: form.name,
                    type: 'facebook',
                    pageId: page.id,
                    pageName: page.name,
                    description: `${form.leads_count || 0} leads • ${form.questions_count || 0} questions`,
                    status: form.status,
                    isActive: form.is_active,
                    createdAt: form.created_time
                  }))
                });
              }
            }
          }
        }
      } catch (fbError) {
        console.error('Error fetching Facebook forms:', fbError);
      }
    }

    // Add some default options
    forms.unshift({
      category: 'All Forms',
      items: [{
        id: 'all',
        name: 'Any Form Submission',
        type: 'all',
        description: 'Triggers for any form submission'
      }]
    });

    return NextResponse.json({
      success: true,
      forms,
      summary: {
        totalCategories: forms.length,
        totalForms: forms.reduce((sum, cat) => sum + cat.items.length, 0),
        hasFacebook: forms.some(cat => cat.category.includes('Facebook')),
        hasWebsite: forms.some(cat => cat.category === 'Website Forms')
      }
    });

  } catch (error) {
    console.error('Error in workflow config forms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forms', details: error.message },
      { status: 500 }
    );
  }
}