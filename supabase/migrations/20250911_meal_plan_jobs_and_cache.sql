-- Create meal_plan_jobs table for background processing
CREATE TABLE IF NOT EXISTS public.meal_plan_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.nutrition_profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    days_requested INTEGER NOT NULL DEFAULT 7,
    preferences JSONB DEFAULT '{}',
    nutrition_profile JSONB NOT NULL,
    skeleton_data JSONB,
    result_data JSONB,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meal_plan_cache table for caching generated plans
CREATE TABLE IF NOT EXISTS public.meal_plan_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cache_key TEXT UNIQUE NOT NULL,
    meal_data JSONB NOT NULL,
    nutrition_totals JSONB NOT NULL,
    shopping_list JSONB,
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meal_plan_jobs_profile_id ON public.meal_plan_jobs(profile_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_jobs_client_id ON public.meal_plan_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_jobs_organization_id ON public.meal_plan_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_jobs_status ON public.meal_plan_jobs(status);
CREATE INDEX IF NOT EXISTS idx_meal_plan_jobs_created_at ON public.meal_plan_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_meal_plan_cache_cache_key ON public.meal_plan_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_meal_plan_cache_expires_at ON public.meal_plan_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_meal_plan_cache_last_used_at ON public.meal_plan_cache(last_used_at DESC);

-- Enable RLS
ALTER TABLE public.meal_plan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies for meal_plan_jobs
CREATE POLICY "Users can view their organization's meal plan jobs" 
    ON public.meal_plan_jobs
    FOR SELECT
    USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM public.organization_members om 
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create meal plan jobs for their organization" 
    ON public.meal_plan_jobs
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT om.organization_id 
            FROM public.organization_members om 
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their organization's meal plan jobs" 
    ON public.meal_plan_jobs
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM public.organization_members om 
            WHERE om.user_id = auth.uid()
        )
    );

-- RLS policies for meal_plan_cache (public read, admin write)
CREATE POLICY "Anyone can read meal plan cache" 
    ON public.meal_plan_cache
    FOR SELECT
    USING (true);

CREATE POLICY "Only service role can insert meal plan cache" 
    ON public.meal_plan_cache
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can update meal plan cache" 
    ON public.meal_plan_cache
    FOR UPDATE
    USING (auth.role() = 'service_role');

CREATE POLICY "Only service role can delete meal plan cache" 
    ON public.meal_plan_cache
    FOR DELETE
    USING (auth.role() = 'service_role');

-- Create function to clean up expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_meal_plan_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.meal_plan_cache
    WHERE expires_at < NOW();
END;
$$;

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_meal_plan_jobs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_meal_plan_jobs_updated_at
    BEFORE UPDATE ON public.meal_plan_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_meal_plan_jobs_updated_at();

-- Grant permissions
GRANT ALL ON public.meal_plan_jobs TO authenticated;
GRANT ALL ON public.meal_plan_cache TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_meal_plan_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_meal_plan_jobs_updated_at() TO authenticated;