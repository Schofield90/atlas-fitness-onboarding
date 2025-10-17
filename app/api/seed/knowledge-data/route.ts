import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient()
    
    // Get the first organization
    const { data: org } = await adminSupabase
      .from('organizations')
      .select('id')
      .eq('name', 'Atlas Fitness')
      .single()

    const organizationId = org?.id || '63589490-8f55-4157-bd3a-e141594b748e'

    // Atlas Fitness knowledge data
    const knowledgeData = [
      // Basic Information
      {
        organization_id: organizationId,
        type: 'FAQ',
        content: 'What are your opening hours? We are open Monday to Friday 6am-10pm, Saturday 7am-8pm, and Sunday 8am-6pm.'
      },
      {
        organization_id: organizationId,
        type: 'FAQ',
        content: 'Where are you located? We have two locations: Harrogate at Unit 5, Claro Court Business Centre, Claro Road, HG1 4BA, and York at Unit 12, Auster Road Business Park, Clifton Moor, YO30 4XA.'
      },
      {
        organization_id: organizationId,
        type: 'FAQ',
        content: 'How can I contact you? Call us at 01423 555123 for Harrogate or 01904 666789 for York. Email us at hello@atlasfitness.co.uk.'
      },
      
      // Pricing Information
      {
        organization_id: organizationId,
        type: 'Pricing',
        content: 'Monthly Membership: £49.99/month with no contract. Access to both locations, all classes, and gym facilities.'
      },
      {
        organization_id: organizationId,
        type: 'Pricing',
        content: 'Annual Membership: £499/year (save £100). Includes all monthly benefits plus 2 free personal training sessions.'
      },
      {
        organization_id: organizationId,
        type: 'Pricing',
        content: 'Student Discount: 20% off all memberships with valid student ID. Monthly £39.99, Annual £399.'
      },
      {
        organization_id: organizationId,
        type: 'Pricing',
        content: 'Day Pass: £15 for full day access. Includes all facilities and classes.'
      },
      {
        organization_id: organizationId,
        type: 'Pricing',
        content: 'Personal Training: £45 per session, £400 for 10 sessions (save £50), £750 for 20 sessions (save £150).'
      },
      
      // Classes and Services
      {
        organization_id: organizationId,
        type: 'Services',
        content: 'Group Fitness Classes: We offer Yoga, HIIT, Spin, Pilates, Boxing, Zumba, Body Pump, and Circuits. All included with membership.'
      },
      {
        organization_id: organizationId,
        type: 'Services',
        content: 'Personal Training: Our certified trainers specialize in weight loss, muscle building, sports performance, and rehabilitation.'
      },
      {
        organization_id: organizationId,
        type: 'Services',
        content: 'InBody Scans: Track your body composition with our InBody 770 scanner. Free monthly scan for members, £25 for non-members.'
      },
      
      // Facilities
      {
        organization_id: organizationId,
        type: 'FAQ',
        content: 'What facilities do you have? Free weights area, cardio zone with 50+ machines, functional training area, Olympic lifting platforms, swimming pool (Harrogate only), sauna and steam room, cafe and protein bar.'
      },
      {
        organization_id: organizationId,
        type: 'FAQ',
        content: 'Do you have parking? Yes, free parking is available at both locations. Harrogate has 80 spaces, York has 120 spaces.'
      },
      {
        organization_id: organizationId,
        type: 'FAQ',
        content: 'Are there changing facilities? Yes, we have spacious changing rooms with lockers, showers, hairdryers, and complimentary toiletries.'
      },
      
      // Policies
      {
        organization_id: organizationId,
        type: 'Policies',
        content: 'Membership Freeze: You can freeze your membership for up to 3 months per year for £5/month. Email us 7 days before your billing date.'
      },
      {
        organization_id: organizationId,
        type: 'Policies',
        content: 'Cancellation Policy: No contract! Cancel anytime with 30 days notice via email to memberships@atlasfitness.co.uk.'
      },
      {
        organization_id: organizationId,
        type: 'Policies',
        content: 'Guest Policy: Members can bring 1 guest per month for free. Additional guests £10 each. Guests must complete health form.'
      },
      
      // Staff and Expertise
      {
        organization_id: organizationId,
        type: 'SOP',
        content: 'Owner and Head Coach: Sam Schofield - 15 years experience, specializes in strength training and business fitness consultancy.'
      },
      {
        organization_id: organizationId,
        type: 'Services',
        content: 'Specialist Services: Physiotherapy on-site (Tuesdays and Thursdays), Sports massage therapy, Nutrition consultations, Competition prep coaching.'
      },
      
      // Onboarding and Trial
      {
        organization_id: organizationId,
        type: 'FAQ',
        content: 'Do you offer a free trial? Yes! We offer a 3-day free trial with full access to facilities and classes. Book online or visit reception.'
      },
      {
        organization_id: organizationId,
        type: 'SOP',
        content: 'New Member Process: Free gym tour and consultation, InBody scan to establish baseline, Personalized workout plan, Introduction to MyFitness app.'
      },
      
      // Special Offers
      {
        organization_id: organizationId,
        type: 'Pricing',
        content: 'Refer a Friend: Both you and your friend get 1 month free when they join on an annual membership.'
      },
      {
        organization_id: organizationId,
        type: 'Services',
        content: 'Corporate Memberships: Special rates for companies with 5+ employees. Contact corporate@atlasfitness.co.uk.'
      },
      
      // Additional FAQs
      {
        organization_id: organizationId,
        type: 'FAQ',
        content: 'What should I bring? Comfortable workout clothes, trainers, water bottle, and towel. We provide equipment and mats for classes.'
      },
      {
        organization_id: organizationId,
        type: 'FAQ',
        content: 'Is there an age limit? Members must be 16+. Ages 16-17 require parental consent and induction. Senior discounts available for 60+.'
      },
      {
        organization_id: organizationId,
        type: 'FAQ',
        content: 'Do you have WiFi? Yes, free high-speed WiFi throughout both gyms. Password available at reception.'
      },
      
      // Style Guide
      {
        organization_id: organizationId,
        type: 'Style',
        content: 'Communication Style: Friendly, motivating, and professional. Use "we" not "I". Focus on member benefits and results. Always offer to help with next steps.'
      },
      {
        organization_id: organizationId,
        type: 'Style',
        content: 'Response Guidelines: Keep messages under 300 characters for WhatsApp. Always include a call-to-action. Be enthusiastic about fitness. Address concerns with empathy.'
      }
    ]

    // Insert knowledge data
    const { data: insertedData, error } = await adminSupabase
      .from('knowledge')
      .insert(knowledgeData)
      .select()

    if (error) {
      console.error('Knowledge seed error:', error)
      return NextResponse.json({ 
        error: 'Failed to seed knowledge',
        details: error.message 
      }, { status: 500 })
    }

    // Count by type
    const byType: Record<string, number> = {}
    insertedData?.forEach(item => {
      byType[item.type] = (byType[item.type] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      itemsCreated: insertedData?.length || 0,
      byType,
      message: 'Knowledge base populated successfully!'
    })
  } catch (error: any) {
    console.error('Seed error:', error)
    return NextResponse.json({ 
      error: 'Failed to seed knowledge data',
      details: error.message 
    }, { status: 500 })
  }
}