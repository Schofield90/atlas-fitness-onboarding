#!/usr/bin/env node

/**
 * Script to fix all API code references for nutrition_profiles table
 * Changes user_id to client_id consistently across all files
 */

const fs = require('fs');
const path = require('path');

// Files that need to be updated based on the analysis
const filesToUpdate = [
  'app/api/nutrition/profile/route.ts',
  'app/api/nutrition/meals/[id]/regenerate/route.ts', 
  'app/api/nutrition/meal-plans/route.ts',
  'app/api/nutrition/chat/wizard/route.ts',
  'app/api/nutrition/macros/route.ts',
  'app/api/nutrition/body-metrics/route.ts',
  'app/api/nutrition/body-metrics/sync/route.ts'
];

// Function to read file and apply fixes
function fixNutritionFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }
  
  console.log(`🔧 Fixing: ${filePath}`);
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Fix 1: Change user_id to client_id in nutrition_profiles queries
  const userIdPattern = /\.eq\('user_id',\s*userWithOrg\.id\)/g;
  if (content.match(userIdPattern)) {
    content = content.replace(userIdPattern, ".eq('client_id', clientId)");
    modified = true;
    console.log('  ✓ Fixed user_id references');
  }
  
  // Fix 2: Change user_id field in inserts/updates for nutrition_profiles
  const insertUserIdPattern = /user_id:\s*userWithOrg\.id/g;
  if (content.match(insertUserIdPattern)) {
    content = content.replace(insertUserIdPattern, "client_id: clientId");
    modified = true;
    console.log('  ✓ Fixed user_id in inserts');
  }
  
  // Fix 3: Ensure we get client_id from user context
  // This is more complex and may require manual review
  const authPattern = /const\s+userWithOrg\s*=\s*await\s+requireAuth\(\)/;
  if (content.match(authPattern) && content.includes('user_id')) {
    // Add client lookup logic
    const clientLookup = `
    // Get client_id from user
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userWithOrg.id)
      .eq('organization_id', userWithOrg.organizationId)
      .single();
    
    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found for user' },
        { status: 404 }
      );
    }
    
    const clientId = client.id;`;
    
    // Insert after requireAuth() call
    content = content.replace(
      authPattern,
      `const userWithOrg = await requireAuth()
    
    // Create Supabase client
    const supabase = await createClient()
    ${clientLookup}`
    );
    modified = true;
    console.log('  ✓ Added client lookup logic');
  }
  
  // Fix 4: Update enum values to UPPERCASE
  const enumFixes = [
    { from: /sex:\s*['"`]male['"`]/g, to: "sex: 'MALE'" },
    { from: /sex:\s*['"`]female['"`]/g, to: "sex: 'FEMALE'" },
    { from: /gender:\s*['"`]male['"`]/g, to: "gender: 'MALE'" },
    { from: /gender:\s*['"`]female['"`]/g, to: "gender: 'FEMALE'" },
    { from: /activity_level:\s*['"`]sedentary['"`]/g, to: "activity_level: 'SEDENTARY'" },
    { from: /activity_level:\s*['"`]lightly_active['"`]/g, to: "activity_level: 'LIGHTLY_ACTIVE'" },
    { from: /activity_level:\s*['"`]moderately_active['"`]/g, to: "activity_level: 'MODERATELY_ACTIVE'" },
    { from: /activity_level:\s*['"`]very_active['"`]/g, to: "activity_level: 'VERY_ACTIVE'" },
    { from: /activity_level:\s*['"`]extra_active['"`]/g, to: "activity_level: 'EXTRA_ACTIVE'" }
  ];
  
  enumFixes.forEach((fix, index) => {
    if (content.match(fix.from)) {
      content = content.replace(fix.from, fix.to);
      modified = true;
      console.log(`  ✓ Fixed enum value ${index + 1}`);
    }
  });
  
  // Fix 5: Update column name references  
  const columnFixes = [
    { from: /current_weight:/g, to: "weight_kg:" },
    { from: /goal_weight:/g, to: "target_weight_kg:" },
    { from: /height:/g, to: "height_cm:" },
    { from: /sex:/g, to: "gender:" }
  ];
  
  columnFixes.forEach((fix, index) => {
    if (content.match(fix.from)) {
      content = content.replace(fix.from, fix.to);
      modified = true;
      console.log(`  ✓ Fixed column name ${index + 1}`);
    }
  });
  
  if (modified) {
    // Create backup
    fs.writeFileSync(`${fullPath}.backup`, fs.readFileSync(fullPath));
    
    // Write updated content
    fs.writeFileSync(fullPath, content);
    console.log(`  ✅ Updated ${filePath} (backup created)`);
    return true;
  } else {
    console.log(`  ℹ️  No changes needed for ${filePath}`);
    return false;
  }
}

// Function to create a summary of changes needed
function createFixSummary() {
  const summary = `
# Nutrition API Code Fixes Summary

## Files Updated:
${filesToUpdate.map(f => `- ${f}`).join('\n')}

## Changes Made:
1. **Changed user_id to client_id**: All nutrition_profiles queries now use client_id
2. **Added client lookup**: Gets client_id from user context via clients table
3. **Fixed enum values**: All enum values now use UPPERCASE (MALE, FEMALE, SEDENTARY, etc.)
4. **Updated column names**: 
   - current_weight → weight_kg
   - goal_weight → target_weight_kg  
   - height → height_cm
   - sex → gender

## Manual Review Required:
- Check that all files have proper client_id lookup logic
- Verify enum values match database constraints
- Test all nutrition endpoints after database migration
- Update any frontend code that uses the old field names

## Database Migration:
Run the fix-nutrition-schema.sql file to update database schema.

## Testing Checklist:
- [ ] Create nutrition profile
- [ ] Update nutrition profile  
- [ ] Generate meal plan
- [ ] Sync body metrics
- [ ] Calculate macros
- [ ] Chat wizard integration
`;

  fs.writeFileSync('NUTRITION_FIX_SUMMARY.md', summary);
  console.log('📝 Created NUTRITION_FIX_SUMMARY.md');
}

// Main execution
console.log('🚀 Starting nutrition API fixes...\n');

let totalFixed = 0;
filesToUpdate.forEach(file => {
  if (fixNutritionFile(file)) {
    totalFixed++;
  }
  console.log(''); // Empty line for readability
});

createFixSummary();

console.log(`\n✨ Fix complete! Updated ${totalFixed}/${filesToUpdate.length} files`);
console.log('\n⚠️  IMPORTANT: Run the database migration (fix-nutrition-schema.sql) before testing!');
console.log('📖 See NUTRITION_FIX_SUMMARY.md for full details and testing checklist');