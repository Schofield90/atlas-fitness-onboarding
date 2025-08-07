# Nutrition Integration Test Checklist

## Pre-Deployment Testing

### 1. Environment Setup
- [ ] Verify OPENAI_API_KEY is set in `.env.local`
- [ ] Run database migration: `supabase db push`
- [ ] Verify all tables created successfully
- [ ] Check RLS policies are enabled

### 2. Profile Management
- [ ] **Create Profile via Form**
  - [ ] Navigate to client profile → Nutrition tab
  - [ ] Fill out all profile fields
  - [ ] Save and verify data persists
  - [ ] Check validation (e.g., age > 0, weight > 0)

- [ ] **Create Profile via Chat Wizard**
  - [ ] Start nutrition chat wizard
  - [ ] Answer questions naturally
  - [ ] Verify profile auto-populates correctly
  - [ ] Save and confirm all data extracted

### 3. Macro Calculations
- [ ] View calculated macros for different goals:
  - [ ] Weight loss (deficit)
  - [ ] Maintenance
  - [ ] Muscle gain (surplus)
- [ ] Verify calculations adjust for:
  - [ ] Activity level changes
  - [ ] Training frequency
  - [ ] Body composition (if InBody data exists)

### 4. Meal Plan Generation
- [ ] **Generate 1-week plan**
  - [ ] Verify 7 days × 4 meals = 28 meals created
  - [ ] Check macro targets are met (±5%)
  - [ ] Confirm dietary restrictions respected

- [ ] **Generate 4-week plan**
  - [ ] Verify 28 days × 4 meals = 112 meals created
  - [ ] Check variety (no excessive repetition)
  - [ ] Verify all weeks meet targets

### 5. Meal Features
- [ ] **Regenerate Meal**
  - [ ] Select a meal to regenerate
  - [ ] Confirm new meal maintains macros
  - [ ] Verify dietary preferences still respected

- [ ] **View Recipes**
  - [ ] Check recipes are complete
  - [ ] Verify prep times are reasonable
  - [ ] Confirm ingredient lists are detailed

### 6. Shopping Lists
- [ ] **Generate Shopping List**
  - [ ] Generate from active meal plan
  - [ ] Verify ingredients are consolidated
  - [ ] Check categorization is correct

- [ ] **Shopping List Management**
  - [ ] Mark items as purchased
  - [ ] Filter by week (for multi-week plans)
  - [ ] Verify totals update correctly

### 7. Body Metrics
- [ ] **Manual Entry**
  - [ ] Add new body metrics entry
  - [ ] Include weight, body fat %, muscle mass
  - [ ] Save and verify in history

- [ ] **Data Visualization**
  - [ ] View metrics chart
  - [ ] Check date range selector works
  - [ ] Verify trend lines display correctly

- [ ] **InBody Integration** (if available)
  - [ ] Sync InBody data
  - [ ] Verify all metrics imported
  - [ ] Check scan ID is recorded

### 8. Client Portal Access
- [ ] **Login as Client**
  - [ ] Access client portal
  - [ ] Navigate to "My Nutrition"
  - [ ] Verify all features accessible

- [ ] **Feature Access**
  - [ ] View meal plans
  - [ ] Access shopping lists
  - [ ] Check body metrics history
  - [ ] Ensure read-only where appropriate

### 9. Integration Points
- [ ] **CRM Integration**
  - [ ] Verify nutrition tab appears in client profile
  - [ ] Check data syncs between views
  - [ ] Test quick actions work

- [ ] **Multi-tenancy**
  - [ ] Create data for different organizations
  - [ ] Verify data isolation
  - [ ] Check no cross-organization access

### 10. Performance Testing
- [ ] **API Response Times**
  - [ ] Profile load: < 500ms
  - [ ] Meal plan generation: < 30s
  - [ ] Shopping list generation: < 2s
  - [ ] Body metrics load: < 500ms

- [ ] **UI Responsiveness**
  - [ ] Chart rendering: < 1s
  - [ ] Page transitions: smooth
  - [ ] No UI freezing during operations

## Post-Deployment Verification

### 1. Production Environment
- [ ] Verify OPENAI_API_KEY is set in Vercel
- [ ] Check all API endpoints respond (no 404s)
- [ ] Confirm database migration applied
- [ ] Test with production data

### 2. Error Monitoring
- [ ] Check Vercel logs for errors
- [ ] Monitor API rate limits
- [ ] Verify no database connection issues
- [ ] Check for any 500 errors

### 3. User Acceptance
- [ ] Have staff create test profile
- [ ] Generate meal plan successfully
- [ ] Verify all features work as expected
- [ ] Gather initial feedback

## Common Issues & Solutions

### Issue: Meal generation fails
**Solution**: Check OpenAI API key and rate limits

### Issue: Shopping list empty
**Solution**: Ensure meal plan exists with ingredients

### Issue: Charts not displaying
**Solution**: Verify at least 2 data points exist

### Issue: Permission denied errors
**Solution**: Check RLS policies and user authentication

### Issue: Slow performance
**Solution**: Check database indexes and API response times

## Sign-off

- [ ] Development testing complete
- [ ] Staging testing complete  
- [ ] Production deployment verified
- [ ] Documentation reviewed
- [ ] Team trained on new features

**Tested by**: _________________ **Date**: _________________

**Approved by**: _________________ **Date**: _________________