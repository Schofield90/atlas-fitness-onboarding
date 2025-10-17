import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient()
    
    // Get the first organization
    const { data: org } = await adminSupabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const organizationId = org.id

    // Create programs
    const programs = [
      {
        organization_id: organizationId,
        name: 'Group Fitness Classes',
        description: 'Access to all group fitness classes including yoga, HIIT, spin, and more',
        is_active: true
      },
      {
        organization_id: organizationId,
        name: 'Personal Training',
        description: 'One-on-one personal training sessions',
        is_active: true
      },
      {
        organization_id: organizationId,
        name: 'Specialty Classes',
        description: 'Specialized classes like boxing, pilates, and dance',
        is_active: true
      }
    ]

    const { data: createdPrograms, error: programError } = await adminSupabase
      .from('programs')
      .insert(programs)
      .select()

    if (programError) {
      console.error('Program error:', programError)
      return NextResponse.json({ error: 'Failed to create programs', details: programError }, { status: 500 })
    }

    // Create class types
    const classTypes = [
      {
        organization_id: organizationId,
        name: 'Morning Yoga',
        description: 'Start your day with relaxing yoga',
        duration: 60,
        max_capacity: 20,
        program_id: createdPrograms[0].id,
        color: '#10B981'
      },
      {
        organization_id: organizationId,
        name: 'HIIT Training',
        description: 'High-intensity interval training for maximum results',
        duration: 45,
        max_capacity: 15,
        program_id: createdPrograms[0].id,
        color: '#EF4444'
      },
      {
        organization_id: organizationId,
        name: 'Spin Class',
        description: 'Indoor cycling workout',
        duration: 45,
        max_capacity: 25,
        program_id: createdPrograms[0].id,
        color: '#3B82F6'
      },
      {
        organization_id: organizationId,
        name: 'Strength Training',
        description: 'Build muscle and strength',
        duration: 60,
        max_capacity: 12,
        program_id: createdPrograms[0].id,
        color: '#8B5CF6'
      },
      {
        organization_id: organizationId,
        name: 'Pilates',
        description: 'Core strengthening and flexibility',
        duration: 50,
        max_capacity: 15,
        program_id: createdPrograms[2].id,
        color: '#EC4899'
      },
      {
        organization_id: organizationId,
        name: 'Boxing Fitness',
        description: 'High-energy boxing workout',
        duration: 60,
        max_capacity: 10,
        program_id: createdPrograms[2].id,
        color: '#F59E0B'
      }
    ]

    const { data: createdClassTypes, error: classTypeError } = await adminSupabase
      .from('class_types')
      .insert(classTypes)
      .select()

    if (classTypeError) {
      console.error('Class type error:', classTypeError)
      return NextResponse.json({ error: 'Failed to create class types', details: classTypeError }, { status: 500 })
    }

    // Create instructors
    const instructors = [
      {
        organization_id: organizationId,
        name: 'Sarah Johnson',
        email: 'sarah@atlasfitness.com',
        specialties: ['Yoga', 'Pilates'],
        bio: 'Certified yoga instructor with 10 years experience'
      },
      {
        organization_id: organizationId,
        name: 'Mike Wilson',
        email: 'mike@atlasfitness.com',
        specialties: ['HIIT', 'Strength Training'],
        bio: 'Former athlete specializing in high-intensity training'
      },
      {
        organization_id: organizationId,
        name: 'Emma Davis',
        email: 'emma@atlasfitness.com',
        specialties: ['Spin', 'Cardio'],
        bio: 'Spin instructor and cycling enthusiast'
      },
      {
        organization_id: organizationId,
        name: 'Tom Brown',
        email: 'tom@atlasfitness.com',
        specialties: ['Boxing', 'HIIT'],
        bio: 'Professional boxer turned fitness instructor'
      }
    ]

    const { data: createdInstructors, error: instructorError } = await adminSupabase
      .from('instructors')
      .insert(instructors)
      .select()

    if (instructorError) {
      console.error('Instructor error:', instructorError)
      return NextResponse.json({ error: 'Failed to create instructors', details: instructorError }, { status: 500 })
    }

    // Create class sessions for the next 2 weeks
    const classSessions = []
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 14)

    // Map class types to instructors
    const classInstructorMap = {
      'Morning Yoga': createdInstructors[0].id,
      'HIIT Training': createdInstructors[1].id,
      'Spin Class': createdInstructors[2].id,
      'Strength Training': createdInstructors[1].id,
      'Pilates': createdInstructors[0].id,
      'Boxing Fitness': createdInstructors[3].id
    }

    // Class schedule template
    const weeklySchedule = [
      { day: 1, classes: [
        { type: 'Morning Yoga', time: '07:00' },
        { type: 'HIIT Training', time: '09:00' },
        { type: 'Spin Class', time: '12:00' },
        { type: 'Strength Training', time: '17:00' },
        { type: 'Pilates', time: '18:30' }
      ]},
      { day: 2, classes: [
        { type: 'Spin Class', time: '06:30' },
        { type: 'Boxing Fitness', time: '09:00' },
        { type: 'Strength Training', time: '12:00' },
        { type: 'HIIT Training', time: '17:30' },
        { type: 'Morning Yoga', time: '19:00' }
      ]},
      { day: 3, classes: [
        { type: 'Morning Yoga', time: '07:00' },
        { type: 'Pilates', time: '09:00' },
        { type: 'Spin Class', time: '12:00' },
        { type: 'Boxing Fitness', time: '17:00' },
        { type: 'HIIT Training', time: '18:30' }
      ]},
      { day: 4, classes: [
        { type: 'HIIT Training', time: '06:30' },
        { type: 'Strength Training', time: '09:00' },
        { type: 'Morning Yoga', time: '12:00' },
        { type: 'Spin Class', time: '17:30' },
        { type: 'Pilates', time: '19:00' }
      ]},
      { day: 5, classes: [
        { type: 'Morning Yoga', time: '07:00' },
        { type: 'Boxing Fitness', time: '09:00' },
        { type: 'HIIT Training', time: '12:00' },
        { type: 'Strength Training', time: '17:00' },
        { type: 'Spin Class', time: '18:30' }
      ]},
      { day: 6, classes: [
        { type: 'Spin Class', time: '08:00' },
        { type: 'Morning Yoga', time: '09:30' },
        { type: 'HIIT Training', time: '11:00' },
        { type: 'Pilates', time: '14:00' }
      ]},
      { day: 0, classes: [
        { type: 'Morning Yoga', time: '09:00' },
        { type: 'Strength Training', time: '10:30' },
        { type: 'Spin Class', time: '12:00' }
      ]}
    ]

    // Generate sessions for each day
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay()
      const daySchedule = weeklySchedule.find(s => s.day === dayOfWeek)
      
      if (daySchedule) {
        for (const classInfo of daySchedule.classes) {
          const classType = createdClassTypes.find(ct => ct.name === classInfo.type)
          if (classType) {
            const [hours, minutes] = classInfo.time.split(':')
            const endTime = new Date(d)
            endTime.setHours(parseInt(hours), parseInt(minutes))
            endTime.setMinutes(endTime.getMinutes() + classType.duration)
            
            classSessions.push({
              organization_id: organizationId,
              class_type_id: classType.id,
              instructor_id: classInstructorMap[classInfo.type],
              date: d.toISOString().split('T')[0],
              start_time: classInfo.time + ':00',
              end_time: `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}:00`,
              max_capacity: classType.max_capacity,
              current_bookings: Math.floor(Math.random() * (classType.max_capacity * 0.7)), // Random bookings up to 70% capacity
              location: 'Main Studio',
              status: 'scheduled'
            })
          }
        }
      }
    }

    const { data: createdSessions, error: sessionError } = await adminSupabase
      .from('class_sessions')
      .insert(classSessions)
      .select()

    if (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.json({ error: 'Failed to create sessions', details: sessionError }, { status: 500 })
    }

    // Create some sample bookings for Sam Schofield
    const { data: samClient } = await adminSupabase
      .from('clients')
      .select('id')
      .eq('email', 'samschofield90@hotmail.co.uk')
      .single()

    if (samClient) {
      // Book Sam into 3 upcoming classes
      const upcomingSessions = createdSessions
        .filter(s => new Date(s.date) > new Date())
        .slice(0, 3)

      const bookings = upcomingSessions.map(session => ({
        organization_id: organizationId,
        class_session_id: session.id,
        customer_id: samClient.id,
        status: 'confirmed',
        booking_reference: `BK${Date.now()}${Math.random().toString(36).substr(2, 9)}`.toUpperCase()
      }))

      const { error: bookingError } = await adminSupabase
        .from('bookings')
        .insert(bookings)

      if (bookingError) {
        console.error('Booking error:', bookingError)
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        programs: createdPrograms.length,
        classTypes: createdClassTypes.length,
        instructors: createdInstructors.length,
        sessions: createdSessions.length,
        message: 'Sample booking data created successfully!'
      }
    })
  } catch (error: any) {
    console.error('Seed error:', error)
    return NextResponse.json({ 
      error: 'Failed to seed booking data',
      details: error.message 
    }, { status: 500 })
  }
}