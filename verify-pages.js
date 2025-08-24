#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPages() {
  console.log('🔍 Verifying Facebook Pages in Database...\n');
  
  try {
    // Check pages
    const { data: pages, error } = await supabase
      .from('facebook_pages')
      .select('*')
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
      .order('page_name');
    
    if (error) {
      console.log('❌ Error fetching pages:', error.message);
      return;
    }
    
    console.log(`✅ Found ${pages.length} pages in database:\n`);
    
    pages.forEach((page, index) => {
      console.log(`${index + 1}. ${page.page_name}`);
      console.log(`   - Facebook Page ID: ${page.facebook_page_id}`);
      console.log(`   - Page ID: ${page.page_id}`);
      console.log(`   - Active: ${page.is_active}`);
      console.log(`   - Has Access Token: ${!!page.access_token}`);
      console.log('');
    });
    
    // Check if there are any issues with the data
    const issueCount = pages.filter(p => !p.facebook_page_id || !p.page_name).length;
    if (issueCount > 0) {
      console.log(`⚠️  ${issueCount} pages have missing data`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyPages();