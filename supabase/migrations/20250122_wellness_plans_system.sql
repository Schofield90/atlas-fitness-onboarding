-- =====================================================
-- WELLNESS PLANS SYSTEM - Multi-Aspect Health Management
-- =====================================================

-- 1. AI Coach Personalities (Organization-specific)
-- =====================================================
CREATE TABLE IF NOT EXISTS coach_personalities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  personality_traits JSONB DEFAULT '{}', -- empathetic, motivating, strict, etc.
  communication_style JSONB DEFAULT '{}', -- formal, casual, supportive, etc.
  focus_areas TEXT[] DEFAULT ARRAY[]::TEXT[], -- nutrition, fitness, mental health, etc.
  custom_prompts JSONB DEFAULT '{}', -- custom system prompts for different scenarios
  question_styles JSONB DEFAULT '{}', -- how to phrase questions
  response_patterns JSONB DEFAULT '{}', -- how to structure responses
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- 2. Wellness Conversation Context
-- =====================================================
CREATE TABLE IF NOT EXISTS wellness_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  coach_personality_id UUID REFERENCES coach_personalities(id),
  conversation_phase VARCHAR(50) NOT NULL, -- assessment, planning, adjustment, check-in
  context_data JSONB NOT NULL DEFAULT '{}', -- stores all conversation context
  learned_preferences JSONB DEFAULT '{}', -- what we've learned about the client
  goals JSONB DEFAULT '{}', -- client's stated goals
  constraints JSONB DEFAULT '{}', -- allergies, injuries, time limitations
  lifestyle_factors JSONB DEFAULT '{}', -- work schedule, family, stress levels
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  conversation_history JSONB DEFAULT '[]', -- array of messages with timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Dynamic Question Templates
-- =====================================================
CREATE TABLE IF NOT EXISTS wellness_question_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL, -- nutrition, sleep, stress, exercise, etc.
  subcategory VARCHAR(100),
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL, -- open_ended, multiple_choice, scale, yes_no
  options JSONB, -- for multiple choice questions
  follow_up_conditions JSONB, -- conditions for follow-up questions
  context_requirements JSONB, -- what context is needed to ask this
  priority INTEGER DEFAULT 50, -- higher = more important
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Wellness Plan Components
-- =====================================================
CREATE TABLE IF NOT EXISTS wellness_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_name VARCHAR(200),
  plan_type VARCHAR(50) NOT NULL, -- comprehensive, nutrition, fitness, mental_health, sleep
  status VARCHAR(50) DEFAULT 'active', -- draft, active, paused, completed
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  
  -- Meal Planning
  meal_plans JSONB DEFAULT '{}', -- breakfast, lunch, dinner, snacks with customization
  nutrition_targets JSONB DEFAULT '{}', -- calories, macros, micros
  dietary_preferences TEXT[] DEFAULT ARRAY[]::TEXT[],
  allergies TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Hydration
  water_intake_target INTEGER, -- in ml
  hydration_reminders JSONB DEFAULT '{}',
  
  -- Sleep & Recovery
  sleep_schedule JSONB DEFAULT '{}', -- target bed/wake times
  sleep_quality_factors JSONB DEFAULT '{}', -- things affecting sleep
  recovery_protocols JSONB DEFAULT '{}', -- stretching, meditation, etc.
  
  -- Mental Wellbeing
  stress_management JSONB DEFAULT '{}',
  mindfulness_practices JSONB DEFAULT '{}',
  mood_tracking_enabled BOOLEAN DEFAULT false,
  
  -- Habits & Behaviors
  habit_goals JSONB DEFAULT '[]', -- array of habits to build/break
  behavior_triggers JSONB DEFAULT '{}',
  
  -- Training Integration
  training_schedule_sync BOOLEAN DEFAULT true,
  pre_workout_nutrition JSONB DEFAULT '{}',
  post_workout_nutrition JSONB DEFAULT '{}',
  recovery_between_sessions JSONB DEFAULT '{}',
  
  -- Customization
  coach_notes TEXT,
  client_notes TEXT,
  adjustments_history JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- could be coach or client
  last_modified_by UUID
);

-- 5. Daily Wellness Logs
-- =====================================================
CREATE TABLE IF NOT EXISTS wellness_daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wellness_plan_id UUID NOT NULL REFERENCES wellness_plans(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Meals
  meals_logged JSONB DEFAULT '{}', -- actual meals consumed
  meal_adherence_score DECIMAL(3,2), -- 0-1 score
  
  -- Hydration
  water_intake_ml INTEGER,
  
  -- Sleep
  sleep_hours DECIMAL(3,1),
  sleep_quality INTEGER, -- 1-10 scale
  wake_time TIME,
  bed_time TIME,
  
  -- Exercise (synced from bookings/attendance)
  workout_completed BOOLEAN DEFAULT false,
  workout_intensity INTEGER, -- 1-10 scale
  workout_notes TEXT,
  
  -- Wellbeing
  energy_level INTEGER, -- 1-10 scale
  stress_level INTEGER, -- 1-10 scale
  mood VARCHAR(50),
  
  -- Habits
  habits_completed JSONB DEFAULT '[]',
  
  notes TEXT,
  ai_insights JSONB DEFAULT '{}', -- AI-generated insights for the day
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wellness_plan_id, date)
);

-- 6. Wellness Plan Templates (Gym Owner Created)
-- =====================================================
CREATE TABLE IF NOT EXISTS wellness_plan_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  template_type VARCHAR(50) NOT NULL,
  template_data JSONB NOT NULL, -- full plan structure
  target_demographics JSONB DEFAULT '{}', -- age, fitness level, goals
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- 7. AI Learning Repository (Per Client)
-- =====================================================
CREATE TABLE IF NOT EXISTS wellness_ai_learning (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  learning_type VARCHAR(100) NOT NULL, -- preference, response_pattern, success_factor
  category VARCHAR(100),
  data_point JSONB NOT NULL,
  confidence_score DECIMAL(3,2), -- 0-1
  learned_at TIMESTAMPTZ DEFAULT NOW(),
  last_validated TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- 8. Wellness Recommendations Engine
-- =====================================================
CREATE TABLE IF NOT EXISTS wellness_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wellness_plan_id UUID NOT NULL REFERENCES wellness_plans(id) ON DELETE CASCADE,
  recommendation_type VARCHAR(100) NOT NULL,
  recommendation_text TEXT NOT NULL,
  reasoning JSONB DEFAULT '{}', -- why this recommendation
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, rejected, completed
  client_response TEXT,
  coach_override TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_coach_personalities_org ON coach_personalities(organization_id);
CREATE INDEX idx_wellness_conversations_client ON wellness_conversations(client_id);
CREATE INDEX idx_wellness_conversations_phase ON wellness_conversations(conversation_phase);
CREATE INDEX idx_wellness_plans_client ON wellness_plans(client_id);
CREATE INDEX idx_wellness_plans_status ON wellness_plans(status);
CREATE INDEX idx_wellness_daily_logs_date ON wellness_daily_logs(date DESC);
CREATE INDEX idx_wellness_daily_logs_plan ON wellness_daily_logs(wellness_plan_id);
CREATE INDEX idx_wellness_ai_learning_client ON wellness_ai_learning(client_id);
CREATE INDEX idx_wellness_recommendations_plan ON wellness_recommendations(wellness_plan_id);
CREATE INDEX idx_wellness_recommendations_status ON wellness_recommendations(status);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE coach_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_question_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_ai_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_recommendations ENABLE ROW LEVEL SECURITY;

-- Coach Personalities RLS
CREATE POLICY "Organization members can manage coach personalities"
  ON coach_personalities
  FOR ALL
  USING (
    organization_id IN (
      SELECT o.id FROM organizations o
      JOIN memberships m ON m.organization_id = o.id
      WHERE m.user_id = auth.uid()
    )
  );

-- Wellness Conversations RLS
CREATE POLICY "Users can view own conversations"
  ON wellness_conversations
  FOR SELECT
  USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT o.id FROM organizations o
      JOIN memberships m ON m.organization_id = o.id
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own conversations"
  ON wellness_conversations
  FOR ALL
  USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT o.id FROM organizations o
      JOIN memberships m ON m.organization_id = o.id
      WHERE m.user_id = auth.uid() AND m.role IN ('owner', 'admin', 'coach')
    )
  );

-- Wellness Plans RLS
CREATE POLICY "Users can view own wellness plans"
  ON wellness_plans
  FOR SELECT
  USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT o.id FROM organizations o
      JOIN memberships m ON m.organization_id = o.id
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage wellness plans"
  ON wellness_plans
  FOR ALL
  USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT o.id FROM organizations o
      JOIN memberships m ON m.organization_id = o.id
      WHERE m.user_id = auth.uid() AND m.role IN ('owner', 'admin', 'coach')
    )
  );

-- Daily Logs RLS
CREATE POLICY "Users can manage own daily logs"
  ON wellness_daily_logs
  FOR ALL
  USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    OR
    wellness_plan_id IN (
      SELECT id FROM wellness_plans
      WHERE organization_id IN (
        SELECT o.id FROM organizations o
        JOIN memberships m ON m.organization_id = o.id
        WHERE m.user_id = auth.uid() AND m.role IN ('owner', 'admin', 'coach')
      )
    )
  );

-- Plan Templates RLS
CREATE POLICY "Organization members can manage templates"
  ON wellness_plan_templates
  FOR ALL
  USING (
    organization_id IN (
      SELECT o.id FROM organizations o
      JOIN memberships m ON m.organization_id = o.id
      WHERE m.user_id = auth.uid() AND m.role IN ('owner', 'admin', 'coach')
    )
  );

-- AI Learning RLS
CREATE POLICY "Users can view own AI learning"
  ON wellness_ai_learning
  FOR SELECT
  USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT o.id FROM organizations o
      JOIN memberships m ON m.organization_id = o.id
      WHERE m.user_id = auth.uid()
    )
  );

-- Recommendations RLS
CREATE POLICY "Users can manage recommendations"
  ON wellness_recommendations
  FOR ALL
  USING (
    wellness_plan_id IN (
      SELECT id FROM wellness_plans
      WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
      OR organization_id IN (
        SELECT o.id FROM organizations o
        JOIN memberships m ON m.organization_id = o.id
        WHERE m.user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to sync training data with wellness plans
CREATE OR REPLACE FUNCTION sync_training_with_wellness()
RETURNS TRIGGER AS $$
BEGIN
  -- When a booking is completed, log it in daily wellness log
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO wellness_daily_logs (
      wellness_plan_id,
      client_id,
      date,
      workout_completed,
      workout_notes
    )
    SELECT 
      wp.id,
      NEW.client_id,
      NEW.class_date,
      true,
      'Class: ' || cs.name
    FROM wellness_plans wp
    JOIN class_sessions cs ON cs.id = NEW.class_session_id
    WHERE wp.client_id = NEW.client_id
      AND wp.status = 'active'
      AND wp.training_schedule_sync = true
    ON CONFLICT (wellness_plan_id, date) 
    DO UPDATE SET
      workout_completed = true,
      workout_notes = COALESCE(wellness_daily_logs.workout_notes || ', ', '') || EXCLUDED.workout_notes;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking sync
CREATE TRIGGER sync_bookings_to_wellness
  AFTER UPDATE ON class_bookings
  FOR EACH ROW
  EXECUTE FUNCTION sync_training_with_wellness();

-- Function to generate AI recommendations based on patterns
CREATE OR REPLACE FUNCTION generate_wellness_recommendations(
  p_wellness_plan_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_plan wellness_plans;
  v_recent_logs wellness_daily_logs[];
  v_client_learning wellness_ai_learning[];
BEGIN
  -- Get the plan
  SELECT * INTO v_plan FROM wellness_plans WHERE id = p_wellness_plan_id;
  
  -- Get recent logs (last 7 days)
  SELECT ARRAY_AGG(dl.*) INTO v_recent_logs
  FROM wellness_daily_logs dl
  WHERE dl.wellness_plan_id = p_wellness_plan_id
    AND dl.date >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Get AI learning for this client
  SELECT ARRAY_AGG(al.*) INTO v_client_learning
  FROM wellness_ai_learning al
  WHERE al.client_id = v_plan.client_id
    AND al.is_active = true;
  
  -- This would typically call an AI service to generate recommendations
  -- For now, we'll create a placeholder
  INSERT INTO wellness_recommendations (
    wellness_plan_id,
    recommendation_type,
    recommendation_text,
    reasoning,
    priority
  )
  VALUES (
    p_wellness_plan_id,
    'daily_adjustment',
    'Based on your recent activity, consider adjusting your meal timing',
    jsonb_build_object(
      'recent_patterns', v_recent_logs,
      'learned_preferences', v_client_learning
    ),
    'medium'
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA FOR DEVELOPMENT
-- =====================================================

-- Insert default coach personality for organizations
INSERT INTO coach_personalities (
  organization_id,
  name,
  description,
  personality_traits,
  communication_style,
  focus_areas
)
SELECT 
  id,
  'Balanced Coach',
  'A well-rounded coach focusing on holistic wellness',
  '{"empathy": "high", "motivation": "moderate", "structure": "moderate"}'::jsonb,
  '{"tone": "friendly", "formality": "casual", "encouragement": "frequent"}'::jsonb,
  ARRAY['nutrition', 'fitness', 'mental_health', 'sleep']
FROM organizations
ON CONFLICT (organization_id, name) DO NOTHING;

-- Insert sample question templates
INSERT INTO wellness_question_templates (
  category,
  subcategory,
  question_text,
  question_type,
  options,
  follow_up_conditions,
  priority
) VALUES
  ('nutrition', 'preferences', 'What are your main dietary preferences or restrictions?', 'multiple_choice', 
   '["No restrictions", "Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Keto", "Other"]'::jsonb,
   '{"Other": "Please specify your dietary preferences"}'::jsonb, 100),
  
  ('sleep', 'quality', 'How would you rate your sleep quality over the past week?', 'scale',
   '{"min": 1, "max": 10, "labels": {"1": "Very Poor", "10": "Excellent"}}'::jsonb,
   '{"value_less_than": 6, "follow_up": "What factors are affecting your sleep?"}'::jsonb, 90),
  
  ('fitness', 'goals', 'What is your primary fitness goal right now?', 'open_ended',
   null, null, 95),
  
  ('stress', 'management', 'How do you typically manage stress?', 'multiple_choice',
   '["Exercise", "Meditation", "Reading", "Social activities", "I struggle with stress management"]'::jsonb,
   '{"I struggle with stress management": "Would you like help developing stress management techniques?"}'::jsonb, 85)
ON CONFLICT DO NOTHING;