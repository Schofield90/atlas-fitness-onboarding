-- Create recipes table for community meal library
CREATE TABLE IF NOT EXISTS recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    meal_type VARCHAR(50) NOT NULL CHECK (meal_type IN ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner')),
    
    -- Nutritional information
    calories INTEGER NOT NULL,
    protein DECIMAL(10,2) NOT NULL,
    carbs DECIMAL(10,2) NOT NULL,
    fat DECIMAL(10,2) NOT NULL,
    fiber DECIMAL(10,2),
    sugar DECIMAL(10,2),
    sodium DECIMAL(10,2),
    
    -- Time information
    prep_time INTEGER, -- in minutes
    cook_time INTEGER, -- in minutes
    total_time INTEGER GENERATED ALWAYS AS (prep_time + cook_time) STORED,
    
    -- Recipe details
    servings INTEGER DEFAULT 1,
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    cuisine VARCHAR(100),
    
    -- Ingredients and instructions stored as JSONB for flexibility
    ingredients JSONB NOT NULL, -- Array of {item, amount, unit}
    instructions JSONB NOT NULL, -- Array of step strings
    equipment JSONB, -- Array of required equipment
    
    -- Dietary information
    dietary_tags TEXT[], -- vegetarian, vegan, gluten-free, dairy-free, etc.
    allergens TEXT[], -- nuts, dairy, eggs, gluten, soy, etc.
    
    -- Community features
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    rating DECIMAL(3,2) GENERATED ALWAYS AS (
        CASE 
            WHEN (upvotes + downvotes) > 0 
            THEN (upvotes::DECIMAL / (upvotes + downvotes))::DECIMAL(3,2)
            ELSE 0.5 
        END
    ) STORED,
    times_used INTEGER DEFAULT 0,
    
    -- Source information
    source VARCHAR(50) DEFAULT 'ai_generated', -- ai_generated, user_submitted, imported
    created_by UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id),
    
    -- Images
    image_url TEXT,
    thumbnail_url TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'archived')),
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient searching
CREATE INDEX idx_recipes_meal_type ON recipes(meal_type);
CREATE INDEX idx_recipes_dietary_tags ON recipes USING GIN(dietary_tags);
CREATE INDEX idx_recipes_allergens ON recipes USING GIN(allergens);
CREATE INDEX idx_recipes_rating ON recipes(rating DESC);
CREATE INDEX idx_recipes_times_used ON recipes(times_used DESC);
CREATE INDEX idx_recipes_calories ON recipes(calories);
CREATE INDEX idx_recipes_organization ON recipes(organization_id);
CREATE INDEX idx_recipes_status ON recipes(status);

-- Full text search index
CREATE INDEX idx_recipes_search ON recipes USING GIN(
    to_tsvector('english', 
        COALESCE(name, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(cuisine, '')
    )
);

-- Create recipe_votes table to track user votes
CREATE TABLE IF NOT EXISTS recipe_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one vote per user per recipe
    UNIQUE(recipe_id, user_id)
);

CREATE INDEX idx_recipe_votes_recipe ON recipe_votes(recipe_id);
CREATE INDEX idx_recipe_votes_user ON recipe_votes(user_id);

-- Create recipe_favorites table
CREATE TABLE IF NOT EXISTS recipe_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one favorite per user per recipe
    UNIQUE(recipe_id, user_id)
);

CREATE INDEX idx_recipe_favorites_user ON recipe_favorites(user_id);
CREATE INDEX idx_recipe_favorites_recipe ON recipe_favorites(recipe_id);

-- Create recipe_usage_log table to track when recipes are used
CREATE TABLE IF NOT EXISTS recipe_usage_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id),
    used_for_date DATE,
    meal_plan_id UUID REFERENCES meal_plans(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_recipe_usage_recipe ON recipe_usage_log(recipe_id);
CREATE INDEX idx_recipe_usage_date ON recipe_usage_log(used_for_date);

-- Function to update recipe votes
CREATE OR REPLACE FUNCTION update_recipe_votes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.vote_type = 'upvote' THEN
            UPDATE recipes SET upvotes = upvotes + 1 WHERE id = NEW.recipe_id;
        ELSE
            UPDATE recipes SET downvotes = downvotes + 1 WHERE id = NEW.recipe_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.vote_type = 'upvote' THEN
            UPDATE recipes SET upvotes = GREATEST(0, upvotes - 1) WHERE id = OLD.recipe_id;
        ELSE
            UPDATE recipes SET downvotes = GREATEST(0, downvotes - 1) WHERE id = OLD.recipe_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle vote type change
        IF OLD.vote_type != NEW.vote_type THEN
            IF OLD.vote_type = 'upvote' THEN
                UPDATE recipes SET 
                    upvotes = GREATEST(0, upvotes - 1),
                    downvotes = downvotes + 1 
                WHERE id = NEW.recipe_id;
            ELSE
                UPDATE recipes SET 
                    downvotes = GREATEST(0, downvotes - 1),
                    upvotes = upvotes + 1 
                WHERE id = NEW.recipe_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recipe_votes
    AFTER INSERT OR UPDATE OR DELETE ON recipe_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_recipe_votes();

-- Function to increment recipe usage
CREATE OR REPLACE FUNCTION increment_recipe_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE recipes SET times_used = times_used + 1 WHERE id = NEW.recipe_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_recipe_usage
    AFTER INSERT ON recipe_usage_log
    FOR EACH ROW
    EXECUTE FUNCTION increment_recipe_usage();

-- RLS Policies
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_usage_log ENABLE ROW LEVEL SECURITY;

-- Recipes are viewable by everyone
CREATE POLICY "Recipes are viewable by everyone" ON recipes
    FOR SELECT USING (status = 'active');

-- Users can create recipes
CREATE POLICY "Users can create recipes" ON recipes
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own recipes
CREATE POLICY "Users can update own recipes" ON recipes
    FOR UPDATE USING (created_by = auth.uid());

-- Users can vote on recipes
CREATE POLICY "Users can manage their votes" ON recipe_votes
    FOR ALL USING (user_id = auth.uid());

-- Users can manage their favorites
CREATE POLICY "Users can manage their favorites" ON recipe_favorites
    FOR ALL USING (user_id = auth.uid());

-- Usage log is viewable by recipe creators
CREATE POLICY "Recipe creators can view usage" ON recipe_usage_log
    FOR SELECT USING (
        recipe_id IN (SELECT id FROM recipes WHERE created_by = auth.uid())
    );

-- Grant permissions
GRANT ALL ON recipes TO authenticated;
GRANT ALL ON recipe_votes TO authenticated;
GRANT ALL ON recipe_favorites TO authenticated;
GRANT ALL ON recipe_usage_log TO authenticated;
GRANT SELECT ON recipes TO anon;