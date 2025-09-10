-- Create table for tracking meal plan generation jobs
CREATE TABLE IF NOT EXISTS meal_plan_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES nutrition_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Job status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  
  -- Job input parameters
  days_requested INTEGER NOT NULL,
  preferences JSONB,
  nutrition_profile JSONB NOT NULL, -- Snapshot of profile at time of request
  
  -- Results
  meal_plan_id UUID REFERENCES meal_plans(id),
  skeleton_data JSONB, -- Instant response with titles and macros
  error_message TEXT,
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  model_used VARCHAR(50),
  total_tokens_used INTEGER,
  processing_time_ms INTEGER
);

-- Index for fast lookups
CREATE INDEX idx_meal_plan_jobs_status ON meal_plan_jobs(status);
CREATE INDEX idx_meal_plan_jobs_client ON meal_plan_jobs(client_id);
CREATE INDEX idx_meal_plan_jobs_created ON meal_plan_jobs(created_at DESC);

-- Create cache table for common meal presets
CREATE TABLE IF NOT EXISTS meal_plan_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key VARCHAR(255) UNIQUE NOT NULL, -- Hash of input parameters
  
  -- Cached data
  meal_data JSONB NOT NULL,
  nutrition_totals JSONB NOT NULL,
  shopping_list JSONB,
  
  -- Metadata
  calories_target INTEGER NOT NULL,
  protein_target INTEGER NOT NULL,
  dietary_type VARCHAR(50),
  days INTEGER NOT NULL,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Index for fast cache lookups
CREATE INDEX idx_meal_plan_cache_key ON meal_plan_cache(cache_key);
CREATE INDEX idx_meal_plan_cache_expires ON meal_plan_cache(expires_at);

-- Enable RLS
ALTER TABLE meal_plan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own meal plan jobs" ON meal_plan_jobs
  FOR SELECT USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Staff can manage meal plan jobs" ON meal_plan_jobs
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_staff 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Cache is read-only for all authenticated users
CREATE POLICY "Authenticated users can read cache" ON meal_plan_cache
  FOR SELECT USING (auth.uid() IS NOT NULL);