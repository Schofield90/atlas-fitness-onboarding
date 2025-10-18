import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'db.lzlrojoaxrqvmhempnkn.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'OGFYlxSChyYLgQxn',
  ssl: {
    rejectUnauthorized: false
  }
});

try {
  await client.connect();
  console.log('✅ Connected to database');

  // Add the column
  const result = await client.query(`
    ALTER TABLE booking_links
    ADD COLUMN IF NOT EXISTS max_days_in_advance INTEGER DEFAULT 30;
  `);

  console.log('✅ Column added successfully');

  // Verify the column exists
  const verify = await client.query(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'booking_links' AND column_name = 'max_days_in_advance';
  `);

  if (verify.rows.length > 0) {
    console.log('✅ Column verified:', verify.rows[0]);
  } else {
    console.log('❌ Column not found after creation');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await client.end();
}
