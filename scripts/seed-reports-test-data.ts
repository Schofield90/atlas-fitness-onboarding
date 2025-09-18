/**
 * Seed test data for reports testing
 * Creates organizations, customers, classes, bookings, invoices, and other report data
 */

import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test organization IDs
const TEST_ORG_IDS = [
  'test-org-123',
  'test-org-456',
  'test-org-789'
];

interface TestOrganization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface TestCustomer {
  id: string;
  organization_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: string;
  created_at: string;
}

interface TestClass {
  id: string;
  organization_id: string;
  class_type_name: string;
  instructor_name: string;
  venue_name: string;
  start_time: string;
  end_time: string;
  capacity: number;
  created_at: string;
}

interface TestBooking {
  id: string;
  organization_id: string;
  customer_id: string;
  class_id: string;
  attendance_status: 'registered' | 'attended' | 'no_show' | 'late_cancelled';
  booking_method: 'membership' | 'drop_in' | 'free' | 'package';
  booking_source: 'web' | 'kiosk' | 'mobile_app' | 'staff' | 'api';
  payment_amount_pennies: number;
  checked_in_at?: string;
  created_at: string;
}

interface TestInvoice {
  id: string;
  organization_id: string;
  customer_id: string;
  invoice_number: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  subtotal_pennies: number;
  tax_amount_pennies: number;
  total_amount_pennies: number;
  issue_date: string;
  due_date: string;
  created_at: string;
}

interface TestDiscountCode {
  id: string;
  organization_id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_amount_pennies: number;
  max_uses: number;
  current_uses: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Generate test organizations
 */
function generateTestOrganizations(): TestOrganization[] {
  return TEST_ORG_IDS.map(id => ({
    id,
    name: faker.company.name() + ' Fitness',
    slug: faker.internet.domainWord(),
    created_at: faker.date.past({ years: 2 }).toISOString()
  }));
}

/**
 * Generate test customers for each organization
 */
function generateTestCustomers(orgIds: string[], count: number = 50): TestCustomer[] {
  const customers: TestCustomer[] = [];
  
  orgIds.forEach(orgId => {
    for (let i = 0; i < count; i++) {
      customers.push({
        id: faker.string.uuid(),
        organization_id: orgId,
        email: faker.internet.email(),
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        phone: faker.phone.number(),
        date_of_birth: faker.date.birthdate({ min: 18, max: 70, mode: 'age' }).toISOString().split('T')[0],
        created_at: faker.date.past({ years: 1 }).toISOString()
      });
    }
  });

  return customers;
}

/**
 * Generate test classes for each organization
 */
function generateTestClasses(orgIds: string[], count: number = 30): TestClass[] {
  const classes: TestClass[] = [];
  const classTypes = ['Yoga', 'Pilates', 'HIIT', 'Strength Training', 'Cardio', 'CrossFit', 'Zumba', 'Spin'];
  const venues = ['Main Studio', 'Studio A', 'Studio B', 'Outdoor Space', 'Pool Area'];
  
  orgIds.forEach(orgId => {
    for (let i = 0; i < count; i++) {
      const startTime = faker.date.between({ 
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)   // 30 days from now
      });
      
      const endTime = new Date(startTime.getTime() + (45 + Math.random() * 75) * 60 * 1000); // 45-120 minutes

      classes.push({
        id: faker.string.uuid(),
        organization_id: orgId,
        class_type_name: faker.helpers.arrayElement(classTypes),
        instructor_name: faker.person.fullName(),
        venue_name: faker.helpers.arrayElement(venues),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        capacity: faker.number.int({ min: 10, max: 30 }),
        created_at: faker.date.past({ years: 1 }).toISOString()
      });
    }
  });

  return classes;
}

/**
 * Generate test bookings
 */
function generateTestBookings(customers: TestCustomer[], classes: TestClass[], count: number = 200): TestBooking[] {
  const bookings: TestBooking[] = [];
  const attendanceStatuses: TestBooking['attendance_status'][] = ['registered', 'attended', 'no_show', 'late_cancelled'];
  const bookingMethods: TestBooking['booking_method'][] = ['membership', 'drop_in', 'free', 'package'];
  const bookingSources: TestBooking['booking_source'][] = ['web', 'kiosk', 'mobile_app', 'staff', 'api'];

  for (let i = 0; i < count; i++) {
    const customer = faker.helpers.arrayElement(customers);
    const customerClasses = classes.filter(c => c.organization_id === customer.organization_id);
    const selectedClass = faker.helpers.arrayElement(customerClasses);
    
    const attendanceStatus = faker.helpers.arrayElement(attendanceStatuses);
    const classStartTime = new Date(selectedClass.start_time);
    const isPastClass = classStartTime < new Date();
    
    // For future classes, only allow 'registered' status
    const finalStatus = isPastClass ? attendanceStatus : 'registered';
    
    const booking: TestBooking = {
      id: faker.string.uuid(),
      organization_id: customer.organization_id,
      customer_id: customer.id,
      class_id: selectedClass.id,
      attendance_status: finalStatus,
      booking_method: faker.helpers.arrayElement(bookingMethods),
      booking_source: faker.helpers.arrayElement(bookingSources),
      payment_amount_pennies: faker.number.int({ min: 1000, max: 5000 }),
      created_at: faker.date.past({ years: 1 }).toISOString()
    };

    // Add check-in time for attended bookings
    if (finalStatus === 'attended' && isPastClass) {
      const checkinTime = new Date(classStartTime.getTime() - faker.number.int({ min: 0, max: 15 }) * 60 * 1000);
      booking.checked_in_at = checkinTime.toISOString();
    }

    bookings.push(booking);
  }

  return bookings;
}

/**
 * Generate test invoices
 */
function generateTestInvoices(customers: TestCustomer[], count: number = 100): TestInvoice[] {
  const invoices: TestInvoice[] = [];
  const statuses: TestInvoice['status'][] = ['draft', 'pending', 'paid', 'overdue', 'cancelled'];

  customers.forEach(customer => {
    const invoiceCount = faker.number.int({ min: 0, max: 5 });
    
    for (let i = 0; i < invoiceCount; i++) {
      const subtotal = faker.number.int({ min: 2000, max: 20000 });
      const taxAmount = Math.round(subtotal * 0.1); // 10% tax
      const issueDate = faker.date.past({ years: 1 });
      const dueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days later

      invoices.push({
        id: faker.string.uuid(),
        organization_id: customer.organization_id,
        customer_id: customer.id,
        invoice_number: `INV-${faker.number.int({ min: 1000, max: 9999 })}`,
        status: faker.helpers.arrayElement(statuses),
        subtotal_pennies: subtotal,
        tax_amount_pennies: taxAmount,
        total_amount_pennies: subtotal + taxAmount,
        issue_date: issueDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        created_at: issueDate.toISOString()
      });
    }
  });

  return invoices.slice(0, count);
}

/**
 * Generate test discount codes
 */
function generateTestDiscountCodes(orgIds: string[], count: number = 20): TestDiscountCode[] {
  const discountCodes: TestDiscountCode[] = [];
  const discountTypes: TestDiscountCode['discount_type'][] = ['percentage', 'fixed_amount'];

  orgIds.forEach(orgId => {
    const codesPerOrg = Math.floor(count / orgIds.length);
    
    for (let i = 0; i < codesPerOrg; i++) {
      const discountType = faker.helpers.arrayElement(discountTypes);
      const startDate = faker.date.past({ years: 1 });
      const endDate = faker.date.future({ years: 1, refDate: startDate });
      const maxUses = faker.number.int({ min: 10, max: 100 });
      const currentUses = faker.number.int({ min: 0, max: maxUses });

      discountCodes.push({
        id: faker.string.uuid(),
        organization_id: orgId,
        code: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
        description: faker.commerce.productAdjective() + ' Discount',
        discount_type: discountType,
        discount_value: discountType === 'percentage' 
          ? faker.number.int({ min: 5, max: 50 })
          : faker.number.int({ min: 500, max: 5000 }),
        min_amount_pennies: faker.number.int({ min: 1000, max: 5000 }),
        max_uses: maxUses,
        current_uses: currentUses,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        is_active: faker.datatype.boolean(),
        created_at: startDate.toISOString()
      });
    }
  });

  return discountCodes;
}

/**
 * Insert data into Supabase
 */
async function insertTestData() {
  console.log('🌱 Starting test data seeding...');

  try {
    // 1. Create test organizations
    console.log('📊 Creating test organizations...');
    const organizations = generateTestOrganizations();
    const { error: orgError } = await supabase
      .from('organizations')
      .upsert(organizations, { onConflict: 'id' });
    
    if (orgError) {
      console.error('Error creating organizations:', orgError);
      throw orgError;
    }
    console.log(`✅ Created ${organizations.length} organizations`);

    // 2. Create test customers
    console.log('👥 Creating test customers...');
    const customers = generateTestCustomers(TEST_ORG_IDS, 50);
    const { error: customerError } = await supabase
      .from('customers')
      .upsert(customers, { onConflict: 'id' });
    
    if (customerError) {
      console.error('Error creating customers:', customerError);
      throw customerError;
    }
    console.log(`✅ Created ${customers.length} customers`);

    // 3. Create test classes
    console.log('🏃 Creating test classes...');
    const classes = generateTestClasses(TEST_ORG_IDS, 30);
    const { error: classError } = await supabase
      .from('class_sessions')
      .upsert(classes.map(c => ({
        id: c.id,
        organization_id: c.organization_id,
        class_type_name: c.class_type_name,
        instructor_name: c.instructor_name,
        venue_name: c.venue_name,
        start_time: c.start_time,
        end_time: c.end_time,
        capacity: c.capacity,
        created_at: c.created_at
      })), { onConflict: 'id' });
    
    if (classError) {
      console.error('Error creating classes:', classError);
      throw classError;
    }
    console.log(`✅ Created ${classes.length} classes`);

    // 4. Create test bookings
    console.log('📅 Creating test bookings...');
    const bookings = generateTestBookings(customers, classes, 200);
    const { error: bookingError } = await supabase
      .from('class_bookings')
      .upsert(bookings.map(b => ({
        id: b.id,
        organization_id: b.organization_id,
        customer_id: b.customer_id,
        class_id: b.class_id,
        attendance_status: b.attendance_status,
        booking_method: b.booking_method,
        booking_source: b.booking_source,
        payment_amount_pennies: b.payment_amount_pennies,
        checked_in_at: b.checked_in_at,
        created_at: b.created_at
      })), { onConflict: 'id' });
    
    if (bookingError) {
      console.error('Error creating bookings:', bookingError);
      throw bookingError;
    }
    console.log(`✅ Created ${bookings.length} bookings`);

    // 5. Create test invoices
    console.log('💰 Creating test invoices...');
    const invoices = generateTestInvoices(customers, 100);
    const { error: invoiceError } = await supabase
      .from('invoices')
      .upsert(invoices, { onConflict: 'id' });
    
    if (invoiceError) {
      console.error('Error creating invoices:', invoiceError);
      throw invoiceError;
    }
    console.log(`✅ Created ${invoices.length} invoices`);

    // 6. Create test discount codes
    console.log('🎫 Creating test discount codes...');
    const discountCodes = generateTestDiscountCodes(TEST_ORG_IDS, 20);
    const { error: discountError } = await supabase
      .from('discount_codes')
      .upsert(discountCodes, { onConflict: 'id' });
    
    if (discountError) {
      console.error('Error creating discount codes:', discountError);
      throw discountError;
    }
    console.log(`✅ Created ${discountCodes.length} discount codes`);

    // 7. Create sample invoice items
    console.log('📋 Creating test invoice items...');
    const invoiceItems = invoices.flatMap(invoice => {
      const itemCount = faker.number.int({ min: 1, max: 3 });
      const items = [];
      
      for (let i = 0; i < itemCount; i++) {
        items.push({
          id: faker.string.uuid(),
          invoice_id: invoice.id,
          organization_id: invoice.organization_id,
          description: faker.commerce.productName(),
          quantity: faker.number.int({ min: 1, max: 5 }),
          unit_price_pennies: faker.number.int({ min: 500, max: 5000 }),
          total_price_pennies: faker.number.int({ min: 500, max: 5000 }),
          created_at: invoice.created_at
        });
      }
      
      return items;
    });

    const { error: itemError } = await supabase
      .from('invoice_items')
      .upsert(invoiceItems, { onConflict: 'id' });
    
    if (itemError) {
      console.error('Error creating invoice items:', itemError);
      throw itemError;
    }
    console.log(`✅ Created ${invoiceItems.length} invoice items`);

    // 8. Create sample payouts
    console.log('💸 Creating test payouts...');
    const payouts = TEST_ORG_IDS.flatMap(orgId => {
      const payoutCount = faker.number.int({ min: 5, max: 15 });
      const orgPayouts = [];
      
      for (let i = 0; i < payoutCount; i++) {
        const arrivalDate = faker.date.past({ years: 1 });
        const statuses = ['pending', 'in_transit', 'paid', 'failed', 'cancelled'];
        
        orgPayouts.push({
          id: faker.string.uuid(),
          organization_id: orgId,
          amount_pennies: faker.number.int({ min: 10000, max: 100000 }),
          currency: 'USD',
          status: faker.helpers.arrayElement(statuses),
          arrival_date: arrivalDate.toISOString().split('T')[0],
          method: faker.helpers.arrayElement(['bank_transfer', 'card']),
          description: 'Weekly payout',
          fees_pennies: faker.number.int({ min: 100, max: 1000 }),
          created_at: arrivalDate.toISOString()
        });
      }
      
      return orgPayouts;
    });

    const { error: payoutError } = await supabase
      .from('payouts')
      .upsert(payouts, { onConflict: 'id' });
    
    if (payoutError) {
      console.error('Error creating payouts:', payoutError);
      throw payoutError;
    }
    console.log(`✅ Created ${payouts.length} payouts`);

    console.log('🎉 Test data seeding completed successfully!');
    console.log(`
📊 Summary:
- Organizations: ${organizations.length}
- Customers: ${customers.length}
- Classes: ${classes.length}
- Bookings: ${bookings.length}
- Invoices: ${invoices.length}
- Invoice Items: ${invoiceItems.length}
- Discount Codes: ${discountCodes.length}
- Payouts: ${payouts.length}

Test Organization IDs:
${TEST_ORG_IDS.map(id => `- ${id}`).join('\n')}
    `);

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    process.exit(1);
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');

  try {
    // Delete in reverse order to avoid foreign key constraints
    await supabase.from('payouts').delete().in('organization_id', TEST_ORG_IDS);
    await supabase.from('invoice_items').delete().in('organization_id', TEST_ORG_IDS);
    await supabase.from('discount_codes').delete().in('organization_id', TEST_ORG_IDS);
    await supabase.from('invoices').delete().in('organization_id', TEST_ORG_IDS);
    await supabase.from('class_bookings').delete().in('organization_id', TEST_ORG_IDS);
    await supabase.from('class_sessions').delete().in('organization_id', TEST_ORG_IDS);
    await supabase.from('customers').delete().in('organization_id', TEST_ORG_IDS);
    await supabase.from('organizations').delete().in('id', TEST_ORG_IDS);

    console.log('✅ Test data cleanup completed!');
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
    process.exit(1);
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'seed') {
  insertTestData();
} else if (command === 'cleanup') {
  cleanupTestData();
} else {
  console.log(`
Usage:
  npm run seed-reports-data seed    - Insert test data
  npm run seed-reports-data cleanup - Remove test data

Example:
  npx tsx scripts/seed-reports-test-data.ts seed
  npx tsx scripts/seed-reports-test-data.ts cleanup
  `);
  process.exit(1);
}