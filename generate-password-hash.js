const bcrypt = require('bcryptjs');

// Generate hash for the password
const password = '@Aa80236661';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
  if (err) {
    console.error('Error generating hash:', err);
    return;
  }

  console.log('Password hash generated for: @Aa80236661');
  console.log('Hash:', hash);
  console.log('\nSQL to update password in auth.users table:');
  console.log('================================================');
  console.log(`
UPDATE auth.users
SET encrypted_password = '${hash}',
    updated_at = NOW()
WHERE email = 'sam@atlas-gyms.co.uk';
  `);
  console.log('================================================');
  console.log('\nNote: This SQL needs to be run directly on the Supabase database');
  console.log('You can run this in the Supabase SQL editor at:');
  console.log('https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new');
});