const { createHash, randomBytes, pbkdf2Sync } = require('crypto');

// Helper function to hash password (same as in the API route)
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Get password from command line argument
const password = process.argv[2];

if (!password) {
  console.log('Usage: node set-password.js <password>');
  console.log('Example: node set-password.js mypassword123');
  process.exit(1);
}

const hashedPassword = hashPassword(password);

console.log('\n--- SQL Query to set password ---');
console.log('Run this SQL command to set the password for sam@gymleadhub.co.uk:\n');

console.log(`UPDATE clients SET
  password_hash = '${hashedPassword}',
  password_set_at = NOW()
WHERE email = 'sam@gymleadhub.co.uk';`);

console.log('\n--- Copy this command to run in your database ---');
console.log(`PGPASSWORD=OGFYlxSChyYLgQxn psql -h db.lzlrojoaxrqvmhempnkn.supabase.co -U postgres -d postgres -c "UPDATE clients SET password_hash = '${hashedPassword}', password_set_at = NOW() WHERE email = 'sam@gymleadhub.co.uk';"`);

console.log('\n--- Or use this if you have database access via another method ---');
console.log('Email: sam@gymleadhub.co.uk');
console.log('Password Hash:', hashedPassword);
console.log('Password (plaintext):', password);