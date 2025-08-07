# Nutrition System Backend Setup Guide

## 🚀 What We've Accomplished

### 1. **Full Integration of NutriCoach into Atlas Fitness CRM**
- Migrated standalone NutriCoach app into the CRM system
- Converted Express.js backend to Next.js API routes
- Integrated with existing authentication and multi-tenant architecture

### 2. **Database Migration Created**
- Created comprehensive Supabase migration with 6 new tables
- All tables prefixed with `nutrition_` to avoid conflicts
- Integrated with existing `leads` table for user management
- Added RLS policies for multi-tenant security

### 3. **API Endpoints Implemented** (13 total)
- `/api/nutrition/profile` - Profile management
- `/api/nutrition/macros` - Macro calculations
- `/api/nutrition/chat/wizard` - AI conversational setup
- `/api/nutrition/meal-plans` - Meal plan generation
- `/api/nutrition/meals/[id]` - Individual meal management
- `/api/nutrition/shopping-list` - Shopping list management
- `/api/nutrition/body-metrics` - InBody integration
- And more...

### 4. **Frontend Components Created** (9 total)
- Complete nutrition dashboard for clients
- AI-powered profile setup wizard
- Meal planning interface with macro tracking
- Shopping list management
- Body metrics tracking
- Training integration display

### 5. **Key Integrations**
- ✅ CRM Authentication system
- ✅ Multi-tenant organization structure
- ✅ InBody scan data integration
- ✅ Training session data from bookings
- ✅ OpenAI GPT-4 for meal generation and chat

## 🔧 Backend Setup Requirements

### 1. **Environment Variables**
Add to your `.env.local` and Vercel environment variables:
```bash
# Required for nutrition features
OPENAI_API_KEY=your_openai_api_key_here

# Already in your CRM (verify these exist):
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### 2. **Database Migration**
Run the following migrations in your Supabase SQL editor in this order:

```sql
-- 1. First run the main nutrition integration
-- Path: /supabase/nutricoach-integration.sql

-- 2. Then run the migration with constraints
-- Path: /supabase/migrations/20250807_nutrition_system.sql
```

### 3. **Verify Database Setup**
After running migrations, verify:
- [ ] All 6 nutrition tables created
- [ ] RLS policies are active
- [ ] Foreign key relationships established
- [ ] Indexes created for performance

### 4. **OpenAI API Key Setup**
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add to environment variables (both local and Vercel)
4. Ensure billing is set up on OpenAI account

## 📝 Deployment Checklist

### Local Testing
- [ ] Add OPENAI_API_KEY to `.env.local`
- [ ] Run database migrations in local Supabase
- [ ] Test nutrition tab appears for logged-in clients
- [ ] Verify AI chat wizard works
- [ ] Test meal plan generation

### Vercel Deployment
1. **Add Environment Variable**
   ```bash
   vercel env add OPENAI_API_KEY
   # Enter your OpenAI API key when prompted
   # Select all environments (development, preview, production)
   ```

2. **Run Database Migrations**
   - Go to Supabase dashboard
   - Navigate to SQL editor
   - Run both migration files in order
   - Verify tables created successfully

3. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```
   Or push to GitHub for automatic deployment

4. **Post-Deployment Verification**
   - [ ] Access `/client/nutrition` as a test client
   - [ ] Complete AI profile setup
   - [ ] Generate a meal plan
   - [ ] Verify InBody integration (if data exists)
   - [ ] Check training data integration

## 🐛 Troubleshooting

### Common Issues

1. **"OpenAI API key not found" error**
   - Verify OPENAI_API_KEY is set in Vercel environment variables
   - Redeploy after adding the variable

2. **Database tables not found**
   - Ensure both migration files were run
   - Check Supabase logs for migration errors
   - Verify you're connected to the correct database

3. **RLS policy errors**
   - Ensure user is properly authenticated
   - Check organization_id is set for the user
   - Verify RLS is enabled on all nutrition tables

4. **AI Chat not responding**
   - Check OpenAI API key is valid
   - Verify OpenAI account has credits
   - Check Vercel function logs for errors

## 📊 Database Tables Created

1. **nutrition_profiles** - User nutrition profiles
2. **nutrition_body_metrics** - InBody scan data
3. **nutrition_meal_plans** - Meal plan definitions
4. **nutrition_meals** - Individual meals
5. **nutrition_ingredients** - Meal ingredients
6. **nutrition_shopping_list_items** - Shopping lists
7. **nutrition_chat_sessions** - AI conversation history
8. **nutrition_training_sessions** - Training integration

## 🔗 Integration Points

### InBody Data Flow
```
InBody Scan → nutrition_body_metrics → Auto-update profile → Recalculate macros
```

### Training Data Flow
```
Class Bookings → nutrition_training_sessions → Adjust TDEE → Update daily calories
```

### AI Meal Generation Flow
```
Profile + Preferences → OpenAI GPT-4 → Generate meals → Store in database
```

## 📱 Client Access

Clients can access nutrition features at:
- **URL**: `/client/nutrition`
- **Navigation**: Client Portal → Nutrition tab
- **First Use**: AI wizard guides setup
- **Features**: Meal plans, macros, shopping lists, body tracking

## 🚨 Important Notes

1. **OpenAI Costs**: Each meal plan generation costs ~$0.10-0.20 in API calls
2. **Rate Limits**: OpenAI has rate limits - consider implementing caching
3. **Data Privacy**: Ensure GDPR compliance for health data storage
4. **Backup**: Regular backups recommended for nutrition data

## 📞 Support

If you encounter issues:
1. Check Vercel function logs
2. Review Supabase logs for database errors
3. Verify all environment variables are set
4. Test with the checklist in `NUTRITION_TEST_CHECKLIST.md`

---

Last updated: August 7, 2025
Integration completed by: AI Assistant with Sam