-- Migration: Coach Messaging System
-- Create tables and functions for coach-member messaging

-- Create member_coach_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.member_coach_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(member_id) -- Each member can only have one assigned coach
);

-- Create member_coach_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.member_coach_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('member', 'coach', 'ai')),
  sender_id UUID NOT NULL,
  sender_name TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create nutrition_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.nutrition_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(member_id)
);

-- Create meal_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meal_plan_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.meal_plan_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to clients table if they don't exist
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS nutrition_profile JSONB,
ADD COLUMN IF NOT EXISTS current_meal_plan JSONB;

-- Enable RLS on all tables
ALTER TABLE public.member_coach_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for member_coach_assignments
CREATE POLICY "Users can view their coach assignments" ON public.member_coach_assignments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.organization_members 
      WHERE org_id = organization_id
    )
  );

CREATE POLICY "Organization members can manage assignments" ON public.member_coach_assignments
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.organization_members 
      WHERE org_id = organization_id 
      AND role IN ('owner', 'admin')
    )
  );

-- Create RLS policies for member_coach_messages
CREATE POLICY "Users can view their messages" ON public.member_coach_messages
  FOR SELECT USING (
    auth.uid() = coach_id OR 
    auth.uid() IN (
      SELECT user_id FROM public.organization_members 
      WHERE org_id = organization_id
    )
  );

CREATE POLICY "Coaches can send messages" ON public.member_coach_messages
  FOR INSERT WITH CHECK (
    auth.uid() = coach_id AND
    auth.uid() IN (
      SELECT user_id FROM public.organization_members 
      WHERE org_id = organization_id
    )
  );

CREATE POLICY "Users can update their messages" ON public.member_coach_messages
  FOR UPDATE USING (
    auth.uid() = coach_id AND
    auth.uid() IN (
      SELECT user_id FROM public.organization_members 
      WHERE org_id = organization_id
    )
  );

-- Create RLS policies for nutrition_profiles
CREATE POLICY "Organization members can view nutrition profiles" ON public.nutrition_profiles
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.organization_members 
      WHERE org_id = organization_id
    )
  );

CREATE POLICY "Organization members can manage nutrition profiles" ON public.nutrition_profiles
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.organization_members 
      WHERE org_id = organization_id
    )
  );

-- Create RLS policies for meal_plans
CREATE POLICY "Organization members can view meal plans" ON public.meal_plans
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.organization_members 
      WHERE org_id = organization_id
    )
  );

CREATE POLICY "Organization members can manage meal plans" ON public.meal_plans
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.organization_members 
      WHERE org_id = organization_id
    )
  );

-- Create RLS policies for meal_plan_comments
CREATE POLICY "Organization members can view meal plan comments" ON public.meal_plan_comments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.organization_members om
      JOIN public.meal_plans mp ON mp.organization_id = om.org_id
      WHERE mp.id = meal_plan_id
    )
  );

CREATE POLICY "Coaches can add meal plan comments" ON public.meal_plan_comments
  FOR INSERT WITH CHECK (
    auth.uid() = coach_id AND
    auth.uid() IN (
      SELECT user_id FROM public.organization_members om
      JOIN public.meal_plans mp ON mp.organization_id = om.org_id
      WHERE mp.id = meal_plan_id
    )
  );

-- Create function to get coach conversations
CREATE OR REPLACE FUNCTION get_coach_conversations(coach_user_id UUID)
RETURNS TABLE (
  member_id UUID,
  member_name TEXT,
  member_email TEXT,
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE,
  unread_count BIGINT,
  sender_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_messages AS (
    SELECT DISTINCT ON (mcm.member_id)
      mcm.member_id,
      mcm.content as last_message,
      mcm.created_at as last_message_time,
      mcm.sender_type
    FROM member_coach_messages mcm
    WHERE mcm.coach_id = coach_user_id
    ORDER BY mcm.member_id, mcm.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      mcm.member_id,
      COUNT(*) as unread_count
    FROM member_coach_messages mcm
    WHERE mcm.coach_id = coach_user_id
      AND mcm.sender_type = 'member'
      AND mcm.read = FALSE
    GROUP BY mcm.member_id
  )
  SELECT 
    c.id as member_id,
    COALESCE(c.first_name || ' ' || c.last_name, c.first_name, c.email) as member_name,
    c.email as member_email,
    lm.last_message,
    lm.last_message_time,
    COALESCE(uc.unread_count, 0) as unread_count,
    lm.sender_type
  FROM clients c
  JOIN latest_messages lm ON lm.member_id = c.id
  LEFT JOIN unread_counts uc ON uc.member_id = c.id
  ORDER BY lm.last_message_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_member_coach_assignments_member ON member_coach_assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_member_coach_assignments_coach ON member_coach_assignments(coach_id);
CREATE INDEX IF NOT EXISTS idx_member_coach_assignments_org ON member_coach_assignments(organization_id);

CREATE INDEX IF NOT EXISTS idx_member_coach_messages_member ON member_coach_messages(member_id);
CREATE INDEX IF NOT EXISTS idx_member_coach_messages_coach ON member_coach_messages(coach_id);
CREATE INDEX IF NOT EXISTS idx_member_coach_messages_org ON member_coach_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_member_coach_messages_read ON member_coach_messages(read);
CREATE INDEX IF NOT EXISTS idx_member_coach_messages_created ON member_coach_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_nutrition_profiles_member ON nutrition_profiles(member_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_profiles_org ON nutrition_profiles(organization_id);

CREATE INDEX IF NOT EXISTS idx_meal_plans_member ON meal_plans(member_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_org ON meal_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_created ON meal_plans(created_at);

CREATE INDEX IF NOT EXISTS idx_meal_plan_comments_plan ON meal_plan_comments(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_comments_coach ON meal_plan_comments(coach_id);