#!/usr/bin/env node

// Script to check OTP tokens in the database for testing
// Usage: node scripts/check-otp.js [email]

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOTP(email) {
  try {
    // Get all OTP tokens, or filter by email if provided
    const query = supabase
      .from('otp_tokens')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (email) {
      query.eq('email', email.toLowerCase());
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching OTP tokens:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('No OTP tokens found' + (email ? ` for ${email}` : ''));
      return;
    }
    
    console.log('\n📧 OTP Tokens in Database:\n');
    console.log('═'.repeat(60));
    
    data.forEach(otp => {
      const expires = new Date(otp.expires_at);
      const now = new Date();
      const isExpired = expires < now;
      const timeLeft = isExpired ? 0 : Math.floor((expires - now) / 1000);
      
      console.log(`Email: ${otp.email}`);
      console.log(`Code: ${otp.token} ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
      console.log(`Created: ${new Date(otp.created_at).toLocaleString()}`);
      console.log(`Expires: ${expires.toLocaleString()}`);
      
      if (!isExpired) {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        console.log(`Time left: ${minutes}m ${seconds}s`);
      }
      
      console.log('─'.repeat(60));
    });
    
    console.log('\n💡 Tip: Copy the code and enter it in the verification field');
    console.log('⚠️  Note: Codes expire after 10 minutes\n');
    
  } catch (err) {
    console.error('Error:', err);
  }
}

// Get email from command line argument
const email = process.argv[2];
checkOTP(email);