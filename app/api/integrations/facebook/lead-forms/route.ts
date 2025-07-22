import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pageId = searchParams.get('pageId')
    
    if (!pageId) {
      return NextResponse.json(
        { error: 'Page ID is required' }, 
        { status: 400 }
      )
    }

    // For demo purposes, we'll simulate the integration check
    const facebookConnected = request.headers.get('x-facebook-connected') || 'demo'
    
    if (!facebookConnected) {
      return NextResponse.json(
        { error: 'Facebook integration not connected' }, 
        { status: 401 }
      )
    }

    console.log(`📋 Fetching Lead Forms for Facebook Page: ${pageId}`)
    
    // Demo data - in production, you'd use:
    // const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/leadgen_forms?fields=id,name,status,created_time,leads_count,page,privacy_policy_url&access_token=${pageAccessToken}`)
    
    // Generate different demo data based on pageId
    const getDemoLeadForms = (pageId: string) => {
      const baseForms = [
        {
          id: `${pageId}_form_1`,
          name: 'Free Trial Membership Sign-up',
          status: 'ACTIVE',
          created_time: '2024-01-15T10:30:00Z',
          leads_count: 147,
          form_type: 'LEAD_GENERATION',
          context_card: {
            title: 'Get Your Free Trial',
            description: 'Join Atlas Fitness today and get a 7-day free trial membership.',
            button_text: 'Sign Up Now'
          },
          questions: [
            { key: 'full_name', label: 'Full Name', type: 'FULL_NAME' },
            { key: 'email', label: 'Email Address', type: 'EMAIL' },
            { key: 'phone_number', label: 'Phone Number', type: 'PHONE_NUMBER' },
            { key: 'fitness_goals', label: 'What are your fitness goals?', type: 'CUSTOM', options: ['Weight Loss', 'Muscle Building', 'General Fitness', 'Athletic Training'] }
          ],
          thank_you_page: {
            title: 'Thank You!',
            body: 'We\'ll contact you within 24 hours to schedule your free trial.'
          }
        },
        {
          id: `${pageId}_form_2`,
          name: 'Personal Training Consultation',
          status: 'ACTIVE',
          created_time: '2024-02-20T14:15:00Z',
          leads_count: 89,
          form_type: 'LEAD_GENERATION',
          context_card: {
            title: 'Free Personal Training Consultation',
            description: 'Get a one-on-one consultation with our certified trainers.',
            button_text: 'Book Consultation'
          },
          questions: [
            { key: 'full_name', label: 'Full Name', type: 'FULL_NAME' },
            { key: 'email', label: 'Email Address', type: 'EMAIL' },
            { key: 'phone_number', label: 'Phone Number', type: 'PHONE_NUMBER' },
            { key: 'experience_level', label: 'Fitness Experience Level', type: 'CUSTOM', options: ['Beginner', 'Intermediate', 'Advanced'] },
            { key: 'preferred_time', label: 'Preferred consultation time', type: 'CUSTOM', options: ['Morning (6AM-12PM)', 'Afternoon (12PM-6PM)', 'Evening (6PM-10PM)'] }
          ],
          thank_you_page: {
            title: 'Consultation Booked!',
            body: 'A trainer will call you to schedule your free consultation.'
          }
        }
      ]

      // Add page-specific forms
      if (pageId === '123456789') { // Atlas Fitness Gym
        baseForms.push({
          id: `${pageId}_form_3`,
          name: 'Group Fitness Class Interest',
          status: 'ACTIVE',
          created_time: '2024-03-10T09:45:00Z',
          leads_count: 234,
          form_type: 'LEAD_GENERATION',
          context_card: {
            title: 'Join Our Group Classes',
            description: 'Discover our yoga, HIIT, and strength training classes.',
            button_text: 'Learn More'
          },
          questions: [
            { key: 'full_name', label: 'Full Name', type: 'FULL_NAME' },
            { key: 'email', label: 'Email Address', type: 'EMAIL' },
            { key: 'class_interest', label: 'Which classes interest you?', type: 'CUSTOM', options: ['Yoga', 'HIIT', 'Strength Training', 'Cardio', 'Pilates'] }
          ],
          thank_you_page: {
            title: 'Thanks for Your Interest!',
            body: 'We\'ll send you our class schedule and pricing information.'
          }
        })
      } else if (pageId === '987654321') { // Atlas Fitness Downtown
        baseForms.push({
          id: `${pageId}_form_3`,
          name: 'Corporate Wellness Program',
          status: 'ACTIVE',
          created_time: '2024-02-28T16:20:00Z',
          leads_count: 67,
          form_type: 'LEAD_GENERATION',
          context_card: {
            title: 'Corporate Wellness Solutions',
            description: 'Boost employee health and productivity with our corporate programs.',
            button_text: 'Get Quote'
          },
          questions: [
            { key: 'full_name', label: 'Full Name', type: 'FULL_NAME' },
            { key: 'email', label: 'Work Email', type: 'EMAIL' },
            { key: 'company_name', label: 'Company Name', type: 'CUSTOM' },
            { key: 'employee_count', label: 'Number of Employees', type: 'CUSTOM', options: ['1-50', '51-200', '201-500', '500+'] }
          ],
          thank_you_page: {
            title: 'Proposal Coming Soon!',
            body: 'Our corporate wellness team will contact you with a custom proposal.'
          }
        })
      }

      return baseForms
    }

    const demoForms = getDemoLeadForms(pageId)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600))

    return NextResponse.json({
      success: true,
      page_id: pageId,
      forms: demoForms.map(form => ({
        id: form.id,
        name: form.name,
        status: form.status,
        created_time: form.created_time,
        leads_count: form.leads_count,
        form_type: form.form_type,
        context_card: form.context_card,
        questions_count: form.questions.length,
        questions: form.questions,
        thank_you_page: form.thank_you_page,
        is_active: form.status === 'ACTIVE'
      })),
      summary: {
        total_forms: demoForms.length,
        active_forms: demoForms.filter(form => form.status === 'ACTIVE').length,
        total_leads: demoForms.reduce((sum, form) => sum + form.leads_count, 0),
        avg_leads_per_form: Math.round(demoForms.reduce((sum, form) => sum + form.leads_count, 0) / demoForms.length)
      },
      debug: {
        api_call: `GET /${pageId}/leadgen_forms`,
        permissions_required: ['leads_retrieval', 'pages_show_list'],
        note: 'Demo data - replace with real Facebook Graph API call'
      }
    })

  } catch (error) {
    console.error('❌ Error fetching Facebook lead forms:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch Facebook lead forms', 
        details: error instanceof Error ? error.message : 'Unknown error',
        debug: {
          endpoint: '/api/integrations/facebook/lead-forms',
          timestamp: new Date().toISOString()
        }
      }, 
      { status: 500 }
    )
  }
}