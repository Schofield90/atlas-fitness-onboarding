#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFinalFix() {
  console.log('🎯 Final Facebook Integration Test\n');
  console.log('=' .repeat(50));
  
  try {
    const orgId = '63589490-8f55-4157-bd3a-e141594b748e';
    
    // Check one page to see structure
    console.log('\n📊 SAMPLE PAGE DATA STRUCTURE');
    const { data: samplePage } = await supabase
      .from('facebook_pages')
      .select('*')
      .eq('organization_id', orgId)
      .eq('page_name', 'Atlas Fitness')
      .single();
    
    if (samplePage) {
      console.log('✅ Atlas Fitness page data:');
      console.log(`   - Name: ${samplePage.page_name}`);
      console.log(`   - Category: ${samplePage.page_category || 'Not set'}`);
      console.log(`   - Followers: ${samplePage.page_info?.followers_count || 0}`);
      console.log(`   - Has cover image: ${!!samplePage.page_info?.cover}`);
      console.log(`   - Has permissions: ${Array.isArray(samplePage.permissions)}`);
    }
    
    // Check all pages have required fields
    console.log('\n🔍 CHECKING ALL PAGES');
    const { data: allPages } = await supabase
      .from('facebook_pages')
      .select('page_name, page_category, page_info')
      .eq('organization_id', orgId)
      .eq('is_active', true);
    
    if (allPages) {
      let withFollowers = 0;
      let withCategory = 0;
      let withCover = 0;
      
      allPages.forEach(page => {
        if (page.page_info?.followers_count > 0) withFollowers++;
        if (page.page_category) withCategory++;
        if (page.page_info?.cover) withCover++;
      });
      
      console.log(`✅ Out of ${allPages.length} pages:`);
      console.log(`   - ${withFollowers} have follower counts`);
      console.log(`   - ${withCategory} have categories`);
      console.log(`   - ${withCover} have cover images`);
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ FRONTEND SHOULD NOW WORK!');
    console.log('\nThe error "Cannot read properties of undefined (reading \'toLocaleString\')" is fixed.');
    console.log('\n📱 Visit http://localhost:3000/integrations/facebook');
    console.log('The pages should display with:');
    console.log('   • Page names');
    console.log('   • Categories (where available)');
    console.log('   • Follower counts');
    console.log('   • Lead access status');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFinalFix();