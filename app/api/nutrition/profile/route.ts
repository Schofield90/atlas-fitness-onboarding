import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'

// Types for nutrition profile
export interface NutritionProfile {
  id?: string
  user_id: string
  organization_id: string
  age: number
  sex: 'MALE' | 'FEMALE'
  height: number // in cm
  current_weight: number // in kg
  goal_weight: number // in kg
  activity_level: 'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'MODERATELY_ACTIVE' | 'VERY_ACTIVE' | 'EXTREMELY_ACTIVE'
  training_frequency: number // days per week
  training_types: string[]
  dietary_preferences: string[]
  allergies: string[]
  food_likes: string[]
  food_dislikes: string[]
  cooking_time: 'MINIMAL' | 'MODERATE' | 'EXTENSIVE'
  budget_constraint: 'LOW' | 'MODERATE' | 'HIGH'
  created_at?: string
  updated_at?: string
}

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
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching nutrition profile:', error)
      return createErrorResponse(error, 500)
    }
    
    // If no profile exists, return null
    if (!profile) {
      return NextResponse.json({
        success: true,
        data: null
      })
    }
    
    return NextResponse.json({
      success: true,
      data: profile
    })
  } catch (error) {
    console.error('Error in GET /api/nutrition/profile:', error)
    return createErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    // Create Supabase client
    const supabase = await createClient()
    
    // Get request body
    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['age', 'sex', 'height', 'current_weight', 'goal_weight', 'activity_level', 'training_frequency']
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }
    
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('nutrition_profiles')
      .select('id')
      .eq('user_id', userWithOrg.id)
      .eq('organization_id', userWithOrg.organizationId)
      .single()
    
    let profile
    
    if (existingProfile) {
      // Update existing profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('nutrition_profiles')
        .update({
          age: body.age,
          sex: body.sex,
          height: body.height,
          current_weight: body.current_weight,
          goal_weight: body.goal_weight,
          activity_level: body.activity_level,
          training_frequency: body.training_frequency,
          training_types: body.training_types || [],
          dietary_preferences: body.dietary_preferences || [],
          allergies: body.allergies || [],
          food_likes: body.food_likes || [],
          food_dislikes: body.food_dislikes || [],
          cooking_time: body.cooking_time || 'MODERATE',
          budget_constraint: body.budget_constraint || 'MODERATE',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProfile.id)
        .select()
        .single()
      
      if (updateError) {
        console.error('Error updating nutrition profile:', updateError)
        return createErrorResponse(updateError, 500)
      }
      
      profile = updatedProfile
    } else {
      // Create new profile
      const { data: newProfile, error: createError } = await supabase
        .from('nutrition_profiles')
        .insert({
          user_id: userWithOrg.id,
          organization_id: userWithOrg.organizationId,
          age: body.age,
          sex: body.sex,
          height: body.height,
          current_weight: body.current_weight,
          goal_weight: body.goal_weight,
          activity_level: body.activity_level,
          training_frequency: body.training_frequency,
          training_types: body.training_types || [],
          dietary_preferences: body.dietary_preferences || [],
          allergies: body.allergies || [],
          food_likes: body.food_likes || [],
          food_dislikes: body.food_dislikes || [],
          cooking_time: body.cooking_time || 'MODERATE',
          budget_constraint: body.budget_constraint || 'MODERATE'
        })
        .select()
        .single()
      
      if (createError) {
        console.error('Error creating nutrition profile:', createError)
        return createErrorResponse(createError, 500)
      }
      
      profile = newProfile
    }
    
    return NextResponse.json({
      success: true,
      message: existingProfile ? 'Profile updated successfully' : 'Profile created successfully',
      data: profile
    })
  } catch (error) {
    console.error('Error in POST /api/nutrition/profile:', error)
    return createErrorResponse(error)
  }
}