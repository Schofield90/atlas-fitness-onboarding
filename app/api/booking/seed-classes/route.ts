import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'

// Sample class types and data
const CLASS_TYPES = [
  { name: 'HIIT', description: 'High Intensity Interval Training', duration: 45 },
  { name: 'Yoga', description: 'Mind and body relaxation', duration: 60 },
  { name: 'Spin', description: 'Indoor cycling workout', duration: 45 },
  { name: 'Strength Training', description: 'Build muscle and strength', duration: 60 },
  { name: 'Pilates', description: 'Core strengthening workout', duration: 50 },
  { name: 'Boxing', description: 'Boxing fitness workout', duration: 45 },
]

const INSTRUCTORS = [
  'Emma Johnson',
  'Mike Wilson',
  'Sarah Davis',
  'Tom Brown',
  'Lisa Garcia',
]

const LOCATIONS = [
  'Main Studio',
  'Studio A',
  'Studio B',
  'Outdoor Area',
]

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get organization ID
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      return NextResponse.json({ 
        error: 'No organization found',
        details: orgError 
      }, { status: 400 })
    }
    
    const createdPrograms = []
    const createdClasses = []
    
    // Create programs
    for (const classType of CLASS_TYPES) {
      const { data: program, error: programError } = await supabase
        .from('programs')
        .insert({
          organization_id: organizationId,
          name: classType.name,
          description: classType.description,
          price_pennies: Math.floor(Math.random() * 2000) + 1000, // Random price £10-£30
          is_active: true,
          max_participants: Math.floor(Math.random() * 15) + 10, // 10-25 participants
        })
        .select()
        .single()
      
      if (!programError && program) {
        createdPrograms.push(program)
        
        // Create 3-5 class sessions for each program over the next week
        const numSessions = Math.floor(Math.random() * 3) + 3
        
        for (let i = 0; i < numSessions; i++) {
          const daysAhead = Math.floor(Math.random() * 7) + 1
          const hour = Math.floor(Math.random() * 12) + 6 // 6 AM to 6 PM
          const startDate = new Date()
          startDate.setDate(startDate.getDate() + daysAhead)
          startDate.setHours(hour, 0, 0, 0)
          
          const { data: classSession, error: sessionError } = await supabase
            .from('class_sessions')
            .insert({
              organization_id: organizationId,
              program_id: program.id,
              name: classType.name,
              instructor_name: INSTRUCTORS[Math.floor(Math.random() * INSTRUCTORS.length)],
              start_time: startDate.toISOString(),
              duration_minutes: classType.duration,
              capacity: Math.floor(Math.random() * 15) + 10,
              location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
              is_active: true,
              recurring: false,
            })
            .select()
            .single()
          
          if (!sessionError && classSession) {
            createdClasses.push(classSession)
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Sample classes created successfully',
      stats: {
        programs_created: createdPrograms.length,
        classes_created: createdClasses.length,
      },
      data: {
        programs: createdPrograms,
        classes: createdClasses,
      }
    })
    
  } catch (error: any) {
    console.error('Error seeding classes:', error)
    return NextResponse.json({ 
      error: 'Failed to seed classes',
      details: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}