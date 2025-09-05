-- Create client nutrition plans table
CREATE TABLE IF NOT EXISTS client_nutrition_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Macro targets
    macro_targets JSONB NOT NULL DEFAULT '{}',
    
    -- Profile data used for calculations
    profile_data JSONB NOT NULL DEFAULT '{}',
    
    -- Generated meal plan
    meal_plan JSONB,
    
    -- Coach notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(client_id)
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_client_nutrition_plans_updated_at 
    BEFORE UPDATE ON client_nutrition_plans 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE client_nutrition_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access nutrition plans for clients in their organization
CREATE POLICY "Users can access nutrition plans for their organization clients" ON client_nutrition_plans
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON client_nutrition_plans TO authenticated;
GRANT USAGE ON SEQUENCE client_nutrition_plans_id_seq TO authenticated;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_nutrition_plans_client_id ON client_nutrition_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_client_nutrition_plans_organization_id ON client_nutrition_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_nutrition_plans_updated_at ON client_nutrition_plans(updated_at DESC);

-- Add trigger to automatically set organization_id from client
CREATE OR REPLACE FUNCTION set_nutrition_plan_organization_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Set organization_id from the client's organization_id
    SELECT organization_id INTO NEW.organization_id 
    FROM clients 
    WHERE id = NEW.client_id;
    
    IF NEW.organization_id IS NULL THEN
        RAISE EXCEPTION 'Could not determine organization_id for client_id %', NEW.client_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_client_nutrition_plans_organization_id
    BEFORE INSERT ON client_nutrition_plans
    FOR EACH ROW
    EXECUTE FUNCTION set_nutrition_plan_organization_id();

-- Add some useful comments
COMMENT ON TABLE client_nutrition_plans IS 'Stores AI-generated nutrition plans and macro targets for clients';
COMMENT ON COLUMN client_nutrition_plans.macro_targets IS 'JSON object containing protein, carbs, fats, and calories targets';
COMMENT ON COLUMN client_nutrition_plans.profile_data IS 'JSON object containing client profile data used for calculations (age, weight, height, activity level, goals, etc.)';
COMMENT ON COLUMN client_nutrition_plans.meal_plan IS 'JSON object containing the generated meal plan with recipes and instructions';
COMMENT ON COLUMN client_nutrition_plans.notes IS 'Private coach notes about the nutrition plan';