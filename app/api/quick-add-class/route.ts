import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { headers } from 'next/headers';

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Get user's organization
    const { data: orgUser } = await supabase
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();
      
    let organizationId = orgUser?.organization_id;
    
    // If not found in organization_users, check user_organizations
    if (!organizationId) {
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
        
      organizationId = userOrg?.organization_id;
    }
    
    // If still not found, check if they own an organization
    if (!organizationId) {
      const { data: ownedOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single();
        
      organizationId = ownedOrg?.id;
    }
    
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found for user' }, { status: 400 });
    }
    
    console.log('Adding class for organization:', organizationId);
    
    // First, get or create a program
    let { data: programs } = await supabase
      .from('programs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(1);

    let programId;
    
    if (!programs || programs.length === 0) {
      // Create a program
      const { data: newProgram, error: programError } = await supabase
        .from('programs')
        .insert({
          organization_id: organizationId,
          name: 'HIIT Blast',
          description: 'High intensity interval training',
          price_pennies: 2000,
          duration_minutes: 45,
          is_active: true
        })
        .select()
        .single();
        
      if (programError) {
        console.error('Error creating program:', programError);
        return NextResponse.json({ error: `Failed to create program: ${programError.message}` }, { status: 400 });
      }
        
      programId = newProgram?.id;
    } else {
      programId = programs[0].id;
    }
    
    // Create classes for the next few days
    const classes = [];
    const instructors = ['Sarah Chen', 'Mike Johnson', 'Emma Wilson', 'Tom Davis'];
    const locations = ['Studio A', 'Studio B', 'Main Gym'];
    
    // Add 5 classes over the next 3 days
    for (let i = 0; i < 5; i++) {
      const startTime = new Date();
      
      // Distribute classes over next 3 days
      const daysToAdd = Math.floor(i / 2);
      startTime.setDate(startTime.getDate() + daysToAdd);
      
      // Set different times
      const hours = i % 2 === 0 ? 10 : 17; // 10am or 5pm
      startTime.setHours(hours, 0, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 45);
      
      classes.push({
        organization_id: organizationId,
        program_id: programId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        instructor_name: instructors[i % instructors.length],
        capacity: 20,
        location: locations[i % locations.length],
        duration_minutes: 45
      });
    }
    
    const { data: newClasses, error: classError } = await supabase
      .from('class_sessions')
      .insert(classes)
      .select();

    if (classError) {
      console.error('Error creating classes:', classError);
      return NextResponse.json({ error: `Failed to create classes: ${classError.message}` }, { status: 400 });
    }
    
    // Add some sample bookings to make it look realistic
    const { data: customers } = await supabase
      .from('leads')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(10);
    
    if (customers && customers.length > 0 && newClasses) {
      const bookings = [];
      
      newClasses.forEach((classSession, index) => {
        // Add 5-15 bookings per class
        const numBookings = Math.floor(Math.random() * 10) + 5;
        for (let i = 0; i < numBookings && i < customers.length; i++) {
          bookings.push({
            class_session_id: classSession.id,
            customer_id: customers[i].id,
            status: 'confirmed',
            booking_date: new Date().toISOString()
          });
        }
      });
      
      if (bookings.length > 0) {
        await supabase.from('bookings').insert(bookings);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Created ${newClasses?.length || 0} classes`,
      classes: newClasses 
    });
    
  } catch (error: any) {
    console.error('Error in quick-add-class:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}