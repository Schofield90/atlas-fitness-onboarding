import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// Mock environment variables for testing
const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';

describe('Nutrition Profile Save Fix', () => {
  let supabase: any;
  let testClient: any;
  let testLead: any;
  let createdProfileIds: string[] = [];

  beforeEach(async () => {
    // Skip tests if no real Supabase key provided
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('Skipping nutrition profile tests - no SUPABASE_SERVICE_ROLE_KEY');
      return;
    }

    supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get a test client and lead from the database
    const { data: client } = await supabase
      .from('clients')
      .select('id, lead_id, organization_id, org_id, email, first_name, last_name, gender')
      .eq('email', 'sam@atlas-gyms.co.uk')
      .single();
    
    testClient = client;

    // Find corresponding lead
    const { data: lead } = await supabase
      .from('leads')
      .select('id, organization_id')
      .eq('email', testClient?.email)
      .single();
    
    testLead = lead;
  });

  afterEach(async () => {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !supabase) return;

    // Clean up created profiles
    if (createdProfileIds.length > 0) {
      await supabase
        .from('nutrition_profiles')
        .delete()
        .in('id', createdProfileIds);
      
      createdProfileIds = [];
    }
  });

  it('should successfully save nutrition profile with valid lead_id', async () => {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('Skipping test - no database connection');
      return;
    }

    expect(testClient).toBeTruthy();
    expect(testLead).toBeTruthy();

    const profileData = {
      // Required fields
      lead_id: testLead.id,
      organization_id: testLead.organization_id,
      age: 30,
      height: 180,
      current_weight: 75.0,
      goal_weight: 75.0,
      sex: 'MALE',
      activity_level: 'MODERATELY_ACTIVE',
      
      // Optional calculated nutrition values
      bmr: 1800,
      tdee: 2200,
      target_calories: 2200,
      target_protein: 120,
      target_carbs: 275,
      target_fat: 60,
      target_fiber: 25,
      protein_grams: 120,
      carbs_grams: 275,
      fat_grams: 60,
      
      // Optional lifestyle preferences
      training_frequency: 3,
      training_types: [],
      dietary_preferences: [],
      allergies: [],
      food_likes: [],
      food_dislikes: [],
      cooking_time: 'MODERATE',
      budget_constraint: 'MODERATE',
      cultural_restrictions: [],
    };

    const { data, error } = await supabase
      .from('nutrition_profiles')
      .upsert(profileData)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.lead_id).toBe(testLead.id);
    expect(data.age).toBe(30);
    expect(data.sex).toBe('MALE');
    expect(data.target_calories).toBe(2200);

    if (data?.id) {
      createdProfileIds.push(data.id);
    }
  });

  it('should find lead_id when client has no direct lead_id reference', async () => {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('Skipping test - no database connection');
      return;
    }

    // Simulate client without lead_id (like the original error case)
    const clientWithoutLeadId = {
      ...testClient,
      lead_id: null
    };

    // This simulates the lead finding logic in NutritionSetup.tsx
    let leadId = clientWithoutLeadId.lead_id;
    
    if (!leadId && clientWithoutLeadId.email) {
      const { data: leadByEmail } = await supabase
        .from('leads')
        .select('id')
        .eq('email', clientWithoutLeadId.email)
        .single();
      
      if (leadByEmail) {
        leadId = leadByEmail.id;
      }
    }
    
    if (!leadId) {
      const { data: leadByClientId } = await supabase
        .from('leads')
        .select('id')
        .eq('client_id', clientWithoutLeadId.id)
        .single();
      
      if (leadByClientId) {
        leadId = leadByClientId.id;
      }
    }

    expect(leadId).toBeTruthy();
    expect(leadId).toBe(testLead.id);
  });

  it('should handle required field validation', async () => {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('Skipping test - no database connection');
      return;
    }

    // Test missing required field (sex)
    const incompleteData = {
      lead_id: testLead.id,
      organization_id: testLead.organization_id,
      age: 30,
      height: 180,
      current_weight: 75.0,
      goal_weight: 75.0,
      // Missing 'sex' - should fail
      activity_level: 'MODERATELY_ACTIVE',
    };

    const { error } = await supabase
      .from('nutrition_profiles')
      .insert(incompleteData);

    expect(error).toBeTruthy();
    expect(error.code).toBe('23502'); // NOT NULL constraint violation
    expect(error.message).toContain('sex');
  });

  it('should reject invalid lead_id foreign key', async () => {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('Skipping test - no database connection');
      return;
    }

    const invalidData = {
      lead_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
      organization_id: testLead.organization_id,
      age: 30,
      height: 180,
      current_weight: 75.0,
      goal_weight: 75.0,
      sex: 'MALE',
      activity_level: 'MODERATELY_ACTIVE',
    };

    const { error } = await supabase
      .from('nutrition_profiles')
      .insert(invalidData);

    expect(error).toBeTruthy();
    expect(error.code).toBe('23503'); // Foreign key constraint violation
    expect(error.message).toContain('foreign key constraint');
    expect(error.message).toContain('nutrition_profiles_lead_id_fkey');
  });

  it('should update existing nutrition profile on upsert', async () => {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('Skipping test - no database connection');
      return;
    }

    const initialData = {
      lead_id: testLead.id,
      organization_id: testLead.organization_id,
      age: 30,
      height: 180,
      current_weight: 75.0,
      goal_weight: 75.0,
      sex: 'MALE',
      activity_level: 'MODERATELY_ACTIVE',
      target_calories: 2000
    };

    // First insert
    const { data: firstInsert } = await supabase
      .from('nutrition_profiles')
      .upsert(initialData)
      .select()
      .single();

    expect(firstInsert).toBeTruthy();
    expect(firstInsert.target_calories).toBe(2000);
    
    if (firstInsert?.id) {
      createdProfileIds.push(firstInsert.id);
    }

    // Update with same lead_id
    const updatedData = {
      ...initialData,
      target_calories: 2200,
      age: 31
    };

    const { data: updatedInsert } = await supabase
      .from('nutrition_profiles')
      .upsert(updatedData)
      .select()
      .single();

    expect(updatedInsert).toBeTruthy();
    expect(updatedInsert.id).toBe(firstInsert.id); // Should be same record
    expect(updatedInsert.target_calories).toBe(2200);
    expect(updatedInsert.age).toBe(31);
  });
});