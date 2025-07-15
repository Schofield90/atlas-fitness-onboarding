import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

// Validation schema for client conversion
const clientConversionSchema = z.object({
  // Basic client information
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  
  // Address information
  address: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().default('UK'),
  
  // Emergency contact
  emergency_name: z.string().optional(),
  emergency_phone: z.string().optional(),
  emergency_relationship: z.string().optional(),
  
  // Health information
  medical_conditions: z.string().optional(),
  medications: z.string().optional(),
  fitness_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  goals: z.string().optional(),
  
  // Membership information
  membership_plan_id: z.string().uuid('Valid membership plan is required'),
  start_date: z.string().default(() => new Date().toISOString().split('T')[0]),
  billing_date: z.number().min(1).max(31).default(1),
  
  // Assignment
  assigned_trainer: z.string().uuid().optional(),
  
  // Additional information
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  
  // Conversion tracking
  user_id: z.string().uuid('User ID is required for tracking'),
});

// POST /api/leads/[id]/convert - Convert lead to client
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    
    // Validate the request body
    const validationResult = clientConversionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Get the lead to convert
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();
    
    if (leadError) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    
    // Check if lead is already converted
    if (lead.status === 'converted') {
      return NextResponse.json({ error: 'Lead is already converted' }, { status: 400 });
    }
    
    // Get the membership plan
    const { data: membershipPlan, error: planError } = await supabaseAdmin
      .from('membership_plans')
      .select('*')
      .eq('id', data.membership_plan_id)
      .eq('organization_id', lead.organization_id)
      .single();
    
    if (planError) {
      return NextResponse.json({ error: 'Membership plan not found' }, { status: 404 });
    }
    
    // Start a transaction-like process
    // 1. Create the client
    const clientData = {
      organization_id: lead.organization_id,
      lead_id: lead.id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
      address: data.address,
      city: data.city,
      postcode: data.postcode,
      country: data.country,
      emergency_name: data.emergency_name,
      emergency_phone: data.emergency_phone,
      emergency_relationship: data.emergency_relationship,
      medical_conditions: data.medical_conditions,
      medications: data.medications,
      fitness_level: data.fitness_level,
      goals: data.goals,
      status: 'active',
      assigned_trainer: data.assigned_trainer,
      joined_date: data.start_date,
      notes: data.notes,
      tags: data.tags,
    };
    
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert([clientData])
      .select()
      .single();
    
    if (clientError) {
      console.error('Error creating client:', clientError);
      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
    }
    
    // 2. Create the membership
    const membershipData = {
      client_id: client.id,
      plan_id: data.membership_plan_id,
      status: 'active',
      start_date: data.start_date,
      monthly_price: membershipPlan.price,
      billing_date: data.billing_date,
      next_payment_date: calculateNextPaymentDate(data.start_date, data.billing_date),
      classes_used: 0,
      guest_passes_used: 0,
    };
    
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .insert([membershipData])
      .select()
      .single();
    
    if (membershipError) {
      console.error('Error creating membership:', membershipError);
      // Clean up - delete the client if membership creation failed
      await supabaseAdmin.from('clients').delete().eq('id', client.id);
      return NextResponse.json({ error: 'Failed to create membership' }, { status: 500 });
    }
    
    // 3. Update the lead status to converted
    const { error: updateLeadError } = await supabaseAdmin
      .from('leads')
      .update({
        status: 'converted',
        conversion_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    
    if (updateLeadError) {
      console.error('Error updating lead status:', updateLeadError);
      // Note: We don't fail here as the client and membership are created successfully
    }
    
    // 4. Create activity record for the conversion
    await supabaseAdmin
      .from('lead_activities')
      .insert([{
        lead_id: id,
        user_id: data.user_id,
        type: 'status_change',
        subject: 'Lead Converted to Client',
        content: `Lead successfully converted to client. Client ID: ${client.id}, Membership: ${membershipPlan.name}`,
        metadata: {
          client_id: client.id,
          membership_id: membership.id,
          membership_plan: membershipPlan.name,
          conversion_date: new Date().toISOString(),
        },
      }]);
    
    // Return the complete conversion result
    return NextResponse.json({
      success: true,
      client: {
        ...client,
        membership: {
          ...membership,
          plan: membershipPlan,
        },
      },
      message: 'Lead successfully converted to client',
    });
    
  } catch (error) {
    console.error('Error in lead conversion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to calculate next payment date
function calculateNextPaymentDate(startDate: string, billingDate: number): string {
  const start = new Date(startDate);
  const nextPayment = new Date(start);
  
  // Set to next month, same billing date
  nextPayment.setMonth(nextPayment.getMonth() + 1);
  nextPayment.setDate(billingDate);
  
  // Handle edge cases (e.g., billing date 31 in February)
  if (nextPayment.getDate() !== billingDate) {
    nextPayment.setDate(0); // Set to last day of previous month
  }
  
  return nextPayment.toISOString().split('T')[0];
}