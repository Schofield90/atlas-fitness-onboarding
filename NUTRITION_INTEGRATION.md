# Nutrition Integration Documentation

## Overview

The nutrition system is a comprehensive module integrated into the Atlas Fitness CRM that provides personalized nutrition planning, meal generation, shopping lists, and body metrics tracking. It leverages AI to create customized meal plans based on individual client profiles, training goals, and dietary preferences.

## Key Features

### 1. Nutrition Profile Management
- Complete client nutrition profiling including:
  - Physical metrics (age, sex, height, weight)
  - Activity level and training frequency
  - Dietary preferences and restrictions
  - Allergies and food preferences
  - Cooking time availability
  - Budget constraints

### 2. AI-Powered Meal Plan Generation
- Generates 1-4 week meal plans (7, 14, 21, or 28 days)
- Customized macro calculations based on:
  - Body composition (from InBody scans if available)
  - Training intensity and frequency
  - Weight goals (loss, maintenance, or gain)
- Each meal includes:
  - Detailed recipes with step-by-step instructions
  - Complete ingredient lists with quantities
  - Macro breakdown (calories, protein, carbs, fat, fiber)
  - Preparation time estimates

### 3. Meal Regeneration
- Individual meals can be regenerated if clients don't like specific options
- Maintains macro targets while providing variety
- Preserves dietary restrictions and preferences

### 4. Shopping List Generation
- Automatically generates consolidated shopping lists from meal plans
- Organized by food category (proteins, vegetables, grains, etc.)
- Supports weekly breakdowns for multi-week plans
- Tracks purchased items

### 5. Body Metrics Tracking
- Comprehensive body composition tracking
- Integration with InBody scans
- Tracks weight, body fat, muscle mass, visceral fat, BMR
- Historical data visualization with charts

### 6. Chat-Based Nutrition Wizard
- Conversational interface for gathering nutrition profile data
- Natural language processing to extract information
- Guided flow for complete profile creation

## API Endpoints

### Profile Management
- `GET /api/nutrition/profile` - Get user's nutrition profile
- `POST /api/nutrition/profile` - Create nutrition profile
- `PUT /api/nutrition/profile` - Update nutrition profile

### Macro Calculations
- `GET /api/nutrition/macros` - Calculate personalized macros based on profile

### Meal Plans
- `POST /api/nutrition/meal-plans` - Generate new meal plan
- `GET /api/nutrition/meal-plans` - Get user's meal plans

### Meal Management
- `PUT /api/nutrition/meals/[id]` - Update specific meal
- `POST /api/nutrition/meals/[id]/regenerate` - Regenerate a specific meal

### Shopping Lists
- `GET /api/nutrition/shopping-list` - Get shopping list items
- `POST /api/nutrition/shopping-list` - Generate shopping list from meal plan
- `PUT /api/nutrition/shopping-list/[id]` - Update shopping list item (mark as purchased)

### Body Metrics
- `GET /api/nutrition/body-metrics` - Get body metrics history
- `POST /api/nutrition/body-metrics` - Create new body metrics entry
- `POST /api/nutrition/body-metrics/sync` - Sync with InBody data

### Chat Wizard
- `POST /api/nutrition/chat/wizard` - Process chat messages for profile creation
- `GET /api/nutrition/chat/sessions` - Get chat session history

## Database Tables

### nutrition_profiles
Stores complete nutrition profile data for each user:
```sql
- id (UUID)
- user_id (UUID)
- organization_id (UUID)
- age (INTEGER)
- sex (VARCHAR)
- height (DECIMAL) - in cm
- current_weight (DECIMAL) - in kg
- goal_weight (DECIMAL) - in kg
- activity_level (VARCHAR)
- training_frequency (INTEGER)
- training_types (TEXT[])
- dietary_preferences (TEXT[])
- allergies (TEXT[])
- food_likes (TEXT[])
- food_dislikes (TEXT[])
- cooking_time (VARCHAR)
- budget_constraint (VARCHAR)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### body_metrics
Tracks body composition over time:
```sql
- id (UUID)
- user_id (UUID)
- organization_id (UUID)
- date (DATE)
- weight (DECIMAL)
- body_fat_percentage (DECIMAL)
- muscle_mass (DECIMAL)
- visceral_fat (INTEGER)
- metabolic_age (INTEGER)
- body_water_percentage (DECIMAL)
- bone_mass (DECIMAL)
- bmr (INTEGER)
- inbody_scan_id (VARCHAR)
- notes (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### meal_plans
Stores generated meal plans:
```sql
- id (UUID)
- user_id (UUID)
- organization_id (UUID)
- weeks (INTEGER)
- days (INTEGER)
- target_calories (INTEGER)
- target_protein (INTEGER)
- target_carbs (INTEGER)
- target_fat (INTEGER)
- target_fiber (INTEGER)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### meals
Individual meals within meal plans:
```sql
- id (UUID)
- meal_plan_id (UUID)
- day (INTEGER)
- name (VARCHAR) - BREAKFAST, LUNCH, DINNER, SNACK
- calories (INTEGER)
- protein (DECIMAL)
- carbs (DECIMAL)
- fat (DECIMAL)
- fiber (DECIMAL)
- recipe (TEXT)
- prep_minutes (INTEGER)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### ingredients
Ingredients for each meal:
```sql
- id (UUID)
- meal_id (UUID)
- item (VARCHAR)
- grams (DECIMAL)
- calories (DECIMAL)
- protein (DECIMAL)
- carbs (DECIMAL)
- fat (DECIMAL)
- created_at (TIMESTAMPTZ)
```

### shopping_lists
Generated shopping list items:
```sql
- id (UUID)
- user_id (UUID)
- organization_id (UUID)
- ingredient (VARCHAR)
- quantity (DECIMAL)
- unit (VARCHAR)
- category (VARCHAR)
- week (INTEGER)
- purchased (BOOLEAN)
- created_at (TIMESTAMPTZ)
```

## Setup Instructions

### 1. Environment Variables
Add the following environment variable to your `.env.local` file and Vercel:
```
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Database Migration
Run the nutrition system migration to create all required tables:
```bash
# Apply the migration to your Supabase database
supabase db push
```

Or manually run the migration file:
```bash
psql -h your-supabase-host -U postgres -d postgres -f supabase/migrations/20250807_nutrition_system.sql
```

### 3. Dependencies
All required dependencies are already included in package.json:
- `recharts` - For data visualization
- `openai` - For AI-powered meal generation
- Other dependencies are part of the existing stack

### 4. Deployment
1. Ensure `OPENAI_API_KEY` is set in Vercel environment variables
2. Deploy to Vercel: `vercel --prod`
3. Run database migration on production database

## Client Access

### For Gym Staff (CRM Users)
1. Navigate to Clients section in the CRM
2. Select a client profile
3. Click on the "Nutrition" tab
4. Access features:
   - View/Edit nutrition profile
   - Generate meal plans
   - View body metrics history
   - Generate shopping lists

### For Gym Members (Client Portal)
Clients can access their nutrition data through the client portal:
1. Log into client portal
2. Navigate to "My Nutrition" section
3. Available features:
   - View personalized meal plans
   - Access shopping lists
   - Track body metrics
   - View progress charts

## Integration Points

### InBody Integration
The nutrition system integrates with InBody scans through:
1. **Body Metrics Sync**: `/api/nutrition/body-metrics/sync` endpoint
2. **Automatic Data Import**: When InBody scans are completed, body composition data is automatically imported
3. **Macro Calculations**: Uses InBody data for more accurate BMR and macro calculations

### Training Data Integration
The system considers training data for macro calculations:
1. **Training Frequency**: Pulled from client's training schedule
2. **Training Types**: Considers workout intensity and type
3. **Activity Level**: Automatically calculated based on training frequency and session duration

### CRM Integration
1. **Client Profiles**: Nutrition profiles are linked to CRM client records
2. **Organization Multi-tenancy**: All data is scoped to organization level
3. **Permissions**: Uses existing CRM permission system
4. **Audit Trail**: All changes are logged in the audit system

## Testing Checklist

### Pre-deployment Testing
- [ ] **Profile Creation**
  - [ ] Create new nutrition profile via form
  - [ ] Create profile via chat wizard
  - [ ] Verify all fields save correctly
  - [ ] Test validation rules

- [ ] **Meal Plan Generation**
  - [ ] Generate 1-week plan
  - [ ] Generate 4-week plan
  - [ ] Verify macro targets are met
  - [ ] Check dietary restrictions are respected
  - [ ] Test with different activity levels

- [ ] **Meal Management**
  - [ ] Regenerate individual meals
  - [ ] Verify new meals maintain macro targets
  - [ ] Check recipe quality and completeness

- [ ] **Shopping Lists**
  - [ ] Generate shopping list from meal plan
  - [ ] Verify ingredient consolidation
  - [ ] Test marking items as purchased
  - [ ] Check multi-week breakdown

- [ ] **Body Metrics**
  - [ ] Add manual body metrics entry
  - [ ] Test InBody sync (if available)
  - [ ] Verify chart visualization
  - [ ] Check historical data display

- [ ] **Integration Tests**
  - [ ] Verify data appears in client profiles
  - [ ] Test organization data isolation
  - [ ] Check permission restrictions
  - [ ] Verify audit logging

### Post-deployment Verification
- [ ] All API endpoints responding correctly
- [ ] Database tables created successfully
- [ ] RLS policies working correctly
- [ ] No console errors in production
- [ ] Performance is acceptable (< 2s load times)

## Additional Environment Variables for Vercel

Add these environment variables in Vercel dashboard:
```
OPENAI_API_KEY=your_openai_api_key_here
```

All other required environment variables (Supabase, etc.) should already be configured.

## Troubleshooting

### Common Issues

1. **Meal generation fails**
   - Check OPENAI_API_KEY is set correctly
   - Verify API rate limits haven't been exceeded
   - Check nutrition profile is complete

2. **Shopping list is empty**
   - Ensure meal plan has been generated first
   - Check that meals have ingredients

3. **Body metrics chart not showing**
   - Verify at least 2 data points exist
   - Check date range selection

4. **Permission errors**
   - Ensure user is authenticated
   - Verify organization_id is set correctly
   - Check RLS policies

### Debug Endpoints
- Check profile completeness: `GET /api/nutrition/profile`
- Verify macro calculations: `GET /api/nutrition/macros`
- Test OpenAI connection: Check meal generation logs

## Future Enhancements

1. **Recipe Sharing**: Allow sharing popular recipes between clients
2. **Meal Prep Videos**: Integration with video content for recipes
3. **Grocery Store Integration**: Direct ordering from shopping lists
4. **Nutrition Coaching**: AI-powered nutrition advice and adjustments
5. **Progress Analytics**: Advanced analytics on nutrition adherence
6. **Mobile App**: Dedicated mobile app for meal tracking