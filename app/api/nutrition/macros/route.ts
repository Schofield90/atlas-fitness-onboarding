import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'
import { computeMacros, validateProfileForMacros } from '@/app/lib/services/nutrition/macro-calculator'

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    // Create Supabase client
    const supabase = await createClient()
    
    // Get user's nutrition profile
    const { data: profile, error } = await supabase
      .from('nutrition_profiles')
      .select('*')
      .eq('user_id', userWithOrg.id)
      .eq('organization_id', userWithOrg.organizationId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return NextResponse.json(
          { 
            error: 'Profile not found',
            message: 'Please complete your nutrition profile setup first.'
          },
          { status: 404 }
        )
      }
      console.error('Error fetching nutrition profile:', error)
      return createErrorResponse(error, 500)
    }
    
    // Validate profile has all required fields
    if (!validateProfileForMacros(profile)) {
      return NextResponse.json(
        { 
          error: 'Profile incomplete',
          message: 'Please complete all required profile information to calculate macros.'
        },
        { status: 400 }
      )
    }
    
    // Calculate macros
    const macros = computeMacros(profile)
    
    // Store calculated macros in the profile for future reference
    await supabase
      .from('nutrition_profiles')
      .update({
        target_calories: macros.calories,
        target_protein: macros.protein,
        target_carbs: macros.carbs,
        target_fat: macros.fat,
        target_fiber: macros.fiber,
        macros_updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)
    
    return NextResponse.json({
      success: true,
      data: macros
    })
  } catch (error) {
    console.error('Error in GET /api/nutrition/macros:', error)
    return createErrorResponse(error)
  }
}