// Test GoCardless API access
import pg from 'pg';
const { Client } = pg;

// @ts-ignore
const gocardless = await import('gocardless-nodejs');
const { Environments } = await import('gocardless-nodejs/constants');

const organizationId = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4';

// Connect to database
const dbClient = new Client({
  host: 'db.lzlrojoaxrqvmhempnkn.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '@Aa80236661',
  ssl: { rejectUnauthorized: false }
});

await dbClient.connect();

try {
  // Get GoCardless connection
  const result = await dbClient.query(
    `SELECT access_token, environment
     FROM payment_provider_accounts
     WHERE organization_id = $1 AND provider = 'gocardless'`,
    [organizationId]
  );

  if (!result.rows[0]) {
    console.error('No GoCardless connection found');
    process.exit(1);
  }

  const { access_token, environment } = result.rows[0];
  console.log('GoCardless environment:', environment);
  console.log('Token starts with:', access_token.substring(0, 10) + '...');

  // Initialize GoCardless client
  const gcClient = gocardless.default(
    access_token,
    environment === 'live' ? Environments.Live : Environments.Sandbox
  );

  // Test fetching a single payment
  const testPaymentId = 'PM01M11W061DSB';
  console.log(`\nTesting payment fetch: ${testPaymentId}`);

  try {
    const payment = await gcClient.payments.find(testPaymentId);
    console.log('✓ Payment found:', payment.id);
    console.log('  Status:', payment.status);
    console.log('  Amount:', payment.amount);
    console.log('  Customer link:', payment.links?.customer);

    if (payment.links?.customer) {
      console.log(`\nTesting customer fetch: ${payment.links.customer}`);
      const customer = await gcClient.customers.find(payment.links.customer);
      console.log('✓ Customer found:', customer.id);
      console.log('  Email:', customer.email);
      console.log('  Name:', customer.given_name, customer.family_name);
    } else {
      console.log('✗ Payment has no customer link');
    }
  } catch (error) {
    console.error('✗ Error fetching payment:', error.message);
    console.error('Error details:', error);
  }

} finally {
  await dbClient.end();
}
