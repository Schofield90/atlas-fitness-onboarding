import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Get all class sessions with program details
    const { data: classes, error } = await supabase
      .from('class_sessions')
      .select(`
        *,
        program:programs(name, description, price_pennies)
      `)
      .eq('organization_id', organizationId)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching classes:', error);
      return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
    }

    return NextResponse.json({ classes });
  } catch (error) {
    console.error('Error in GET /api/booking/classes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const {
      organizationId,
      programId,
      title,
      instructor,
      startTime,
      duration,
      capacity,
      room,
      price,
      description,
      type
    } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // First, create or get the program
    let actualProgramId = programId;
    
    if (!programId) {
      // Create a new program for this class type
      const { data: program, error: programError } = await supabase
        .from('programs')
        .insert({
          organization_id: organizationId,
          name: title,
          description: description || `${type} class`,
          price_pennies: price * 100,
          is_active: true
        })
        .select()
        .single();

      if (programError) {
        console.error('Error creating program:', programError);
        return NextResponse.json({ error: 'Failed to create program' }, { status: 500 });
      }

      actualProgramId = program.id;
    }

    // Create the class session
    const { data: classSession, error: sessionError } = await supabase
      .from('class_sessions')
      .insert({
        organization_id: organizationId,
        program_id: actualProgramId,
        instructor_name: instructor,
        start_time: startTime,
        duration_minutes: duration,
        capacity,
        location: room,
        is_active: true
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating class session:', sessionError);
      return NextResponse.json({ error: 'Failed to create class session' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Class created successfully',
      class: classSession 
    });
  } catch (error) {
    console.error('Error in POST /api/booking/classes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { classId, ...updateData } = body;

    if (!classId) {
      return NextResponse.json({ error: 'Class ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('class_sessions')
      .update({
        instructor_name: updateData.instructor,
        start_time: updateData.startTime,
        duration_minutes: updateData.duration,
        capacity: updateData.capacity,
        location: updateData.room,
      })
      .eq('id', classId)
      .select()
      .single();

    if (error) {
      console.error('Error updating class:', error);
      return NextResponse.json({ error: 'Failed to update class' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Class updated successfully',
      class: data 
    });
  } catch (error) {
    console.error('Error in PUT /api/booking/classes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('classId');

    if (!classId) {
      return NextResponse.json({ error: 'Class ID required' }, { status: 400 });
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('class_sessions')
      .update({ is_active: false })
      .eq('id', classId);

    if (error) {
      console.error('Error deleting class:', error);
      return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/booking/classes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}